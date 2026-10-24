import { getDb } from "@/lib/mongodb";
import { getMobileSession } from "@/lib/mobileAuth";
import { getRequestId, mobileError, mobileSuccess } from "@/lib/mobileResponse";

export async function GET(request) {
  const requestId = getRequestId(request);
  try {
    const { session, error } = await getMobileSession(request);
    if (error) return error;

    const db = await getDb();
    const sessions = await db
      .collection("mobile_sessions")
      .find({ userId: session.user.id, isRevoked: false })
      .sort({ lastUsedAt: -1 })
      .limit(20)
      .toArray();

    const formatted = sessions.map((s) => ({
      id: s._id.toString(),
      deviceId: s.deviceId,
      platform: s.platform || "unknown",
      appVersion: s.appVersion || "1.0.0",
      createdAt: s.createdAt,
      lastUsedAt: s.lastUsedAt,
      lastActive: s.lastUsedAt,
      isCurrent: s._id.toString() === session.sessionId,
      current: s._id.toString() === session.sessionId,
      ip: s.ip,
    }));

    return mobileSuccess(formatted, { requestId });
  } catch (error) {
    console.error("[mobile-sessions-list]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "An error occurred retrieving active sessions.",
      status: 500,
      requestId,
    });
  }
}
