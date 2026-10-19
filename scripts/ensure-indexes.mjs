import { MongoClient } from "mongodb";
import fs from "node:fs";
import path from "node:path";

if (!process.env.MONGODB_URI) {
  for (const envFile of [".env.local", ".env"]) {
    const fullPath = path.resolve(process.cwd(), envFile);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
      break;
    }
  }
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "trimly";

if (!uri) {
  console.error("MONGODB_URI is required.");
  process.exit(1);
}

const client = new MongoClient(uri);

async function main() {
  await client.connect();
  const db = client.db(dbName);

  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true, name: "uniq_users_email" }),
    db.collection("barbers").createIndex({ userId: 1 }, { unique: true, name: "uniq_barber_owner" }),
    db.collection("barbers").createIndex({ verificationStatus: 1, createdAt: -1 }, { name: "barber_verification_created" }),
    db.collection("bookings").createIndex({ userId: 1, createdAt: -1 }, { name: "booking_user_created" }),
    db.collection("bookings").createIndex({ barberId: 1, timeSlot: 1, status: 1 }, { name: "booking_barber_time_status" }),
    // Drop old sparse indexes if migrating to partialFilterExpression
    await Promise.allSettled([
      db.collection("bookings").dropIndex("uniq_barber_active_minutes"),
      db.collection("bookings").dropIndex("uniq_user_active_minutes"),
    ]),
    db.collection("bookings").createIndex(
      { barberId: 1, reservationKeys: 1 },
      {
        unique: true,
        partialFilterExpression: { "reservationKeys.0": { $exists: true } },
        name: "uniq_barber_active_minutes",
      },
    ),
    db.collection("bookings").createIndex(
      { userId: 1, reservationKeys: 1 },
      {
        unique: true,
        partialFilterExpression: { "reservationKeys.0": { $exists: true } },
        name: "uniq_user_active_minutes",
      },
    ),
    db.collection("notifications").createIndex({ userId: 1, createdAt: -1 }, { name: "notification_user_created" }),
    db.collection("rate_limits").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "rate_limit_ttl" }),
    db.collection("password_reset_tokens").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "password_reset_ttl" }),
    db.collection("password_reset_tokens").createIndex({ tokenHash: 1 }, { unique: true, name: "uniq_password_reset_token" }),
    db.collection("email_verification_tokens").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "email_verification_ttl" }),
    db.collection("email_verification_tokens").createIndex({ tokenHash: 1 }, { unique: true, name: "uniq_email_verification_token" }),
    db.collection("audit_logs").createIndex({ createdAt: -1 }, { name: "audit_created" }),
    db.collection("reviews").createIndex({ bookingId: 1 }, { unique: true, name: "uniq_review_booking" }),
    db.collection("reviews").createIndex({ barberId: 1, createdAt: -1 }, { name: "review_barber_created" }),
    db.collection("reviews").createIndex({ userId: 1, createdAt: -1 }, { name: "review_user_created" }),
    db.collection("mobile_sessions").createIndex({ refreshHash: 1 }, { unique: true, sparse: true, name: "uniq_mobile_session_refresh" }),
    db.collection("mobile_sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "mobile_session_ttl" }),
    db.collection("mobile_sessions").createIndex({ userId: 1, isRevoked: 1 }, { name: "mobile_session_user_revoked" }),
    db.collection("mobile_sessions").createIndex({ familyId: 1 }, { name: "mobile_session_family" }),
    db.collection("devices").createIndex({ userId: 1, deviceId: 1 }, { unique: true, name: "uniq_user_device" }),
    db.collection("devices").createIndex({ pushToken: 1 }, { sparse: true, name: "idx_devices_push_token" }),
    db.collection("idempotency_keys").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "idempotency_key_ttl" }),
    db.collection("favourites").createIndex({ userId: 1, barberId: 1 }, { unique: true, name: "uniq_user_favourite" }),
    db.collection("consents").createIndex({ userId: 1, createdAt: -1 }, { name: "consent_user_created" }),
    db.collection("barbers").createIndex({ location: "2dsphere" }, { name: "barber_geo_2dsphere", sparse: true }),
  ]);

  console.log(`Indexes ensured for database '${dbName}'.`);
}

main()
  .catch((error) => {
    console.error("Failed to ensure indexes:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.close();
  });
