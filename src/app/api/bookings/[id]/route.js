// app/api/bookings/[id]/route.js
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { updateBarberWaitingTime } from "@/lib/waitingTime";
import { createNotification } from "@/lib/notifications";

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });
    }

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return new Response(JSON.stringify({ error: "Invalid booking ID" }), { status: 400 });
    }

    const body = await request.json();
    const { status, cancelReason, timeSlot } = body;

    if (!status || !['confirmed', 'cancelled', 'pending'].includes(status)) {
      return new Response(JSON.stringify({ error: "Invalid status" }), { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const col = db.collection("bookings");

    const existingBooking = await col.findOne({ _id: new ObjectId(id) });
    if (!existingBooking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), { status: 404 });
    }

    // Ownership check: Requester must be booking client, barber owner, or admin
    let isAuthorized = session.user.role === 'admin';
    if (!isAuthorized && existingBooking.userId === session.user.id) {
      isAuthorized = true;
    }
    if (!isAuthorized && existingBooking.barberId) {
      const barberCol = db.collection("barbers");
      const barber = ObjectId.isValid(existingBooking.barberId)
        ? await barberCol.findOne({ _id: new ObjectId(existingBooking.barberId) })
        : await barberCol.findOne({ userId: existingBooking.barberId });
      
      if (barber && barber.userId === session.user.id) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Unauthorized access to this booking" }), { status: 403 });
    }

    const updateFields = { status, updatedAt: new Date() };
    if (status === 'cancelled' && cancelReason) {
      updateFields.cancelReason = cancelReason;
    }

    let unsetFields = null;
    if (timeSlot) {
      const bookingDate = new Date(timeSlot);
      if (bookingDate < new Date()) {
        return new Response(JSON.stringify({ error: "Cannot book a date in the past" }), { status: 400 });
      }
      updateFields.timeSlot = timeSlot;
    }

    if (status === 'pending') {
      unsetFields = { cancelReason: "" };
    }

    const updateQuery = { $set: updateFields };
    if (unsetFields) updateQuery.$unset = unsetFields;

    await col.updateOne({ _id: new ObjectId(id) }, updateQuery);

    // Recalculate waiting time for barber
    if (existingBooking.barberId) {
      await updateBarberWaitingTime(db, existingBooking.barberId);
    }

    // Trigger Notification
    if (existingBooking.userId) {
      let notifyMessage = `Your booking for ${existingBooking.service} status has been updated to ${status}.`;
      if (status === 'cancelled' && cancelReason) {
        notifyMessage += ` Reason: ${cancelReason}`;
      }
      await createNotification(db, {
        userId: existingBooking.userId,
        type: "booking_update",
        message: notifyMessage,
        bookingId: id,
      });
    }

    return new Response(JSON.stringify({ ok: true, message: "Booking updated successfully" }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
