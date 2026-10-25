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

    // Fan-out to important email notifications (high-priority booking events only)
    if (bookingId && ["booking_created", "booking_update"].includes(type)) {
      (async () => {
        try {
          const { ObjectId } = await import("mongodb");
          const user = await db.collection("users").findOne(
            ObjectId.isValid(userId) ? { _id: new ObjectId(userId) } : { _id: userId }
          );
          if (!user || !user.email) return;

          const prefs = await db.collection("notification_preferences").findOne({ userId: String(userId) });
          if (prefs && (prefs.enabled === false || prefs.bookingUpdates === false)) {
            return; // User opted out of booking update notifications
          }

          const booking = await db.collection("bookings").findOne(
            ObjectId.isValid(bookingId) ? { _id: new ObjectId(bookingId) } : { _id: bookingId }
          );
          if (!booking) return;

          const { sendBookingNotificationEmail } = await import("./email.js");
          await sendBookingNotificationEmail({
            to: user.email,
            recipientName: user.name || "Customer",
            type,
            booking,
            customMessage: message,
          });
        } catch (emailErr) {
          console.error("[email] Failed to send booking notification email:", emailErr?.message || emailErr);
        }
      })().catch(() => {});
    }

    return result;
  } catch (err) {
    console.error("Failed to create notification:", err);
  }
}

