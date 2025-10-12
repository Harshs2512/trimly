// app/api/barbers/route.js
import clientPromise from "@/lib/mongodb";

export async function GET() {
  const client = await clientPromise;
  const db = client.db();
  const col = db.collection("barbers");
  const list = await col.find({}).toArray();
  return new Response(JSON.stringify(list), { status: 200 });
}

export async function POST(request) {
  const body = await request.json();
  const client = await clientPromise;
  const db = client.db();
  const col = db.collection("barbers");

  // expected: { userId, shopName, address, services: [{name, price}], workingHours: {open,close} }
  const res = await col.insertOne({ ...body, createdAt: new Date(), waitingTime: body.waitingTime || 0 });
  return new Response(JSON.stringify({ ok: true, id: res.insertedId }), { status: 201 });
}
