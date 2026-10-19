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
    if (!barberId) {
      return mobileError({
        code: "VALIDATION_ERROR",
        message: "Barber ID is required.",
        status: 400,
        requestId,
      });
    }

    const cursor = searchParams.get("cursor");
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10), 1), 50);

    const query = {
      $or: [
        { barberId },
        ...(ObjectId.isValid(barberId) ? [{ barberId: new ObjectId(barberId) }] : []),
      ],
      deletedAt: { $exists: false },
    };

    if (cursor && ObjectId.isValid(cursor)) {
      query._id = { $lt: new ObjectId(cursor) };
    }

    const db = await getDb();
    const reviews = await db
      .collection("reviews")
      .find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .toArray();

    const hasMore = reviews.length > limit;
    const items = (hasMore ? reviews.slice(0, limit) : reviews).map(serializeReview);
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

    return mobileSuccess(
      {
        items,
        nextCursor,
        count: items.length,
      },
      {
        requestId,
        headers: {
          "Cache-Control": "public, max-age=60",
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
    const auth = await getMobileSession(request, ["user"]);
    if (!auth.session) {
      return mobileError({
        code: auth.error.code,
        message: auth.error.message,
        status: auth.error.status,
        requestId,
      });
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
