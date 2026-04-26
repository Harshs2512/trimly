// app/api/barbers/route.js
import clientPromise from "@/lib/mongodb";
import { barberSchema } from "@/lib/validations";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const service = searchParams.get("service");
  const name = searchParams.get("name");
  const userId = searchParams.get("userId");

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
  if (userId) {
    query.userId = userId;
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

    const { userId } = validation.data;

    const client = await clientPromise;
    const db = client.db();
    const col = db.collection("barbers");

    // Check if profile already exists for this user
    const existing = await col.findOne({ userId });
    if (existing) {
      return new Response(JSON.stringify({ error: "Profile already exists for this user. Use PUT to update." }), { status: 409 });
    }

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

export async function PUT(request) {
  try {
    const body = await request.json();

    // Use partial schema for updates, but ensure userId is present
    const validation = barberSchema.partial().safeParse(body);

    if (!validation.success) {
      return new Response(JSON.stringify({ error: validation.error.format() }), { status: 400 });
    }

    const { userId } = validation.data;
    if (!userId) {
      return new Response(JSON.stringify({ error: "User ID is required" }), { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const col = db.collection("barbers");

    const updateData = { ...validation.data, updatedAt: new Date() };
    delete updateData.userId; // Don't update userId itself

    const updateResult = await col.updateOne(
      { userId: userId },
      { $set: updateData }
    );

    if (updateResult.matchedCount === 0) {
      return new Response(JSON.stringify({ error: "Barber profile not found" }), { status: 404 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
