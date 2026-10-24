import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { verifyEmailSchema } from "@/lib/validations";
import { hashToken, normalizeEmail } from "@/lib/security";
import { rateLimit } from "@/lib/rateLimit";
import { ensureIndexes } from "@/lib/indexes";
import { getMobileClientIp, getRequestId, mobileError, mobileSuccess } from "@/lib/mobileResponse";

export async function POST(request) {
  const requestId = getRequestId(request);
  try {
    await ensureIndexes();
    const ip = getMobileClientIp(request);
    const limiter = await rateLimit(`mobile:verify-email:${ip}`, 20, 15 * 60 * 1000);
    if (!limiter.allowed) {
      return mobileError({
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many verification attempts. Please try again later.",
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

    const rawCode = body.code ? String(body.code).trim() : "";
    const rawToken = body.token ? String(body.token).trim() : "";
    const rawEmail = body.email ? String(body.email).trim() : "";

    if (!rawEmail || (!rawCode && !rawToken)) {
      return mobileError({
        code: "VALIDATION_ERROR",
        message: "Email and verification code are required.",
        status: 400,
        requestId,
      });
    }

    const email = normalizeEmail(rawEmail);
    const db = await getDb();
    const now = new Date();

    const queryConditions = [];
    if (rawCode) {
      queryConditions.push({ code: rawCode });
      queryConditions.push({ codeHash: hashToken(rawCode) });
      queryConditions.push({ code: rawCode.toUpperCase() });
      queryConditions.push({ code: rawCode.toLowerCase() });
    }
    if (rawToken) {
      queryConditions.push({ tokenHash: hashToken(rawToken) });
      queryConditions.push({ code: rawToken });
      queryConditions.push({ codeHash: hashToken(rawToken) });
    }

    const verification = await db.collection("email_verification_tokens").findOneAndUpdate(
      {
        email,
        $or: queryConditions,
        expiresAt: { $gt: now },
        usedAt: { $exists: false },
      },
      { $set: { usedAt: now } },
      { returnDocument: "after" }
    );

    if (!verification || !ObjectId.isValid(verification.userId)) {
      const existingUser = await db.collection("users").findOne(
        { email, active: { $ne: false } },
        { projection: { _id: 1, emailVerified: 1 } }
      );
      if (existingUser && existingUser.emailVerified === true) {
        return mobileSuccess(
          { message: "Email is already verified. You can now sign in." },
          { requestId }
        );
      }

      return mobileError({
        code: "TOKEN_INVALID",
        message: "This verification code is invalid or has expired.",
        status: 400,
        requestId,
      });
    }

    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(verification.userId), email, active: { $ne: false } },
      { $set: { emailVerified: true, emailVerifiedAt: now, updatedAt: now } }
    );

    if (!result.matchedCount) {
      return mobileError({
        code: "TOKEN_INVALID",
        message: "This verification link is invalid or has expired.",
        status: 400,
        requestId,
      });
    }

    await db.collection("email_verification_tokens").deleteMany({ userId: verification.userId });

    return mobileSuccess(
      { message: "Email verified successfully. You can now sign in." },
      { requestId }
    );
  } catch (error) {
    console.error("[mobile-verify-email]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "An error occurred verifying email.",
      status: 500,
      requestId,
    });
  }
}
