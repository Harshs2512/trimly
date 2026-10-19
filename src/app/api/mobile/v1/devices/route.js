import { getDb } from "@/lib/mongodb";
import { getMobileSession } from "@/lib/mobileAuth";
import { mobileDeviceSchema } from "@/lib/validations";
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
    const userId = auth.session.user.id;
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
