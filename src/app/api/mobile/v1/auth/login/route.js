import bcrypt from "bcryptjs";
import { getDb } from "@/lib/mongodb";
import { mobileLoginSchema } from "@/lib/validations";
import { normalizeEmail } from "@/lib/security";
import { rateLimit } from "@/lib/rateLimit";
import { ensureIndexes } from "@/lib/indexes";
import { createMobileSession } from "@/lib/mobileAuth";
import { getMobileClientIp, getRequestId, mobileError, mobileSuccess } from "@/lib/mobileResponse";
import { writeAuditLog } from "@/lib/audit";

export async function POST(request) {
  const requestId = getRequestId(request);
  try {
    await ensureIndexes();
    const ip = getMobileClientIp(request);

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

    const validation = mobileLoginSchema.safeParse(body);
    if (!validation.success) {
      return mobileError({
        code: "VALIDATION_ERROR",
        message: "Validation failed.",
        details: validation.error.flatten(),
        status: 400,
        requestId,
      });
    }

    const { password, deviceId, platform, appVersion } = validation.data;
    const email = normalizeEmail(validation.data.email);

    // Multi-tier rate limiting: IP, Email, and Device
    const ipLimiter = await rateLimit(`mobile:login:ip:${ip}`, 20, 15 * 60 * 1000);
    if (!ipLimiter.allowed) {
      return mobileError({
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many login attempts from this network. Please try again later.",
        status: 429,
        requestId,
      });
    }

    const emailLimiter = await rateLimit(`mobile:login:email:${email}`, 10, 15 * 60 * 1000);
    if (!emailLimiter.allowed) {
      return mobileError({
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many login attempts for this account. Please try again later.",
        status: 429,
        requestId,
      });
    }

    if (deviceId) {
      const devLimiter = await rateLimit(`mobile:login:device:${deviceId}`, 15, 15 * 60 * 1000);
      if (!devLimiter.allowed) {
        return mobileError({
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many login attempts from this device. Please try again later.",
          status: 429,
          requestId,
        });
      }
    }

    const db = await getDb();
    const user = await db.collection("users").findOne({ email });

    // Defend against user enumeration and timing attacks: compute dummy hash if user not found
    const DUMMY_HASH = "$2a$12$e8k899s6X50s706qE5qGFeYfQ5vV8d1a1b1c1d1e1f1g1h1i1j1k1";
    const passwordHash = user?.password || DUMMY_HASH;
    const isPasswordValid = await bcrypt.compare(password, passwordHash);

    if (!user || !isPasswordValid) {
      await writeAuditLog(db, {
        actorId: user?._id?.toString() || "anonymous",
        action: "auth.mobile.login_failed",
        targetType: "user",
        targetId: email,
        metadata: { ip, deviceId, platform },
      });

      return mobileError({
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password.",
        status: 401,
        requestId,
      });
    }

    if (user.active === false) {
      return mobileError({
        code: "ACCOUNT_DEACTIVATED",
        message: "This account has been deactivated. Please contact support.",
        status: 403,
        requestId,
      });
    }

    if (user.emailVerified === false) {
      return mobileError({
        code: "EMAIL_NOT_VERIFIED",
        message: "Please verify your email address before logging in.",
        status: 403,
        requestId,
      });
    }

    // Create session and issue tokens
    const sessionResult = await createMobileSession(db, {
      userId: user._id.toString(),
      deviceId,
      platform,
      appVersion,
      userAgent: request.headers.get("user-agent") || "",
      ip,
      sessionVersion: user.sessionVersion || 0,
      role: user.role || "user",
    });

    await writeAuditLog(db, {
      actorId: user._id.toString(),
      action: "auth.mobile.login_success",
      targetType: "user",
      targetId: user._id.toString(),
      metadata: { ip, deviceId, platform, sessionId: sessionResult.sessionId },
    });

    return mobileSuccess(
      {
        accessToken: sessionResult.accessToken,
        refreshToken: sessionResult.refreshToken,
        expiresIn: sessionResult.expiresIn,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role || "user",
        },
      },
      { requestId }
    );
  } catch (error) {
    console.error("[mobile-login]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "An error occurred during authentication.",
      status: 500,
      requestId,
    });
  }
}
