import test from "node:test";
import assert from "node:assert/strict";
import { ObjectId } from "mongodb";
import { getDb } from "../src/lib/mongodb.js";
import {
  calculateDistanceKm,
  isValidCoordinate,
  resolveCityCoordinates,
} from "../src/lib/geo.js";

test("Geo Discovery & Favorites Suite", async (t) => {
  const db = await getDb();

  await t.test("1. Great-Circle Distance Calculation (Haversine)", () => {
    // Delhi: 28.6139° N, 77.2090° E
    // Mumbai: 19.0760° N, 72.8777° E
    const distanceDelhiMumbai = calculateDistanceKm(28.6139, 77.209, 19.076, 72.8777);
    assert.ok(distanceDelhiMumbai > 1100 && distanceDelhiMumbai < 1200, "Distance should be ~1150 km");

    // Same location should be 0 km
    const zeroDist = calculateDistanceKm(28.6139, 77.209, 28.6139, 77.209);
    assert.equal(zeroDist, 0);
  });

  await t.test("2. Coordinate Range Validation", () => {
    assert.equal(isValidCoordinate(77.209, 28.6139), true);
    assert.equal(isValidCoordinate(181, 28.6139), false, "Longitude > 180 invalid");
    assert.equal(isValidCoordinate(77.209, 95), false, "Latitude > 90 invalid");
    assert.equal(isValidCoordinate(NaN, 28.6139), false);
  });

  await t.test("3. City Geocoding Resolution", () => {
    const delhiCoords = resolveCityCoordinates("Connaught Place, New Delhi");
    assert.deepEqual(delhiCoords, [77.209, 28.6139]);

    const mumbaiCoords = resolveCityCoordinates("Bandra West, Mumbai");
    assert.deepEqual(mumbaiCoords, [72.8777, 19.076]);
  });

  await t.test("4. User Favorites Workflow", async () => {
    const testUserId = `user-fav-${Date.now()}`;
    const testBarberId = new ObjectId();

    // Create mock barber
    await db.collection("barbers").insertOne({
      _id: testBarberId,
      name: "Favorite Barber",
      shopName: "Fav Shop",
      verificationStatus: "verified",
      createdAt: new Date(),
    });

    // Add favorite
    await db.collection("favourites").insertOne({
      userId: testUserId,
      barberId: testBarberId.toString(),
      createdAt: new Date(),
    });

    // Query favorites
    const favs = await db.collection("favourites").find({ userId: testUserId }).toArray();
    assert.equal(favs.length, 1);
    assert.equal(favs[0].barberId, testBarberId.toString());

    // Duplicate addition prevented by unique index or upsert
    await assert.rejects(
      async () => {
        await db.collection("favourites").insertOne({
          userId: testUserId,
          barberId: testBarberId.toString(),
          createdAt: new Date(),
        });
      },
      /E11000/
    );

    // Delete favorite
    await db.collection("favourites").deleteOne({
      userId: testUserId,
      barberId: testBarberId.toString(),
    });

    const emptyFavs = await db.collection("favourites").find({ userId: testUserId }).toArray();
    assert.equal(emptyFavs.length, 0);

    // Cleanup
    await db.collection("barbers").deleteOne({ _id: testBarberId });
  });

  const { default: clientPromise } = await import("../src/lib/mongodb.js");
  const client = await clientPromise;
  await client.close();
});
