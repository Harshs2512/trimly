// app/api/bookings/route.js
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { bookingSchema } from "@/lib/validations";
import { updateBarberWaitingTime } from "@/lib/waitingTime";
import { createNotification } from "@/lib/notifications";

export async function POST(request) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = bookingSchema.safeParse(body);
    if (!validation.success) {
      return new Response(JSON.stringify({ error: validation.error.format() }), { status: 400 });
    }

    const { userId, barberId, service, timeSlot, status } = validation.data;
    const requestStart = new Date(timeSlot);

    if (isNaN(requestStart.getTime())) {
      return new Response(JSON.stringify({ error: "Invalid date and time" }), { status: 400 });
    }

    if (requestStart < new Date()) {
      return new Response(JSON.stringify({ error: "Cannot book a date in the past" }), { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const barbersCol = db.collection("barbers");
    const col = db.collection("bookings");

    // Fetch Barber details
    let barber = null;
    if (ObjectId.isValid(barberId)) {
      barber = await barbersCol.findOne({ _id: new ObjectId(barberId) });
    }
    if (!barber) {
      barber = await barbersCol.findOne({ userId: barberId });
    }

    if (!barber) {
      return new Response(JSON.stringify({ error: "Barber profile not found" }), { status: 404 });
    }

    // Determine service duration (in minutes, default 30)
    const matchedService = barber.services?.find(s => s.name === service);
    const duration = matchedService?.duration || 30;
    const requestEnd = new Date(requestStart.getTime() + duration * 60000);

    // Working Hours Check (Item 15)
    if (barber.workingHours) {
      const openTime = barber.workingHours.open; // "HH:MM"
      const closeTime = barber.workingHours.close; // "HH:MM"

      if (openTime && closeTime) {
        const reqStartStr = requestStart.toTimeString().slice(0, 5); // "HH:MM"
        const reqEndStr = requestEnd.toTimeString().slice(0, 5); // "HH:MM"

        if (reqStartStr < openTime || reqEndStr > closeTime) {
          return new Response(JSON.stringify({ error: `Barber is only available between ${openTime} and ${closeTime}` }), { status: 400 });
        }
      }
    }

    // Real Overlap Conflict Detection (Item 9)
    const activeBookings = await col.find({
      barberId: barberId,
      status: { $ne: "cancelled" }
    }).toArray();

    const hasOverlap = activeBookings.some(b => {
      const bStart = new Date(b.timeSlot);
      const bDuration = b.duration || barber.services?.find(s => s.name === b.service)?.duration || 30;
      const bEnd = new Date(bStart.getTime() + bDuration * 60000);
      return requestStart < bEnd && requestEnd > bStart;
    });

    if (hasOverlap) {
      return new Response(JSON.stringify({ error: "Time slot overlaps with an existing appointment" }), { status: 409 });
    }

    const newBooking = {
      userId,
      barberId,
      service,
      duration,
      timeSlot,
      endTime: requestEnd.toISOString(),
      status: status || "pending",
      createdAt: new Date(),
    };

    const res = await col.insertOne(newBooking);

    // Recompute waiting time (Item 10)
    await updateBarberWaitingTime(db, barberId);

    // Notify barber of new booking (Item 14)
    if (barber.userId) {
      await createNotification(db, {
        userId: barber.userId,
        type: "booking_created",
        message: `New booking request for ${service} on ${requestStart.toLocaleDateString()} at ${requestStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
        bookingId: res.insertedId.toString(),
      });
    }

    return new Response(JSON.stringify({ ok: true, id: res.insertedId }), { status: 201 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function GET(request) {
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
