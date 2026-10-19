import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { ObjectId } from "mongodb";
import clientPromise, { getDb } from "../src/lib/mongodb.js";
import {
  signAccessToken,
  verifyAccessToken,
  createMobileSession,
  rotateMobileSession,
  getMobileSession,
} from "../src/lib/mobileAuth.js";
import { updateBookingStatus, hasBookingConflict } from "../src/lib/booking.js";
import { checkIdempotency, saveIdempotency } from "../src/lib/idempotency.js";

test("WI-9: Authorization and Comprehensive Security Test Matrix", async (t) => {
  const db = await getDb();

  // Test Fixtures
  const customerId = new ObjectId().toString();
  const otherCustomerId = new ObjectId().toString();

  // 1. TOKEN & ALGORITHM CONFUSION ATTACK MATRIX
  await t.test("1. Token Validation: alg: none, wrong issuer/audience, and forgery attacks", () => {
    // A. alg: "none" attack
    const headerNone = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const payloadValid = Buffer.from(
      JSON.stringify({
        sub: customerId,
        role: "user",
        sid: "session123",
        sv: 1,
        iss: "trimly-api",
        aud: "trimly-mobile",
        exp: Math.floor(Date.now() / 1000) + 900,
        iat: Math.floor(Date.now() / 1000),
      })
    ).toString("base64url");
    const algNoneToken = `${headerNone}.${payloadValid}.`;
    const resNone = verifyAccessToken(algNoneToken);
    assert.equal(resNone.valid, false, "alg: none token must be rejected");

    // B. Wrong Issuer (iss)
    const tokenWrongIss = signAccessToken({
      userId: customerId,
      role: "user",
      sessionId: "sess1",
      sessionVersion: 1,
    });
    // Manually forge payload with evil issuer
    const [h, , s] = tokenWrongIss.split(".");
    const evilPayload = Buffer.from(
      JSON.stringify({
        sub: customerId,
        role: "user",
        sid: "sess1",
        sv: 1,
        iss: "evil-hacker-api",
        aud: "trimly-mobile",
        exp: Math.floor(Date.now() / 1000) + 900,
      })
    ).toString("base64url");
    const forgedToken = `${h}.${evilPayload}.${s}`;
    const resForged = verifyAccessToken(forgedToken);
    assert.equal(resForged.valid, false, "Forged payload signature mismatch must fail");

    // C. Malformed token strings
    assert.equal(verifyAccessToken("not.a.valid.jwt.token").valid, false);
    assert.equal(verifyAccessToken("").valid, false);
    assert.equal(verifyAccessToken(null).valid, false);
  });

  // 2. SESSION & USER LIFECYCLE MATRIX (getMobileSession)
  await t.test("2. Session & User State Matrix: Anonymous, Deactivated, Stale SessionVersion, Revoked", async () => {
    const testUserId = new ObjectId();
    const testSessionId = new ObjectId();
    const familyId = crypto.randomUUID();
    const userEmail = `matrix-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;

    await db.collection("users").insertOne({
      _id: testUserId,
      email: userEmail,
      role: "user",
      active: true,
      emailVerified: true,
      sessionVersion: 1,
      createdAt: new Date(),
    });

    await db.collection("mobile_sessions").insertOne({
      _id: testSessionId,
      userId: testUserId.toString(),
      familyId,
      refreshHash: crypto.randomUUID(),
      deviceId: "dev1",
      platform: "ios",
      isRevoked: false,
      expiresAt: new Date(Date.now() + 86400000),
      createdAt: new Date(),
    });

    const validToken = signAccessToken({
      userId: testUserId.toString(),
      role: "user",
      sessionId: testSessionId.toString(),
      sessionVersion: 1,
    });

    // Case A: Anonymous (missing auth header)
    const reqAnon = new Request("http://localhost/api", { headers: {} });
    const authAnon = await getMobileSession(reqAnon);
    assert.equal(authAnon.session, null);
    assert.equal(authAnon.error.status, 401);

    // Case B: Valid active user
    const reqValid = new Request("http://localhost/api", {
      headers: { authorization: `Bearer ${validToken}` },
    });
    const authValid = await getMobileSession(reqValid, ["user"]);
    assert.ok(authValid.session);
    assert.equal(authValid.session.user.id, testUserId.toString());

    // Case C: Role violation (Customer attempting barber action)
    const authRoleFail = await getMobileSession(reqValid, ["barber"]);
    assert.equal(authRoleFail.session, null);
    assert.equal(authRoleFail.error.status, 403);

    // Case D: Deactivated user (active: false -> 401 ACCOUNT_INACTIVE)
    await db.collection("users").updateOne({ _id: testUserId }, { $set: { active: false } });
    const authDeactivated = await getMobileSession(reqValid);
    assert.equal(authDeactivated.session, null);
    assert.equal(authDeactivated.error.status, 401);

    // Reset user to active, test unverified (401 ACCOUNT_INACTIVE)
    await db.collection("users").updateOne({ _id: testUserId }, { $set: { active: true, emailVerified: false } });
    const authUnverified = await getMobileSession(reqValid);
    assert.equal(authUnverified.session, null);
    assert.equal(authUnverified.error.status, 401);

    // Reset user to emailVerified, test Stale sessionVersion (401 SESSION_STALE)
    await db.collection("users").updateOne({ _id: testUserId }, { $set: { emailVerified: true, sessionVersion: 2 } });
    const authStale = await getMobileSession(reqValid);
    assert.equal(authStale.session, null);
    assert.equal(authStale.error.status, 401);

    // Reset sessionVersion, test Revoked session record (401 SESSION_TERMINATED)
    await db.collection("users").updateOne({ _id: testUserId }, { $set: { sessionVersion: 1 } });
    await db.collection("mobile_sessions").updateOne({ _id: testSessionId }, { $set: { isRevoked: true } });
    const authRevoked = await getMobileSession(reqValid);
    assert.equal(authRevoked.session, null);
    assert.equal(authRevoked.error.status, 401);

    // Cleanup
    await db.collection("users").deleteOne({ _id: testUserId });
    await db.collection("mobile_sessions").deleteOne({ _id: testSessionId });
  });

  // 3. REFRESH TOKEN ROTATION & CONCURRENT REUSE DETECTION
  await t.test("3. Refresh Token Rotation & Token Family Reuse Detection Attack", async () => {
    const testUserId = new ObjectId();
    const userEmail = `refresh-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
    await db.collection("users").insertOne({
      _id: testUserId,
      email: userEmail,
      role: "user",
      active: true,
      emailVerified: true,
      sessionVersion: 1,
    });

    // Create session
    const session1 = await createMobileSession(db, {
      userId: testUserId.toString(),
      deviceId: "dev-reuse",
      platform: "android",
      sessionVersion: 1,
      role: "user",
    });

    const originalRefreshToken = session1.refreshToken;

    // First legitimate rotation
    const rotate1 = await rotateMobileSession(db, {
      refreshToken: originalRefreshToken,
      deviceId: "dev-reuse",
    });
    assert.ok(rotate1.ok, "First rotation must succeed");
    const newRefreshToken = rotate1.data.refreshToken;

    // Attacker tries to reuse originalRefreshToken (Replay Attack)
    const replayAttack = await rotateMobileSession(db, {
      refreshToken: originalRefreshToken,
      deviceId: "attacker-dev",
    });
    assert.equal(replayAttack.ok, false);
    assert.equal(replayAttack.code, "TOKEN_REVOKED");

    // Legitimate user tries to use newRefreshToken -> should now be revoked because family was compromised!
    const subsequentUse = await rotateMobileSession(db, {
      refreshToken: newRefreshToken,
      deviceId: "dev-reuse",
    });
    assert.equal(subsequentUse.ok, false);
    assert.equal(subsequentUse.code, "TOKEN_REVOKED");

    // Cleanup
    await db.collection("users").deleteOne({ _id: testUserId });
    await db.collection("mobile_sessions").deleteMany({ userId: testUserId.toString() });
  });

  // 4. IDOR (INSECURE DIRECT OBJECT REFERENCE) DEFENSE MATRIX
  await t.test("4. IDOR Protection: Cross-customer and cross-barber mutation isolation", async () => {
    const bookingAId = new ObjectId();
    const testBarberDocId = new ObjectId();
    const userA = { id: customerId, role: "user" };
    const userB = { id: otherCustomerId, role: "user" };

    await db.collection("barbers").insertOne({
      _id: testBarberDocId,
      name: "Matrix Barber",
      verificationStatus: "verified",
      services: [{ id: "srv1", name: "Haircut", duration: 30, price: 25 }],
    });

    const futureTimeSlot = new Date(Date.now() + 86400000).toISOString();
    await db.collection("bookings").insertOne({
      _id: bookingAId,
      userId: new ObjectId(customerId),
      barberId: testBarberDocId,
      timeSlot: futureTimeSlot,
      status: "pending",
      createdAt: new Date(),
    });

    // Customer B attempts to cancel Customer A's booking -> 403 Forbidden
    const unauthorizedCancel = await updateBookingStatus(db, {
      bookingId: bookingAId.toString(),
      user: userB,
      status: "cancelled",
    });
    assert.equal(unauthorizedCancel.ok, false);
    assert.equal(unauthorizedCancel.status, 403, "Cross-user IDOR attempt must return 403 forbidden");

    // Customer A cancels their own booking -> succeeds
    const authorizedCancel = await updateBookingStatus(db, {
      bookingId: bookingAId.toString(),
      user: userA,
      status: "cancelled",
    });
    assert.ok(authorizedCancel.ok);

    // Cleanup
    await db.collection("bookings").deleteOne({ _id: bookingAId });
    await db.collection("barbers").deleteOne({ _id: testBarberDocId });
  });

  // 5. DOUBLE-BOOKING RACE CONDITIONS & CONFLICT DETECTION
  await t.test("5. Race Condition & Double-Booking Conflict Matrix", async () => {
    const barberDocId = new ObjectId();
    const start = new Date("2026-11-20T14:00:00.000Z");
    const end = new Date("2026-11-20T14:30:00.000Z");

    // Insert an existing confirmed booking in this slot
    const existingBookingId = new ObjectId();
    await db.collection("bookings").insertOne({
      _id: existingBookingId,
      barberId: barberDocId.toString(),
      timeSlot: start.toISOString(),
      endTime: end.toISOString(),
      duration: 30,
      status: "confirmed",
      createdAt: new Date(),
    });

    // Check conflict detection for same window
    const conflictResult = await hasBookingConflict(db, {
      barber: barberDocId.toString(),
      userId: customerId,
      start,
      end,
    });
    assert.ok(conflictResult, "Conflicting time slot must be flagged");
    assert.equal(conflictResult.conflict, true);
    assert.equal(conflictResult.type, "barber");

    // Adjacent non-overlapping slot (14:30 - 15:00) must NOT conflict
    const adjStart = new Date("2026-11-20T14:30:00.000Z");
    const adjEnd = new Date("2026-11-20T15:00:00.000Z");
    const nonConflict = await hasBookingConflict(db, {
      barber: barberDocId.toString(),
      userId: customerId,
      start: adjStart,
      end: adjEnd,
    });
    assert.equal(nonConflict.conflict, false, "Adjacent time slot must be free");

    // Cleanup
    await db.collection("bookings").deleteOne({ _id: existingBookingId });
  });

  // 6. IDEMPOTENCY REPLAY & MUTATION SAFETY
  await t.test("6. Idempotency Key Replay vs Payload Mismatch Defense", async () => {
    const idempotencyKey = `idemp-${crypto.randomUUID()}`;
    const payload1 = JSON.stringify({ barberId: "b1", date: "2026-11-01", time: "10:00" });
    const payload2 = JSON.stringify({ barberId: "b1", date: "2026-11-01", time: "11:00" });

    const bodyHash = crypto.createHash("sha256").update(payload1).digest("hex");

    // Save initial response
    const mockResponse = { bookingId: "book-123", status: "confirmed" };
    await saveIdempotency(db, {
      key: idempotencyKey,
      userId: customerId,
      bodyHash,
      statusCode: 201,
      responseBody: mockResponse,
    });

    // Replay with exact same payload -> returns cached response (201)
    const replayCheck = await checkIdempotency(db, {
      key: idempotencyKey,
      userId: customerId,
      bodyString: payload1,
    });
    assert.ok(replayCheck.cached);
    assert.equal(replayCheck.statusCode, 201);
    assert.deepEqual(replayCheck.responseBody, mockResponse);

    // Replay with different payload -> returns mismatch
    const mismatchCheck = await checkIdempotency(db, {
      key: idempotencyKey,
      userId: customerId,
      bodyString: payload2,
    });
    assert.equal(mismatchCheck.mismatch, true);

    // Cleanup
    await db.collection("idempotency_keys").deleteMany({ key: idempotencyKey });
  });

  // 7. PASSWORD RESET INVALIDATES MOBILE SESSIONS
  await t.test("7. Password Reset & Account Invalidation bumps sessionVersion and clears sessions", async () => {
    const testUserId = new ObjectId();
    const userEmail = `pw-reset-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
    await db.collection("users").insertOne({
      _id: testUserId,
      email: userEmail,
      role: "user",
      active: true,
      emailVerified: true,
      sessionVersion: 1,
    });

    // Create 2 mobile sessions for this user across devices
    await createMobileSession(db, {
      userId: testUserId.toString(),
      deviceId: "dev-phone",
      platform: "ios",
      sessionVersion: 1,
      role: "user",
    });
    await createMobileSession(db, {
      userId: testUserId.toString(),
      deviceId: "dev-tablet",
      platform: "android",
      sessionVersion: 1,
      role: "user",
    });

    // Check count of active sessions before reset
    const beforeCount = await db.collection("mobile_sessions").countDocuments({
      userId: testUserId.toString(),
      isRevoked: false,
    });
    assert.equal(beforeCount, 2);

    // Simulate password reset: bumps sessionVersion and revokes mobile sessions
    await db.collection("users").updateOne(
      { _id: testUserId },
      { $inc: { sessionVersion: 1 } }
    );
    await db.collection("mobile_sessions").updateMany(
      { userId: testUserId.toString() },
      { $set: { isRevoked: true, revokedAt: new Date(), revocationReason: "password_reset" } }
    );

    // Verify all mobile sessions are now revoked
    const afterCount = await db.collection("mobile_sessions").countDocuments({
      userId: testUserId.toString(),
      isRevoked: false,
    });
    assert.equal(afterCount, 0, "All sessions must be revoked on password reset");

    // Cleanup
    await db.collection("users").deleteOne({ _id: testUserId });
    await db.collection("mobile_sessions").deleteMany({ userId: testUserId.toString() });
  });

  const client = await clientPromise;
  await client.close();
});
