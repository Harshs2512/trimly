import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getMobileSession } from "@/lib/mobileAuth";
import { reviewUpdateSchema } from "@/lib/validations";
import { recalculateBarberRating } from "@/lib/reviews";
import {
  enforceAppVersion,
  getRequestId,
  mobileError,
  mobileSuccess,
  serializeReview,
} from "@/lib/mobileResponse";

export async function PUT(request, { params }) {
  const versionError = enforceAppVersion(request);
  if (versionError) return versionError;

  const requestId = getRequestId(request);
  try {
    const auth = await getMobileSession(request);
    if (!auth.session) {
      return auth.error;
    }

    const { id } = await params;
    if (!id) {
      return mobileError({
        code: "VALIDATION_ERROR",
        message: "Invalid review ID.",
        status: 400,
        requestId,
      });
    }

    const json = await request.json();
    const validation = reviewUpdateSchema.safeParse(json);
    if (!validation.success) {
      return mobileError({
        code: "VALIDATION_ERROR",
        message: "Invalid review update payload.",
        details: validation.error.flatten(),
        status: 400,
        requestId,
      });
    }

    const db = await getDb();
    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
    const review = await db.collection("reviews").findOne(query);

    if (!review || review.deletedAt) {
      return mobileError({
        code: "NOT_FOUND",
        message: "Review not found.",
        status: 404,
        requestId,
      });
    }

    const isAuthor = String(review.userId) === String(auth.session.user.id);
    const isAdmin = auth.session.user.role === "admin";
    if (!isAuthor && !isAdmin) {
      return mobileError({
        code: "FORBIDDEN",
        message: "You can only edit your own reviews.",
        status: 403,
        requestId,
      });
    }

    const updateFields = { updatedAt: new Date() };
    if (validation.data.rating !== undefined) {
      updateFields.rating = validation.data.rating;
    }
    if (validation.data.comment !== undefined) {
      updateFields.comment = validation.data.comment.trim();
    }

    await db.collection("reviews").updateOne(query, { $set: updateFields });
    const stats = await recalculateBarberRating(db, review.barberId);

    const updatedDoc = {
      ...review,
      ...updateFields,
    };

    return mobileSuccess(
      {
        review: serializeReview(updatedDoc),
        stats,
      },
      { requestId }
    );
  } catch (error) {
    console.error("[mobile-review-update]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "Failed to update review.",
      status: 500,
      requestId,
    });
  }
}

export async function DELETE(request, { params }) {
  const versionError = enforceAppVersion(request);
  if (versionError) return versionError;

  const requestId = getRequestId(request);
  try {
    const auth = await getMobileSession(request);
    if (!auth.session) {
      return auth.error;
    }

    const { id } = await params;
    if (!id) {
      return mobileError({
        code: "VALIDATION_ERROR",
        message: "Invalid review ID.",
        status: 400,
        requestId,
      });
    }

    const db = await getDb();
    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
    const review = await db.collection("reviews").findOne(query);

    if (!review || review.deletedAt) {
      return mobileError({
        code: "NOT_FOUND",
        message: "Review not found.",
        status: 404,
        requestId,
      });
    }

    const isAuthor = String(review.userId) === String(auth.session.user.id);
    const isAdmin = auth.session.user.role === "admin";
    if (!isAuthor && !isAdmin) {
      return mobileError({
        code: "FORBIDDEN",
        message: "You can only delete your own reviews.",
        status: 403,
        requestId,
      });
    }

    await db.collection("reviews").updateOne(query, {
      $set: { deletedAt: new Date() },
    });

    const stats = await recalculateBarberRating(db, review.barberId);

    return mobileSuccess(
      {
        message: "Review deleted successfully.",
        stats,
      },
      { requestId }
    );
  } catch (error) {
    console.error("[mobile-review-delete]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "Failed to delete review.",
      status: 500,
      requestId,
    });
  }
}
