import { getDb } from "@/lib/mongodb";

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
        { col: "bookings", spec: { barberId: 1, reservationKeys: 1 }, opts: { unique: true, sparse: true, name: "uniq_barber_active_minutes" } },
        { col: "bookings", spec: { userId: 1, reservationKeys: 1 }, opts: { unique: true, sparse: true, name: "uniq_user_active_minutes" } },
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
      ];

      const results = await Promise.allSettled(
        indexDefinitions.map(({ col, spec, opts }) =>
          db.collection(col).createIndex(spec, opts)
        )
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
