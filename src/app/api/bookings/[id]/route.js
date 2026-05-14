// app/api/bookings/[id]/route.js
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status, cancelReason, timeSlot } = body;

    if (!status || !['confirmed', 'cancelled', 'pending'].includes(status)) {
      return new Response(JSON.stringify({ error: "Invalid status" }), { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const col = db.collection("bookings");

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

    const updateResult = await col.updateOne(
      { _id: new ObjectId(id) },
      updateQuery
    );

    if (updateResult.matchedCount === 0) {
      return new Response(JSON.stringify({ error: "Booking not found" }), { status: 404 });
    }

    return new Response(JSON.stringify({ ok: true, message: "Booking updated successfully" }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
