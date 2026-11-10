import { getDb } from "@/lib/mongodb";
import { json, getClientIp, rejectCrossSiteRequest, safeInternalError } from "@/lib/api";
import { rateLimit } from "@/lib/rateLimit";
import { leadCreateSchema } from "@/lib/validations";
import { createOrDedupeLead, dispatchLeadNotification, normalizeIndianPhone } from "@/lib/leads";

export async function POST(request) {
  try {
    // 1. Same-Origin & CSRF Defense
    const originError = rejectCrossSiteRequest(request);
    if (originError) return originError;

    // 2. Parse & Honeypot Check
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON payload" }, 400);
    }

    // Silent trap for automated spam bots filling hidden fields
    if (body.website || body.honeypot) {
      return json({
        success: true,
        message: "Thank you for reaching out. Our team will contact you shortly.",
      });
    }

    // 3. Schema & Field Validation
    const parsed = leadCreateSchema.safeParse(body);
    if (!parsed.success) {
      return json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        400
      );
    }

    const leadData = parsed.data;
    const clientIp = getClientIp(request);
    const normalizedPhone = normalizeIndianPhone(leadData.phone);

    // 4. Rate Limiting (MongoDB-backed)
    // 5 submissions per IP per hour
    const ipLimiter = await rateLimit(`leads:ip:${clientIp}`, 5, 60 * 60 * 1000);
    if (!ipLimiter.allowed) {
      return json(
        {
          error: "Too many enquiries submitted from this network. Please try again later.",
        },
        429
      );
    }

    // 3 submissions per phone number per day
    const phoneLimiter = await rateLimit(`leads:phone:${normalizedPhone}`, 3, 24 * 60 * 60 * 1000);
    if (!phoneLimiter.allowed) {
      return json(
        {
          error: "We have already received your enquiry for this number. Our team will reach out shortly.",
        },
        429
      );
    }

    // 5. Store / Deduplicate within 24 hours
    const db = await getDb();
    const result = await createOrDedupeLead(db, leadData, clientIp);

    // 6. Asynchronous Notification (Email + Webhook) - Fire and forget
    dispatchLeadNotification(result.lead).catch((err) =>
      console.error("[leads] Notification dispatch failed:", err)
    );

    // 7. Generic sanitized success response
    return json({
      success: true,
      message: "Thank you for reaching out. Our team will contact you shortly.",
    });
  } catch (error) {
    return safeInternalError(error, "leads-post");
  }
}

