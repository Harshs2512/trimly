import { getDb } from "@/lib/mongodb";
import { resolveBarber } from "@/lib/booking";
import {
  checkEtag,
  enforceAppVersion,
  getRequestId,
  mobileError,
  mobileSuccess,
  serializeBarber,
} from "@/lib/mobileResponse";

export async function GET(request, { params }) {
  const versionError = enforceAppVersion(request);
  if (versionError) return versionError;

  const requestId = getRequestId(request);
  try {
    const { id } = await params;
    const db = await getDb();
    const barber = await resolveBarber(db, id);

    if (!barber || barber.deletedAt || barber.verificationStatus !== "verified") {
      return mobileError({
        code: "BARBER_NOT_FOUND",
        message: "Barber profile not found or is currently inactive.",
        status: 404,
        requestId,
      });
    }

    const serialized = serializeBarber(barber);
    const payloadJson = JSON.stringify(serialized);
    const { etag, isMatch } = checkEtag(request, payloadJson);

    if (isMatch) {
      return new Response(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "public, max-age=60",
          "X-Request-Id": requestId,
        },
      });
    }

    return mobileSuccess(serialized, {
      requestId,
      headers: {
        ETag: etag,
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (error) {
    console.error("[mobile-barber-detail]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "Failed to fetch barber details.",
      status: 500,
      requestId,
    });
  }
}
