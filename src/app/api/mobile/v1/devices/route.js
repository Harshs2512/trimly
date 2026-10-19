import { getDb } from "@/lib/mongodb";
import { getMobileSession } from "@/lib/mobileAuth";
import { mobileDeviceSchema } from "@/lib/validations";
import { enforceMobileRateLimit } from "@/lib/rateLimit";
import {
  enforceAppVersion,
  getRequestId,
  mobileError,
  mobileSuccess,
} from "@/lib/mobileResponse";

export async function POST(request) {
  const versionError = enforceAppVersion(request);
  if (versionError) return versionError;

  const requestId = getRequestId(request);
  try {
    const auth = await getMobileSession(request);
    if (!auth.session) {
      return mobileError({
        code: auth.error.code,
        message: auth.error.message,
        status: auth.error.status,
        requestId,
      });
    }

    const userId = auth.session.user.id;

    // Rate limit device registration per user (10 per 15 minutes)
    const rateLimitError = await enforceMobileRateLimit(
      `mobile:devices:register:${userId}`,
      10,
      15 * 60 * 1000,
      { requestId, message: "Too many device registrations. Please wait a few minutes." }
    );
    if (rateLimitError) return rateLimitError;

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

    const validation = mobileDeviceSchema.safeParse(body);
    if (!validation.success) {
      return mobileError({
        code: "VALIDATION_ERROR",
        message: "Validation failed.",
        details: validation.error.flatten(),
        status: 400,
        requestId,
      });
    }

    const { deviceId, pushToken, platform, appVersion, locale, enabled } = validation.data;
    const db = await getDb();
    const now = new Date();

    await db.collection("devices").updateOne(
      { userId, deviceId },
      {
        $set: {
          userId,
          deviceId,
          pushToken,
          platform,
          appVersion,
          locale,
          enabled,
          lastSeenAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );

    return mobileSuccess(
      {
        ok: true,
        deviceId,
        message: "Device registered for push notifications.",
      },
      { status: 201, requestId }
    );
  } catch (error) {
    console.error("[mobile-device-register]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "Failed to register device.",
      status: 500,
      requestId,
    });
  }
}
