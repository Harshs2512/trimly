import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getSessionWithRole } from "@/lib/authz";
import { writeAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { updateBarberWaitingTime } from "@/lib/waitingTime";
import { resolveBarber, canTransition, getReservationKeys } from "@/lib/booking";
import { safeInternalError, rejectCrossSiteRequest } from "@/lib/api";

export async function PUT(request, { params }) {
  try {
    const originError = rejectCrossSiteRequest(request);
    if (originError) return originError;

    const { session, error } = await getSessionWithRole(["admin"]);
    if (error) return error;

    const { id } = await params;
    if (!ObjectId.isValid(id)) return Response.json({ error: "Invalid booking ID" }, { status: 400 });

    const body = await request.json();
    const { status, timeSlot, adminNote } = body;

    const db = await getDb();
    const bookings = db.collection("bookings");
    const bookingId = new ObjectId(id);

    const existing = await bookings.findOne({ _id: bookingId });
    if (!existing) return Response.json({ error: "Booking not found" }, { status: 404 });

    const barber = await resolveBarber(db, existing.barberId);
    const updateDoc = {
      updatedAt: new Date(),
      lastAssistedByAdmin: session.user.id,
    };

    if (adminNote) {
      updateDoc.adminNote = adminNote;
    }

    if (status && status !== existing.status) {
      if (!canTransition("admin", existing.status, status)) {
        return Response.json(
          { error: `Administrator cannot change booking status from ${existing.status} to ${status}` },
          { status: 409 }
        );
      }
      updateDoc.status = status;
    }

    if (timeSlot) {
      const newStart = new Date(timeSlot);
      if (isNaN(newStart.getTime())) {
        return Response.json({ error: "Invalid date format for rescheduled time slot" }, { status: 400 });
      }
      const duration = existing.duration || 30;
      const newEnd = new Date(newStart.getTime() + duration * 60000);
      updateDoc.timeSlot = newStart;
      updateDoc.endTime = newEnd;
      updateDoc.reservationKeys = getReservationKeys(newStart, newEnd);
    }

    await bookings.updateOne({ _id: bookingId }, { $set: updateDoc });
    const updated = await bookings.findOne({ _id: bookingId });

    if (barber) {
      await updateBarberWaitingTime(db, barber);
    }

    // Send notifications to customer & barber
    if (status || timeSlot) {
      const changeMsg = status && timeSlot
        ? `Status updated to ${status} and rescheduled to ${new Date(timeSlot).toLocaleString()}`
        : status
        ? `Status updated to ${status}`
        : `Rescheduled to ${new Date(timeSlot).toLocaleString()}`;

      if (existing.userId) {
        await createNotification(db, {
          userId: existing.userId,
          title: "Appointment Assisted by Trimlly Admin",
          message: `Your appointment with ${barber?.shopName || "barber"} was updated: ${changeMsg}.`,
          type: "booking_update",
          bookingId: id,
        });
      }

      if (barber?.userId) {
        await createNotification(db, {
          userId: barber.userId,
          title: "Appointment Assisted by Admin",
          message: `Booking #${id.slice(-6)} was updated by administrator: ${changeMsg}.`,
          type: "booking_update",
          bookingId: id,
        });
      }
    }

    await writeAuditLog(db, {
      actorId: session.user.id,
      action: "admin.booking.assist",
      targetType: "booking",
      targetId: id,
      metadata: {
        previousStatus: existing.status,
        newStatus: updateDoc.status || existing.status,
        timeSlot: updateDoc.timeSlot,
        adminNote,
      },
    });

    return Response.json({ ok: true, booking: updated });
  } catch (error) {
    return safeInternalError(error, "admin-booking-assist");
  }
}

