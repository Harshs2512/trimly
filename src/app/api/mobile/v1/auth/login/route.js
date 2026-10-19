import bcrypt from "bcryptjs";
import { getDb } from "@/lib/mongodb";
import { mobileLoginSchema } from "@/lib/validations";
import { normalizeEmail } from "@/lib/security";
import { enforceMobileRateLimit, rateLimit } from "@/lib/rateLimit";
import { ensureIndexes } from "@/lib/indexes";
import { createMobileSession } from "@/lib/mobileAuth";
import { getMobileClientIp, getRequestId, mobileError, mobileSuccess } from "@/lib/mobileResponse";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { enforceDeviceAttestation } from "@/lib/attestation";

export async function POST(request) {
  const requestId = getRequestId(request);
  try {
    await ensureIndexes();
    const ip = getMobileClientIp(request);

    // Optional device attestation hook (feature flagged)
    const attestationError = await enforceDeviceAttestation(request, { action: "login", requestId });
    if (attestationError) return attestationError;

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

    // Multi-tier rate limiting with Retry-After headers: IP, Email, and Device
    const ipLimitError = await enforceMobileRateLimit(
      `mobile:login:ip:${ip}`,
      20,
      15 * 60 * 1000,
      { requestId, message: "Too many login attempts from this network. Please try again later." }
    );
    if (ipLimitError) return ipLimitError;

    const emailLimitError = await enforceMobileRateLimit(
      `mobile:login:email:${email}`,
      10,
      15 * 60 * 1000,
      { requestId, message: "Too many login attempts for this account. Please try again later." }
    );
    if (emailLimitError) return emailLimitError;

    if (deviceId) {
      const devLimitError = await enforceMobileRateLimit(
        `mobile:login:device:${deviceId}`,
        15,
        15 * 60 * 1000,
        { requestId, message: "Too many login attempts from this device. Please try again later." }
      );
      if (devLimitError) return devLimitError;
    }

    const db = await getDb();
    const user = await db.collection("users").findOne({ email });

    // Defend against user enumeration and timing attacks: compute dummy hash if user not found
    const DUMMY_HASH = "$2a$12$e8k899s6X50s706qE5qGFeYfQ5vV8d1a1b1c1d1e1f1g1h1i1j1k1";
    const passwordHash = user?.password || DUMMY_HASH;
    const isPasswordValid = await bcrypt.compare(password, passwordHash);

    if (!user || !isPasswordValid) {
      // Record failed attempt
      await writeAuditLog(db, {
        actorId: user?._id?.toString() || "anonymous",
        action: "auth.mobile.login_failed",
        targetType: "user",
        targetId: email,
        metadata: { ip, deviceId, platform },
      });

      // Detect login failure bursts (e.g. 5 failed logins within 5 minutes)
      const burstCheck = await rateLimit(`burst:login:fail:${ip}`, 5, 5 * 60 * 1000);
      if (!burstCheck.allowed) {
        await writeAuditLog(db, {
          actorId: "system",
          action: "auth.mobile.login_failure_burst",
          targetType: "network",
          targetId: ip,
          metadata: { ip, email, deviceId, platform, burstCount: 5 },
        });
        logger.warn("Login failure burst detected", { requestId, ip, email, platform, deviceId });
      }

      logger.warn("Mobile login failed: invalid credentials", { requestId, ip, email, platform });

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

    logger.info("Mobile login successful", {
      requestId,
      userId: user._id.toString(),
      role: user.role,
      platform,
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
    logger.error("Mobile login unexpected error", { requestId, error });
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "An error occurred during authentication.",
      status: 500,
      requestId,
    });
  }
}
