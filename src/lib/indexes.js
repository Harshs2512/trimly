import { getDb } from "./mongodb.js";

let indexesPromise;

export async function ensureIndexes() {
  if (process.env.NODE_ENV === "development" && global._mongoIndexesPromise) {
    return global._mongoIndexesPromise;
  }
  if (indexesPromise) {
    return indexesPromise;
  }

  const promise = (async () => {
    try {
      const db = await getDb();
      const indexDefinitions = [
        { col: "users", spec: { email: 1 }, opts: { unique: true, name: "uniq_users_email" } },
        { col: "barbers", spec: { userId: 1 }, opts: { unique: true, name: "uniq_barber_owner" } },
        { col: "barbers", spec: { verificationStatus: 1, createdAt: -1 }, opts: { name: "barber_verification_created" } },
        { col: "bookings", spec: { userId: 1, createdAt: -1 }, opts: { name: "booking_user_created" } },
        { col: "bookings", spec: { barberId: 1, timeSlot: 1, status: 1 }, opts: { name: "booking_barber_time_status" } },
        { col: "bookings", spec: { barberId: 1, status: 1, endTime: 1 }, opts: { name: "booking_barber_status_end" } },
        { col: "bookings", spec: { userId: 1, status: 1, timeSlot: 1 }, opts: { name: "booking_user_status_time" } },
        {
          col: "bookings",
          spec: { barberId: 1, reservationKeys: 1 },
          opts: {
            unique: true,
            partialFilterExpression: { "reservationKeys.0": { $exists: true } },
            name: "uniq_barber_active_minutes",
          },
        },
        {
          col: "bookings",
          spec: { userId: 1, reservationKeys: 1 },
          opts: {
            unique: true,
            partialFilterExpression: { "reservationKeys.0": { $exists: true } },
            name: "uniq_user_active_minutes",
          },
        },
        { col: "notifications", spec: { userId: 1, createdAt: -1 }, opts: { name: "notification_user_created" } },
        { col: "rate_limits", spec: { expiresAt: 1 }, opts: { expireAfterSeconds: 0, name: "rate_limit_ttl" } },
        { col: "password_reset_tokens", spec: { expiresAt: 1 }, opts: { expireAfterSeconds: 0, name: "password_reset_ttl" } },
        { col: "password_reset_tokens", spec: { tokenHash: 1 }, opts: { unique: true, name: "uniq_password_reset_token" } },
        { col: "password_reset_tokens", spec: { userId: 1 }, opts: { name: "password_reset_user" } },
        { col: "email_verification_tokens", spec: { expiresAt: 1 }, opts: { expireAfterSeconds: 0, name: "email_verification_ttl" } },
        { col: "email_verification_tokens", spec: { tokenHash: 1 }, opts: { unique: true, name: "uniq_email_verification_token" } },
        { col: "email_verification_tokens", spec: { userId: 1 }, opts: { name: "email_verification_user" } },
        { col: "system_locks", spec: { expiresAt: 1 }, opts: { expireAfterSeconds: 0, name: "system_lock_ttl" } },
        { col: "audit_logs", spec: { createdAt: -1 }, opts: { name: "audit_created" } },
        { col: "reviews", spec: { bookingId: 1 }, opts: { unique: true, name: "uniq_review_booking" } },
        { col: "reviews", spec: { barberId: 1, createdAt: -1 }, opts: { name: "review_barber_created" } },
        { col: "reviews", spec: { userId: 1, createdAt: -1 }, opts: { name: "review_user_created" } },
        { col: "mobile_sessions", spec: { refreshHash: 1 }, opts: { unique: true, sparse: true, name: "uniq_mobile_session_refresh" } },
        { col: "mobile_sessions", spec: { expiresAt: 1 }, opts: { expireAfterSeconds: 0, name: "mobile_session_ttl" } },
        { col: "mobile_sessions", spec: { userId: 1, isRevoked: 1 }, opts: { name: "mobile_session_user_revoked" } },
        { col: "mobile_sessions", spec: { familyId: 1 }, opts: { name: "mobile_session_family" } },
        { col: "devices", spec: { userId: 1, deviceId: 1 }, opts: { unique: true, name: "uniq_user_device" } },
        { col: "devices", spec: { pushToken: 1 }, opts: { sparse: true, name: "idx_devices_push_token" } },
        { col: "idempotency_keys", spec: { expiresAt: 1 }, opts: { expireAfterSeconds: 0, name: "idempotency_key_ttl" } },
        { col: "favourites", spec: { userId: 1, barberId: 1 }, opts: { unique: true, name: "uniq_user_favourite" } },
        { col: "consents", spec: { userId: 1, createdAt: -1 }, opts: { name: "consent_user_created" } },
        { col: "barbers", spec: { location: "2dsphere" }, opts: { name: "barber_geo_2dsphere", sparse: true } },
      ];

      const results = await Promise.allSettled(
        indexDefinitions.map(async ({ col, spec, opts }) => {
          try {
            return await db.collection(col).createIndex(spec, opts);
          } catch (err) {
            if (err?.codeName === "IndexOptionsConflict" || err?.code === 85) {
              if (opts?.name) {
                await db.collection(col).dropIndex(opts.name).catch(() => {});
                return await db.collection(col).createIndex(spec, opts);
              }
            }
            throw err;
          }
        })
      );

      results.forEach((res, i) => {
        if (res.status === "rejected") {
          console.warn(`[indexes] Non-fatal index creation warning for ${indexDefinitions[i].col}:`, res.reason?.message || res.reason);
        }
      });
    } catch (error) {
      console.warn("[indexes] Failed to ensure database indexes safely:", error?.message || error);
    }
    return true;
  })();

  if (process.env.NODE_ENV === "development") {
    global._mongoIndexesPromise = promise;
  }
  indexesPromise = promise;

  return promise;
}
