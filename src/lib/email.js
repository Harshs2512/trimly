import nodemailer from "nodemailer";
import { getAppUrl } from "@/lib/appUrl";

const APP_URL = getAppUrl();

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
  const resetUrl = `${APP_URL}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(to)}`;
  return sendEmail({
    to,
    subject: "Reset your Trimlly password",
    html: `<p>We received a request to reset your Trimlly password.</p><p><a href="${resetUrl.replace(/&/g, "&amp;")}">Reset password</a></p><p>This link expires in 60 minutes. If you did not request this, you can ignore this email.</p>`,
    text: `Reset your Trimlly password: ${resetUrl}\n\nThis link expires in 60 minutes.`,
  });
}

export async function sendVerificationEmail({ to, token }) {
  const verifyUrl = `${APP_URL}/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(to)}`;
  return {
    ...(await sendEmail({
      to,
      subject: "Verify your Trimlly email",
      html: `<p>Verify your email address to activate your Trimlly account.</p><p><a href="${verifyUrl.replace(/&/g, "&amp;")}">Verify email</a></p><p>This link expires in 24 hours.</p>`,
      text: `Verify your Trimlly email: ${verifyUrl}\n\nThis link expires in 24 hours.`,
    })),
    verifyUrl,
  };
}
