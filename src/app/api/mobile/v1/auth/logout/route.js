import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getMobileSession } from "@/lib/mobileAuth";
import { getRequestId, mobileError, mobileSuccess } from "@/lib/mobileResponse";
import { writeAuditLog } from "@/lib/audit";

export async function POST(request) {
  const requestId = getRequestId(request);
  try {
    const { session, error } = await getMobileSession(request);
    if (error) return error;

    const db = await getDb();
    const now = new Date();

    if (session.sessionId && ObjectId.isValid(session.sessionId)) {
      await db.collection("mobile_sessions").updateOne(
        { _id: new ObjectId(session.sessionId) },
        { $set: { isRevoked: true, revokedAt: now, revocationReason: "user_logout" } }
      );
    }

    // Unregister device push token if bound to this device
    if (session.deviceId) {
      await db.collection("devices").deleteOne({
        userId: session.user.id,
        deviceId: session.deviceId,
      });
    }

    await writeAuditLog(db, {
      actorId: session.user.id,
      action: "auth.mobile.logout",
      targetType: "mobile_session",
      targetId: session.sessionId,
      metadata: { deviceId: session.deviceId },
    });

    return mobileSuccess({ message: "Successfully logged out." }, { requestId });
  } catch (error) {
    console.error("[mobile-logout]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "An error occurred during logout.",
      status: 500,
      requestId,
    });
  }
}
