import { getDb } from "./mongodb.js";
import { mobileError } from "./mobileResponse.js";

export async function rateLimit(key, limit = 5, windowMs = 15 * 60 * 1000) {
  const db = await getDb();
  const now = new Date();
  const nextExpiry = new Date(now.getTime() + windowMs);
  const collection = db.collection("rate_limits");

  const current = await collection.findOneAndUpdate(
    { _id: key },
    [
      {
        $set: {
          count: {
            $cond: [
              { $gt: ["$expiresAt", now] },
              { $add: [{ $ifNull: ["$count", 0] }, 1] },
              1,
            ],
          },
          expiresAt: {
            $cond: [
              { $gt: ["$expiresAt", now] },
              "$expiresAt",
              nextExpiry,
            ],
          },
          updatedAt: now,
        },
      },
    ],
    { upsert: true, returnDocument: "after" },
  );

  const count = current?.count ?? 1;
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt: current?.expiresAt || nextExpiry,
  };
}

export async function enforceMobileRateLimit(
  key,
  limit,
  windowMs,
  { requestId = null, message = "Too many requests. Please try again later." } = {}
) {
  const limiter = await rateLimit(key, limit, windowMs);
  if (!limiter.allowed) {
    const retryAfter = Math.max(1, Math.ceil((new Date(limiter.resetAt).getTime() - Date.now()) / 1000));
    return mobileError({
      code: "RATE_LIMIT_EXCEEDED",
      message,
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
      },
      requestId,
    });
  }
  return null;
}
