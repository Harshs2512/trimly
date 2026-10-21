import { getDb } from "@/lib/mongodb";
import { getMobileSession } from "@/lib/mobileAuth";
import {
  enforceAppVersion,
  getRequestId,
  mobileError,
  mobileSuccess,
} from "@/lib/mobileResponse";

const DEFAULT_PREFERENCES = {
  enabled: true,
  bookingUpdates: true,
  reminders: true,
  marketing: false,
  quietHours: {
    enabled: false,
    start: "22:00",
    end: "08:00",
  },
};

export async function GET(request) {
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

    const db = await getDb();
    const prefs = await db
      .collection("notification_preferences")
      .findOne({ userId: auth.session.user.id });

    return mobileSuccess(
      {
        preferences: prefs ? { ...DEFAULT_PREFERENCES, ...prefs, _id: undefined, userId: undefined } : DEFAULT_PREFERENCES,
      },
      { requestId }
    );
  } catch (error) {
    console.error("[mobile-notification-preferences-get]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "Failed to retrieve notification preferences.",
      status: 500,
      requestId,
    });
  }
}

export async function PUT(request) {
  return handleUpdate(request);
}

export async function PATCH(request) {
  return handleUpdate(request);
}

async function handleUpdate(request) {
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

    const allowed = ["enabled", "bookingUpdates", "reminders", "marketing", "quietHours"];
    const updateDoc = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        updateDoc[key] = body[key];
      }
    }
    updateDoc.updatedAt = new Date();

    const db = await getDb();
    await db.collection("notification_preferences").updateOne(
      { userId: auth.session.user.id },
      {
        $set: updateDoc,
        $setOnInsert: {
          userId: auth.session.user.id,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    const saved = await db
      .collection("notification_preferences")
      .findOne({ userId: auth.session.user.id });

    return mobileSuccess(
      {
        preferences: { ...DEFAULT_PREFERENCES, ...saved, _id: undefined, userId: undefined },
        message: "Notification preferences updated.",
      },
      { requestId }
    );
  } catch (error) {
    console.error("[mobile-notification-preferences-update]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "Failed to update notification preferences.",
      status: 500,
      requestId,
    });
  }
}
