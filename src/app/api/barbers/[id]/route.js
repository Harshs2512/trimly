// app/api/barbers/[id]/route.js
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request, { params }) {
  const id = params.id;
  const client = await clientPromise;
  const db = client.db();
  const col = db.collection("barbers");
  const barber = await col.findOne({ _id: new ObjectId(id) });
  if (!barber) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  return new Response(JSON.stringify(barber), { status: 200 });
}

export async function PUT(request, { params }) {
  const id = params.id;
  const body = await request.json();
  const client = await clientPromise;
  const db = client.db();
  const col = db.collection("barbers");

  await col.updateOne({ _id: new ObjectId(id) }, { $set: body });
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
