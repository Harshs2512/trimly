// app/api/bookings/[id]/route.js
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status } = body;

    if (!status || !['confirmed', 'cancelled', 'pending'].includes(status)) {
      return new Response(JSON.stringify({ error: "Invalid status" }), { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const col = db.collection("bookings");

    const updateResult = await col.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } }
    );

    if (updateResult.matchedCount === 0) {
      return new Response(JSON.stringify({ error: "Booking not found" }), { status: 404 });
    }

    return new Response(JSON.stringify({ ok: true, message: "Booking updated successfully" }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
