import crypto from "crypto";
import { ObjectId } from "mongodb";
import { sendLeadNotificationEmail } from "./email.js";

/**
 * Standardizes Indian phone numbers into E.164 format (+91XXXXXXXXXX).
 */
export function normalizeIndianPhone(rawPhone = "") {
  let cleaned = String(rawPhone).replace(/[^\d+]/g, "").trim();
  if (cleaned.startsWith("+91")) {
    return cleaned;
  }
  if (cleaned.startsWith("91") && cleaned.length === 12) {
    return "+" + cleaned;
  }
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    return "+91" + cleaned.slice(1);
  }
  if (cleaned.length === 10) {
    return "+91" + cleaned;
  }
  if (!cleaned.startsWith("+")) {
    return "+91" + cleaned;
  }
  return cleaned;
}

/**
 * Creates a salted hash of the client IP address to ensure DPDP Act / privacy compliance.
 * Never stores raw IP addresses in the database.
 */
export function hashIp(ip = "") {
  if (!ip || ip === "unknown") return "unknown_hashed";
  const salt = process.env.IP_HASH_SALT || process.env.NEXTAUTH_SECRET || "trimlly-lead-ip-salt-v1";
  return crypto.createHmac("sha256", salt).update(String(ip)).digest("hex").slice(0, 32);
}

/**
 * Creates a new lead or dedupes within a 24-hour window by phone number.
 * If a matching lead was created in the last 24h, updates the existing record
 * with any new message, notes, and fields without creating duplicate leads.
 */
export async function createOrDedupeLead(db, data, clientIp = "unknown") {
  const collection = db.collection("leads");
  const normalizedPhone = normalizeIndianPhone(data.phone);
  const now = new Date();
  const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Look for existing active lead with the same phone in the past 24 hours
  const existing = await collection.findOne({
    phone: normalizedPhone,
    isDeleted: { $ne: true },
    createdAt: { $gte: cutoff24h },
  });

  if (existing) {
    const updateSet = {
      updatedAt: now,
    };

    if (data.email && !existing.email) {
      updateSet.email = data.email;
    }
    if (data.city && (!existing.city || existing.city === "Other")) {
      updateSet.city = data.city;
    }
    if (data.interest) {
      updateSet.interest = data.interest;
    }
    if (data.name && (!existing.name || existing.name === "Guest")) {
      updateSet.name = data.name;
    }

    const updateOps = { $set: updateSet };

    if (data.message) {
      updateOps.$push = {
        notes: {
          text: `Follow-up enquiry: ${data.message}`,
          source: data.source || "chatbot",
          page: data.page || "/",
          at: now,
        },
      };
      updateSet.message = existing.message
        ? `${existing.message}\n---\n${data.message}`
        : data.message;
    }

    await collection.updateOne({ _id: existing._id }, updateOps);

    return {
      isDuplicate: true,
      leadId: existing._id,
      lead: { ...existing, ...updateSet },
    };
  }

  // Brand-new lead
  const newLead = {
    type: data.type || "customer",
    name: data.name,
    phone: normalizedPhone,
    email: data.email || null,
    city: data.city,
    interest: data.interest || "",
    message: data.message || "",
    source: data.source || "chatbot",
    page: data.page || "",
    referrer: data.referrer || "",
    utm_source: data.utm_source || "",
    utm_medium: data.utm_medium || "",
    utm_campaign: data.utm_campaign || "",
    consent: {
      given: true,
      text: data.consentText || "I agree to be contacted by Trimlly regarding my enquiry.",
      at: now,
      ipHash: hashIp(clientIp),
    },
    status: "new",
    notes: data.message
      ? [
          {
            text: `Initial enquiry: ${data.message}`,
            source: data.source || "chatbot",
            page: data.page || "/",
            at: now,
          },
        ]
      : [],
    assignedTo: null,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(newLead);
  return {
    isDuplicate: false,
    leadId: result.insertedId,
    lead: { ...newLead, _id: result.insertedId },
  };
}

/**
 * Asynchronously dispatches lead notification email and optional webhook.
 * Non-blocking and fails silently to guarantee reliable public API response.
 */
export async function dispatchLeadNotification(lead) {
  // Fire email
  try {
    await sendLeadNotificationEmail(lead);
  } catch (err) {
    console.error("[leads] Failed to send email alert:", err?.message || err);
  }

  // Fire webhook if configured
  const webhookUrl = process.env.LEAD_NOTIFY_WEBHOOK;
  if (webhookUrl) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "lead.created",
          lead: {
            id: String(lead._id),
            type: lead.type,
            name: lead.name,
            phone: lead.phone,
            email: lead.email,
            city: lead.city,
            interest: lead.interest,
            source: lead.source,
            page: lead.page,
            createdAt: lead.createdAt,
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
    } catch (err) {
      console.error("[leads] Webhook notification failed:", err?.message || err);
    }
  }
}

