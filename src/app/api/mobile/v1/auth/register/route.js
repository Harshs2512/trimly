import bcrypt from "bcryptjs";
import { userSchema } from "@/lib/validations";
import { enforceMobileRateLimit } from "@/lib/rateLimit";
import { getDb } from "@/lib/mongodb";
import { hashToken, normalizeEmail, randomToken } from "@/lib/security";
import { ensureIndexes } from "@/lib/indexes";
import { isEmailDeliveryConfigured, sendVerificationEmail } from "@/lib/email";
import { getMobileClientIp, getRequestId, mobileError, mobileSuccess } from "@/lib/mobileResponse";
import { checkBreachedPassword } from "@/lib/mobileAuth";
import { logger } from "@/lib/logger";
import { enforceDeviceAttestation } from "@/lib/attestation";

export async function POST(request) {
  const requestId = getRequestId(request);
  try {
    await ensureIndexes();
    const ip = getMobileClientIp(request);

    // Optional device attestation hook (feature flagged)
    const attestationError = await enforceDeviceAttestation(request, { action: "register", requestId });
    if (attestationError) return attestationError;

    const rateLimitError = await enforceMobileRateLimit(
      `mobile:register:${ip}`,
      5,
      15 * 60 * 1000,
      { requestId, message: "Too many registration attempts. Please try again later." }
    );
    if (rateLimitError) return rateLimitError;

    let body;
    try {
      body = await request.json();
    } catch {
      return mobileError({
        code: "INVALID_JSON",
        message: "Invalid JSON request body.",
        status: 400,
        requestId,
      });
    }

    const validation = userSchema.safeParse(body);
    if (!validation.success) {
      return mobileError({
        code: "VALIDATION_ERROR",
        message: "Validation failed.",
        details: validation.error.flatten(),
        status: 400,
        requestId,
      });
    }

    if (process.env.NODE_ENV === "production" && !isEmailDeliveryConfigured()) {
      return mobileError({
        code: "SERVICE_UNAVAILABLE",
        message: "Account registration is temporarily unavailable because email verification is not configured.",
        status: 503,
        requestId,
      });
    }

    const { name, password, role, phone } = validation.data;
    const email = normalizeEmail(validation.data.email);

    // Breached password check via HIBP
    try {
      const breachCheck = await checkBreachedPassword(password);
      if (breachCheck.breached) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[mobile-register] Common password used in dev mode for:", email);
        } else {
          return mobileError({
            code: "PASSWORD_BREACHED",
            message: "This password has appeared in a known public data breach. For your security, please choose a different password.",
            status: 400,
            requestId,
          });
        }
      }
    } catch (err) {
      console.warn("[mobile-register] HIBP check skipped due to error:", err?.message || err);
    }

    const db = await getDb();
    const existingUser = await db.collection("users").findOne({ email }, { projection: { _id: 1 } });
    if (existingUser) {
      return mobileError({
        code: "EMAIL_EXISTS",
        message: "An account with this email already exists.",
        status: 409,
        requestId,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const now = new Date();
    const userResult = await db.collection("users").insertOne({
      name,
      email,
      password: hashedPassword,
      role: role === "barber" ? "barber" : "user",
      phone: phone || null,
      active: true,
      emailVerified: false,
      sessionVersion: 0,
      createdAt: now,
      updatedAt: now,
    });

    const token = randomToken(32);
    const tokenHash = hashToken(token);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = hashToken(code);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.collection("email_verification_tokens").insertOne({
      tokenHash,
      code,
      codeHash,
      userId: userResult.insertedId.toString(),
      email,
      expiresAt,
      createdAt: now,
    });

    const delivery = await sendVerificationEmail({ to: email, token, code });
    if (!delivery.sent) {
      if (process.env.NODE_ENV !== "production") {
        return mobileSuccess(
          {
            message: "Account created. Verify email before signing in.",
            code,
            developmentVerificationUrl: delivery.verifyUrl,
          },
          { status: 201, requestId }
        );
      }

      await db.collection("email_verification_tokens").deleteMany({ userId: userResult.insertedId.toString() });
      await db.collection("users").deleteOne({ _id: userResult.insertedId, emailVerified: false });
      return mobileError({
        code: "EMAIL_DELIVERY_FAILED",
        message: "Verification email could not be delivered. Please try again later.",
        status: 503,
        requestId,
      });
    }

    return mobileSuccess(
      {
        message: "Account created successfully. Check your email to verify your account.",
        code: process.env.NODE_ENV !== "production" ? code : undefined,
        developmentVerificationUrl: process.env.NODE_ENV !== "production" ? delivery.verifyUrl : undefined,
      },
      { status: 201, requestId }
    );
  } catch (error) {
    if (error?.code === 11000) {
      return mobileError({
        code: "EMAIL_EXISTS",
        message: "An account with this email already exists.",
        status: 409,
        requestId,
      });
    }
    console.error("[mobile-register]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "An error occurred during registration.",
      status: 500,
      requestId,
    });
  }
}
