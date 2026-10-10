import test from "node:test";
import assert from "node:assert/strict";
import { ObjectId } from "mongodb";
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
import { recalculateBarberRating } from "../src/lib/reviews.js";
import { reviewCreateSchema } from "../src/lib/validations.js";

const TEST_RUN_ID = `rev_${Date.now().toString(36)}`;

test("Customer Review & Rating System Workflow Test", async (t) => {
  const db = await getDb();
  await ensureIndexes();

  const customerId = new ObjectId().toString();
  const barberProfileId = new ObjectId();
  const booking1Id = new ObjectId().toString();
  const booking2Id = new ObjectId().toString();

  // Seed test barber
  await db.collection("barbers").insertOne({
    _id: barberProfileId,
    shopName: `Test Review Shop ${TEST_RUN_ID}`,
    address: "123 Review Way",
    verificationStatus: "verified",
    averageRating: 0,
    reviewCount: 0,
    createdAt: new Date(),
  });

  // Seed completed booking
  await db.collection("bookings").insertOne({
    _id: new ObjectId(booking1Id),
    userId: customerId,
    barberId: barberProfileId.toString(),
    service: "Deluxe Haircut",
    status: "completed",
    timeSlot: new Date(Date.now() - 3600000).toISOString(),
    createdAt: new Date(),
  });

  // Seed pending (uncompleted) booking
  await db.collection("bookings").insertOne({
    _id: new ObjectId(booking2Id),
    userId: customerId,
    barberId: barberProfileId.toString(),
    service: "Beard Trim",
    status: "pending",
    timeSlot: new Date(Date.now() + 86400000).toISOString(),
    createdAt: new Date(),
  });

  await t.test("1. Schema validation validates rating and length limits", () => {
    // Valid 5 star
    const valid = reviewCreateSchema.safeParse({
      barberId: barberProfileId.toString(),
      bookingId: booking1Id,
      rating: 5,
      comment: "Incredible attention to detail!",
    });
    assert.equal(valid.success, true);

    // Invalid rating (0 or 6)
    const invalidRating = reviewCreateSchema.safeParse({
      barberId: barberProfileId.toString(),
      bookingId: booking1Id,
      rating: 6,
    });
    assert.equal(invalidRating.success, false);

    // Invalid rating float
    const invalidFloat = reviewCreateSchema.safeParse({
      barberId: barberProfileId.toString(),
      bookingId: booking1Id,
      rating: 4.5,
    });
    assert.equal(invalidFloat.success, false);
  });

  await t.test("2. Submit review and calculate aggregate stats", async () => {
    const reviewDoc = {
      barberId: barberProfileId.toString(),
      bookingId: booking1Id,
      userId: customerId,
      userName: "Alex Customer",
      serviceName: "Deluxe Haircut",
      rating: 5,
      comment: "Best fade cut in town! Highly recommend.",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("reviews").insertOne(reviewDoc);

    const stats = await recalculateBarberRating(db, barberProfileId.toString());
    assert.equal(stats.reviewCount, 1);
    assert.equal(stats.averageRating, 5.0);
    assert.equal(stats.ratingBreakdown[5], 1);

    const updatedBarber = await db.collection("barbers").findOne({ _id: barberProfileId });
    assert.equal(updatedBarber.averageRating, 5.0);
    assert.equal(updatedBarber.reviewCount, 1);
  });

  await t.test("3. Unique index prevents duplicate reviews on same booking", async () => {
    let duplicateFailed = false;
    try {
      await db.collection("reviews").insertOne({
        barberId: barberProfileId.toString(),
        bookingId: booking1Id,
        userId: customerId,
        userName: "Alex Customer",
        rating: 4,
        createdAt: new Date(),
      });
    } catch (err) {
      duplicateFailed = err.code === 11000;
    }
    assert.equal(duplicateFailed, true, "Expected E11000 duplicate key on bookingId");
  });

  await t.test("4. Recalculate rating with multiple weighted reviews", async () => {
    const booking3Id = new ObjectId().toString();
    const review2Doc = {
      barberId: barberProfileId.toString(),
      bookingId: booking3Id,
      userId: new ObjectId().toString(),
      userName: "Sam Client",
      serviceName: "Hot Towel Shave",
      rating: 4,
      comment: "Very relaxing shave experience.",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.collection("reviews").insertOne(review2Doc);

    const stats = await recalculateBarberRating(db, barberProfileId.toString());
    assert.equal(stats.reviewCount, 2);
    assert.equal(stats.averageRating, 4.5); // (5 + 4) / 2 = 4.5
    assert.equal(stats.ratingBreakdown[5], 1);
    assert.equal(stats.ratingBreakdown[4], 1);

    const updatedBarber = await db.collection("barbers").findOne({ _id: barberProfileId });
    assert.equal(updatedBarber.averageRating, 4.5);
    assert.equal(updatedBarber.reviewCount, 2);
  });

  await t.test("5. Soft-deleting a review updates aggregate rating stats", async () => {
    // Soft delete the 4-star review
    await db.collection("reviews").updateOne(
      { bookingId: booking1Id },
      { $set: { deletedAt: new Date() } }
    );

    const stats = await recalculateBarberRating(db, barberProfileId.toString());
    assert.equal(stats.reviewCount, 1);
    assert.equal(stats.averageRating, 4.0); // Only review2 (4-star) remains active

    const updatedBarber = await db.collection("barbers").findOne({ _id: barberProfileId });
    assert.equal(updatedBarber.averageRating, 4.0);
    assert.equal(updatedBarber.reviewCount, 1);
  });

  await t.test("6. Cleanup test fixtures", async () => {
    await db.collection("reviews").deleteMany({ barberId: barberProfileId.toString() });
    await db.collection("bookings").deleteMany({ _id: { $in: [new ObjectId(booking1Id), new ObjectId(booking2Id)] } });
    await db.collection("barbers").deleteOne({ _id: barberProfileId });
  });

  const client = await clientPromise;
  await client.close();
});

