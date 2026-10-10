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
