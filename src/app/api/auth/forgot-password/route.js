import { getDb } from "@/lib/mongodb";
import { forgotPasswordSchema } from "@/lib/validations";
import { getClientIp, safeInternalError, rejectCrossSiteRequest } from "@/lib/api";
import { normalizeEmail, hashToken, randomToken } from "@/lib/security";
import { rateLimit } from "@/lib/rateLimit";
import { isEmailDeliveryConfigured, sendPasswordResetEmail } from "@/lib/email";
import { ensureIndexes } from "@/lib/indexes";
import { getAppUrl } from "@/lib/appUrl";

const GENERIC_MESSAGE = "If an active account exists for that email, password reset instructions have been sent.";

export async function POST(request) {
  try {
    const originError = rejectCrossSiteRequest(request);
    if (originError) return originError;
    await ensureIndexes();
    const limiter = await rateLimit(`forgot-password:${getClientIp(request)}`, 5, 15 * 60 * 1000);
    if (!limiter.allowed) return Response.json({ error: "Too many reset requests. Please try again later." }, { status: 429 });

    const validation = forgotPasswordSchema.safeParse(await request.json());
    if (!validation.success) return Response.json({ error: validation.error.flatten() }, { status: 400 });

    if (process.env.NODE_ENV === "production" && !isEmailDeliveryConfigured()) {
      return Response.json({ error: "Password reset service is currently unavailable." }, { status: 503 });
    }

    const email = normalizeEmail(validation.data.email);
    const emailLimiter = await rateLimit(`forgot-password:email:${email}`, 3, 60 * 60 * 1000);
    if (!emailLimiter.allowed) return Response.json({ error: "Too many reset requests. Please try again later." }, { status: 429 });
    const db = await getDb();
    const user = await db.collection("users").findOne({ email, active: { $ne: false } }, { projection: { _id: 1 } });
    if (!user) return Response.json({ message: GENERIC_MESSAGE });

    const token = randomToken(32);
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await db.collection("password_reset_tokens").deleteMany({ userId: user._id.toString() });
    await db.collection("password_reset_tokens").insertOne({
      tokenHash,
      userId: user._id.toString(),
      email,
      expiresAt,
      createdAt: new Date(),
    });

    const delivery = await sendPasswordResetEmail({ to: email, token });
    if (!delivery.sent) {
      await db.collection("password_reset_tokens").deleteOne({ tokenHash });
      if (process.env.NODE_ENV !== "production" && delivery.reason === "not_configured") {
        const appUrl = getAppUrl();
        return Response.json({
          message: "Email delivery is not configured. Development reset link generated.",
          developmentResetUrl: `${appUrl}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`,
        });
      }
      // Do not reveal whether the account exists based on provider failures.
      return Response.json({ message: GENERIC_MESSAGE });
    }

    return Response.json({ message: GENERIC_MESSAGE });
  } catch (error) {
    return safeInternalError(error, "forgot-password");
  }
}
