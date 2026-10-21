import test from "node:test";
import assert from "node:assert/strict";
import { ObjectId } from "mongodb";
import { getDb } from "../src/lib/mongodb.js";
import {
  compareSemver,
  enforceAppVersion,
  serializeBarber,
  serializeBooking,
} from "../src/lib/mobileResponse.js";
import { checkIdempotency, saveIdempotency } from "../src/lib/idempotency.js";
import { getBarberAvailability, updateBookingStatus } from "../src/lib/booking.js";
import { createReview } from "../src/lib/reviews.js";

test("Mobile API Contract & Gateway Suite", async (t) => {
  const db = await getDb();

  await t.test("1. Versioning & Semver Enforcement", () => {
    assert.equal(compareSemver("1.0.0", "1.0.0"), 0);
    assert.equal(compareSemver("0.9.9", "1.0.0"), -1);
    assert.equal(compareSemver("1.2.0", "1.1.9"), 1);

    // Old client version rejected with 426
    const oldClientReq = new Request("http://localhost/api/mobile/v1/config", {
      headers: {
        "x-app-version": "0.8.0",
        "x-platform": "ios",
      },
    });
    const res = enforceAppVersion(oldClientReq);
    assert.ok(res, "Must return upgrade required error response");
    assert.equal(res.status, 426);

    // Current client version allowed
    const validClientReq = new Request("http://localhost/api/mobile/v1/config", {
      headers: {
        "x-app-version": "1.0.0",
        "x-platform": "ios",
      },
    });
    const resValid = enforceAppVersion(validClientReq);
    assert.equal(resValid, null);
  });

  await t.test("2. Minimal Response Serializers: No Secret or Sensitive Data Leaks", () => {
    const rawBarber = {
      _id: new ObjectId(),
      userId: "user-123",
      name: "John Barber",
      shopName: "John's Cuts",
      idType: "aadhaar",
      idNumber: "1234-5678-9012", // Sensitive
      idDocumentImage: "data:image/jpeg;base64,sensitiveData", // Sensitive
      internalSecretFlag: true, // Internal
      services: [{ id: "s1", name: "Haircut", price: 300, duration: 30 }],
      workingHours: { open: "09:00", close: "18:00" },
    };

    const serializedBarber = serializeBarber(rawBarber);
    assert.equal(serializedBarber.name, "John Barber");
    assert.equal(serializedBarber.idNumber, undefined, "Must not leak idNumber");
    assert.equal(serializedBarber.idDocumentImage, undefined, "Must not leak idDocumentImage");
    assert.equal(serializedBarber.internalSecretFlag, undefined, "Must not leak internal flags");

    const rawBooking = {
      _id: new ObjectId(),
      barberId: "barber-1",
      userId: "cust-1",
      service: "Haircut",
      price: 300,
      reservationKeys: ["12345", "12346"], // Internal lock keys
      status: "confirmed",
    };

    const serializedBooking = serializeBooking(rawBooking);
    assert.equal(serializedBooking.service, "Haircut");
    assert.equal(serializedBooking.reservationKeys, undefined, "Must not leak reservationKeys");
  });

  await t.test("3. Idempotency Key Handling & Replay Detection", async () => {
    const testKey = `idemp-${Date.now()}`;
    const userId = "user-idemp-test";
    const body1 = JSON.stringify({ barberId: "b1", service: "Cut", timeSlot: "2026-10-25T10:00:00Z" });
    const body2 = JSON.stringify({ barberId: "b1", service: "Beard", timeSlot: "2026-10-25T10:00:00Z" });

    // Step 1: Check new key
    const check1 = await checkIdempotency(db, { key: testKey, userId, bodyString: body1 });
    assert.equal(check1.cached, false);

    // Step 2: Save response
    await saveIdempotency(db, {
      key: testKey,
      userId,
      bodyHash: check1.bodyHash,
      statusCode: 201,
      responseBody: { data: { id: "booking-123" } },
    });

    // Step 3: Replay with identical body -> Cached replay
    const check2 = await checkIdempotency(db, { key: testKey, userId, bodyString: body1 });
    assert.equal(check2.cached, true);
    assert.equal(check2.statusCode, 201);
    assert.equal(check2.responseBody.data.id, "booking-123");

    // Step 4: Replay with different body -> Mismatch error (422)
    const check3 = await checkIdempotency(db, { key: testKey, userId, bodyString: body2 });
    assert.equal(check3.mismatch, true);
    assert.equal(check3.error.code, "IDEMPOTENCY_MISMATCH");

    await db.collection("idempotency_keys").deleteMany({ key: testKey });
  });

  await t.test("4. Availability Calculation & Slot Generation", async () => {
    const barberId = new ObjectId();
    const testBarber = {
      _id: barberId,
      name: "Available Barber",
      workingHours: { open: "10:00", close: "12:00" }, // 2 hours = 4 slots of 30 min
      slotIntervalMinutes: 30,
      closedDays: ["sunday"],
      timezone: "Asia/Kolkata",
      services: [{ id: "srv-1", name: "Haircut", price: 250, duration: 30 }],
      leadTimeMinutes: 0,
      bookingHorizonDays: 90,
      verificationStatus: "verified",
    };

    // Date: Monday 2026-11-02
    const date = "2026-11-02";
    const res = await getBarberAvailability(db, {
      barber: testBarber,
      date,
      serviceId: "srv-1",
    });

    assert.equal(res.ok, true);
    assert.equal(res.data.isClosedDay, false);
    assert.ok(res.data.slots.length > 0);
  });

  await t.test("5. Status Transition Domain Invariants", async () => {
    const barberUserId = `barber-u-${Date.now()}`;
    const custUserId = `cust-u-${Date.now()}`;
    const barberDoc = {
      name: "Barber Transitions",
      userId: barberUserId,
      verificationStatus: "verified",
      services: [{ id: "s1", name: "Fade", duration: 30, price: 400 }],
      workingHours: { open: "09:00", close: "18:00" },
      createdAt: new Date(),
    };
    const bRes = await db.collection("barbers").insertOne(barberDoc);
    const barberId = bRes.insertedId.toString();

    // Future booking
    const futureTime = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const bookingDoc = {
      barberId,
      userId: custUserId,
      service: "Fade",
      price: 400,
      duration: 30,
      timeSlot: futureTime,
      status: "pending",
      createdAt: new Date(),
    };
    const bkRes = await db.collection("bookings").insertOne(bookingDoc);
    const bookingId = bkRes.insertedId.toString();

    // Customer cancels pending booking -> allowed
    const cancelRes = await updateBookingStatus(db, {
      bookingId,
      user: { id: custUserId, role: "user" },
      status: "cancelled",
    });
    assert.equal(cancelRes.ok, true);
    assert.equal(cancelRes.status, "cancelled");

    // Barber attempts invalid transition from cancelled -> completed (must fail 409)
    const invalidRes = await updateBookingStatus(db, {
      bookingId,
      user: { id: barberUserId, role: "barber" },
      status: "completed",
    });
    assert.equal(invalidRes.ok, false);
    assert.equal(invalidRes.status, 409);
    assert.equal(invalidRes.code, "INVALID_TRANSITION");

    // Cleanup
    await db.collection("barbers").deleteOne({ _id: bRes.insertedId });
    await db.collection("bookings").deleteOne({ _id: bkRes.insertedId });
  });

  const { default: clientPromise } = await import("../src/lib/mongodb.js");
  const client = await clientPromise;
  await client.close();
});
