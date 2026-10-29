import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getDb } from "../src/lib/mongodb.js";
import { ensureIndexes } from "../src/lib/indexes.js";
import { normalizePhone, sendPhoneOtp, verifyPhoneOtpAndLogin } from "../src/lib/phoneAuth.js";
import { bookingUpdateSchema, profileUpdateSchema, changePasswordSchema } from "../src/lib/validations.js";
import { verifyAccessToken } from "../src/lib/mobileAuth.js";

test("Phone OTP: normalization, generation, and rate limits", async () => {
  await ensureIndexes();
  const db = await getDb();

  assert.equal(normalizePhone("9876543210"), "+919876543210");
  assert.equal(normalizePhone("+91 98765 43210"), "+919876543210");
  assert.equal(normalizePhone("09876543210"), "+919876543210");

  const testPhone = `99999${Math.floor(10000 + Math.random() * 90000)}`;
  const sendRes = await sendPhoneOtp(db, { phone: testPhone, ip: "127.0.0.1" });

  assert.equal(sendRes.ok, true);
  assert.ok(sendRes.developmentCode);
  assert.equal(sendRes.developmentCode.length, 6);

  // Verify OTP is stored in DB
  const stored = await db.collection("phone_otps").findOne({ phone: normalizePhone(testPhone) });
  assert.ok(stored);
  assert.equal(stored.attempts, 0);
  assert.ok(stored.expiresAt > new Date());
});

test("Phone OTP: new user auto-registration and direct login", async () => {
  await ensureIndexes();
  const db = await getDb();

  const testPhone = `98888${Math.floor(10000 + Math.random() * 90000)}`;
  const sendRes = await sendPhoneOtp(db, { phone: testPhone, ip: "127.0.0.1" });
  assert.equal(sendRes.ok, true);
  const otp = sendRes.developmentCode;

  // 1. Verify invalid OTP rejection
  const invalidRes = await verifyPhoneOtpAndLogin(db, {
    phone: testPhone,
    code: "000000",
    name: "New Customer",
    deviceId: "device-test-1",
  });
  assert.equal(invalidRes.ok, false);
  assert.equal(invalidRes.code, "INVALID_OTP");

  // 2. Verify with correct OTP -> auto-registers new customer
  const verifyRes = await verifyPhoneOtpAndLogin(db, {
    phone: testPhone,
    code: otp,
    name: "Aman Verma",
    deviceId: "device-test-1",
    platform: "android",
  });

  assert.equal(verifyRes.ok, true);
  assert.equal(verifyRes.data.isNewUser, true);
  assert.equal(verifyRes.data.user.name, "Aman Verma");
  assert.equal(verifyRes.data.user.phone, normalizePhone(testPhone));
  assert.equal(verifyRes.data.user.role, "user");
  assert.ok(verifyRes.data.accessToken);
  assert.ok(verifyRes.data.refreshToken);

  // Verify token is valid HS256 JWT
  const tokenCheck = verifyAccessToken(verifyRes.data.accessToken);
  assert.equal(tokenCheck.valid, true);
  assert.equal(tokenCheck.payload.role, "user");

  // 3. Subsequent login with existing phone -> logs in directly without creating duplicate
  const secondOtpRes = await sendPhoneOtp(db, { phone: testPhone, ip: "127.0.0.1" });
  const secondLogin = await verifyPhoneOtpAndLogin(db, {
    phone: testPhone,
    code: secondOtpRes.developmentCode,
    deviceId: "device-test-1",
  });

  assert.equal(secondLogin.ok, true);
  assert.equal(secondLogin.data.isNewUser, false);
  assert.equal(secondLogin.data.user.id, verifyRes.data.user.id);
});

test("Validation: bookingUpdateSchema accepts rescheduling with or without explicit status", () => {
  // Mobile client sending new timeSlot only
  const validReschedule = bookingUpdateSchema.safeParse({
    timeSlot: "2026-11-01T10:00:00+05:30",
  });
  assert.equal(validReschedule.success, true);

  // Client sending status + timeSlot
  const explicitReschedule = bookingUpdateSchema.safeParse({
    status: "pending",
    timeSlot: "2026-11-01T10:00:00+05:30",
  });
  assert.equal(explicitReschedule.success, true);

  // Cancel with reason
  const validCancel = bookingUpdateSchema.safeParse({
    status: "cancelled",
    cancelReason: "Customer requested cancellation",
  });
  assert.equal(validCancel.success, true);

  // Empty payload rejected
  const empty = bookingUpdateSchema.safeParse({});
  assert.equal(empty.success, false);
});

test("Validation: profileUpdateSchema supports name and/or phone", () => {
  assert.equal(profileUpdateSchema.safeParse({ name: "Rohan" }).success, true);
  assert.equal(profileUpdateSchema.safeParse({ phone: "+919876543210" }).success, true);
  assert.equal(profileUpdateSchema.safeParse({ phone: "9876543210" }).success, true);
  assert.equal(profileUpdateSchema.safeParse({ name: "Rohan", phone: "+919876543210" }).success, true);
  assert.equal(profileUpdateSchema.safeParse({}).success, false);
});

test("Validation: changePasswordSchema enforces non-empty current and min 6 new password", () => {
  assert.equal(
    changePasswordSchema.safeParse({ currentPassword: "oldPassword1", newPassword: "newPassword2" }).success,
    true
  );
  assert.equal(
    changePasswordSchema.safeParse({ currentPassword: "", newPassword: "newPassword2" }).success,
    false
  );
  assert.equal(
    changePasswordSchema.safeParse({ currentPassword: "oldPassword1", newPassword: "123" }).success,
    false
  );
});

