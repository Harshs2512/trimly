import crypto from "crypto";
import { ObjectId } from "mongodb";
import { hashToken } from "./security.js";
import { rateLimit } from "./rateLimit.js";
import { createMobileSession } from "./mobileAuth.js";
import { writeAuditLog } from "./audit.js";
import { sendOtpEmail } from "./email.js";

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

export function maskEmail(email = "") {
  if (!email || !email.includes("@")) return email;
  const [user, domain] = email.split("@");
  if (user.length <= 2) return `${user[0]}*@${domain}`;
  return `${user.slice(0, 2)}***${user.slice(-1)}@${domain}`;
}

/**
 * Sends a 6-digit OTP using a resilient 3-Tier Priority Fallback chain:
 * Priority 1: Fast2SMS (Indian carrier SMS gateway)
 * Priority 2: Twilio (Global carrier SMS gateway)
 * Priority 3: Email (SMTP / Nodemailer via Gmail/configured provider)
 * Priority 4: Development Test Code (Zero-downtime local testing)
 */
export async function sendPhoneOtp(db, { phone, email, ip }) {
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

  // Find existing user in database to determine fallback email if not passed directly
  const existingUser = await db.collection("users").findOne({
    $or: [{ phone: normalizedPhone }, { phone: normalizedPhone.replace("+91", "") }],
  });

  const rawTargetEmail = (email && email.trim()) || (existingUser?.email && !existingUser.email.endsWith("@phone.trimly.local") ? existingUser.email : null);
  const targetEmail = rawTargetEmail ? rawTargetEmail.toLowerCase() : null;

  let deliveryMethod = null; // 'fast2sms' | 'twilio' | 'email' | 'dev'
  let smsSentSuccessfully = false;
  let emailSentSuccessfully = false;
  let gatewayWarning = null;

  // -------------------------------------------------------------
  // PRIORITY 1: Fast2SMS (Indian carrier SMS gateway)
  // -------------------------------------------------------------
  if (process.env.FAST2SMS_API_KEY && process.env.FAST2SMS_API_KEY.trim() !== "") {
    try {
      const pureDigits = normalizedPhone.replace(/\D/g, "").slice(-10);
      const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          authorization: process.env.FAST2SMS_API_KEY.trim(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route: "otp",
          variables_values: otp,
          numbers: pureDigits,
        }),
      });
      const data = await res.json().catch(() => null);
      if (data && data.return === true) {
        smsSentSuccessfully = true;
        deliveryMethod = "fast2sms";
        console.log(`[PHONE-OTP] Priority 1 (Fast2SMS) SUCCESS -> ${pureDigits}`);
      } else {
        console.warn("[PHONE-OTP] Priority 1 (Fast2SMS) warning:", data);
        if (data?.status_code === 996 || (data?.message && data.message.includes("website verification"))) {
          gatewayWarning = "Fast2SMS requires Website Verification in dashboard under 'OTP Message' menu.";
        } else if (data?.message) {
          gatewayWarning = `Fast2SMS notice: ${data.message}`;
        }
      }
    } catch (smsErr) {
      console.warn("[PHONE-OTP] Priority 1 (Fast2SMS) network error:", smsErr);
      gatewayWarning = `Fast2SMS network error: ${smsErr.message}`;
    }
  }

  // -------------------------------------------------------------
  // PRIORITY 2: Twilio (Global carrier SMS gateway)
  // -------------------------------------------------------------
  if (!smsSentSuccessfully && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    try {
      const twilioAuth = Buffer.from(
        `${process.env.TWILIO_ACCOUNT_SID.trim()}:${process.env.TWILIO_AUTH_TOKEN.trim()}`
      ).toString("base64");

      const twilioBody = new URLSearchParams({
        To: normalizedPhone,
        From: process.env.TWILIO_PHONE_NUMBER.trim(),
        Body: `Your Trimly verification code is ${otp}. Valid for 10 minutes.`,
      });

      const twilioRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID.trim()}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${twilioAuth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: twilioBody.toString(),
        }
      );

      if (twilioRes.ok) {
        smsSentSuccessfully = true;
        deliveryMethod = "twilio";
        gatewayWarning = null;
        console.log(`[PHONE-OTP] Priority 2 (Twilio) SUCCESS -> ${normalizedPhone}`);
      } else {
        const twilioJson = await twilioRes.json().catch(() => null);
        console.warn("[PHONE-OTP] Priority 2 (Twilio) warning:", twilioJson);
      }
    } catch (twilioErr) {
      console.warn("[PHONE-OTP] Priority 2 (Twilio) network error:", twilioErr);
    }
  }

  // -------------------------------------------------------------
  // PRIORITY 3: Email Delivery (Resilient fallback when SMS is empty or fails)
  // -------------------------------------------------------------
  if (!smsSentSuccessfully && targetEmail) {
    try {
      const emailResult = await sendOtpEmail({
        to: targetEmail,
        otp,
        phone: normalizedPhone,
      });

      if (emailResult.sent === true) {
        emailSentSuccessfully = true;
        deliveryMethod = "email";
        console.log(`[PHONE-OTP] Priority 3 (Email fallback) SUCCESS -> ${targetEmail}`);
      } else {
        console.warn("[PHONE-OTP] Priority 3 (Email fallback) failed:", emailResult);
      }
    } catch (mailErr) {
      console.warn("[PHONE-OTP] Priority 3 (Email fallback) error:", mailErr);
    }
  }

  // -------------------------------------------------------------
  // Determine final status & message for mobile client
  // -------------------------------------------------------------
  const isDev = process.env.NODE_ENV !== "production";
  const shouldReturnDevCode = (!smsSentSuccessfully && !emailSentSuccessfully && isDev);

  let message = "";
  if (deliveryMethod === "fast2sms" || deliveryMethod === "twilio") {
    message = `OTP text message sent to ${normalizedPhone}.`;
  } else if (deliveryMethod === "email") {
    message = `OTP code sent to your email (${maskEmail(targetEmail)}).`;
  } else {
    // Both SMS and Email were unavailable
    if (gatewayWarning) {
      message = `${gatewayWarning} Enter your email address to receive OTP via email.`;
    } else {
      message = `Verification code generated for ${normalizedPhone}.`;
    }
  }

  return {
    ok: true,
    message,
    deliveryMethod: deliveryMethod || "dev",
    smsDelivered: smsSentSuccessfully,
    emailDelivered: emailSentSuccessfully,
    targetEmail: targetEmail ? maskEmail(targetEmail) : undefined,
    developmentCode: shouldReturnDevCode ? otp : undefined,
    gatewayWarning: gatewayWarning || undefined,
  };
}

/**
 * Verifies the 6-digit OTP.
 * If user exists -> logs them in.
 * If new user -> auto-registers customer account and logs them in immediately.
 */
export async function verifyPhoneOtpAndLogin(db, { phone, code, name, email, deviceId, platform, appVersion, ip }) {
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

  const validEmail = email && typeof email === "string" && email.trim().includes("@") ? email.trim().toLowerCase() : null;

  let isNewUser = false;
  if (!user) {
    // Auto-create customer account seamlessly!
    isNewUser = true;
    const displayName = (name || "").trim() || "Customer";
    const userDoc = {
      name: displayName,
      phone: normalizedPhone,
      phoneVerified: true,
      email: validEmail || `${normalizedPhone.replace("+", "")}@phone.trimly.local`,
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
      metadata: { phone: normalizedPhone, email: user.email, ip, deviceId },
    });
  } else {
    // Existing user: mark phoneVerified and update email if provided and previously placeholder
    const updateFields = { phoneVerified: true, updatedAt: now };
    if (validEmail && (!user.email || user.email.endsWith("@phone.trimly.local"))) {
      updateFields.email = validEmail;
      user.email = validEmail;
    }
    await db.collection("users").updateOne({ _id: user._id }, { $set: updateFields });
    user.phoneVerified = true;
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
