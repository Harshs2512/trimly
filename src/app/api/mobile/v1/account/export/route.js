import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getMobileSession } from "@/lib/mobileAuth";
import {
  enforceAppVersion,
  getRequestId,
  mobileError,
  mobileSuccess,
  serializeBooking,
  serializeReview,
  serializeUserProfile,
} from "@/lib/mobileResponse";

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

    const userId = auth.session.user.id;
    const db = await getDb();

    const query = ObjectId.isValid(userId) ? { _id: new ObjectId(userId) } : { _id: userId };
    const [user, bookings, reviews, consents, devices] = await Promise.all([
      db.collection("users").findOne(query),
      db.collection("bookings").find({ userId }).sort({ createdAt: -1 }).toArray(),
      db.collection("reviews").find({ userId }).sort({ createdAt: -1 }).toArray(),
      db.collection("consents").find({ userId }).sort({ createdAt: -1 }).toArray(),
      db.collection("devices").find({ userId }, { projection: { pushToken: 0 } }).toArray(),
    ]);

    if (!user) {
      return mobileError({
        code: "USER_NOT_FOUND",
        message: "User account not found.",
        status: 404,
        requestId,
      });
    }

    const exportPayload = {
      profile: serializeUserProfile(user),
      bookings: bookings.map(serializeBooking),
      reviews: reviews.map(serializeReview),
      consents: consents.map((c) => ({
        policyVersion: c.policyVersion,
        purposes: c.purposes,
        timestamp: c.createdAt,
      })),
      devices: devices.map((d) => ({
        deviceId: d.deviceId,
        platform: d.platform,
        appVersion: d.appVersion,
        lastSeenAt: d.lastSeenAt,
      })),
      exportedAt: new Date().toISOString(),
    };

    return mobileSuccess(exportPayload, {
      requestId,
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[mobile-account-export]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "Failed to generate data export.",
      status: 500,
      requestId,
    });
  }
}
