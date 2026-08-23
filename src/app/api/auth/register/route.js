import bcrypt from "bcryptjs";
import { userSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rateLimit";
import { getDb } from "@/lib/mongodb";
import { hashToken, normalizeEmail, randomToken } from "@/lib/security";
import { ensureIndexes } from "@/lib/indexes";
import { getClientIp, safeInternalError, rejectCrossSiteRequest } from "@/lib/api";
import { isEmailDeliveryConfigured, sendVerificationEmail } from "@/lib/email";

export async function POST(req) {
  try {
    const originError = rejectCrossSiteRequest(req);
    if (originError) return originError;
    await ensureIndexes();
    const ip = getClientIp(req);
    const limiter = await rateLimit(`register:${ip}`, 5, 15 * 60 * 1000);
    if (!limiter.allowed) {
      return Response.json({ error: "Too many registration attempts. Please try again later." }, { status: 429 });
    }

    const validation = userSchema.safeParse(await req.json());
    if (!validation.success) {
      return Response.json({ error: validation.error.flatten() }, { status: 400 });
    }

    if (process.env.NODE_ENV === "production" && !isEmailDeliveryConfigured()) {
      return Response.json({ error: "Account registration is temporarily unavailable because email verification is not configured." }, { status: 503 });
    }

    const { name, password, role } = validation.data;
    const email = normalizeEmail(validation.data.email);
    const db = await getDb();

    const existingUser = await db.collection("users").findOne({ email }, { projection: { _id: 1 } });
    if (existingUser) {
      return Response.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const now = new Date();
    const userResult = await db.collection("users").insertOne({
      name,
      email,
      password: hashedPassword,
      role: role === "barber" ? "barber" : "user",
      active: true,
      emailVerified: false,
      sessionVersion: 0,
      createdAt: now,
      updatedAt: now,
    });

    const token = randomToken(32);
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.collection("email_verification_tokens").insertOne({
      tokenHash,
      userId: userResult.insertedId.toString(),
      email,
      expiresAt,
      createdAt: now,
    });

    const delivery = await sendVerificationEmail({ to: email, token });
    if (!delivery.sent) {
      if (process.env.NODE_ENV !== "production" && delivery.reason === "not_configured") {
        return Response.json({
          message: "Account created. Verify the email before signing in.",
          developmentVerificationUrl: delivery.verifyUrl,
        }, { status: 201 });
      }

      await db.collection("email_verification_tokens").deleteMany({ userId: userResult.insertedId.toString() });
      await db.collection("users").deleteOne({ _id: userResult.insertedId, emailVerified: false });
      return Response.json({ error: "Verification email could not be delivered. Please try again later." }, { status: 503 });
    }

    return Response.json({ message: "Account created. Check your email to verify the account before signing in." }, { status: 201 });
  } catch (error) {
    if (error?.code === 11000) {
      return Response.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    return safeInternalError(error, "auth-register");
  }
}
