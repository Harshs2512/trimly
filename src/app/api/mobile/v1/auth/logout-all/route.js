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
    const userId = session.user.id;

    // 1. Revoke all mobile sessions
    await db.collection("mobile_sessions").updateMany(
      { userId, isRevoked: false },
      { $set: { isRevoked: true, revokedAt: now, revocationReason: "logout_all_devices" } }
    );

    // 2. Remove all registered push devices for user
    await db.collection("devices").deleteMany({ userId });

    // 3. Increment sessionVersion in users collection (invalidates web cookies and outstanding mobile access tokens)
    if (ObjectId.isValid(userId)) {
      await db.collection("users").updateOne(
        { _id: new ObjectId(userId) },
        { $inc: { sessionVersion: 1 }, $set: { updatedAt: now } }
      );
    }

    await writeAuditLog(db, {
      actorId: userId,
      action: "auth.mobile.logout_all",
      targetType: "user",
      targetId: userId,
      metadata: { initiatedFromSession: session.sessionId },
    });

    return mobileSuccess(
      { message: "All sessions have been revoked. Please sign in again on all devices." },
      { requestId }
    );
  } catch (error) {
    console.error("[mobile-logout-all]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "An error occurred during global logout.",
      status: 500,
      requestId,
    });
  }
}
