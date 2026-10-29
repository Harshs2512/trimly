import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getMobileSession } from "@/lib/mobileAuth";
import { bookingUpdateSchema } from "@/lib/validations";
import { resolveBarber, updateBookingStatus } from "@/lib/booking";
import {
  enforceAppVersion,
  getRequestId,
  mobileError,
  mobileSuccess,
  serializeBooking,
} from "@/lib/mobileResponse";

export async function GET(request, { params }) {
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

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return mobileError({
        code: "INVALID_BOOKING_ID",
        message: "Invalid booking ID format.",
        status: 400,
        requestId,
      });
    }

    const db = await getDb();
    const booking = await db.collection("bookings").findOne({ _id: new ObjectId(id) });
    if (!booking) {
      return mobileError({
        code: "BOOKING_NOT_FOUND",
        message: "Booking not found.",
        status: 404,
        requestId,
      });
    }

    // Check authorization: customer, barber, or admin
    const barber = await resolveBarber(db, booking.barberId);
    const isCustomer = booking.userId === auth.session.user.id;
    const isBarber = barber && barber.userId === auth.session.user.id;
    const isAdmin = auth.session.user.role === "admin";

    if (!isCustomer && !isBarber && !isAdmin) {
      return mobileError({
        code: "FORBIDDEN",
        message: "You are not authorized to view this booking.",
        status: 403,
        requestId,
      });
    }

    return mobileSuccess(serializeBooking(booking), { requestId });
  } catch (error) {
    console.error("[mobile-booking-detail]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "Failed to fetch booking details.",
      status: 500,
      requestId,
    });
  }
}

export async function PATCH(request, { params }) {
  return handleUpdate(request, params);
}

export async function PUT(request, { params }) {
  return handleUpdate(request, params);
}

async function handleUpdate(request, params) {
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

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return mobileError({
        code: "INVALID_BOOKING_ID",
        message: "Invalid booking ID format.",
        status: 400,
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

    const validation = bookingUpdateSchema.safeParse(body);
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
    const result = await updateBookingStatus(db, {
      bookingId: id,
      user: auth.session.user,
      status: validation.data.status || (validation.data.timeSlot ? "pending" : undefined),
      cancelReason: validation.data.cancelReason,
      timeSlot: validation.data.timeSlot,
    });

    if (!result.ok) {
      return mobileError({
        code: result.code || "BOOKING_UPDATE_FAILED",
        message: result.error,
        status: result.status,
        requestId,
      });
    }

    return mobileSuccess(
      {
        booking: serializeBooking(result.booking),
        message: "Booking updated successfully.",
      },
      { requestId }
    );
  } catch (error) {
    if (error?.code === 11000) {
      return mobileError({
        code: "SLOT_TAKEN",
        message: "This time slot was just taken. Please choose another time.",
        status: 409,
        requestId,
      });
    }
    console.error("[mobile-booking-update]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "An error occurred while updating the booking.",
      status: 500,
      requestId,
    });
  }
}
