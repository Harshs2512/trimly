import { MongoClient } from "mongodb";

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
    db.collection("bookings").createIndex(
      { barberId: 1, reservationKeys: 1 },
      { unique: true, sparse: true, name: "uniq_barber_active_minutes" },
    ),
    db.collection("bookings").createIndex(
      { userId: 1, reservationKeys: 1 },
      { unique: true, sparse: true, name: "uniq_user_active_minutes" },
    ),
    db.collection("notifications").createIndex({ userId: 1, createdAt: -1 }, { name: "notification_user_created" }),
    db.collection("rate_limits").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "rate_limit_ttl" }),
    db.collection("password_reset_tokens").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "password_reset_ttl" }),
    db.collection("password_reset_tokens").createIndex({ tokenHash: 1 }, { unique: true, name: "uniq_password_reset_token" }),
    db.collection("email_verification_tokens").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "email_verification_ttl" }),
    db.collection("email_verification_tokens").createIndex({ tokenHash: 1 }, { unique: true, name: "uniq_email_verification_token" }),
    db.collection("audit_logs").createIndex({ createdAt: -1 }, { name: "audit_created" }),
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
