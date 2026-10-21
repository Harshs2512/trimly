import crypto from "crypto";

/**
 * Checks if an idempotency key already exists for the given user.
 * Returns { cached: true, statusCode, responseBody } if found with matching body,
 * or { mismatch: true } if body differs,
 * or { cached: false } if new.
 */
export async function checkIdempotency(db, { key, userId, bodyString }) {
  if (!key || typeof key !== "string") {
    return { cached: false };
  }

  const trimmedKey = key.trim();
  if (trimmedKey.length > 255) {
    return { error: { code: "INVALID_IDEMPOTENCY_KEY", message: "Idempotency-Key header is too long." } };
  }

  const bodyHash = crypto.createHash("sha256").update(bodyString || "").digest("hex");
  const existing = await db.collection("idempotency_keys").findOne({
    key: trimmedKey,
    userId: String(userId),
  });

  if (!existing) {
    return { cached: false, bodyHash, key: trimmedKey };
  }

  if (existing.bodyHash !== bodyHash) {
    return {
      mismatch: true,
      error: {
        code: "IDEMPOTENCY_MISMATCH",
        message: "Idempotency key re-used with a different request payload.",
      },
    };
  }

  return {
    cached: true,
    statusCode: existing.statusCode,
    responseBody: existing.responseBody,
  };
}

/**
 * Stores the response for an idempotency key with a 24-hour TTL.
 */
export async function saveIdempotency(db, { key, userId, bodyHash, statusCode, responseBody }) {
  if (!key) return;
  try {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.collection("idempotency_keys").updateOne(
      { key, userId: String(userId) },
      {
        $set: {
          key,
          userId: String(userId),
          bodyHash,
          statusCode,
          responseBody,
          createdAt: new Date(),
          expiresAt,
        },
      },
      { upsert: true }
    );
  } catch (err) {
    console.error("[idempotency] Failed to save idempotency response:", err);
  }
}
