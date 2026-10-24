import { getDb } from "@/lib/mongodb";
import { resendVerificationSchema } from "@/lib/validations";
import { hashToken, normalizeEmail, randomToken } from "@/lib/security";
import { rateLimit } from "@/lib/rateLimit";
import { ensureIndexes } from "@/lib/indexes";
import { isEmailDeliveryConfigured, sendVerificationEmail } from "@/lib/email";
import { getMobileClientIp, getRequestId, mobileError, mobileSuccess } from "@/lib/mobileResponse";

const GENERIC_MESSAGE = "If an unverified active account exists for that email, a new verification link has been sent.";

export async function POST(request) {
  const requestId = getRequestId(request);
  try {
    await ensureIndexes();

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

    const validation = resendVerificationSchema.safeParse(body);
    if (!validation.success) {
      return mobileError({
        code: "VALIDATION_ERROR",
        message: "Validation failed.",
        details: validation.error.flatten(),
        status: 400,
        requestId,
      });
    }

    const email = normalizeEmail(validation.data.email);
    const ip = getMobileClientIp(request);

    const ipLimiter = await rateLimit(`mobile:resend-verification:${ip}:${email}`, 5, 60 * 60 * 1000);
    if (!ipLimiter.allowed) {
      return mobileError({
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many verification requests. Please try again later.",
        status: 429,
        requestId,
      });
    }

    const emailLimiter = await rateLimit(`mobile:resend-verification:email:${email}`, 5, 60 * 60 * 1000);
    if (!emailLimiter.allowed) {
      return mobileError({
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many verification requests. Please try again later.",
        status: 429,
        requestId,
      });
    }

    if (process.env.NODE_ENV === "production" && !isEmailDeliveryConfigured()) {
      return mobileError({
        code: "SERVICE_UNAVAILABLE",
        message: "Email verification service is currently unavailable.",
        status: 503,
        requestId,
      });
    }

    const db = await getDb();
    const user = await db.collection("users").findOne(
      { email, active: { $ne: false } },
      { projection: { _id: 1, emailVerified: 1 } }
    );

    // Account enumeration safe
    if (!user || user.emailVerified !== false) {
      return mobileSuccess({ message: GENERIC_MESSAGE }, { requestId });
    }

    const token = randomToken(32);
    const tokenHash = hashToken(token);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = hashToken(code);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const userId = user._id.toString();

    await db.collection("email_verification_tokens").deleteMany({ userId });
    await db.collection("email_verification_tokens").insertOne({
      tokenHash,
      code,
      codeHash,
      userId,
      email,
      expiresAt,
      createdAt: now,
    });

    const delivery = await sendVerificationEmail({ to: email, token, code });
    if (!delivery.sent) {
      await db.collection("email_verification_tokens").deleteOne({ tokenHash });
      if (process.env.NODE_ENV !== "production") {
        return mobileSuccess(
          {
            message: "Development verification link generated.",
            developmentVerificationUrl: delivery.verifyUrl,
          },
          { requestId }
        );
      }
      return mobileSuccess({ message: GENERIC_MESSAGE }, { requestId });
    }

    return mobileSuccess({ message: GENERIC_MESSAGE }, { requestId });
  } catch (error) {
    console.error("[mobile-resend-verification]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "An error occurred processing verification request.",
      status: 500,
      requestId,
    });
  }
}
