import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getDb } from "../src/lib/mongodb.js";
import {
  signAccessToken,
  verifyAccessToken,
  createMobileSession,
  rotateMobileSession,
  getMobileSession,
} from "../src/lib/mobileAuth.js";
import { ensureIndexes } from "../src/lib/indexes.js";

test("mobile JWT sign and verify handles valid, expired and tampered tokens", () => {
  const token = signAccessToken({
    userId: "507f1f77bcf86cd799439011",
    role: "user",
    sessionId: "607f1f77bcf86cd799439022",
    sessionVersion: 1,
  });

  assert.ok(token, "token must be generated");
  const verified = verifyAccessToken(token);
  assert.equal(verified.valid, true);
  assert.equal(verified.payload.sub, "507f1f77bcf86cd799439011");
  assert.equal(verified.payload.role, "user");
  assert.equal(verified.payload.sid, "607f1f77bcf86cd799439022");
  assert.equal(verified.payload.sv, 1);
  assert.equal(verified.payload.iss, "trimly-api");
  assert.equal(verified.payload.aud, "trimly-mobile");

  // Tampered payload
  const parts = token.split(".");
  const tampered = `${parts[0]}.${parts[1]}xyz.${parts[2]}`;
  const tamperedResult = verifyAccessToken(tampered);
  assert.equal(tamperedResult.valid, false);

  // alg: none attack rejection
  const noneHeader = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const noneToken = `${noneHeader}.${parts[1]}.`;
  const noneResult = verifyAccessToken(noneToken);
  assert.equal(noneResult.valid, false);
  assert.match(noneResult.error, /algorithm/i);
});

test("mobile session creation and refresh token rotation with reuse detection", async () => {
  await ensureIndexes();
  const db = await getDb();
  const testEmail = `mob-test-${Date.now()}@example.com`;
  const hashedPassword = await bcrypt.hash("Password123!", 10);

  // Insert test user
  const userResult = await db.collection("users").insertOne({
    name: "Mobile Test User",
    email: testEmail,
    password: hashedPassword,
    role: "user",
    active: true,
    emailVerified: true,
    sessionVersion: 0,
    createdAt: new Date(),
  });
  const userId = userResult.insertedId.toString();

  try {
    // 1. Create mobile session
    const session = await createMobileSession(db, {
      userId,
      deviceId: "device-uuid-1234",
      platform: "ios",
      appVersion: "1.0.0",
      ip: "127.0.0.1",
      sessionVersion: 0,
      role: "user",
    });

    assert.ok(session.accessToken, "access token generated");
    assert.ok(session.refreshToken, "refresh token generated");
    const initialRefresh = session.refreshToken;

    // Verify session was created in DB
    const dbSession = await db.collection("mobile_sessions").findOne({ _id: new ObjectId(session.sessionId) });
    assert.ok(dbSession);
    assert.equal(dbSession.isRevoked, false);
    assert.equal(dbSession.familyId, session.familyId);

    // 2. Rotate session with valid refresh token (Generation 1 -> Generation 2)
    const rotate1 = await rotateMobileSession(db, {
      refreshToken: initialRefresh,
      deviceId: "device-uuid-1234",
      ip: "127.0.0.1",
    });

    assert.equal(rotate1.ok, true);
    assert.ok(rotate1.data.accessToken);
    assert.ok(rotate1.data.refreshToken);
    assert.notEqual(rotate1.data.refreshToken, initialRefresh, "refresh token must be rotated");

    const secondRefresh = rotate1.data.refreshToken;

    // 3. TOKEN REUSE DETECTION ATTACK: Present the old Generation 1 token again!
    const reuseAttempt = await rotateMobileSession(db, {
      refreshToken: initialRefresh,
      deviceId: "device-uuid-1234",
      ip: "127.0.0.1",
    });

    assert.equal(reuseAttempt.ok, false);
    assert.equal(reuseAttempt.code, "TOKEN_REVOKED");
    assert.match(reuseAttempt.error, /compromised/i);

    // Verify the entire family is now revoked
    const revokedSession = await db.collection("mobile_sessions").findOne({ _id: new ObjectId(session.sessionId) });
    assert.equal(revokedSession.isRevoked, true);
    assert.equal(revokedSession.revocationReason, "reuse_detected");

    // 4. Attempting to use Generation 2 token now also fails because the family was compromised
    const rotateAfterRevoke = await rotateMobileSession(db, {
      refreshToken: secondRefresh,
      deviceId: "device-uuid-1234",
      ip: "127.0.0.1",
    });

    assert.equal(rotateAfterRevoke.ok, false);
    assert.equal(rotateAfterRevoke.code, "TOKEN_REVOKED");

  } finally {
    await db.collection("users").deleteOne({ _id: userResult.insertedId });
    await db.collection("mobile_sessions").deleteMany({ userId });
  }
});

test("getMobileSession validates Bearer token, sessionVersion, and role authorization", async () => {
  const db = await getDb();
  const testEmail = `mob-auth-${Date.now()}@example.com`;

  const userResult = await db.collection("users").insertOne({
    name: "Auth Test User",
    email: testEmail,
    role: "user",
    active: true,
    emailVerified: true,
    sessionVersion: 2,
    createdAt: new Date(),
  });
  const userId = userResult.insertedId.toString();

  try {
    const session = await createMobileSession(db, {
      userId,
      deviceId: "device-test-1",
      platform: "android",
      sessionVersion: 2,
      role: "user",
    });

    // 1. Missing bearer header returns 401
    const reqNoAuth = new Request("http://localhost/api/mobile/v1/profile");
    const resNoAuth = await getMobileSession(reqNoAuth);
    assert.equal(resNoAuth.session, null);
    assert.equal(resNoAuth.error.status, 401);

    // 2. Valid bearer token returns session
    const reqValid = new Request("http://localhost/api/mobile/v1/profile", {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    const resValid = await getMobileSession(reqValid);
    assert.ok(resValid.session);
    assert.equal(resValid.session.user.id, userId);
    assert.equal(resValid.session.user.role, "user");

    // 3. Role check forbidden for barber
    const resForbidden = await getMobileSession(reqValid, ["barber"]);
    assert.equal(resForbidden.session, null);
    assert.equal(resForbidden.error.status, 403);

    // 4. Incremented sessionVersion invalidates token
    await db.collection("users").updateOne({ _id: userResult.insertedId }, { $inc: { sessionVersion: 1 } });
    const resStale = await getMobileSession(reqValid);
    assert.equal(resStale.session, null);
    assert.equal(resStale.error.status, 401);

  } finally {
    await db.collection("users").deleteOne({ _id: userResult.insertedId });
    await db.collection("mobile_sessions").deleteMany({ userId });
    const { default: clientPromise } = await import("../src/lib/mongodb.js");
    const client = await clientPromise;
    await client.close();
  }
});
