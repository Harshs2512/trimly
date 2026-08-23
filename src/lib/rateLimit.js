import { getDb } from "@/lib/mongodb";

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
