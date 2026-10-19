import { sendPushNotification } from "./push.js";

export async function createNotification(db, { userId, type, message, bookingId }) {
  try {
    if (!userId || !message) return;
    const notifications = db.collection("notifications");
    const result = await notifications.insertOne({
      userId,
      type, // 'booking_created', 'booking_update', 'system'
      message,
      bookingId: bookingId || null,
      read: false,
      createdAt: new Date(),
    });

    // Fan-out to mobile push notifications
    await sendPushNotification(db, {
      userId,
      type,
      title: "Trimly Appointment Update",
      bookingId,
    }).catch((err) => console.error("[push] Push notification error:", err));

    return result;
  } catch (err) {
    console.error("Failed to create notification:", err);
  }
}

