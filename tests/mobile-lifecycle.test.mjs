import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getDb } from "../src/lib/mongodb.js";
import { deleteUserAccount } from "../src/lib/accountLifecycle.js";
import nextConfig from "../next.config.mjs";

test("Account Lifecycle, Privacy & Security Headers Suite", async (t) => {
  const db = await getDb();

  await t.test("1. Deleting Customer Account Erases PII and Cancels Active Bookings", async () => {
    const passwordHash = await bcrypt.hash("Password123!", 10);
    const userRes = await db.collection("users").insertOne({
      name: "Privacy User",
      email: `privacy-${Date.now()}@example.com`,
      password: passwordHash,
      role: "user",
      active: true,
      sessionVersion: 1,
      createdAt: new Date(),
    });
    const userId = userRes.insertedId.toString();

    // Create an active booking
    const bookingRes = await db.collection("bookings").insertOne({
      userId,
      barberId: "barber-test-1",
      service: "Haircut",
      status: "confirmed",
      timeSlot: new Date(Date.now() + 86400000).toISOString(),
      createdAt: new Date(),
    });

    // Register a mobile session and device
    await db.collection("mobile_sessions").insertOne({ userId, tokenFamily: "fam-1" });
    await db.collection("devices").insertOne({ userId, deviceId: "dev-del-1" });

    // Attempt delete with wrong password -> fails
    const badPwRes = await deleteUserAccount(db, { userId, confirmPassword: "WrongPassword" });
    assert.equal(badPwRes.ok, false);
    assert.equal(badPwRes.status, 401);

    // Delete with correct password -> succeeds
    const deleteRes = await deleteUserAccount(db, { userId, confirmPassword: "Password123!" });
    assert.equal(deleteRes.ok, true);

    // Verify user document anonymized
    const anonymized = await db.collection("users").findOne({ _id: userRes.insertedId });
    assert.equal(anonymized.active, false);
    assert.equal(anonymized.name, "Deleted User");
    assert.ok(anonymized.email.startsWith("deleted_"));
    assert.equal(anonymized.password, undefined);

    // Verify booking cancelled
    const booking = await db.collection("bookings").findOne({ _id: bookingRes.insertedId });
    assert.equal(booking.status, "cancelled");

    // Verify sessions and devices purged
    const sessions = await db.collection("mobile_sessions").find({ userId }).toArray();
    assert.equal(sessions.length, 0);
    const devices = await db.collection("devices").find({ userId }).toArray();
    assert.equal(devices.length, 0);

    // Cleanup
    await db.collection("users").deleteOne({ _id: userRes.insertedId });
    await db.collection("bookings").deleteOne({ _id: bookingRes.insertedId });
  });

  await t.test("2. Last Admin Deletion Protection", async () => {
    // Ensure an active admin fixture exists
    let adminUser = await db.collection("users").findOne({ role: "admin", active: { $ne: false } });
    let createdFixture = false;
    if (!adminUser) {
      const res = await db.collection("users").insertOne({
        name: "Test Admin",
        email: `test-admin-${Date.now()}@trimly.local`,
        role: "admin",
        active: true,
        createdAt: new Date(),
      });
      adminUser = { _id: res.insertedId };
      createdFixture = true;
    }
    const delAdminRes = await deleteUserAccount(db, { userId: adminUser._id.toString() });
    assert.equal(delAdminRes.ok, false);
    assert.equal(delAdminRes.code, "LAST_ADMIN");
    if (createdFixture) {
      await db.collection("users").deleteOne({ _id: adminUser._id });
    }
  });

  await t.test("3. Security Headers in next.config.mjs", async () => {
    const headersList = await nextConfig.headers();
    const globalEntry = headersList.find((h) => h.source === "/(.*)");
    assert.ok(globalEntry);

    const headerKeys = globalEntry.headers.map((h) => h.key);
    assert.ok(headerKeys.includes("X-Content-Type-Options"));
    assert.ok(headerKeys.includes("X-Frame-Options"));
    assert.ok(headerKeys.includes("Referrer-Policy"));
    assert.ok(headerKeys.includes("Permissions-Policy"));
    assert.ok(headerKeys.includes("Content-Security-Policy"));

    const authEntry = headersList.find((h) => h.source === "/api/mobile/v1/auth/(.*)");
    assert.ok(authEntry);
    const authHeaders = authEntry.headers.map((h) => h.key);
    assert.ok(authHeaders.includes("Cache-Control"));
  });

  const { default: clientPromise } = await import("../src/lib/mongodb.js");
  const client = await clientPromise;
  await client.close();
});
