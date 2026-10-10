import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getActiveSession } from "@/lib/authz";
import { safeInternalError, rejectCrossSiteRequest } from "@/lib/api";
import { recalculateBarberRating } from "@/lib/reviews";

export async function DELETE(request, { params }) {
  try {
    const originError = rejectCrossSiteRequest(request);
    if (originError) return originError;

    const session = await getActiveSession();
    if (!session) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return Response.json({ error: "Invalid review ID" }, { status: 400 });
    }

    const db = await getDb();
    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
    const review = await db.collection("reviews").findOne(query);

    if (!review || review.deletedAt) {
      return Response.json({ error: "Review not found" }, { status: 404 });
    }

    const isAuthor = String(review.userId) === String(session.user.id);
    const isAdmin = session.user.role === "admin";
    if (!isAuthor && !isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.collection("reviews").updateOne(query, {
      $set: { deletedAt: new Date() },
    });

    const stats = await recalculateBarberRating(db, review.barberId);

    return Response.json({
      ok: true,
      message: "Review removed",
      stats,
    });
  } catch (error) {
    return safeInternalError(error, "review-delete");
  }
}
