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
    const userId = url.searchParams.get("userId")?.trim();
    const ratingParam = url.searchParams.get("rating")?.trim();
    const search = url.searchParams.get("search")?.trim();
    const sortBy = url.searchParams.get("sortBy") || "newest";

    const { page, limit, skip } = parsePagination(url.searchParams, { defaultLimit: 10, maxLimit: 50 });
    const db = await getDb();

    const query = {
      deletedAt: { $exists: false },
    };

    let barberIdConditions = null;
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
      barberIdConditions = [];
      validBarberIds.forEach((id) => {
        barberIdConditions.push({ barberId: id });
        if (ObjectId.isValid(id)) {
          barberIdConditions.push({ barberId: new ObjectId(id) });
        }
      });
      query.$or = barberIdConditions;
    }

    if (userId) {
      query.userId = userId;
    }

    if (ratingParam) {
      const parsedRating = parseInt(ratingParam, 10);
      if (!isNaN(parsedRating) && parsedRating >= 1 && parsedRating <= 5) {
        query.rating = parsedRating;
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

    let sortObj = { createdAt: -1 };
    if (sortBy === "highest") {
      sortObj = { rating: -1, createdAt: -1 };
    } else if (sortBy === "lowest") {
      sortObj = { rating: 1, createdAt: -1 };
    } else if (sortBy === "oldest") {
      sortObj = { createdAt: 1 };
    }

    const reviewsCol = db.collection("reviews");
    const [total, list] = await Promise.all([
      reviewsCol.countDocuments(query),
      reviewsCol.find(query).sort(sortObj).skip(skip).limit(limit).toArray(),
    ]);

    // Compute star breakdown summary for this context (base query without pagination/rating filters)
    const baseStatsQuery = { deletedAt: { $exists: false } };
    if (barberIdConditions) {
      baseStatsQuery.$or = barberIdConditions;
    }
    if (userId) {
      baseStatsQuery.userId = userId;
    }

    const allContextReviews = await reviewsCol.find(baseStatsQuery, { projection: { rating: 1 } }).toArray();
    const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalScore = 0;
    for (const r of allContextReviews) {
      const star = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 0)));
      ratingBreakdown[star] = (ratingBreakdown[star] || 0) + 1;
      totalScore += star;
    }
    const averageRating = allContextReviews.length > 0 ? Number((totalScore / allContextReviews.length).toFixed(1)) : 0;

    // Fetch barber info to attach shopName & address
    const barberIds = [...new Set(list.map((r) => String(r.barberId)).filter(Boolean))];
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
          { projection: { shopName: 1, address: 1, userId: 1, image: 1 } }
        ).toArray()
      : [];

    const barberMap = new Map();
    for (const b of barbers) {
      barberMap.set(b._id.toString(), b);
      if (b.userId) barberMap.set(String(b.userId), b);
    }

    const formattedReviews = list.map((item) => {
      const barber = barberMap.get(String(item.barberId));
      return {
        _id: item._id.toString(),
        barberId: String(item.barberId),
        barberProfileId: barber?._id?.toString() || String(item.barberId),
        barberShopName: barber?.shopName || item.barberShopName || "Barber Shop",
        barberAddress: barber?.address || "",
        userId: String(item.userId),
        userName: item.userName || "Customer",
        bookingId: String(item.bookingId),
        serviceName: item.serviceName || "",
        rating: item.rating,
        comment: item.comment || "",
        createdAt: item.createdAt?.toISOString?.() || item.createdAt,
      };
    });

    return Response.json({
      reviews: formattedReviews,
      stats: {
        averageRating,
        reviewCount: allContextReviews.length,
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
