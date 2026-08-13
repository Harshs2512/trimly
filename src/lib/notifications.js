export async function createNotification(db, { userId, type, message, bookingId }) {
  try {
    if (!userId || !message) return;
    const notifications = db.collection("notifications");
    await notifications.insertOne({
      userId,
      type, // 'booking_created', 'booking_update', 'system'
      message,
      bookingId: bookingId || null,
      read: false,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error("Failed to create notification:", err);
  }
}
