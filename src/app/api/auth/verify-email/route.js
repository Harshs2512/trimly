import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { verifyEmailSchema } from "@/lib/validations";
import { hashToken, normalizeEmail } from "@/lib/security";
import { getClientIp, safeInternalError, rejectCrossSiteRequest } from "@/lib/api";
import { rateLimit } from "@/lib/rateLimit";
import { ensureIndexes } from "@/lib/indexes";

export async function POST(request) {
  try {
    const originError = rejectCrossSiteRequest(request);
    if (originError) return originError;
    await ensureIndexes();
    const limiter = await rateLimit(`verify-email:${getClientIp(request)}`, 20, 15 * 60 * 1000);
    if (!limiter.allowed) {
      return Response.json({ error: "Too many verification attempts. Please try again later." }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const rawToken = body.token || body.code;
    const rawEmail = body.email;

    if (!rawEmail || !rawToken) {
      return Response.json({ error: "Email and verification token are required." }, { status: 400 });
    }

    const email = normalizeEmail(rawEmail);
    const trimmedInput = String(rawToken).trim();
    const tokenHash = hashToken(trimmedInput);
    const db = await getDb();
    const now = new Date();

    const verification = await db.collection("email_verification_tokens").findOneAndUpdate(
      {
        email,
        $or: [
          { tokenHash },
          { code: trimmedInput },
          { codeHash: tokenHash },
          { code: trimmedInput.toUpperCase() },
          { code: trimmedInput.toLowerCase() },
        ],
        expiresAt: { $gt: now },
        usedAt: { $exists: false },
      },
      { $set: { usedAt: now } },
      { returnDocument: "after" },
    );

    if (!verification || !ObjectId.isValid(verification.userId)) {
      const existingUser = await db.collection("users").findOne(
        { email, active: { $ne: false } },
        { projection: { _id: 1, emailVerified: 1 } },
      );
      if (existingUser && existingUser.emailVerified === true) {
        return Response.json({ message: "Email is already verified. You can now sign in." });
      }
      return Response.json({ error: "This verification code or link is invalid or has expired." }, { status: 400 });
    }

    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(verification.userId), email, active: { $ne: false } },
      { $set: { emailVerified: true, emailVerifiedAt: now, updatedAt: now } },
    );
    if (!result.matchedCount) {
      return Response.json({ error: "This verification code or link is invalid or has expired." }, { status: 400 });
    }

    await db.collection("email_verification_tokens").deleteMany({ userId: verification.userId });
    return Response.json({ message: "Email verified successfully. You can now sign in." });
  } catch (error) {
    return safeInternalError(error, "verify-email");
  }
}
