import crypto from "crypto";
import { getDb } from "@/lib/mongodb";
import { getMobileSession } from "@/lib/mobileAuth";
import { barberUpdateSchema } from "@/lib/validations";
import {
  enforceAppVersion,
  getRequestId,
  mobileError,
  mobileSuccess,
  serializeBarber,
} from "@/lib/mobileResponse";

function normalizeServices(services = []) {
  const names = new Set();
  return services.map((service) => {
    const name = service.name.trim();
    const key = name.toLowerCase();
    if (names.has(key)) throw new Error(`Duplicate service: ${name}`);
    names.add(key);
    return { ...service, id: service.id || crypto.randomUUID(), name };
  });
}

export async function GET(request) {
  const versionError = enforceAppVersion(request);
  if (versionError) return versionError;

  const requestId = getRequestId(request);
  try {
    const auth = await getMobileSession(request, ["barber", "admin"]);
    if (!auth.session) {
      return mobileError({
        code: auth.error.code,
        message: auth.error.message,
        status: auth.error.status,
        requestId,
      });
    }

    const db = await getDb();
    const barber = await db
      .collection("barbers")
      .findOne({ userId: auth.session.user.id, deletedAt: { $exists: false } });

    if (!barber) {
      return mobileError({
        code: "BARBER_NOT_FOUND",
        message: "No barber profile found for your account.",
        status: 404,
        requestId,
      });
    }

    return mobileSuccess(serializeBarber(barber, { isOwnerOrAdmin: true }), { requestId });
  } catch (error) {
    console.error("[mobile-barber-profile-get]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "Failed to fetch barber profile.",
      status: 500,
      requestId,
    });
  }
}

export async function PUT(request) {
  const versionError = enforceAppVersion(request);
  if (versionError) return versionError;

  const requestId = getRequestId(request);
  try {
    const auth = await getMobileSession(request, ["barber"]);
    if (!auth.session) {
      return mobileError({
        code: auth.error.code,
        message: auth.error.message,
        status: auth.error.status,
        requestId,
      });
    }

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

    const validation = barberUpdateSchema.safeParse(body);
    if (!validation.success) {
      return mobileError({
        code: "VALIDATION_ERROR",
        message: "Validation failed.",
        details: validation.error.flatten(),
        status: 400,
        requestId,
      });
    }

    const db = await getDb();
    const barber = await db
      .collection("barbers")
      .findOne({ userId: auth.session.user.id, deletedAt: { $exists: false } });

    if (!barber) {
      return mobileError({
        code: "BARBER_NOT_FOUND",
        message: "No barber profile found for your account.",
        status: 404,
        requestId,
      });
    }

    const allowed = [
      "shopName",
      "address",
      "city",
      "area",
      "phone",
      "description",
      "services",
      "workingHours",
      "closedDays",
      "slotIntervalMinutes",
      "leadTimeMinutes",
      "bookingHorizonDays",
      "workPhotos",
      "shopExteriorImage",
      "shopInteriorImage",
      "staffCount",
      "chairsCount",
      "specialties",
      "idType",
      "idNumber",
      "idDocumentImage",
      "timezone",
    ];

    const updateDoc = {};
    for (const key of allowed) {
      if (validation.data[key] !== undefined) {
        updateDoc[key] = validation.data[key];
      }
    }

    if (updateDoc.services) {
      try {
        updateDoc.services = normalizeServices(updateDoc.services);
      } catch (err) {
        return mobileError({
          code: "DUPLICATE_SERVICE",
          message: err.message,
          status: 400,
          requestId,
        });
      }
    }

    updateDoc.updatedAt = new Date();

    await db.collection("barbers").updateOne({ _id: barber._id }, { $set: updateDoc });
    const updated = await db.collection("barbers").findOne({ _id: barber._id });

    return mobileSuccess(serializeBarber(updated, { isOwnerOrAdmin: true }), { requestId });
  } catch (error) {
    console.error("[mobile-barber-profile-put]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "Failed to update barber profile.",
      status: 500,
      requestId,
    });
  }
}
