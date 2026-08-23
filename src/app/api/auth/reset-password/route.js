import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { resetPasswordSchema } from "@/lib/validations";
import { normalizeEmail, hashToken } from "@/lib/security";
import { getClientIp, safeInternalError, rejectCrossSiteRequest } from "@/lib/api";
import { rateLimit } from "@/lib/rateLimit";
import { ensureIndexes } from "@/lib/indexes";

export async function POST(request) {
  try {
    const originError = rejectCrossSiteRequest(request);
    if (originError) return originError;
    await ensureIndexes();
    const limiter = await rateLimit(`reset-password:${getClientIp(request)}`, 10, 15 * 60 * 1000);
    if (!limiter.allowed) {
      return Response.json({ error: "Too many password reset attempts. Please try again later." }, { status: 429 });
    }

    const validation = resetPasswordSchema.safeParse(await request.json());
    if (!validation.success) return Response.json({ error: validation.error.flatten() }, { status: 400 });

    const email = normalizeEmail(validation.data.email);
    const emailLimiter = await rateLimit(`reset-password:email:${email}`, 10, 15 * 60 * 1000);
    if (!emailLimiter.allowed) return Response.json({ error: "Too many password reset attempts. Please try again later." }, { status: 429 });
    const tokenHash = hashToken(validation.data.token);
    const db = await getDb();
    const now = new Date();

    // Consume the token atomically before changing the password so the same
    // reset link cannot be used concurrently by multiple requests.
    const reset = await db.collection("password_reset_tokens").findOneAndUpdate(
      {
        tokenHash,
        email,
        expiresAt: { $gt: now },
        usedAt: { $exists: false },
      },
      { $set: { usedAt: now } },
      { returnDocument: "after" },
    );

    if (!reset || !ObjectId.isValid(reset.userId)) {
      return Response.json({ error: "This password reset link is invalid or has expired." }, { status: 400 });
    }

    const password = await bcrypt.hash(validation.data.password, 12);
    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(reset.userId), email, active: { $ne: false } },
      { $set: { password, updatedAt: new Date() }, $inc: { sessionVersion: 1 } },
    );
    if (!result.matchedCount) {
      return Response.json({ error: "This password reset link is invalid or has expired." }, { status: 400 });
    }

    await db.collection("password_reset_tokens").deleteMany({ userId: reset.userId });
    return Response.json({ message: "Password updated successfully. Please sign in again." });
  } catch (error) {
    return safeInternalError(error, "reset-password");
  }
}
