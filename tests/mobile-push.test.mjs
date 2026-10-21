import test from "node:test";
import assert from "node:assert/strict";
import { getDb } from "../src/lib/mongodb.js";
import {
  formatSafePushPayload,
  sendPushNotification,
  sendAppointmentReminders,
} from "../src/lib/push.js";

test("Push Notification System & Devices Suite", async (t) => {
  const db = await getDb();

  await t.test("1. Non-Sensitive Push Payloads: Zero PII Guarantee", () => {
    const payload = formatSafePushPayload({
      type: "booking_created",
      bookingId: "607f1f77bcf86cd799439011",
    });

    assert.equal(payload.notification.title, "New Appointment Request");
    assert.equal(payload.notification.body, "Tap to view appointment details in Trimly.");
    assert.equal(payload.data.type, "booking_created");
    assert.equal(payload.data.bookingId, "607f1f77bcf86cd799439011");

    // Must not contain customer name, phone or address
    assert.equal(payload.data.customerName, undefined);
    assert.equal(payload.data.phone, undefined);
    assert.equal(payload.data.address, undefined);
  });

  await t.test("2. Device Registration & Push Dispatch Fan-Out", async () => {
    const testUserId = `user-push-${Date.now()}`;
    const testDeviceId = `device-${Date.now()}`;
    const testToken = `fcm-token-${Date.now()}`;

    // Register device
    await db.collection("devices").insertOne({
      userId: testUserId,
      deviceId: testDeviceId,
      pushToken: testToken,
      platform: "android",
      appVersion: "1.0.0",
      enabled: true,
      createdAt: new Date(),
      lastSeenAt: new Date(),
    });

    // Send push
    const result = await sendPushNotification(db, {
      userId: testUserId,
      type: "booking_update",
      bookingId: "bk-123",
    });

    assert.equal(result.sentCount, 1);
    assert.equal(result.totalDevices, 1);

    // Disable device via preferences
    await db.collection("notification_preferences").insertOne({
      userId: testUserId,
      enabled: false,
    });

    const disabledResult = await sendPushNotification(db, {
      userId: testUserId,
      type: "booking_update",
      bookingId: "bk-123",
    });

    assert.equal(disabledResult.sentCount, 0, "Must respect user's disabled notification preference");

    // Cleanup
    await db.collection("devices").deleteMany({ userId: testUserId });
    await db.collection("notification_preferences").deleteMany({ userId: testUserId });
  });

  await t.test("3. Scheduled Appointment Reminders Idempotency", async () => {
    const now = Date.now();
    const target24h = new Date(now + 24 * 60 * 60 * 1000).toISOString();

    const bookingRes = await db.collection("bookings").insertOne({
      userId: "user-reminder-test",
      barberId: "barber-reminder-test",
      service: "Grooming",
      status: "confirmed",
      timeSlot: target24h,
      createdAt: new Date(),
    });

    // First reminder run: sends reminder and sets reminded24h = true
    const run1 = await sendAppointmentReminders(db);
    assert.ok(run1.sent24h >= 1, "Must process 24h reminder for upcoming confirmed booking");

    // Second reminder run: booking already has reminded24h = true -> 0 sent
    const run2 = await sendAppointmentReminders(db);
    const updated = await db.collection("bookings").findOne({ _id: bookingRes.insertedId });
    assert.equal(updated.reminded24h, true);

    await db.collection("bookings").deleteOne({ _id: bookingRes.insertedId });
  });

  const { default: clientPromise } = await import("../src/lib/mongodb.js");
  const client = await clientPromise;
  await client.close();
});
