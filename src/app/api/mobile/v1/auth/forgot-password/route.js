import { getDb } from "@/lib/mongodb";
import { forgotPasswordSchema } from "@/lib/validations";
import { normalizeEmail, hashToken, randomToken } from "@/lib/security";
import { rateLimit } from "@/lib/rateLimit";
import { isEmailDeliveryConfigured, sendPasswordResetEmail } from "@/lib/email";
import { ensureIndexes } from "@/lib/indexes";
import { getAppUrl } from "@/lib/appUrl";
import { getMobileClientIp, getRequestId, mobileError, mobileSuccess } from "@/lib/mobileResponse";

const GENERIC_MESSAGE = "If an active account exists for that email, password reset instructions have been sent.";

export async function POST(request) {
  const requestId = getRequestId(request);
  try {
    await ensureIndexes();
    const ip = getMobileClientIp(request);

    const ipLimiter = await rateLimit(`mobile:forgot-password:${ip}`, 5, 15 * 60 * 1000);
    if (!ipLimiter.allowed) {
      return mobileError({
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many reset requests. Please try again later.",
        status: 429,
        requestId,
      });
    }

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

    const validation = forgotPasswordSchema.safeParse(body);
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
        message: "Password reset service is currently unavailable.",
        status: 503,
        requestId,
      });
    }

    const email = normalizeEmail(validation.data.email);
    const emailLimiter = await rateLimit(`mobile:forgot-password:email:${email}`, 3, 60 * 60 * 1000);
    if (!emailLimiter.allowed) {
      return mobileError({
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many reset requests. Please try again later.",
        status: 429,
        requestId,
      });
    }

    const db = await getDb();
    const user = await db.collection("users").findOne({ email, active: { $ne: false } }, { projection: { _id: 1 } });
    if (!user) {
      return mobileSuccess({ message: GENERIC_MESSAGE }, { requestId });
    }

    const token = randomToken(32);
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const userId = user._id.toString();

    await db.collection("password_reset_tokens").deleteMany({ userId });
    await db.collection("password_reset_tokens").insertOne({
      tokenHash,
      userId,
      email,
      expiresAt,
      createdAt: new Date(),
    });

    const delivery = await sendPasswordResetEmail({ to: email, token });
    if (!delivery.sent) {
      await db.collection("password_reset_tokens").deleteOne({ tokenHash });
      if (process.env.NODE_ENV !== "production") {
        const appUrl = getAppUrl();
        return mobileSuccess(
          {
            message: "Development reset link generated.",
            developmentResetUrl: `${appUrl}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`,
          },
          { requestId }
        );
      }
      return mobileSuccess({ message: GENERIC_MESSAGE }, { requestId });
    }

    return mobileSuccess({ message: GENERIC_MESSAGE }, { requestId });
  } catch (error) {
    console.error("[mobile-forgot-password]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "An error occurred processing password reset request.",
      status: 500,
      requestId,
    });
  }
}
