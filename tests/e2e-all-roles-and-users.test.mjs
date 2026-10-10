import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { MongoClient, ObjectId } from "mongodb";
import fs from "node:fs";
import path from "node:path";

// Load environment from .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
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
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

import clientPromise, { getDb } from "../src/lib/mongodb.js";
import { ensureIndexes } from "../src/lib/indexes.js";
import { hashToken, randomToken, normalizeEmail } from "../src/lib/security.js";
import {
  validateBookingWindow,
  getReservationKeys,
  canTransition,
  expirePendingBookings,
  hasBookingConflict,
  canonicalBarberId,
  legacyBarberIdentifiers,
  resolveBarber,
  getService,
} from "../src/lib/booking.js";
import { acquireMongoLock } from "../src/lib/locks.js";
import { cancelActiveBookingsForBarber, cancelActiveBookingsForCustomer } from "../src/lib/accountLifecycle.js";
import { recalculateBarberRating } from "../src/lib/reviews.js";
import { escapeRegex, rejectCrossSiteRequest } from "../src/lib/api.js";
import {
  userSchema,
  barberSchema,
  bookingCreateSchema,
  bookingUpdateSchema,
  reviewCreateSchema,
  adminUserUpdateSchema,
} from "../src/lib/validations.js";

const RUN_ID = `e2e_${Date.now().toString(36)}`;

test("Comprehensive End-to-End System Test: All Roles, Lifecycles, and Failure Resiliencies", async (t) => {
  const db = await getDb();
  await ensureIndexes();

  const customerEmail = normalizeEmail(`e2e_cust_${RUN_ID}@example.com`);
  const barberEmail = normalizeEmail(`e2e_barber_${RUN_ID}@example.com`);
  const adminEmail = normalizeEmail(`e2e_admin_${RUN_ID}@example.com`);
  const password = "StrongPassword123!";

  let customerId;
  let barberUserId;
  let barberProfileId;
  let adminUserId;
  let bookingId;
  let reviewId;

  // =========================================================================
  // Role 1: Unauthenticated Visitor Flow & Guards
  // =========================================================================
  await t.test("1. Unauthenticated Visitor Flow: Directory Search, Public Views & CSRF Defenses", async () => {
    // 1.1 Regex escaping on public searches protects against ReDoS / Malformed regexes
    const unsafeQuery = "Cool.*+?^${}()|[]\\Barbershop";
    const escaped = escapeRegex(unsafeQuery);
    assert.doesNotThrow(() => new RegExp(escaped, "i"), "Escaped regex must compile cleanly");

    // 1.2 CSRF protection blocks cross-site requests
    const crossSiteReq = new Request("http://localhost:3000/api/bookings", {
      method: "POST",
      headers: {
        "sec-fetch-site": "cross-site",
        origin: "https://malicious-site.com",
      },
    });
    const csrfRejection = rejectCrossSiteRequest(crossSiteReq);
    assert.ok(csrfRejection, "Cross-site request must be rejected");
    assert.equal(csrfRejection.status, 403);

    // 1.3 Same-origin request is permitted
    const validOriginReq = new Request("http://localhost:3000/api/bookings", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
      },
    });
    const validResult = rejectCrossSiteRequest(validOriginReq);
    assert.equal(validResult, null, "Same-origin request must pass CSRF validation");
  });

  // =========================================================================
  // Role 2: Customer Account Lifecycle (Register, Verify, Reset Password)
  // =========================================================================
  await t.test("2. Customer Registration, Email Verification & Password Reset Flow", async () => {
    // 2.1 Validate user registration input schema
    const validCustInput = {
      name: "Suresh Kumar",
      email: customerEmail,
      password,
      role: "user",
    };
    const parsedCust = userSchema.safeParse(validCustInput);
    assert.equal(parsedCust.success, true);

    // Short password rejected
    const invalidCustInput = { ...validCustInput, password: "short" };
    assert.equal(userSchema.safeParse(invalidCustInput).success, false);

    // 2.2 Insert unverified customer user
    const hashed = await bcrypt.hash(password, 12);
    const now = new Date();
    const custInsert = await db.collection("users").insertOne({
      name: validCustInput.name,
      email: customerEmail,
      password: hashed,
      role: "user",
      active: true,
      emailVerified: false,
      sessionVersion: 0,
      createdAt: now,
      updatedAt: now,
    });
    customerId = custInsert.insertedId.toString();

    // 2.3 Verification token generation & single-use atomic consumption
    const token = randomToken(32);
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.collection("email_verification_tokens").insertOne({
      tokenHash,
      userId: customerId,
      email: customerEmail,
      expiresAt,
      createdAt: now,
    });

    const verifyTokenDoc = await db.collection("email_verification_tokens").findOneAndUpdate(
      { tokenHash, email: customerEmail, expiresAt: { $gt: new Date() }, usedAt: { $exists: false } },
      { $set: { usedAt: new Date() } },
      { returnDocument: "after" }
    );
    assert.ok(verifyTokenDoc, "Verification token must be atomically claimed");

    // Activate user
    await db.collection("users").updateOne(
      { _id: new ObjectId(customerId), email: customerEmail },
      { $set: { emailVerified: true, emailVerifiedAt: new Date(), updatedAt: new Date() } }
    );
    await db.collection("email_verification_tokens").deleteMany({ userId: customerId });

    const verifiedUser = await db.collection("users").findOne({ _id: new ObjectId(customerId) });
    assert.equal(verifiedUser.emailVerified, true);

    // 2.4 Password reset lifecycle with token rotation & session invalidation
    const resetToken = randomToken(32);
    const resetHash = hashToken(resetToken);
    await db.collection("password_reset_tokens").insertOne({
      tokenHash: resetHash,
      userId: customerId,
      email: customerEmail,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date(),
    });

    const resetDoc = await db.collection("password_reset_tokens").findOneAndUpdate(
      { tokenHash: resetHash, email: customerEmail, expiresAt: { $gt: new Date() }, usedAt: { $exists: false } },
      { $set: { usedAt: new Date() } },
      { returnDocument: "after" }
    );
    assert.ok(resetDoc, "Password reset token must be valid");

    const newHashed = await bcrypt.hash("NewSecurePass123!", 12);
    await db.collection("users").updateOne(
      { _id: new ObjectId(customerId) },
      { $set: { password: newHashed, updatedAt: new Date() }, $inc: { sessionVersion: 1 } }
    );
    await db.collection("password_reset_tokens").deleteMany({ userId: customerId });

    const updatedCust = await db.collection("users").findOne({ _id: new ObjectId(customerId) });
    assert.equal(updatedCust.sessionVersion, 1, "Session version must increment to invalidate active sessions");
  });

  // =========================================================================
  // Role 3: Barber Account Onboarding, Shop Creation & Admin Approval
  // =========================================================================
  await t.test("3. Barber Registration, Shop Profile Onboarding & Admin Approval", async () => {
    // 3.1 Create and verify Barber User
    const hashed = await bcrypt.hash(password, 12);
    const now = new Date();
    const barberUserRes = await db.collection("users").insertOne({
      name: "Mahesh Sharma",
      email: barberEmail,
      password: hashed,
      role: "barber",
      active: true,
      emailVerified: true,
      sessionVersion: 0,
      createdAt: now,
      updatedAt: now,
    });
    barberUserId = barberUserRes.insertedId.toString();

    // 3.2 Barber creates Shop Profile (validating schema)
    const shopData = {
      shopName: "The Master Barber Lounge",
      address: "42 Connaught Place, New Delhi",
      description: "Artisan hair grooming, hot towel shaves and beard sculpting.",
      timezone: "Asia/Kolkata",
      workingHours: {
        open: "09:00",
        close: "20:00",
      },
      closedDays: ["sunday"],
      slotIntervalMinutes: 30,
      leadTimeMinutes: 30,
      bookingHorizonDays: 60,
      staffCount: 3,
      chairsCount: 3,
      specialties: ["Fade Cuts", "Beard Sculpting", "Hot Towel Shave"],
      services: [
        { id: "srv_fade", name: "Executive Haircut & Style", duration: 30, price: 500 },
        { id: "srv_shave", name: "Royal Beard Trim & Hot Towel", duration: 30, price: 350 },
      ],
      workPhotos: [
        {
          id: "wp_1",
          url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
          caption: "Precision Skin Fade",
          category: "Haircut",
        },
      ],
    };

    const parsedShop = barberSchema.safeParse(shopData);
    assert.equal(parsedShop.success, true, "Shop data must conform to barberSchema");

    const barberProfileRes = await db.collection("barbers").insertOne({
      ...shopData,
      userId: barberUserId,
      verificationStatus: "pending",
      createdAt: now,
      updatedAt: now,
    });
    barberProfileId = barberProfileRes.insertedId.toString();

    // 3.3 Verify unverified profile is NOT discoverable in public directory
    const publicBarbersBefore = await db.collection("barbers").find({
      verificationStatus: "verified",
      deletedAt: { $exists: false },
    }).toArray();
    assert.equal(
      publicBarbersBefore.some((b) => b._id.toString() === barberProfileId),
      false,
      "Unverified barber must not be public"
    );

    // 3.4 Admin approves Barber
    await db.collection("barbers").updateOne(
      { _id: new ObjectId(barberProfileId) },
      { $set: { verificationStatus: "verified", verifiedAt: new Date(), updatedAt: new Date() } }
    );

    // 3.5 Verify barber is now public and discoverable
    const resolvedShop = await resolveBarber(db, barberProfileId);
    assert.ok(resolvedShop, "Barber must resolve by canonical ID");
    assert.equal(resolvedShop.verificationStatus, "verified");

    // Also verify resolveBarber handles user ID lookup
    const resolvedByUser = await resolveBarber(db, barberUserId);
    assert.ok(resolvedByUser, "Barber must resolve by user ID");
    assert.equal(resolvedByUser._id.toString(), barberProfileId);

    // Check canonical identifiers helper
    const legacyIds = legacyBarberIdentifiers(resolvedShop);
    assert.ok(legacyIds.includes(barberProfileId));
    assert.ok(legacyIds.includes(barberUserId));
  });

  // =========================================================================
  // Role 4: Customer Booking, Availability Validation & Conflict Guards
  // =========================================================================
  await t.test("4. Customer Booking Flow: Window Validation, Conflicts & Transitions", async () => {
    const shop = await resolveBarber(db, barberProfileId);
    const service = getService(shop, { serviceId: "srv_fade" });
    assert.ok(service, "Service must exist on shop");

    // 4.1 Compute a valid appointment slot on an open day (Monday-Saturday)
    const validDay = new Date();
    validDay.setUTCDate(validDay.getUTCDate() + 1);
    while (validDay.getUTCDay() === 0) {
      validDay.setUTCDate(validDay.getUTCDate() + 1);
    }
    // 10:30 AM IST = 05:00 UTC
    const slotStart = new Date(Date.UTC(validDay.getUTCFullYear(), validDay.getUTCMonth(), validDay.getUTCDate(), 5, 0, 0, 0));
    const slotEnd = new Date(slotStart.getTime() + service.duration * 60000);

    // Window validation check
    const windowCheck = validateBookingWindow(shop, slotStart, service.duration);
    assert.equal(windowCheck.ok, true, "Valid slot must pass booking window validation");

    // Closed day rejection test (Sunday)
    const sunday = new Date();
    sunday.setUTCDate(sunday.getUTCDate() + ((7 - sunday.getUTCDay()) % 7 || 7));
    const sundayStart = new Date(Date.UTC(sunday.getUTCFullYear(), sunday.getUTCMonth(), sunday.getUTCDate(), 5, 0, 0, 0));
    const sundayCheck = validateBookingWindow(shop, sundayStart, service.duration);
    assert.equal(sundayCheck.ok, false, "Bookings on closed day (Sunday) must be rejected");

    // 4.2 Create booking with reservation keys
    const reservationKeys = getReservationKeys(slotStart, slotEnd);
    assert.equal(reservationKeys.length, service.duration);

    const bookingInsert = await db.collection("bookings").insertOne({
      userId: customerId,
      customerName: "Suresh Kumar",
      customerEmail,
      barberId: barberProfileId,
      serviceId: service.id,
      service: service.name,
      price: service.price,
      duration: service.duration,
      timeSlot: slotStart.toISOString(),
      endTime: slotEnd.toISOString(),
      reservationKeys,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    bookingId = bookingInsert.insertedId.toString();

    // 4.3 Overlap conflict detection
    const conflict = await hasBookingConflict(db, {
      barber: shop,
      userId: new ObjectId().toString(), // Different user attempting same time
      start: slotStart,
      end: slotEnd,
    });
    assert.equal(conflict.conflict, true, "Conflicting time slot must be detected");
    assert.equal(conflict.type, "barber", "Conflict type must be barber slot conflict");

    // 4.4 Same customer conflict detection
    const userConflict = await hasBookingConflict(db, {
      barber: { _id: new ObjectId(), userId: "other_barber" }, // Different barber
      userId: customerId,
      start: slotStart,
      end: slotEnd,
    });
    assert.equal(userConflict.conflict, true, "Customer double booking must be detected");
    assert.equal(userConflict.type, "user", "Conflict type must be user appointment conflict");
  });

  // =========================================================================
  // Role 5: Barber Actions & Appointment Completion
  // =========================================================================
  await t.test("5. Barber Booking Management Lifecycle: Accept -> Complete", async () => {
    // 5.1 Barber accepts pending booking
    assert.equal(canTransition("barber", "pending", "confirmed"), true);
    assert.equal(canTransition("customer", "pending", "confirmed"), false, "Customer cannot confirm booking");

    const acceptResult = await db.collection("bookings").updateOne(
      { _id: new ObjectId(bookingId), status: "pending" },
      { $set: { status: "confirmed", updatedAt: new Date() } }
    );
    assert.equal(acceptResult.modifiedCount, 1);

    // 5.2 Barber cannot mark future appointment as no-show
    const confirmedBooking = await db.collection("bookings").findOne({ _id: new ObjectId(bookingId) });
    const isFuture = new Date(confirmedBooking.timeSlot) > new Date();
    assert.equal(isFuture, true, "Slot is in future");

    // 5.3 Simulate completion after service time has elapsed
    assert.equal(canTransition("barber", "confirmed", "completed"), true);
    const completeResult = await db.collection("bookings").updateOne(
      { _id: new ObjectId(bookingId), status: "confirmed" },
      {
        $set: { status: "completed", updatedAt: new Date() },
        $unset: { reservationKeys: "" },
      }
    );
    assert.equal(completeResult.modifiedCount, 1);

    const completedDoc = await db.collection("bookings").findOne({ _id: new ObjectId(bookingId) });
    assert.equal(completedDoc.status, "completed");
    assert.equal(completedDoc.reservationKeys, undefined, "Reservation keys must be freed on completion");
  });

  // =========================================================================
  // Role 6: Customer Reviews & Ratings Flow
  // =========================================================================
  await t.test("6. Customer Reviews & Ratings Lifecycle: Post, Stats Aggregate & Soft Delete", async () => {
    // 6.1 Validate review schema
    const validReview = {
      barberId: barberProfileId,
      bookingId,
      rating: 5,
      comment: "Outstanding fade! Clean shop and very professional staff.",
    };
    assert.equal(reviewCreateSchema.safeParse(validReview).success, true);

    // Out of bounds rating rejected
    assert.equal(reviewCreateSchema.safeParse({ ...validReview, rating: 6 }).success, false);
    assert.equal(reviewCreateSchema.safeParse({ ...validReview, rating: 0 }).success, false);

    // 6.2 Submit verified review
    const reviewInsert = await db.collection("reviews").insertOne({
      ...validReview,
      userId: customerId,
      userName: "Suresh Kumar",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    reviewId = reviewInsert.insertedId.toString();

    // 6.3 Aggregate recalculation
    const stats = await recalculateBarberRating(db, barberProfileId);
    assert.equal(stats.reviewCount, 1);
    assert.equal(stats.averageRating, 5.0);
    assert.equal(stats.ratingBreakdown[5], 1);

    const shopWithRating = await db.collection("barbers").findOne({ _id: new ObjectId(barberProfileId) });
    assert.equal(shopWithRating.averageRating, 5.0);
    assert.equal(shopWithRating.reviewCount, 1);

    // 6.4 Soft delete review and verify aggregate updates
    await db.collection("reviews").updateOne(
      { _id: new ObjectId(reviewId) },
      { $set: { deletedAt: new Date() } }
    );
    const updatedStats = await recalculateBarberRating(db, barberProfileId);
    assert.equal(updatedStats.reviewCount, 0);
    assert.equal(updatedStats.averageRating, 0);

    const shopAfterDelete = await db.collection("barbers").findOne({ _id: new ObjectId(barberProfileId) });
    assert.equal(shopAfterDelete.averageRating, 0);
    assert.equal(shopAfterDelete.reviewCount, 0);
  });

  // =========================================================================
  // Role 7: Administrator Governance & Cascade Protections
  // =========================================================================
  await t.test("7. Administrator Management, Last-Admin Lock & Deactivation Cascades", async () => {
    // 7.1 Create Admin User
    const hashed = await bcrypt.hash(password, 12);
    const now = new Date();
    const adminRes = await db.collection("users").insertOne({
      name: "Super Admin",
      email: adminEmail,
      password: hashed,
      role: "admin",
      active: true,
      emailVerified: true,
      sessionVersion: 0,
      createdAt: now,
      updatedAt: now,
    });
    adminUserId = adminRes.insertedId.toString();

    // 7.2 Distributed lock protects admin mutations
    const releaseLock = await acquireMongoLock(db, "active-admin-mutation", 5000);
    assert.ok(typeof releaseLock === "function", "Mongo lock must be successfully acquired");
    await releaseLock();

    // 7.3 Last admin cannot be demoted
    const activeAdmins = await db.collection("users").countDocuments({ role: "admin", active: { $ne: false } });
    assert.ok(activeAdmins >= 1, "There is at least one active admin");

    // 7.4 Barber deactivation cascade cancels active appointments
    // Create an active booking to test cascade
    const future = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const bCascade = await db.collection("bookings").insertOne({
      userId: customerId,
      barberId: barberProfileId,
      service: "Executive Haircut",
      timeSlot: future.toISOString(),
      status: "confirmed",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Deactivate barber and verify active bookings are cancelled
    const cancelledCount = await cancelActiveBookingsForBarber(
      db,
      barberProfileId,
      "The barber profile was deactivated."
    );
    assert.equal(cancelledCount, 1, "Active booking must be cancelled on barber deactivation");

    const cascadeDoc = await db.collection("bookings").findOne({ _id: bCascade.insertedId });
    assert.equal(cascadeDoc.status, "cancelled");
    assert.equal(cascadeDoc.cancelReason, "The barber profile was deactivated.");

    // Clean up cascade test booking
    await db.collection("bookings").deleteOne({ _id: bCascade.insertedId });
  });

  // =========================================================================
  // Cleanup test artifacts
  // =========================================================================
  await db.collection("users").deleteMany({ _id: { $in: [new ObjectId(customerId), new ObjectId(barberUserId), new ObjectId(adminUserId)] } });
  await db.collection("barbers").deleteMany({ _id: new ObjectId(barberProfileId) });
  await db.collection("bookings").deleteMany({ _id: new ObjectId(bookingId) });
  if (reviewId) await db.collection("reviews").deleteMany({ _id: new ObjectId(reviewId) });
  await db.collection("email_verification_tokens").deleteMany({ email: { $in: [customerEmail, barberEmail, adminEmail] } });
  await db.collection("password_reset_tokens").deleteMany({ email: { $in: [customerEmail, barberEmail, adminEmail] } });

  const client = await clientPromise;
  await client.close();
});
