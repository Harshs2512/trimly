// app/api/bookings/route.js
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(request) {
  // create booking
  const body = await request.json();
  // body: { userId, barberId, service, timeSlot, status }
  const client = await clientPromise;
  const db = client.db();
  const col = db.collection("bookings");
  body.createdAt = new Date();
  body.status = body.status || "pending";
  const res = await col.insertOne(body);

  // Optionally update barber waitingTime: naive increment
  const barbers = db.collection("barbers");
  await barbers.updateOne({ _id: new ObjectId(body.barberId) }, { $inc: { waitingTime: 10 } }).catch(()=>{});

  return new Response(JSON.stringify({ ok: true, id: res.insertedId }), { status: 201 });
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
