// app/api/barbers/route.js
import clientPromise from "@/lib/mongodb";
import { barberSchema } from "@/lib/validations";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const service = searchParams.get("service");
  const name = searchParams.get("name");

  const client = await clientPromise;
  const db = client.db();
  const col = db.collection("barbers");

  let query = {};
  if (service) {
    query["services.name"] = { $regex: service, $options: "i" };
  }
  if (name) {
    query.shopName = { $regex: name, $options: "i" };
  }

  const list = await col.find(query).toArray();
  return new Response(JSON.stringify(list), { status: 200 });
}

export async function POST(request) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = barberSchema.safeParse(body);
    if (!validation.success) {
      return new Response(JSON.stringify({ error: validation.error.format() }), { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const col = db.collection("barbers");

    // expected: { userId, shopName, address, services: [{name, price}], workingHours: {open,close} }
    const res = await col.insertOne({
      ...validation.data,
      createdAt: new Date(),
      waitingTime: validation.data.waitingTime || 0
    });

    return new Response(JSON.stringify({ ok: true, id: res.insertedId }), { status: 201 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
