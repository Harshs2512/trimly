import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getMobileSession } from "@/lib/mobileAuth";
import { enforceMobileRateLimit } from "@/lib/rateLimit";
import {
  enforceAppVersion,
  getRequestId,
  mobileError,
  mobileSuccess,
} from "@/lib/mobileResponse";

const ALLOWED_REASONS = new Set([
  "inappropriate",
  "spam",
  "harassment",
  "offensive",
  "defamatory",
  "other",
]);

export async function POST(request, { params }) {
  const versionError = enforceAppVersion(request);
  if (versionError) return versionError;

  const requestId = getRequestId(request);
  try {
    const auth = await getMobileSession(request);
    if (!auth.session) {
      return mobileError({
        code: auth.error.code,
        message: auth.error.message,
        status: auth.error.status,
        requestId,
      });
    }

    const rateLimitError = await enforceMobileRateLimit(request, {
      windowMs: 60 * 1000,
      max: 5,
      keyPrefix: "report_review",
    });
    if (rateLimitError) return rateLimitError;

    const reviewId = params?.id;
    if (!reviewId || !ObjectId.isValid(reviewId)) {
      return mobileError({
        code: "VALIDATION_ERROR",
        message: "A valid review ID is required.",
        status: 400,
        requestId,
      });
    }

    const body = await request.json().catch(() => ({}));
    const reason = typeof body?.reason === "string" ? body.reason.toLowerCase().trim() : "";
    const details = typeof body?.details === "string" ? body.details.trim().slice(0, 500) : "";

    if (!ALLOWED_REASONS.has(reason)) {
      return mobileError({
        code: "VALIDATION_ERROR",
        message: `Reason must be one of: ${Array.from(ALLOWED_REASONS).join(", ")}.`,
        status: 400,
        requestId,
      });
    }

    const db = await getDb();
    const review = await db.collection("reviews").findOne({
      _id: new ObjectId(reviewId),
      deletedAt: { $exists: false },
    });

    if (!review) {
      return mobileError({
        code: "NOT_FOUND",
        message: "Review not found or has already been removed.",
        status: 404,
        requestId,
      });
    }

    const reporterId = auth.session.user.id;

    // Check if user has already reported this review
    const existingReport = await db.collection("review_reports").findOne({
      reviewId: review._id,
      reporterId,
    });

    if (existingReport) {
      return mobileError({
        code: "ALREADY_REPORTED",
        message: "You have already submitted a report for this review.",
        status: 409,
        requestId,
      });
    }

    // Insert report into review_reports collection
    const now = new Date();
    await db.collection("review_reports").insertOne({
      reviewId: review._id,
      barberId: review.barberId,
      reporterId,
      reason,
      details,
      createdAt: now,
      status: "pending_review",
      requestId,
    });

    // Increment report counter on the review
    const newReportCount = (review.reportCount || 0) + 1;
    const updateOps = {
      $inc: { reportCount: 1 },
      $set: { updatedAt: now },
    };

    // Auto-quarantine if report count threshold is reached (e.g. >= 3 reports)
    if (newReportCount >= 3) {
      updateOps.$set.moderationStatus = "flagged";
      updateOps.$set.flaggedAt = now;
    }

    await db.collection("reviews").updateOne({ _id: review._id }, updateOps);

    return mobileSuccess(
      {
        ok: true,
        message: "Thank you for reporting. Our moderation team will review this content promptly.",
        moderationStatus: newReportCount >= 3 ? "flagged" : "under_review",
      },
      { requestId }
    );
  } catch (error) {
    console.error("[mobile-review-report-error]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "Failed to submit review report.",
      status: 500,
      requestId,
    });
  }
}
