import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getMobileSession } from "@/lib/mobileAuth";
import {
  enforceAppVersion,
  getRequestId,
  mobileError,
  mobileSuccess,
  serializeBarber,
} from "@/lib/mobileResponse";

export async function GET(request) {
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

    const userId = auth.session.user.id;
    const db = await getDb();

    const favorites = await db
      .collection("favourites")
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    const barberIds = favorites
      .map((f) => f.barberId)
      .filter(Boolean)
      .map((id) => (ObjectId.isValid(id) ? new ObjectId(id) : id));

    const barbers = await db
      .collection("barbers")
      .find({
        _id: { $in: barberIds },
        deletedAt: { $exists: false },
        verificationStatus: "verified",
      })
      .toArray();

    return mobileSuccess(
      {
        items: barbers.map(serializeBarber),
        count: barbers.length,
      },
      { requestId }
    );
  } catch (error) {
    console.error("[mobile-favorites-list]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "Failed to fetch favorite barbers.",
      status: 500,
      requestId,
    });
  }
}
