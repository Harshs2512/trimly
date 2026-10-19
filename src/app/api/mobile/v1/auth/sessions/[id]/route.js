import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getMobileSession } from "@/lib/mobileAuth";
import { getRequestId, mobileError, mobileSuccess } from "@/lib/mobileResponse";
import { writeAuditLog } from "@/lib/audit";

export async function DELETE(request, { params }) {
  const requestId = getRequestId(request);
  try {
    const { session, error } = await getMobileSession(request);
    if (error) return error;

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return mobileError({
        code: "INVALID_ID",
        message: "Invalid session ID.",
        status: 400,
        requestId,
      });
    }

    const db = await getDb();
    const targetSession = await db.collection("mobile_sessions").findOne({
      _id: new ObjectId(id),
      userId: session.user.id,
    });

    if (!targetSession || targetSession.isRevoked) {
      return mobileError({
        code: "SESSION_NOT_FOUND",
        message: "Session not found or already revoked.",
        status: 404,
        requestId,
      });
    }

    await db.collection("mobile_sessions").updateOne(
      { _id: new ObjectId(id) },
      { $set: { isRevoked: true, revokedAt: new Date(), revocationReason: "manual_user_revocation" } }
    );

    await writeAuditLog(db, {
      actorId: session.user.id,
      action: "auth.mobile.session_revoked",
      targetType: "mobile_session",
      targetId: id,
      metadata: { deviceId: targetSession.deviceId },
    });

    return mobileSuccess({ message: "Session successfully revoked." }, { requestId });
  } catch (error) {
    console.error("[mobile-session-delete]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "An error occurred revoking the session.",
      status: 500,
      requestId,
    });
  }
}
