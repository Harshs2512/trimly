import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();
    const notifications = db.collection("notifications");

    const userNotifications = await notifications
      .find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    return new Response(JSON.stringify(userNotifications), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();
    const notifications = db.collection("notifications");

    await notifications.updateMany(
      { userId: session.user.id, read: false },
      { $set: { read: true } }
    );

    return new Response(JSON.stringify({ ok: true, message: "Notifications marked as read" }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
