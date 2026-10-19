import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getActiveSession } from "@/lib/authz";
import { reviewCreateSchema } from "@/lib/validations";
import { parsePagination, safeInternalError, rejectCrossSiteRequest } from "@/lib/api";
import { ensureIndexes } from "@/lib/indexes";
import { recalculateBarberRating } from "@/lib/reviews";

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const barberId = url.searchParams.get("barberId")?.trim();
    if (!barberId) {
      return Response.json({ error: "Barber ID is required" }, { status: 400 });
    }

    const { page, limit, skip } = parsePagination(url.searchParams, { defaultLimit: 10, maxLimit: 50 });
    const db = await getDb();

    // Support both direct barberId and ObjectId matching
    const query = {
      $or: [
        { barberId },
        ...(ObjectId.isValid(barberId) ? [{ barberId: new ObjectId(barberId) }] : []),
      ],
      deletedAt: { $exists: false },
    };

    const reviewsCol = db.collection("reviews");
    const [total, list] = await Promise.all([
      reviewsCol.countDocuments(query),
      reviewsCol.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    ]);

    // Compute star breakdown summary
    const allBarberReviews = await reviewsCol.find(query, { projection: { rating: 1 } }).toArray();
    const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalScore = 0;
    for (const r of allBarberReviews) {
      const star = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 0)));
      ratingBreakdown[star] = (ratingBreakdown[star] || 0) + 1;
      totalScore += star;
    }
    const averageRating = allBarberReviews.length > 0 ? Number((totalScore / allBarberReviews.length).toFixed(1)) : 0;

    const formattedReviews = list.map((item) => ({
      _id: item._id.toString(),
      barberId: String(item.barberId),
      userId: String(item.userId),
      userName: item.userName || "Customer",
      bookingId: String(item.bookingId),
      serviceName: item.serviceName || "",
      rating: item.rating,
      comment: item.comment || "",
      createdAt: item.createdAt?.toISOString?.() || item.createdAt,
    }));

    return Response.json({
      reviews: formattedReviews,
      stats: {
        averageRating,
        reviewCount: allBarberReviews.length,
        ratingBreakdown,
      },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    return safeInternalError(error, "reviews-list");
  }
}

export async function POST(request) {
  try {
    const originError = rejectCrossSiteRequest(request);
    if (originError) return originError;

    await ensureIndexes();
    const session = await getActiveSession();
    if (!session) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const json = await request.json();
    const validation = reviewCreateSchema.safeParse(json);
    if (!validation.success) {
      return Response.json({ error: validation.error.flatten() }, { status: 400 });
    }

    const { barberId, bookingId, rating, comment } = validation.data;
    const db = await getDb();

    const { createReview } = await import("@/lib/reviews");
    const result = await createReview(db, {
      user: session.user,
      barberId,
      bookingId,
      rating,
      comment,
    });

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json(
      {
        ok: true,
        message: "Review submitted successfully",
        review: {
          _id: result.review._id.toString(),
          rating: Number(result.review.rating),
          comment: result.review.comment || "",
        },
        stats: result.stats,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error?.code === 11000) {
      return Response.json(
        { error: "You have already submitted a review for this appointment." },
        { status: 409 }
      );
    }
    return safeInternalError(error, "review-create");
  }
}
