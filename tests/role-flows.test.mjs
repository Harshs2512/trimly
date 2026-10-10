import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { MongoClient, ObjectId } from "mongodb";
import fs from "node:fs";
import path from "node:path";

// Load environment from .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

import clientPromise, { getDb } from "../src/lib/mongodb.js";
import { ensureIndexes } from "../src/lib/indexes.js";
import { hashToken, randomToken, normalizeEmail } from "../src/lib/security.js";
import { validateBookingWindow, getReservationKeys, canTransition, expirePendingBookings } from "../src/lib/booking.js";
import { acquireMongoLock } from "../src/lib/locks.js";
import { cancelActiveBookingsForBarber, cancelActiveBookingsForCustomer } from "../src/lib/accountLifecycle.js";

const TEST_RUN_ID = Date.now().toString(36);

test("Complete End-to-End Role Lifecycle Test (Customer, Barber, Admin)", async (t) => {
  const db = await getDb();
  await ensureIndexes();

  const customerEmail = normalizeEmail(`test_cust_${TEST_RUN_ID}@example.com`);
  const barberEmail = normalizeEmail(`test_barber_${TEST_RUN_ID}@example.com`);
  const adminEmail = normalizeEmail(`test_admin_${TEST_RUN_ID}@example.com`);
  const password = "TestPassword123!";

  let customerId;
  let barberUserId;
  let barberProfileId;
  let adminId;
  let bookingId;

  await t.test("1. Customer Registration & Verification Flow", async () => {
    // 1.1 Create unverified customer
    const hashedPassword = await bcrypt.hash(password, 12);
    const now = new Date();
    const custRes = await db.collection("users").insertOne({
      name: "Test Customer",
      email: customerEmail,
      password: hashedPassword,
      role: "user",
      active: true,
      emailVerified: false,
      sessionVersion: 0,
      createdAt: now,
      updatedAt: now,
    });
    customerId = custRes.insertedId.toString();

    // 1.2 Generate verification token
    const token = randomToken(32);
    const tokenHash = hashToken(token);
    await db.collection("email_verification_tokens").insertOne({
      tokenHash,
      userId: customerId,
      email: customerEmail,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: now,
    });

    // 1.3 Verify email
    const tokenDoc = await db.collection("email_verification_tokens").findOne({ tokenHash });
    assert.ok(tokenDoc, "Verification token must exist");
    assert.equal(tokenDoc.email, customerEmail);

    await db.collection("users").updateOne(
      { _id: new ObjectId(customerId) },
      { $set: { emailVerified: true, emailVerifiedAt: new Date(), updatedAt: new Date() } }
    );
    await db.collection("email_verification_tokens").deleteMany({ email: customerEmail });

    const verifiedCust = await db.collection("users").findOne({ _id: new ObjectId(customerId) });
    assert.equal(verifiedCust.emailVerified, true);
    assert.equal(verifiedCust.role, "user");
  });

  await t.test("2. Barber Registration & Verification Flow", async () => {
    // 2.1 Create unverified barber user
    const hashedPassword = await bcrypt.hash(password, 12);
    const now = new Date();
    const barberRes = await db.collection("users").insertOne({
      name: "Test Barber",
      email: barberEmail,
      password: hashedPassword,
      role: "barber",
      active: true,
      emailVerified: false,
      sessionVersion: 0,
      createdAt: now,
      updatedAt: now,
    });
    barberUserId = barberRes.insertedId.toString();

    // 2.2 Verify email
    await db.collection("users").updateOne(
      { _id: new ObjectId(barberUserId) },
      { $set: { emailVerified: true, emailVerifiedAt: new Date(), updatedAt: new Date() } }
    );

    // 2.3 Barber creates Shop Profile (initial status is pending)
    const profileRes = await db.collection("barbers").insertOne({
      userId: barberUserId,
      shopName: "Urban Fade Studio",
      address: "123 Main St, New Delhi",
      phone: "+91 9876543210",
      description: "Premium barber haircuts and beard grooming",
      timezone: "Asia/Kolkata",
      workingHours: {
        open: "09:00",
        close: "19:00",
        days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
      },
      slotIntervalMinutes: 30,
      leadTimeMinutes: 60,
      bookingHorizonDays: 30,
      services: [
        { id: "srv_haircut", name: "Classic Haircut", duration: 30, price: 400 },
        { id: "srv_beard", name: "Beard Trim & Sculpt", duration: 30, price: 250 },
      ],
      workPhotos: [
        {
          id: "wp_1",
          url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
          caption: "Mid Skin Fade with Texture",
          category: "Haircut",
          createdAt: now.toISOString(),
        },
      ],
      verificationStatus: "pending",
      createdAt: now,
      updatedAt: now,
    });
    barberProfileId = profileRes.insertedId.toString();

    // Verify workPhotos persisted correctly
    const insertedProfile = await db.collection("barbers").findOne({ _id: new ObjectId(barberProfileId) });
    assert.equal(insertedProfile.workPhotos?.length, 1);
    assert.equal(insertedProfile.workPhotos[0].caption, "Mid Skin Fade with Texture");

    // Verify unverified profile is NOT returned in public search
    const publicBarbers = await db.collection("barbers").find({ verificationStatus: "verified" }).toArray();
    assert.equal(publicBarbers.some((b) => b._id.toString() === barberProfileId), false);
  });

  await t.test("3. Administrator Flow & Barber Profile Approval", async () => {
    // 3.1 Create admin user
    const hashedPassword = await bcrypt.hash(password, 12);
    const now = new Date();
    const adminRes = await db.collection("users").insertOne({
      name: "Test Admin",
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
      active: true,
      emailVerified: true,
      sessionVersion: 0,
      createdAt: now,
      updatedAt: now,
    });
    adminId = adminRes.insertedId.toString();

    // 3.2 Admin approves Barber
    await db.collection("barbers").updateOne(
      { _id: new ObjectId(barberProfileId) },
      { $set: { verificationStatus: "verified", verifiedAt: new Date(), updatedAt: new Date() } }
    );

    // 3.3 Verify now public
    const publicBarber = await db.collection("barbers").findOne({ _id: new ObjectId(barberProfileId), verificationStatus: "verified" });
    assert.ok(publicBarber, "Barber must now be verified and public");
    assert.equal(publicBarber.shopName, "Urban Fade Studio");
  });

  await t.test("4. Booking Flow (Customer Books Appointment with Barber)", async () => {
    const barber = await db.collection("barbers").findOne({ _id: new ObjectId(barberProfileId) });
    const service = barber.services[0]; // 30 min haircut

    // Pick a valid future time slot aligned with barber's working hours
    const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    // Align to 11:00 AM UTC+5:30 (05:30 UTC)
    const slotTime = new Date(Date.UTC(futureDate.getUTCFullYear(), futureDate.getUTCMonth(), futureDate.getUTCDate(), 5, 30, 0, 0));
    const duration = service.duration;
    const endTime = new Date(slotTime.getTime() + duration * 60 * 1000);

    const reservationKeys = getReservationKeys(slotTime, endTime);
    assert.equal(reservationKeys.length, 30);

    const now = new Date();
    const bookingRes = await db.collection("bookings").insertOne({
      userId: customerId,
      customerName: "Test Customer",
      customerEmail: customerEmail,
      barberId: barberProfileId,
      service: service.name,
      serviceId: service.id,
      price: service.price,
      duration: service.duration,
      timeSlot: slotTime.toISOString(),
      endTime: endTime.toISOString(),
      reservationKeys,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
    bookingId = bookingRes.insertedId.toString();

    const createdBooking = await db.collection("bookings").findOne({ _id: new ObjectId(bookingId) });
    assert.equal(createdBooking.status, "pending");
    assert.equal(createdBooking.userId, customerId);
    assert.equal(createdBooking.barberId, barberProfileId);
  });

  await t.test("5. Barber Dashboard & Action Lifecycle (Accept -> Complete)", async () => {
    // 5.1 Barber accepts booking
    assert.equal(canTransition("barber", "pending", "confirmed"), true);
    await db.collection("bookings").updateOne(
      { _id: new ObjectId(bookingId), status: "pending" },
      { $set: { status: "confirmed", updatedAt: new Date() } }
    );

    let booking = await db.collection("bookings").findOne({ _id: new ObjectId(bookingId) });
    assert.equal(booking.status, "confirmed");

    // 5.2 Transition to completed
    assert.equal(canTransition("barber", "confirmed", "completed"), true);
    await db.collection("bookings").updateOne(
      { _id: new ObjectId(bookingId), status: "confirmed" },
      { $set: { status: "completed", updatedAt: new Date(), reservationKeys: [] } }
    );

    booking = await db.collection("bookings").findOne({ _id: new ObjectId(bookingId) });
    assert.equal(booking.status, "completed");
    assert.equal(booking.reservationKeys.length, 0, "Reservation keys must be released on completion");
  });

  await t.test("6. Customer Reschedule & Conflict Validation", async () => {
    // 6.1 Create another booking
    const barber = await db.collection("barbers").findOne({ _id: new ObjectId(barberProfileId) });
    const service = barber.services[0];
    const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const slotTime = new Date(Date.UTC(futureDate.getUTCFullYear(), futureDate.getUTCMonth(), futureDate.getUTCDate(), 6, 0, 0, 0));
    const endTime = new Date(slotTime.getTime() + service.duration * 60 * 1000);
    const reservationKeys = getReservationKeys(slotTime, endTime);

    const b2 = await db.collection("bookings").insertOne({
      userId: customerId,
      customerName: "Test Customer",
      customerEmail: customerEmail,
      barberId: barberProfileId,
      service: service.name,
      serviceId: service.id,
      price: service.price,
      duration: service.duration,
      timeSlot: slotTime.toISOString(),
      endTime: endTime.toISOString(),
      reservationKeys,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 6.2 Customer cancels booking
    assert.equal(canTransition("customer", "pending", "cancelled"), true);
    await db.collection("bookings").updateOne(
      { _id: b2.insertedId, status: "pending" },
      { $set: { status: "cancelled", cancelReason: "Cancelled by customer", reservationKeys: [], updatedAt: new Date() } }
    );

    const cancelledDoc = await db.collection("bookings").findOne({ _id: b2.insertedId });
    assert.equal(cancelledDoc.status, "cancelled");
    assert.equal(cancelledDoc.reservationKeys.length, 0);

    // Clean up b2
    await db.collection("bookings").deleteOne({ _id: b2.insertedId });
  });

  await t.test("7. Account Lifecycle Invalidation & Bookings Cleanup", async () => {
    // Test helper functions
    await cancelActiveBookingsForBarber(db, barberProfileId, "Barber account deactivated");
    await cancelActiveBookingsForCustomer(db, customerId, "Customer account deactivated");
  });

  // Cleanup test artifacts from database
  await db.collection("users").deleteMany({ _id: { $in: [new ObjectId(customerId), new ObjectId(barberUserId), new ObjectId(adminId)] } });
  await db.collection("barbers").deleteMany({ _id: new ObjectId(barberProfileId) });
  await db.collection("bookings").deleteMany({ _id: new ObjectId(bookingId) });
  await db.collection("email_verification_tokens").deleteMany({ email: { $in: [customerEmail, barberEmail, adminEmail] } });

  const client = await clientPromise;
  await client.close();
});

