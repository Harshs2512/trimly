import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getMobileSession } from "@/lib/mobileAuth";
import { reviewCreateSchema } from "@/lib/validations";
import { enforceMobileRateLimit } from "@/lib/rateLimit";
import { createReview } from "@/lib/reviews";
import {
  enforceAppVersion,
  getRequestId,
  mobileError,
  mobileSuccess,
  serializeReview,
} from "@/lib/mobileResponse";

export async function GET(request) {
  const versionError = enforceAppVersion(request);
  if (versionError) return versionError;

  const requestId = getRequestId(request);
  try {
    const { searchParams } = new URL(request.url);
    const barberId = searchParams.get("barberId")?.trim();
    const myReviews = searchParams.get("myReviews") === "true";
    const userIdParam = searchParams.get("userId")?.trim();
    const ratingParam = searchParams.get("rating")?.trim();
    const search = searchParams.get("search")?.trim();
    const sortBy = searchParams.get("sortBy") || "newest";

    const cursor = searchParams.get("cursor");
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10), 1), 50);

    const query = {
      deletedAt: { $exists: false },
      moderationStatus: { $ne: "flagged" },
    };

    const db = await getDb();

    if (myReviews) {
      const auth = await getMobileSession(request);
      if (!auth.session) {
        return auth.error;
      }
      query.userId = auth.session.user.id;
    } else if (userIdParam) {
      query.userId = userIdParam;
    }

    if (barberId) {
      const barberDoc = await db.collection("barbers").findOne({
        $or: [
          ...(ObjectId.isValid(barberId) ? [{ _id: new ObjectId(barberId) }] : []),
          { userId: barberId },
          { _id: barberId },
        ],
      });
      const validBarberIds = new Set([barberId]);
      if (barberDoc) {
        validBarberIds.add(barberDoc._id.toString());
        if (barberDoc.userId) validBarberIds.add(String(barberDoc.userId));
      }
      query.$or = Array.from(validBarberIds).flatMap((bid) => [
        { barberId: bid },
        ...(ObjectId.isValid(bid) ? [{ barberId: new ObjectId(bid) }] : []),
      ]);
    }

    if (ratingParam) {
      const parsed = parseInt(ratingParam, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) {
        query.rating = parsed;
      }
    }

    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      const searchConditions = [
        { serviceName: searchRegex },
        { comment: searchRegex },
        { userName: searchRegex },
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    let sortObj = { _id: -1 };
    if (sortBy === "highest") {
      sortObj = { rating: -1, _id: -1 };
    } else if (sortBy === "lowest") {
      sortObj = { rating: 1, _id: -1 };
    } else if (sortBy === "oldest") {
      sortObj = { _id: 1 };
    }

    if (cursor && ObjectId.isValid(cursor)) {
      query._id = { $lt: new ObjectId(cursor) };
    }

    const reviews = await db
      .collection("reviews")
      .find(query)
      .sort(sortObj)
      .limit(limit + 1)
      .toArray();

    // Populate barber details
    const barberIds = [...new Set(reviews.map((r) => String(r.barberId)).filter(Boolean))];
    const objectBarberIds = barberIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
    const barbers = barberIds.length
      ? await db.collection("barbers").find(
          {
            $or: [
              ...(objectBarberIds.length ? [{ _id: { $in: objectBarberIds } }] : []),
              { userId: { $in: barberIds } },
              { _id: { $in: barberIds } },
            ],
          },
          { projection: { shopName: 1, address: 1, userId: 1 } }
        ).toArray()
      : [];

    const barberMap = new Map();
    for (const b of barbers) {
      barberMap.set(b._id.toString(), b);
      if (b.userId) barberMap.set(String(b.userId), b);
    }

    const enriched = reviews.map((r) => {
      const barber = barberMap.get(String(r.barberId));
      return {
        ...r,
        barberProfileId: barber?._id?.toString() || String(r.barberId),
        barberShopName: barber?.shopName || r.barberShopName || "Barber Shop",
        barberAddress: barber?.address || "",
      };
    });

    const hasMore = enriched.length > limit;
    const items = (hasMore ? enriched.slice(0, limit) : enriched).map(serializeReview);
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

    // Compute basic rating breakdown and average for context
    const baseStatsQuery = {
      deletedAt: { $exists: false },
      moderationStatus: { $ne: "flagged" },
    };
    if (barberId) {
      baseStatsQuery.$or = [
        { barberId },
        ...(ObjectId.isValid(barberId) ? [{ barberId: new ObjectId(barberId) }] : []),
      ];
    }
    if (myReviews && query.userId) {
      baseStatsQuery.userId = query.userId;
    }

    const allContextReviews = await db.collection("reviews").find(baseStatsQuery, { projection: { rating: 1 } }).toArray();
    const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalScore = 0;
    for (const r of allContextReviews) {
      const star = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 0)));
      ratingBreakdown[star] = (ratingBreakdown[star] || 0) + 1;
      totalScore += star;
    }
    const averageRating = allContextReviews.length > 0 ? Number((totalScore / allContextReviews.length).toFixed(1)) : 0;

    return mobileSuccess(
      {
        items,
        stats: {
          averageRating,
          reviewCount: allContextReviews.length,
          ratingBreakdown,
        },
        nextCursor,
        count: items.length,
      },
      {
        requestId,
        headers: {
          "Cache-Control": "public, max-age=30",
        },
      }
    );
  } catch (error) {
    console.error("[mobile-reviews-list]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "Failed to fetch reviews.",
      status: 500,
      requestId,
    });
  }
}

export async function POST(request) {
  const versionError = enforceAppVersion(request);
  if (versionError) return versionError;

  const requestId = getRequestId(request);
  try {
    const auth = await getMobileSession(request);
    if (!auth.session) {
      return auth.error;
    }

    const userId = auth.session.user.id;

    // Rate limit review posting (5 per 10 minutes)
    const rateLimitError = await enforceMobileRateLimit(
      `mobile:reviews:create:${userId}`,
      5,
      10 * 60 * 1000,
      { requestId, message: "Too many reviews submitted. Please wait before posting again." }
    );
    if (rateLimitError) return rateLimitError;

    let body;
    try {
      body = await request.json();
    } catch {
      return mobileError({
        code: "INVALID_JSON",
        message: "Invalid JSON request body.",
        status: 400,
        requestId,
      });
    }

    const validation = reviewCreateSchema.safeParse(body);
    if (!validation.success) {
      return mobileError({
        code: "VALIDATION_ERROR",
        message: "Validation failed.",
        details: validation.error.flatten(),
        status: 400,
        requestId,
      });
    }

    const { barberId, bookingId, rating, comment } = validation.data;
    const db = await getDb();

    const result = await createReview(db, {
      user: auth.session.user,
      barberId,
      bookingId,
      rating,
      comment,
    });

    if (!result.ok) {
      return mobileError({
        code: result.code || "REVIEW_FAILED",
        message: result.error,
        status: result.status,
        requestId,
      });
    }

    return mobileSuccess(
      {
        review: serializeReview(result.review),
        stats: result.stats,
        message: "Review submitted successfully.",
      },
      { status: 201, requestId }
    );
  } catch (error) {
    if (error?.code === 11000) {
      return mobileError({
        code: "ALREADY_REVIEWED",
        message: "You have already submitted a review for this appointment.",
        status: 409,
        requestId,
      });
    }
    console.error("[mobile-reviews-post]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "Failed to submit review.",
      status: 500,
      requestId,
    });
  }
}
