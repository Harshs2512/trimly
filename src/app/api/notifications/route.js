import { getDb } from "@/lib/mongodb";
import { getActiveSession } from "@/lib/authz";
import { safeInternalError, rejectCrossSiteRequest } from "@/lib/api";

export async function GET() {
  try {
    const session = await getActiveSession();
    if (!session) return Response.json({ error: "Not authenticated" }, { status: 401 });

    const db = await getDb();
    const notifications = await db.collection("notifications")
      .find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .limit(30)
      .toArray();

    return Response.json(notifications);
  } catch (error) {
    return safeInternalError(error, "notifications-list");
  }
}

export async function PUT(request) {
  try {
    const originError = rejectCrossSiteRequest(request);
    if (originError) return originError;
    const session = await getActiveSession();
    if (!session) return Response.json({ error: "Not authenticated" }, { status: 401 });
    const db = await getDb();
    await db.collection("notifications").updateMany(
      { userId: session.user.id, read: false },
      { $set: { read: true, readAt: new Date() } }
    );
    return Response.json({ ok: true });
  } catch (error) {
    return safeInternalError(error, "notifications-read");
  }
}
