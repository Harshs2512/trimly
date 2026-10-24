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
