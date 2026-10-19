/**
 * Push notification service provider for native iOS & Android clients.
 * Formats non-sensitive push payloads and delivers via FCM/APNs.
 */

const GENERIC_TITLES = {
  booking_created: "New Appointment Request",
  booking_update: "Appointment Status Updated",
  review_received: "New Review Received",
  reminder_24h: "Upcoming Appointment Tomorrow",
  reminder_1h: "Appointment in 1 Hour",
  system: "Trimly Notification",
};

/**
 * Strips sensitive PII and constructs a safe push payload.
 */
export function formatSafePushPayload({ type, title = null, bookingId = null }) {
  const safeTitle = title || GENERIC_TITLES[type] || "Trimly Notification";
  return {
    notification: {
      title: safeTitle,
      body: "Tap to view appointment details in Trimly.",
    },
    data: {
      type: type || "system",
      bookingId: bookingId ? String(bookingId) : "",
    },
  };
}

/**
 * Sends push notification to all active devices registered by the user.
 */
export async function sendPushNotification(db, { userId, type, title = null, bookingId = null }) {
  if (!userId) return { sentCount: 0 };

  // 1. Check user notification preferences
  const prefs = await db.collection("notification_preferences").findOne({ userId });
  if (prefs) {
    if (prefs.enabled === false) return { sentCount: 0 };
    if (type?.startsWith("reminder_") && prefs.reminders === false) return { sentCount: 0 };
    if (type?.startsWith("booking_") && prefs.bookingUpdates === false) return { sentCount: 0 };
  }

  // 2. Fetch registered and active push tokens
  const devices = await db.collection("devices").find({ userId, enabled: true }).toArray();
  if (!devices || devices.length === 0) {
    return { sentCount: 0 };
  }

  const payload = formatSafePushPayload({ type, title, bookingId });
  let sentCount = 0;

  for (const device of devices) {
    try {
      // FCM dispatch (or mock dispatch in development/test)
      const res = await dispatchToProvider(device.pushToken, payload, device.platform);
      if (res.success) {
        sentCount++;
      } else if (res.unregistered) {
        // Token was invalidated or app was uninstalled -> disable token
        await db.collection("devices").updateOne(
          { _id: device._id },
          { $set: { enabled: false, disabledAt: new Date(), disableReason: "unregistered" } }
        );
      }
    } catch (err) {
      console.warn(`[push] Error sending notification to device ${device.deviceId}:`, err.message);
    }
  }

  return { sentCount, totalDevices: devices.length };
}

/**
 * Provider delivery adapter (FCM / APNs).
 */
async function dispatchToProvider(pushToken, payload, platform) {
  // If FIREBASE_SERVER_KEY or GOOGLE_APPLICATION_CREDENTIALS is set, send via FCM API.
  if (process.env.FCM_SERVER_KEY) {
    try {
      const response = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `key=${process.env.FCM_SERVER_KEY}`,
        },
        body: JSON.stringify({
          to: pushToken,
          notification: payload.notification,
          data: payload.data,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData?.results?.[0]?.error === "NotRegistered" || errorData?.results?.[0]?.error === "InvalidRegistration") {
          return { success: false, unregistered: true };
        }
        return { success: false };
      }
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  // Development / test mock delivery
  return { success: true };
}

/**
 * Scheduled Appointment Reminders (24h and 1h before appointment).
 * Idempotent per booking.
 */
export async function sendAppointmentReminders(db) {
  const now = Date.now();
  const in24hMin = new Date(now + 23.5 * 60 * 60 * 1000).toISOString();
  const in24hMax = new Date(now + 24.5 * 60 * 60 * 1000).toISOString();

  const in1hMin = new Date(now + 50 * 60 * 1000).toISOString();
  const in1hMax = new Date(now + 70 * 60 * 1000).toISOString();

  let sent24h = 0;
  let sent1h = 0;

  // 1. Process 24-hour reminders
  const bookings24h = await db
    .collection("bookings")
    .find({
      status: "confirmed",
      timeSlot: { $gte: in24hMin, $lte: in24hMax },
      reminded24h: { $ne: true },
    })
    .toArray();

  for (const b of bookings24h) {
    await sendPushNotification(db, {
      userId: b.userId,
      type: "reminder_24h",
      bookingId: b._id.toString(),
    });
    await db.collection("bookings").updateOne({ _id: b._id }, { $set: { reminded24h: true } });
    sent24h++;
  }

  // 2. Process 1-hour reminders
  const bookings1h = await db
    .collection("bookings")
    .find({
      status: "confirmed",
      timeSlot: { $gte: in1hMin, $lte: in1hMax },
      reminded1h: { $ne: true },
    })
    .toArray();

  for (const b of bookings1h) {
    await sendPushNotification(db, {
      userId: b.userId,
      type: "reminder_1h",
      bookingId: b._id.toString(),
    });
    await db.collection("bookings").updateOne({ _id: b._id }, { $set: { reminded1h: true } });
    sent1h++;
  }

  return { sent24h, sent1h };
}
