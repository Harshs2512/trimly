import nodemailer from "nodemailer";
import { getAppUrl } from "./appUrl.js";


function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: { user, pass },
  });
}

export function isEmailDeliveryConfigured() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return true;
  }
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

async function sendEmail({ to, subject, html, text }) {
  // Support SMTP standard
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || user;

  if (host && user && pass) {
    try {
      const transporter = getTransporter();
      await transporter.sendMail({
        from: from || user,
        to,
        subject,
        html,
        text,
      });
      return { sent: true };
    } catch (error) {
      console.error("[email] SMTP delivery failed:", error?.message || error);
      return { sent: false, reason: "provider_error" };
    }
  }

  // Fallback: Resend if configured
  const apiKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.EMAIL_FROM;
  if (apiKey && resendFrom) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: resendFrom, to: [to], subject, html, text }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("[email] Resend delivery failed", response.status, detail);
      return { sent: false, reason: "provider_error" };
    }
    return { sent: true };
  }

  return { sent: false, reason: "not_configured" };
}

export async function sendPasswordResetEmail({ to, token }) {
  const appUrl = getAppUrl();
  const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(to)}`;
  return sendEmail({
    to,
    subject: "Reset your Trimlly password",
    html: `<p>We received a request to reset your Trimlly password.</p><p><a href="${resetUrl.replace(/&/g, "&amp;")}">Reset password</a></p><p>This link expires in 60 minutes. If you did not request this, you can ignore this email.</p>`,
    text: `Reset your Trimlly password: ${resetUrl}\n\nThis link expires in 60 minutes.`,
  });
}

export async function sendVerificationEmail({ to, token, code }) {
  const appUrl = getAppUrl();
  const verifyUrl = `${appUrl}/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(to)}`;
  const displayCode = code || (token && token.length >= 6 ? token.substring(0, 6).toUpperCase() : "");

  const codeHtml = displayCode
    ? `<div style="margin: 24px 0; text-align: center;">
         <div style="font-size: 14px; color: #555; margin-bottom: 8px;">Your 6-Digit Verification Code:</div>
         <span style="display: inline-block; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #106766; background: #e6f3f3; padding: 12px 28px; border-radius: 8px; font-family: monospace;">${displayCode}</span>
       </div>`
    : "";

  return {
    ...(await sendEmail({
      to,
      subject: displayCode ? `Your Trimly Verification Code: ${displayCode}` : "Verify your Trimly email",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="color: #106766; margin-top: 0; text-align: center;">Verify Your Trimly Account</h2>
          <p style="color: #374151; font-size: 15px; line-height: 1.5; text-align: center;">
            Thank you for registering with Trimly! Enter the 6-digit code below into your mobile app:
          </p>
          ${codeHtml}
          <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 16px;">
            This code expires in 24 hours.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #6b7280; font-size: 13px; text-align: center;">
            Alternatively, click the link below to verify directly in your browser:<br/>
            <a href="${verifyUrl.replace(/&/g, "&amp;")}" style="color: #106766; font-weight: 600; text-decoration: underline; display: inline-block; margin-top: 8px;">
              Verify Email Address
            </a>
          </p>
        </div>
      `,
      text: displayCode
        ? `Your Trimly verification code is: ${displayCode}\n\nOr click here to verify: ${verifyUrl}\n\nThis code expires in 24 hours.`
        : `Verify your Trimly email: ${verifyUrl}\n\nThis link expires in 24 hours.`,
    })),
    verifyUrl,
    code: displayCode,
  };
}

/**
 * Sends an email for high-priority booking lifecycle events only:
 * - New booking request (to barber)
 * - Booking confirmed (to customer)
 * - Booking cancelled or declined (to affected party)
 * - Booking rescheduled (to affected party)
 */
export async function sendBookingNotificationEmail({
  to,
  recipientName = "Customer",
  type = "booking_update",
  booking,
  customMessage,
}) {
  if (!to || !booking) return { sent: false, reason: "missing_parameters" };

  const appUrl = getAppUrl();
  const service = booking.service || "Grooming Service";
  const barberName = booking.barberShopName || booking.barberName || "Barber";
  const customerName = booking.customerName || "Customer";
  const price = booking.price ? `₹${booking.price}` : "";
  const timeSlot = booking.timeSlot
    ? new Date(booking.timeSlot).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Scheduled Time";

  let subject = `[Trimly] Appointment Update: ${service}`;
  let title = "Appointment Update";
  let badgeColor = "#106766";
  let badgeLabel = "UPDATE";

  if (type === "booking_created") {
    subject = `[Trimly] 💈 New Booking Request: ${service} by ${customerName}`;
    title = `New Booking Request from ${customerName}`;
    badgeColor = "#F59E0B";
    badgeLabel = "PENDING APPROVAL";
  } else if (type === "booking_confirmed" || booking.status === "confirmed") {
    subject = `[Trimly] ✅ Confirmed: Your ${service} with ${barberName}`;
    title = "Appointment Confirmed! 🎉";
    badgeColor = "#10B981";
    badgeLabel = "CONFIRMED";
  } else if (type === "booking_cancelled" || booking.status === "cancelled") {
    subject = `[Trimly] ❌ Cancelled: ${service} with ${barberName}`;
    title = "Appointment Cancelled";
    badgeColor = "#EF4444";
    badgeLabel = "CANCELLED";
  } else if (type === "booking_declined" || booking.status === "declined") {
    subject = `[Trimly] ⚠️ Declined: ${service} appointment request`;
    title = "Appointment Request Declined";
    badgeColor = "#EF4444";
    badgeLabel = "DECLINED";
  } else if (type === "booking_rescheduled") {
    subject = `[Trimly] 🗓️ Rescheduled: ${service} with ${barberName}`;
    title = "Appointment Rescheduled";
    badgeColor = "#3B82F6";
    badgeLabel = "RESCHEDULED";
  }

  const messageText = customMessage || `Here are the details for your appointment:`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 28px; border: 1px solid #e5e7eb; border-radius: 14px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 26px; font-weight: 800; color: #106766; letter-spacing: -0.5px;">TRIMLY</span>
        <div style="font-size: 13px; color: #6b7280; margin-top: 2px;">Premium Barber Grooming Platform</div>
      </div>

      <div style="text-align: center; margin-bottom: 20px;">
        <span style="display: inline-block; padding: 6px 14px; font-size: 12px; font-weight: 700; color: #ffffff; background-color: ${badgeColor}; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">
          ${badgeLabel}
        </span>
        <h2 style="color: #111827; font-size: 20px; font-weight: 700; margin: 12px 0 6px 0;">${title}</h2>
        <p style="color: #4b5563; font-size: 15px; line-height: 1.5; margin: 0;">
          Hi ${recipientName}, ${messageText}
        </p>
      </div>

      <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; border-radius: 10px; padding: 18px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Service</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${service}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Barber Shop</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${barberName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Date & Time</td>
            <td style="padding: 8px 0; color: #106766; font-weight: 700; text-align: right;">${timeSlot}</td>
          </tr>
          ${
            price
              ? `<tr>
                  <td style="padding: 8px 0; color: #6b7280;">Price</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${price}</td>
                </tr>`
              : ""
          }
          ${
            booking.cancellationReason || booking.cancelReason
              ? `<tr>
                  <td style="padding: 8px 0; color: #ef4444;">Reason</td>
                  <td style="padding: 8px 0; color: #ef4444; font-weight: 500; text-align: right;">${booking.cancellationReason || booking.cancelReason}</td>
                </tr>`
              : ""
          }
        </table>
      </div>

      <div style="text-align: center; margin: 26px 0 16px 0;">
        <a href="${appUrl}" style="display: inline-block; padding: 12px 28px; background-color: #106766; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 8px;">
          View in Trimly
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 24px 0 16px 0;" />
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0; line-height: 1.4;">
        This is an automated notification for an important appointment update.<br />
        You can adjust your notification settings anytime in the Trimly app profile.
      </p>
    </div>
  `;

  const text = `${title}\n\nHi ${recipientName},\n${messageText}\n\nService: ${service}\nBarber: ${barberName}\nTime: ${timeSlot}\n${price ? `Price: ${price}\n` : ""}\nView details on Trimly: ${appUrl}`;

  const sendResult = await sendEmail({ to, subject, html, text });
  console.log(`[email-notification] Dispatched to ${to} (${badgeLabel}) - Result:`, sendResult);
  return sendResult;
}


/**
 * Sends a 6-digit OTP code to a user's email address.
 * Used as a resilient fallback when SMS gateways are unavailable or unconfigured.
 */
export async function sendOtpEmail({ to, otp, phone }) {
  if (!to) return { sent: false, reason: "missing_to" };

  const appUrl = getAppUrl();
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 28px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #106766; font-size: 26px; margin: 0; font-weight: 800;">Trimly</h1>
        <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Smart Barber Booking</p>
      </div>
      <p style="color: #374151; font-size: 15px; line-height: 1.5; text-align: center;">
        Here is your 6-digit login verification code for <strong>${phone || "your Trimly account"}</strong>:
      </p>
      <div style="margin: 24px 0; text-align: center;">
        <span style="display: inline-block; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #106766; background: #e6f3f3; padding: 12px 28px; border-radius: 8px; font-family: monospace;">${otp}</span>
      </div>
      <p style="color: #6b7280; font-size: 13px; text-align: center; margin-top: 16px;">
        This code is valid for 10 minutes. Never share this code with anyone.
      </p>
      <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 24px 0 16px 0;" />
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
        If you did not request this login code, you can safely ignore this email.
      </p>
    </div>
  `;

  const text = `Your Trimly login verification code is: ${otp}\n\nValid for 10 minutes for ${phone || "your Trimly account"}. Never share this code with anyone.`;

  const sendResult = await sendEmail({
    to,
    subject: `Your Trimly Verification Code: ${otp}`,
    html,
    text,
  });

  console.log(`[otp-email] Dispatched OTP to ${to} - Result:`, sendResult);
  return sendResult;
}
