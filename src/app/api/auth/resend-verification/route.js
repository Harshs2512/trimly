import { getDb } from "@/lib/mongodb";
import { resendVerificationSchema } from "@/lib/validations";
import { getClientIp, safeInternalError, rejectCrossSiteRequest } from "@/lib/api";
import { hashToken, normalizeEmail, randomToken } from "@/lib/security";
import { rateLimit } from "@/lib/rateLimit";
import { ensureIndexes } from "@/lib/indexes";
import { isEmailDeliveryConfigured, sendVerificationEmail } from "@/lib/email";

const GENERIC_MESSAGE = "If an unverified active account exists for that email, a new verification link has been sent.";

export async function POST(request) {
  try {
    const originError = rejectCrossSiteRequest(request);
    if (originError) return originError;
    await ensureIndexes();
    const validation = resendVerificationSchema.safeParse(await request.json());
    if (!validation.success) {
      return Response.json({ error: validation.error.flatten() }, { status: 400 });
    }

    const email = normalizeEmail(validation.data.email);
    const ip = getClientIp(request);
    const limiter = await rateLimit(`resend-verification:${ip}:${email}`, 5, 60 * 60 * 1000);
    if (!limiter.allowed) {
      return Response.json({ error: "Too many verification requests. Please try again later." }, { status: 429 });
    }
    const emailLimiter = await rateLimit(`resend-verification:email:${email}`, 5, 60 * 60 * 1000);
    if (!emailLimiter.allowed) return Response.json({ error: "Too many verification requests. Please try again later." }, { status: 429 });

    if (process.env.NODE_ENV === "production" && !isEmailDeliveryConfigured()) {
      return Response.json({ error: "Email verification service is currently unavailable." }, { status: 503 });
    }

    const db = await getDb();
    const user = await db.collection("users").findOne(
      { email, active: { $ne: false } },
      { projection: { _id: 1, emailVerified: 1 } },
    );

    // Keep the public response generic so this endpoint does not become an
    // account-enumeration oracle.
    if (!user || user.emailVerified !== false) {
      return Response.json({ message: GENERIC_MESSAGE });
    }

    const token = randomToken(32);
    const tokenHash = hashToken(token);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const userId = user._id.toString();

    await db.collection("email_verification_tokens").deleteMany({ userId });
    await db.collection("email_verification_tokens").insertOne({
      tokenHash,
      userId,
      email,
      expiresAt,
      createdAt: now,
    });

    const delivery = await sendVerificationEmail({ to: email, token });
    if (!delivery.sent) {
      await db.collection("email_verification_tokens").deleteOne({ tokenHash });
      if (process.env.NODE_ENV !== "production" && delivery.reason === "not_configured") {
        return Response.json({
          message: "Email delivery is not configured. Development verification link generated.",
          developmentVerificationUrl: delivery.verifyUrl,
        });
      }
      // Keep the response account-neutral even if the provider fails.
      return Response.json({ message: GENERIC_MESSAGE });
    }

    return Response.json({ message: GENERIC_MESSAGE });
  } catch (error) {
    return safeInternalError(error, "resend-verification");
  }
}
