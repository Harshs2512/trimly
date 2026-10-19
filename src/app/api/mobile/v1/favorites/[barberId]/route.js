import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getMobileSession } from "@/lib/mobileAuth";
import {
  enforceAppVersion,
  getRequestId,
  mobileError,
  mobileSuccess,
} from "@/lib/mobileResponse";

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

    const { barberId } = await params;
    if (!barberId) {
      return mobileError({
        code: "VALIDATION_ERROR",
        message: "Barber ID is required.",
        status: 400,
        requestId,
      });
    }

    const userId = auth.session.user.id;
    const db = await getDb();

    // Verify barber exists
    const barber = await db.collection("barbers").findOne(
      ObjectId.isValid(barberId)
        ? { _id: new ObjectId(barberId), deletedAt: { $exists: false } }
        : { userId: barberId, deletedAt: { $exists: false } }
    );

    if (!barber) {
      return mobileError({
        code: "BARBER_NOT_FOUND",
        message: "Barber profile not found.",
        status: 404,
        requestId,
      });
    }

    const canonicalId = barber._id.toString();
    await db.collection("favourites").updateOne(
      { userId, barberId: canonicalId },
      {
        $set: {
          userId,
          barberId: canonicalId,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    return mobileSuccess(
      {
        ok: true,
        barberId: canonicalId,
        message: "Barber added to favorites.",
      },
      { status: 201, requestId }
    );
  } catch (error) {
    console.error("[mobile-favorites-add]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "Failed to add favorite.",
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
      return mobileError({
        code: auth.error.code,
        message: auth.error.message,
        status: auth.error.status,
        requestId,
      });
    }

    const { barberId } = await params;
    const userId = auth.session.user.id;
    const db = await getDb();

    await db.collection("favourites").deleteOne({
      userId,
      $or: [
        { barberId },
        ...(ObjectId.isValid(barberId) ? [{ barberId: new ObjectId(barberId) }] : []),
      ],
    });

    return mobileSuccess(
      {
        ok: true,
        message: "Barber removed from favorites.",
      },
      { requestId }
    );
  } catch (error) {
    console.error("[mobile-favorites-delete]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "Failed to remove favorite.",
      status: 500,
      requestId,
    });
  }
}
