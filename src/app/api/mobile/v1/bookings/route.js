import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getMobileSession } from "@/lib/mobileAuth";
import { bookingCreateSchema } from "@/lib/validations";
import {
  canonicalBarberId,
  expirePendingBookings,
  getReservationKeys,
  getService,
  hasBookingConflict,
  legacyBarberIdentifiers,
  resolveBarber,
  validateBookingWindow,
} from "@/lib/booking";
import { updateBarberWaitingTime } from "@/lib/waitingTime";
import { createNotification } from "@/lib/notifications";
import { checkIdempotency, saveIdempotency } from "@/lib/idempotency";
import {
  enforceAppVersion,
  getRequestId,
  mobileError,
  mobileSuccess,
  serializeBooking,
} from "@/lib/mobileResponse";

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
    const db = await getDb();

    // Idempotency check
    const idempotencyKey = request.headers.get("idempotency-key");
    const rawBody = await request.text();
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return mobileError({
        code: "INVALID_JSON",
        message: "Invalid JSON request body.",
        status: 400,
        requestId,
      });
    }

    if (idempotencyKey) {
      const idemp = await checkIdempotency(db, {
        key: idempotencyKey,
        userId,
        bodyString: rawBody,
      });

      if (idemp.error) {
        return mobileError({
          code: idemp.error.code,
          message: idemp.error.message,
          status: idemp.mismatch ? 422 : 400,
          requestId,
        });
      }

      if (idemp.cached) {
        return new Response(JSON.stringify(idemp.responseBody), {
          status: idemp.statusCode,
          headers: {
            "Content-Type": "application/json",
            "X-Request-Id": requestId,
            "X-Idempotent-Replay": "true",
          },
        });
      }
    }

    const validation = bookingCreateSchema.safeParse(body);
    if (!validation.success) {
      return mobileError({
        code: "VALIDATION_ERROR",
        message: "Validation failed.",
        details: validation.error.flatten(),
        status: 400,
        requestId,
      });
    }

    const barber = await resolveBarber(db, validation.data.barberId);
    if (!barber || barber.deletedAt || barber.verificationStatus !== "verified") {
      return mobileError({
        code: "BARBER_NOT_FOUND",
        message: "Barber profile is not available for booking.",
        status: 404,
        requestId,
      });
    }

    const service = getService(barber, {
      serviceId: validation.data.serviceId,
      serviceName: validation.data.service,
    });
    if (!service) {
      return mobileError({
        code: "SERVICE_NOT_OFFERED",
        message: "Selected service is not offered by this barber.",
        status: 400,
        requestId,
      });
    }

    await expirePendingBookings(db, { barberId: { $in: legacyBarberIdentifiers(barber) } });

    const start = new Date(validation.data.timeSlot);
    const duration = service.duration;
    const end = new Date(start.getTime() + duration * 60000);
    const windowValidation = validateBookingWindow(barber, start, duration);
    if (!windowValidation.ok) {
      return mobileError({
        code: "INVALID_BOOKING_WINDOW",
        message: windowValidation.error,
        status: windowValidation.status,
        requestId,
      });
    }

    const conflict = await hasBookingConflict(db, {
      barber,
      userId,
      start,
      end,
    });
    if (conflict.conflict) {
      return mobileError({
        code: conflict.type === "user" ? "USER_CONFLICT" : "SLOT_TAKEN",
        message:
          conflict.type === "user"
            ? "You already have another appointment during this time."
            : "This time slot is no longer available.",
        status: 409,
        requestId,
      });
    }

    const barberId = canonicalBarberId(barber);
    const reservationKeys = getReservationKeys(start, end);
    const newBooking = {
      userId,
      customerName: auth.session.user.name || "Customer",
      barberId,
      barberName: barber.name,
      barberShopName: barber.shopName,
      serviceId: service.id || null,
      service: service.name,
      price: service.price,
      duration,
      timeSlot: start.toISOString(),
      endTime: end.toISOString(),
      reservationKeys,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const insertResult = await db.collection("bookings").insertOne(newBooking);
    newBooking._id = insertResult.insertedId;

    await updateBarberWaitingTime(db, barberId);

    if (barber.userId) {
      await createNotification(db, {
        userId: barber.userId,
        type: "booking_created",
        message: `New booking request for ${service.name}.`,
        bookingId: insertResult.insertedId.toString(),
      });
    }

    const responseData = {
      booking: serializeBooking(newBooking),
      message: "Booking request sent. Awaiting barber confirmation.",
    };

    const successEnvelope = {
      data: responseData,
      requestId,
    };

    if (idempotencyKey) {
      const crypto = await import("crypto");
      const bodyHash = crypto.createHash("sha256").update(rawBody).digest("hex");
      await saveIdempotency(db, {
        key: idempotencyKey,
        userId,
        bodyHash,
        statusCode: 201,
        responseBody: successEnvelope,
      });
    }

    return mobileSuccess(responseData, {
      status: 201,
      requestId,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return mobileError({
        code: "SLOT_TAKEN",
        message: "This time slot was just taken by another booking. Please choose a different time.",
        status: 409,
        requestId,
      });
    }
    console.error("[mobile-bookings-create]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "An error occurred while creating your booking.",
      status: 500,
      requestId,
    });
  }
}

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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status")?.trim();
    const cursor = searchParams.get("cursor");
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10), 1), 50);

    const db = await getDb();
    const query = {};

    if (auth.session.user.role === "barber") {
      const barber = await db
        .collection("barbers")
        .findOne({ userId: auth.session.user.id, deletedAt: { $exists: false } });
      if (!barber) {
        return mobileSuccess({ items: [], nextCursor: null, count: 0 }, { requestId });
      }
      query.barberId = { $in: legacyBarberIdentifiers(barber) };
    } else {
      query.userId = auth.session.user.id;
    }

    if (status) {
      query.status = status;
    }

    if (cursor && ObjectId.isValid(cursor)) {
      query._id = { $lt: new ObjectId(cursor) };
    }

    const bookings = await db
      .collection("bookings")
      .find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .toArray();

    const hasMore = bookings.length > limit;
    const items = (hasMore ? bookings.slice(0, limit) : bookings).map(serializeBooking);
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

    return mobileSuccess(
      {
        items,
        nextCursor,
        count: items.length,
      },
      { requestId }
    );
  } catch (error) {
    console.error("[mobile-bookings-list]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "Failed to fetch bookings.",
      status: 500,
      requestId,
    });
  }
}
