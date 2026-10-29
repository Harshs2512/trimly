import crypto from "crypto";
import { ObjectId } from "mongodb";
import { hashToken } from "./security.js";
import { rateLimit } from "./rateLimit.js";
import { createMobileSession } from "./mobileAuth.js";
import { writeAuditLog } from "./audit.js";

/**
 * Standardizes phone numbers to E.164 format.
 * Defaults 10-digit Indian numbers to +91.
 */
export function normalizePhone(rawPhone = "") {
  let cleaned = String(rawPhone).replace(/[^\d+]/g, "").trim();
  if (!cleaned.startsWith("+")) {
    if (cleaned.length === 10) {
      cleaned = "+91" + cleaned;
    } else if (cleaned.length === 11 && cleaned.startsWith("0")) {
      cleaned = "+91" + cleaned.slice(1);
    } else {
      cleaned = "+" + cleaned;
    }
  }
  return cleaned;
}

/**
 * Sends a 6-digit OTP to the given phone number.
 */
export async function sendPhoneOtp(db, { phone, ip }) {
  const normalizedPhone = normalizePhone(phone);

  // Rate limit: max 5 OTP requests per 10 minutes per phone number
  const phoneLimiter = await rateLimit(`otp:phone:${normalizedPhone}`, 5, 10 * 60 * 1000);
  if (!phoneLimiter.allowed) {
    return {
      ok: false,
      status: 429,
      code: "RATE_LIMITED",
      error: "Too many OTP requests. Please wait a few minutes before trying again.",
    };
  }

  // Rate limit: max 15 requests per 15 minutes per IP
  if (ip) {
    const ipLimiter = await rateLimit(`otp:ip:${ip}`, 15, 15 * 60 * 1000);
    if (!ipLimiter.allowed) {
      return {
        ok: false,
        status: 429,
        code: "RATE_LIMITED",
        error: "Too many OTP requests from this network. Please try again later.",
      };
    }
  }

  // Generate secure 6-digit OTP
  const otp = crypto.randomInt(100000, 1000000).toString();
  const otpHash = hashToken(otp);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

  // Store in phone_otps collection
  await db.collection("phone_otps").updateOne(
    { phone: normalizedPhone },
    {
      $set: {
        otpHash,
        attempts: 0,
        expiresAt,
        updatedAt: now,
      },
      $setOnInsert: {
        phone: normalizedPhone,
        createdAt: now,
      },
    },
    { upsert: true }
  );

  console.log(`[PHONE-OTP] OTP for ${normalizedPhone}: ${otp}`);

  // Dispatch via SMS gateway if configured (e.g. Fast2SMS / Twilio)
  if (process.env.FAST2SMS_API_KEY) {
    try {
      const pureDigits = normalizedPhone.replace(/\D/g, "").slice(-10);
      await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          authorization: process.env.FAST2SMS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route: "otp",
          variables_values: otp,
          numbers: pureDigits,
        }),
      });
    } catch (smsErr) {
      console.warn("[PHONE-OTP] SMS gateway dispatch warning:", smsErr);
    }
  }

  const isDev = process.env.NODE_ENV !== "production";
  return {
    ok: true,
    message: `OTP sent successfully to ${normalizedPhone}.`,
    developmentCode: isDev ? otp : undefined,
  };
}

/**
 * Verifies the 6-digit OTP.
 * If user exists -> logs them in.
 * If new user -> auto-registers customer account and logs them in immediately.
 */
export async function verifyPhoneOtpAndLogin(db, { phone, code, name, deviceId, platform, appVersion, ip }) {
  const normalizedPhone = normalizePhone(phone);
  const now = new Date();

  // Find active OTP record
  const otpRecord = await db.collection("phone_otps").findOne({ phone: normalizedPhone });
  if (!otpRecord) {
    return {
      ok: false,
      status: 400,
      code: "OTP_NOT_FOUND",
      error: "No OTP was requested for this phone number or it has already been used.",
    };
  }

  if (otpRecord.expiresAt < now) {
    await db.collection("phone_otps").deleteOne({ _id: otpRecord._id });
    return {
      ok: false,
      status: 400,
      code: "OTP_EXPIRED",
      error: "This OTP has expired. Please request a new code.",
    };
  }

  if (otpRecord.attempts >= 5) {
    await db.collection("phone_otps").deleteOne({ _id: otpRecord._id });
    return {
      ok: false,
      status: 429,
      code: "MAX_ATTEMPTS_EXCEEDED",
      error: "Too many incorrect attempts. Please request a new OTP.",
    };
  }

  const inputHash = hashToken(String(code).trim());
  if (inputHash !== otpRecord.otpHash) {
    await db.collection("phone_otps").updateOne(
      { _id: otpRecord._id },
      { $inc: { attempts: 1 } }
    );
    const remaining = 4 - (otpRecord.attempts || 0);
    return {
      ok: false,
      status: 400,
      code: "INVALID_OTP",
      error: remaining > 0 ? `Incorrect OTP. You have ${remaining} attempts remaining.` : "Incorrect OTP.",
    };
  }

  // OTP is verified! Invalidate immediately to prevent replay
  await db.collection("phone_otps").deleteOne({ _id: otpRecord._id });

  // Lookup existing user by phone
  let user = await db.collection("users").findOne({
    $or: [{ phone: normalizedPhone }, { phone: normalizedPhone.replace("+91", "") }],
  });

  let isNewUser = false;
  if (!user) {
    // Auto-create customer account seamlessly!
    isNewUser = true;
    const displayName = (name || "").trim() || "Customer";
    const userDoc = {
      name: displayName,
      phone: normalizedPhone,
      phoneVerified: true,
      email: `${normalizedPhone.replace("+", "")}@phone.trimly.local`,
      role: "user",
      active: true,
      createdAt: now,
      updatedAt: now,
      sessionVersion: 0,
    };

    const insertRes = await db.collection("users").insertOne(userDoc);
    user = { _id: insertRes.insertedId, ...userDoc };

    await writeAuditLog(db, {
      actorId: user._id.toString(),
      action: "auth.mobile.phone_auto_registered",
      targetType: "user",
      targetId: user._id.toString(),
      metadata: { phone: normalizedPhone, ip, deviceId },
    });
  } else {
    // Existing user: mark phoneVerified and active
    if (!user.phoneVerified) {
      await db.collection("users").updateOne(
        { _id: user._id },
        { $set: { phoneVerified: true, updatedAt: now } }
      );
      user.phoneVerified = true;
    }
  }

  if (user.active === false) {
    return {
      ok: false,
      status: 403,
      code: "ACCOUNT_DEACTIVATED",
      error: "This account has been deactivated. Please contact support.",
    };
  }

  // Create mobile session & issue JWTs
  const sessionResult = await createMobileSession(db, {
    userId: user._id.toString(),
    deviceId,
    platform: platform || "unknown",
    appVersion: appVersion || "1.0.0",
    userAgent: `mobile-phone-auth/${platform || "app"}`,
    ip,
    sessionVersion: user.sessionVersion || 0,
    role: user.role || "user",
  });

  await writeAuditLog(db, {
    actorId: user._id.toString(),
    action: "auth.mobile.phone_login_success",
    targetType: "user",
    targetId: user._id.toString(),
    metadata: { phone: normalizedPhone, isNewUser, ip, deviceId },
  });

  return {
    ok: true,
    data: {
      accessToken: sessionResult.accessToken,
      refreshToken: sessionResult.refreshToken,
      expiresIn: sessionResult.expiresIn,
      isNewUser,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role || "user",
      },
    },
  };
}

