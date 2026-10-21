import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getMobileSession } from "@/lib/mobileAuth";
import {
  enforceAppVersion,
  getRequestId,
  mobileError,
  mobileSuccess,
  serializeNotification,
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

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10), 1), 50);

    const db = await getDb();
    const query = { userId: auth.session.user.id };

    if (cursor && ObjectId.isValid(cursor)) {
      query._id = { $lt: new ObjectId(cursor) };
    }

    const [notifications, unreadCount] = await Promise.all([
      db
        .collection("notifications")
        .find(query)
        .sort({ _id: -1 })
        .limit(limit + 1)
        .toArray(),
      db.collection("notifications").countDocuments({ userId: auth.session.user.id, read: false }),
    ]);

    const hasMore = notifications.length > limit;
    const items = (hasMore ? notifications.slice(0, limit) : notifications).map(serializeNotification);
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

    return mobileSuccess(
      {
        items,
        nextCursor,
        unreadCount,
        count: items.length,
      },
      { requestId }
    );
  } catch (error) {
    console.error("[mobile-notifications-list]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "Failed to fetch notifications.",
      status: 500,
      requestId,
    });
  }
}

export async function PATCH(request) {
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

    let body = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional; default to marking all as read
    }

    const db = await getDb();
    const { notificationId, all = true } = body;

    if (notificationId && ObjectId.isValid(notificationId)) {
      await db.collection("notifications").updateOne(
        { _id: new ObjectId(notificationId), userId: auth.session.user.id },
        { $set: { read: true, readAt: new Date() } }
      );
    } else if (all) {
      await db.collection("notifications").updateMany(
        { userId: auth.session.user.id, read: false },
        { $set: { read: true, readAt: new Date() } }
      );
    }

    const unreadCount = await db
      .collection("notifications")
      .countDocuments({ userId: auth.session.user.id, read: false });

    return mobileSuccess(
      {
        ok: true,
        unreadCount,
        message: "Notifications marked as read.",
      },
      { requestId }
    );
  } catch (error) {
    console.error("[mobile-notifications-patch]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "Failed to update notifications.",
      status: 500,
      requestId,
    });
  }
}
