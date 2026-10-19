import { getDb } from "@/lib/mongodb";
import { mobileSocialLoginSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rateLimit";
import { ensureIndexes } from "@/lib/indexes";
import { createMobileSession } from "@/lib/mobileAuth";
import { verifyAppleIdToken, processSocialLogin } from "@/lib/socialAuth";
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

    const validation = mobileSocialLoginSchema.safeParse({ ...body, provider: "apple" });
    if (!validation.success) {
      return mobileError({
        code: "VALIDATION_ERROR",
        message: "Validation failed.",
        details: validation.error.flatten(),
        status: 400,
        requestId,
      });
    }

    const { idToken, rawNonce, fullName, deviceId, platform, appVersion } = validation.data;

    // Rate limiting
    const ipLimiter = await rateLimit(`mobile:auth:apple:${ip}`, 30, 15 * 60 * 1000);
    if (!ipLimiter.allowed) {
      return mobileError({
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many sign-in attempts. Please try again later.",
        status: 429,
        requestId,
      });
    }

    // Verify Apple ID token
    const verification = await verifyAppleIdToken(idToken, { rawNonce });
    if (!verification.valid) {
      return mobileError({
        code: "INVALID_CREDENTIALS",
        message: verification.error || "Invalid Apple identity token.",
        status: 401,
        requestId,
      });
    }

    const verifiedUser = {
      ...verification.user,
      name: fullName || "Apple User",
    };

    const db = await getDb();
    const result = await processSocialLogin(db, {
      provider: "apple",
      verifiedUser,
      deviceId,
      platform,
      appVersion,
      ip,
      userAgent: request.headers.get("user-agent") || "",
      createMobileSession,
    });

    if (result.error) {
      return mobileError({
        code: result.error.code,
        message: result.error.message,
        status: result.error.status,
        requestId,
      });
    }

    const { user, sessionResult } = result;

    await writeAuditLog(db, {
      actorId: user._id.toString(),
      action: "auth.mobile.apple_login",
      targetType: "user",
      targetId: user._id.toString(),
      metadata: { ip, deviceId, platform, sub: verification.user.sub },
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
    console.error("[mobile-apple-auth]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "An error occurred during Apple authentication.",
      status: 500,
      requestId,
    });
  }
}
