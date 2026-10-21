import test from "node:test";
import assert from "node:assert/strict";
import { getDb } from "../src/lib/mongodb.js";
import {
  verifyAppleIdToken,
  verifyGoogleIdToken,
  processSocialLogin,
} from "../src/lib/socialAuth.js";
import { createMobileSession } from "../src/lib/mobileAuth.js";
import { mobileSocialLoginSchema } from "../src/lib/validations.js";

test("Mobile Social Auth Suite", async (t) => {
  const db = await getDb();

  await t.test("Schema Validation: rejects missing or invalid fields", () => {
    const invalid1 = mobileSocialLoginSchema.safeParse({});
    assert.equal(invalid1.success, false);

    const invalid2 = mobileSocialLoginSchema.safeParse({ idToken: "" });
    assert.equal(invalid2.success, false);

    const validGoogle = mobileSocialLoginSchema.safeParse({
      idToken: "valid-dummy-token",
      provider: "google",
      deviceId: "dev-123",
      platform: "android",
    });
    assert.equal(validGoogle.success, true);

    const validApple = mobileSocialLoginSchema.safeParse({
      idToken: "valid-apple-token",
      provider: "apple",
      rawNonce: "test-nonce-raw",
      fullName: "Jane Doe",
      deviceId: "dev-456",
      platform: "ios",
    });
    assert.equal(validApple.success, true);
  });

  await t.test("verifyGoogleIdToken: rejects forged/invalid Google tokens", async () => {
    const res = await verifyGoogleIdToken("invalid-google-token");
    assert.equal(res.valid, false);
    assert.ok(res.error);
  });

  await t.test("verifyAppleIdToken: rejects invalid format and untrusted JWTs", async () => {
    const res1 = await verifyAppleIdToken("not.a.jwt");
    assert.equal(res1.valid, false);

    const res2 = await verifyAppleIdToken(null);
    assert.equal(res2.valid, false);

    // Token with alg: none or bad header
    const fakeHeader = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const fakePayload = Buffer.from(JSON.stringify({ iss: "https://appleid.apple.com", sub: "123" })).toString("base64url");
    const fakeToken = `${fakeHeader}.${fakePayload}.dHJpbWx5`;
    const res3 = await verifyAppleIdToken(fakeToken);
    assert.equal(res3.valid, false);
    assert.equal(res3.error, "Unsupported Apple JWT algorithm");
  });

  await t.test("processSocialLogin: creates new user if neither sub nor email exists", async () => {
    const testSub = `google-sub-${Date.now()}`;
    const testEmail = `new-social-${Date.now()}@example.com`;

    const result = await processSocialLogin(db, {
      provider: "google",
      verifiedUser: {
        sub: testSub,
        email: testEmail,
        name: "Google New User",
      },
      deviceId: "dev-social-1",
      platform: "android",
      appVersion: "1.0.0",
      ip: "127.0.0.1",
      userAgent: "TestAgent",
      createMobileSession,
    });

    assert.ok(result.sessionResult);
    assert.ok(result.sessionResult.accessToken);
    assert.equal(result.user.email, testEmail);
    assert.equal(result.user.role, "user"); // Default role
    assert.equal(result.user.googleSub, testSub);

    // Verify stored in DB
    const saved = await db.collection("users").findOne({ googleSub: testSub });
    assert.ok(saved);
    assert.equal(saved.role, "user");
  });

  await t.test("processSocialLogin: links provider sub to existing email without changing role", async () => {
    const existingEmail = `barber-social-${Date.now()}@example.com`;
    await db.collection("users").insertOne({
      email: existingEmail,
      name: "Existing Barber",
      role: "barber", // Existing role must NOT be downgraded or altered
      active: true,
      emailVerified: true,
      sessionVersion: 1,
      createdAt: new Date(),
    });

    const googleSub = `google-sub-barber-${Date.now()}`;
    const result = await processSocialLogin(db, {
      provider: "google",
      verifiedUser: {
        sub: googleSub,
        email: existingEmail,
        name: "Barber Google",
      },
      deviceId: "dev-barber",
      platform: "ios",
      createMobileSession,
    });

    assert.ok(result.sessionResult);
    assert.equal(result.user.role, "barber"); // Role preserved!
    assert.equal(result.user.googleSub, googleSub);

    const updated = await db.collection("users").findOne({ email: existingEmail });
    assert.equal(updated.role, "barber");
    assert.equal(updated.googleSub, googleSub);
  });

  await t.test("processSocialLogin: rejects deactivated existing user", async () => {
    const deactivatedEmail = `deactivated-social-${Date.now()}@example.com`;
    await db.collection("users").insertOne({
      email: deactivatedEmail,
      name: "Banned User",
      role: "user",
      active: false,
      sessionVersion: 1,
      createdAt: new Date(),
    });

    const result = await processSocialLogin(db, {
      provider: "google",
      verifiedUser: {
        sub: `sub-banned-${Date.now()}`,
        email: deactivatedEmail,
      },
      createMobileSession,
    });

    assert.ok(result.error);
    assert.equal(result.error.code, "ACCOUNT_DEACTIVATED");
    assert.equal(result.error.status, 403);
  });

  const { default: clientPromise } = await import("../src/lib/mongodb.js");
  const client = await clientPromise;
  await client.close();
});

