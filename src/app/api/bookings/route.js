// app/api/bookings/route.js
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { bookingSchema } from "@/lib/validations";

export async function POST(request) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = bookingSchema.safeParse(body);
    if (!validation.success) {
      return new Response(JSON.stringify({ error: validation.error.format() }), { status: 400 });
    }

    const { userId, barberId, service, timeSlot, status } = validation.data;
    const bookingDate = new Date(timeSlot);

    const client = await clientPromise;
    const db = client.db();
    const col = db.collection("bookings");

    // Conflict Detection: Check if barber has a booking at the same time
    // Assuming 30 min slots for simplicity, or we could use service duration if available
    // For now, strict equality on timeSlot
    const conflict = await col.findOne({
      barberId: barberId,
      timeSlot: timeSlot,
      status: { $ne: "cancelled" }
    });

    if (conflict) {
      return new Response(JSON.stringify({ error: "Time slot already booked" }), { status: 409 });
    }

    const newBooking = {
      userId,
      barberId,
      service,
      timeSlot, // Keep as string or Date depending on preference, schema says string(datetime)
      status: status || "pending",
      createdAt: new Date(),
    };

    const res = await col.insertOne(newBooking);

    // Optionally update barber waitingTime: naive increment
    const barbers = db.collection("barbers");
    await barbers.updateOne({ _id: new ObjectId(barberId) }, { $inc: { waitingTime: 10 } }).catch(() => { });

    return new Response(JSON.stringify({ ok: true, id: res.insertedId }), { status: 201 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function GET(request) {
  // query params: userId or barberId
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  const barberId = url.searchParams.get("barberId");

  const client = await clientPromise;
  const db = client.db();
  const col = db.collection("bookings");

  let filter = {};
  if (userId) filter.userId = userId;
  if (barberId) filter.barberId = barberId;

  const list = await col.find(filter).sort({ createdAt: -1 }).toArray();
  return new Response(JSON.stringify(list), { status: 200 });
}
