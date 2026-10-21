import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { resetPasswordSchema } from "@/lib/validations";
import { normalizeEmail, hashToken } from "@/lib/security";
import { rateLimit } from "@/lib/rateLimit";
import { ensureIndexes } from "@/lib/indexes";
import { getMobileClientIp, getRequestId, mobileError, mobileSuccess } from "@/lib/mobileResponse";
import { checkBreachedPassword } from "@/lib/mobileAuth";
import { writeAuditLog } from "@/lib/audit";

export async function POST(request) {
  const requestId = getRequestId(request);
  try {
    await ensureIndexes();
    const ip = getMobileClientIp(request);

    const ipLimiter = await rateLimit(`mobile:reset-password:${ip}`, 10, 15 * 60 * 1000);
    if (!ipLimiter.allowed) {
      return mobileError({
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many password reset attempts. Please try again later.",
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

    const validation = resetPasswordSchema.safeParse(body);
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
    const emailLimiter = await rateLimit(`mobile:reset-password:email:${email}`, 10, 15 * 60 * 1000);
    if (!emailLimiter.allowed) {
      return mobileError({
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many password reset attempts. Please try again later.",
        status: 429,
        requestId,
      });
    }

    // Breached password check
    const breachCheck = await checkBreachedPassword(validation.data.password);
    if (breachCheck.breached) {
      return mobileError({
        code: "PASSWORD_BREACHED",
        message: "This password has appeared in a known public data breach. Please choose a different password.",
        status: 400,
        requestId,
      });
    }

    const tokenHash = hashToken(validation.data.token);
    const db = await getDb();
    const now = new Date();

    // Consume token atomically before updating password
    const reset = await db.collection("password_reset_tokens").findOneAndUpdate(
      {
        tokenHash,
        email,
        expiresAt: { $gt: now },
        usedAt: { $exists: false },
      },
      { $set: { usedAt: now } },
      { returnDocument: "after" }
    );

    if (!reset || !ObjectId.isValid(reset.userId)) {
      return mobileError({
        code: "TOKEN_INVALID",
        message: "This password reset link is invalid or has expired.",
        status: 400,
        requestId,
      });
    }

    const hashedPassword = await bcrypt.hash(validation.data.password, 12);
    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(reset.userId), email, active: { $ne: false } },
      { $set: { password: hashedPassword, updatedAt: now }, $inc: { sessionVersion: 1 } }
    );

    if (!result.matchedCount) {
      return mobileError({
        code: "TOKEN_INVALID",
        message: "This password reset link is invalid or has expired.",
        status: 400,
        requestId,
      });
    }

    // Invalidate all active mobile sessions for this user on password reset
    await db.collection("mobile_sessions").updateMany(
      { userId: reset.userId, isRevoked: false },
      { $set: { isRevoked: true, revokedAt: now, revocationReason: "password_reset" } }
    );

    await db.collection("password_reset_tokens").deleteMany({ userId: reset.userId });

    await writeAuditLog(db, {
      actorId: reset.userId,
      action: "auth.mobile.password_reset",
      targetType: "user",
      targetId: reset.userId,
      metadata: { ip },
    });

    return mobileSuccess(
      { message: "Password updated successfully. All devices have been logged out. Please sign in with your new password." },
      { requestId }
    );
  } catch (error) {
    console.error("[mobile-reset-password]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "An error occurred during password reset.",
      status: 500,
      requestId,
    });
  }
}
