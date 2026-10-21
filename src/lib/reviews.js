import { ObjectId } from "mongodb";

/**
 * Recalculates and stores aggregate rating statistics for a barber.
 * @param {import('mongodb').Db} db
 * @param {string|ObjectId} barberId
 * @returns {Promise<{ averageRating: number, reviewCount: number, ratingBreakdown: Record<number, number> }>}
 */
export async function recalculateBarberRating(db, barberId) {
  const barberIdStr = String(barberId);
  const reviews = await db
    .collection("reviews")
    .find({
      $or: [
        { barberId: barberIdStr },
        ...(ObjectId.isValid(barberIdStr) ? [{ barberId: new ObjectId(barberIdStr) }] : []),
      ],
      deletedAt: { $exists: false },
    })
    .toArray();

  const reviewCount = reviews.length;
  const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  let totalScore = 0;
  for (const review of reviews) {
    const rating = Math.min(5, Math.max(1, Math.round(Number(review.rating) || 0)));
    ratingBreakdown[rating] = (ratingBreakdown[rating] || 0) + 1;
    totalScore += rating;
  }

  const averageRating = reviewCount > 0 ? Number((totalScore / reviewCount).toFixed(1)) : 0;

  // Update barber document with new aggregate stats
  const barberFilter = ObjectId.isValid(barberIdStr)
    ? { $or: [{ _id: new ObjectId(barberIdStr) }, { userId: barberIdStr }] }
    : { userId: barberIdStr };

  await db.collection("barbers").updateOne(barberFilter, {
    $set: {
      averageRating,
      reviewCount,
      updatedAt: new Date(),
    },
  });

  return { averageRating, reviewCount, ratingBreakdown };
}

/**
 * Shared domain logic for submitting reviews across web and mobile.
 */
export async function createReview(db, { user, barberId, bookingId, rating, comment }) {
  const bookingQuery = ObjectId.isValid(bookingId)
    ? { _id: new ObjectId(bookingId) }
    : { _id: bookingId };

  const booking = await db.collection("bookings").findOne(bookingQuery);
  if (!booking) {
    return { ok: false, status: 404, code: "BOOKING_NOT_FOUND", error: "Appointment booking not found." };
  }

  if (String(booking.userId) !== String(user.id)) {
    return { ok: false, status: 403, code: "FORBIDDEN", error: "You can only review your own appointments." };
  }

  const isCompleted =
    booking.status === "completed" ||
    (booking.status === "confirmed" && new Date(booking.timeSlot).getTime() <= Date.now());

  if (!isCompleted) {
    return {
      ok: false,
      status: 400,
      code: "BOOKING_NOT_COMPLETED",
      error: "You can only review appointments that have been completed.",
    };
  }

  // Check duplicate review
  const existing = await db.collection("reviews").findOne({ bookingId: String(bookingId) });
  if (existing && !existing.deletedAt) {
    return {
      ok: false,
      status: 409,
      code: "ALREADY_REVIEWED",
      error: "You have already submitted a review for this appointment.",
    };
  }

  // Resolve barber canonical profile id
  const targetBarber = await db.collection("barbers").findOne(
    ObjectId.isValid(barberId)
      ? { $or: [{ _id: new ObjectId(barberId) }, { userId: barberId }] }
      : { userId: barberId }
  );

  const canonicalBarberId = targetBarber ? targetBarber._id.toString() : barberId;
  const now = new Date();

  const newReviewDoc = {
    barberId: canonicalBarberId,
    bookingId: String(bookingId),
    userId: user.id,
    userName: user.name || "Customer",
    serviceName: booking.service || "Grooming Service",
    rating: Number(rating),
    comment: comment || "",
    createdAt: now,
    updatedAt: now,
  };

  let review;
  if (existing?.deletedAt) {
    await db.collection("reviews").updateOne(
      { _id: existing._id },
      {
        $set: { ...newReviewDoc, updatedAt: now },
        $unset: { deletedAt: "" },
      }
    );
    review = { ...newReviewDoc, _id: existing._id };
  } else {
    const insertResult = await db.collection("reviews").insertOne(newReviewDoc);
    review = { ...newReviewDoc, _id: insertResult.insertedId };
  }

  // Recalculate aggregate stats
  const stats = await recalculateBarberRating(db, canonicalBarberId);

  // Notify barber
  if (targetBarber?.userId) {
    const { createNotification } = await import("./notifications.js");
    await createNotification(db, {
      userId: targetBarber.userId,
      type: "review_received",
      message: `You received a new ${rating}-star review for ${booking.service || "your service"}.`,
      bookingId: String(bookingId),
    });
  }

  return { ok: true, review, stats };
}

