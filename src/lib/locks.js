import crypto from "crypto";

export async function acquireMongoLock(db, key, ttlMs = 5000) {
  const owner = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);
  const locks = db.collection("system_locks");

  let lock;
  try {
    lock = await locks.findOneAndUpdate(
      {
        _id: key,
        $or: [
          { expiresAt: { $lte: now } },
          { expiresAt: { $exists: false } },
        ],
      },
      {
        $set: { owner, expiresAt, updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true, returnDocument: "after" },
    );
  } catch (error) {
    // A duplicate-key error here means another request currently owns the lock.
    if (error?.code === 11000) return null;
    throw error;
  }

  if (!lock || lock.owner !== owner) return null;

  let released = false;
  return async function release() {
    if (released) return;
    released = true;
    await locks.deleteOne({ _id: key, owner });
  };
}
