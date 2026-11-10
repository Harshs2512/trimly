import { getDb } from "@/lib/mongodb";
import { json, getClientIp, rejectCrossSiteRequest, safeInternalError } from "@/lib/api";
import { rateLimit } from "@/lib/rateLimit";
import { leadEventSchema } from "@/lib/validations";

export async function POST(request) {
  try {
    // 1. Same-Origin & CSRF Defense
    const originError = rejectCrossSiteRequest(request);
    if (originError) return originError;

    // 2. Rate Limit (60 click events per IP per hour)
    const clientIp = getClientIp(request);
    const limiter = await rateLimit(`lead_events:ip:${clientIp}`, 60, 60 * 60 * 1000);
    if (!limiter.allowed) {
      return json({ error: "Rate limit exceeded" }, 429);
    }

    // 3. Parse Body
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON payload" }, 400);
    }

    const parsed = leadEventSchema.safeParse(body);
    if (!parsed.success) {
      return json({ error: "Validation failed" }, 400);
    }

    // 4. Store Event (Strictly No PII)
    const db = await getDb();
    await db.collection("lead_events").insertOne({
      type: parsed.data.type,
      page: parsed.data.page || "/",
      source: parsed.data.source || "web",
      createdAt: new Date(),
    });

    return json({ success: true });
  } catch (error) {
    return safeInternalError(error, "leads-event");
  }
}

