import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getBarberAvailability } from "@/lib/booking";
import {
  enforceAppVersion,
  getRequestId,
  mobileError,
  mobileSuccess,
} from "@/lib/mobileResponse";

export async function GET(request, { params }) {
  const versionError = enforceAppVersion(request);
  if (versionError) return versionError;

  const requestId = getRequestId(request);
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return mobileError({
        code: "INVALID_BARBER_ID",
        message: "Invalid barber ID format.",
        status: 400,
        requestId,
      });
    }

    const url = new URL(request.url);
    const date = url.searchParams.get("date")?.trim();
    const serviceId = url.searchParams.get("serviceId")?.trim();
    const serviceName = url.searchParams.get("service")?.trim();

    const db = await getDb();
    const barber = await db
      .collection("barbers")
      .findOne({ _id: new ObjectId(id), deletedAt: { $exists: false } });

    if (!barber || barber.verificationStatus !== "verified") {
      return mobileError({
        code: "BARBER_NOT_FOUND",
        message: "Barber is not available or not verified.",
        status: 404,
        requestId,
      });
    }

    const result = await getBarberAvailability(db, { barber, date, serviceId, serviceName });
    if (!result.ok) {
      return mobileError({
        code: result.code || "AVAILABILITY_ERROR",
        message: result.error,
        status: result.status,
        requestId,
      });
    }

    return mobileSuccess(result.data, {
      requestId,
      headers: {
        "Cache-Control": "public, max-age=30",
      },
    });
  } catch (error) {
    console.error("[mobile-barber-availability]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "Failed to retrieve availability slots.",
      status: 500,
      requestId,
    });
  }
}
