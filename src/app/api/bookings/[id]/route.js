import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getActiveSession } from "@/lib/authz";
import { bookingUpdateSchema } from "@/lib/validations";
import {
  canTransition,
  canonicalBarberId,
  expirePendingBookings,
  getReservationKeys,
  getService,
  hasBookingConflict,
  resolveBarber,
  validateBookingWindow,
} from "@/lib/booking";
import { updateBarberWaitingTime } from "@/lib/waitingTime";
import { createNotification } from "@/lib/notifications";
import { safeInternalError, rejectCrossSiteRequest } from "@/lib/api";

export async function PUT(request, { params }) {
  try {
    const originError = rejectCrossSiteRequest(request);
    if (originError) return originError;
    const session = await getActiveSession();
    if (!session) return Response.json({ error: "Not authenticated" }, { status: 401 });

    const { id } = await params;
    if (!ObjectId.isValid(id)) return Response.json({ error: "Invalid booking ID" }, { status: 400 });

    const validation = bookingUpdateSchema.safeParse(await request.json());
    if (!validation.success) return Response.json({ error: validation.error.flatten() }, { status: 400 });

    const db = await getDb();
    const bookings = db.collection("bookings");
    const bookingObjectId = new ObjectId(id);
    await expirePendingBookings(db, { _id: bookingObjectId });
    const existing = await bookings.findOne({ _id: bookingObjectId });
    if (!existing) return Response.json({ error: "Booking not found" }, { status: 404 });

    const barber = await resolveBarber(db, existing.barberId);
    if (!barber) return Response.json({ error: "Barber profile not found" }, { status: 404 });

    let actor = null;
    if (session.user.role === "admin") actor = "admin";
    else if (session.user.role === "barber" && barber.userId === session.user.id) actor = "barber";
    else if (existing.userId === session.user.id) actor = "customer";
    if (!actor) return Response.json({ error: "Forbidden" }, { status: 403 });

    const { status, cancelReason, timeSlot } = validation.data;
    if (!canTransition(actor, existing.status, status)) {
      return Response.json({ error: `A ${actor} cannot change a booking from ${existing.status} to ${status}.` }, { status: 409 });
    }

    const scheduledStart = new Date(existing.timeSlot);
    const now = new Date();
    if (actor === "customer" && status === "cancelled" && scheduledStart <= now) {
      return Response.json({ error: "An appointment cannot be cancelled after its scheduled start time." }, { status: 409 });
    }
    if (actor === "barber" && status === "no_show" && scheduledStart > now) {
      return Response.json({ error: "A future appointment cannot be marked no show." }, { status: 409 });
    }
    const scheduledEnd = new Date(existing.endTime || new Date(scheduledStart.getTime() + (existing.duration || 30) * 60000));
    if (actor === "barber" && status === "completed" && scheduledEnd > now) {
      return Response.json({ error: "An appointment cannot be completed before its scheduled service end time." }, { status: 409 });
    }

    if (actor === "customer" && status === "pending" && !timeSlot) {
      return Response.json({ error: "A new time slot is required when rescheduling." }, { status: 400 });
    }
    if (actor === "customer" && status === "pending") {
      if (barber.deletedAt || barber.verificationStatus !== "verified") {
        return Response.json({ error: "This barber profile is no longer available for booking." }, { status: 409 });
      }
      const currentService = getService(barber, {
        serviceId: existing.serviceId,
        serviceName: existing.service,
      });
      if (!currentService) {
        return Response.json({ error: "This service is no longer offered. Please create a new booking with an available service." }, { status: 409 });
      }
    }
    if (actor !== "customer" && timeSlot) {
      return Response.json({ error: "Only the customer can choose a new time while rescheduling." }, { status: 403 });
    }

    const updateFields = { status, updatedAt: new Date() };
    const unsetFields = {};
    let newStart = new Date(existing.timeSlot);
    let newEnd = new Date(existing.endTime || new Date(newStart.getTime() + (existing.duration || 30) * 60000));

    if (timeSlot) {
      newStart = new Date(timeSlot);
      newEnd = new Date(newStart.getTime() + (existing.duration || 30) * 60000);
      const windowValidation = validateBookingWindow(barber, newStart, existing.duration || 30);
      if (!windowValidation.ok) return Response.json({ error: windowValidation.error }, { status: windowValidation.status });

      const conflict = await hasBookingConflict(db, {
        barber,
        userId: existing.userId,
        start: newStart,
        end: newEnd,
        excludeBookingId: id,
      });
      if (conflict.conflict) {
        return Response.json({
          error: conflict.type === "user"
            ? "You already have another appointment during this time."
            : "This time slot is no longer available.",
        }, { status: 409 });
      }

      updateFields.timeSlot = newStart.toISOString();
      updateFields.endTime = newEnd.toISOString();
      updateFields.reservationKeys = getReservationKeys(newStart, newEnd);
    } else if (status === "confirmed" && !existing.reservationKeys) {
      const conflict = await hasBookingConflict(db, {
        barber,
        userId: existing.userId,
        start: newStart,
        end: newEnd,
        excludeBookingId: id,
      });
      if (conflict.conflict) return Response.json({ error: "This booking now conflicts with another appointment." }, { status: 409 });
      updateFields.reservationKeys = getReservationKeys(newStart, newEnd);
    }

    if (["cancelled", "declined"].includes(status)) {
      updateFields.cancelReason = cancelReason || (status === "declined" ? "Declined by barber" : `Cancelled by ${actor}`);
      unsetFields.reservationKeys = "";
    } else if (["completed", "no_show"].includes(status)) {
      unsetFields.reservationKeys = "";
      unsetFields.cancelReason = "";
    } else {
      unsetFields.cancelReason = "";
    }

    const updateQuery = { $set: updateFields };
    if (Object.keys(unsetFields).length) updateQuery.$unset = unsetFields;
    const updateResult = await bookings.updateOne(
      { _id: existing._id, status: existing.status },
      updateQuery,
    );
    if (!updateResult.matchedCount) {
      return Response.json({ error: "This booking changed while your request was being processed. Refresh and try again." }, { status: 409 });
    }

    const canonicalId = canonicalBarberId(barber);
    await updateBarberWaitingTime(db, canonicalId);

    if (actor === "customer") {
      await createNotification(db, {
        userId: barber.userId,
        type: "booking_update",
        message: status === "pending"
          ? `A customer rescheduled their ${existing.service} booking request.`
          : `A customer cancelled their ${existing.service} booking.`,
        bookingId: id,
      });
    } else {
      let message = `Your ${existing.service} booking is now ${status.replace("_", " ")}.`;
      if (["cancelled", "declined"].includes(status) && updateFields.cancelReason) message += ` Reason: ${updateFields.cancelReason}`;
      await createNotification(db, {
        userId: existing.userId,
        type: "booking_update",
        message,
        bookingId: id,
      });
    }

    return Response.json({ ok: true, message: "Booking updated successfully", status });
  } catch (error) {
    if (error?.code === 11000) {
      return Response.json({ error: "This time slot was just taken. Please choose another time." }, { status: 409 });
    }
    return safeInternalError(error, "booking-update");
  }
}
