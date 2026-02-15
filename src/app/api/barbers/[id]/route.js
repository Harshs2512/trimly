import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { barberSchema } from "@/lib/validations";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return new Response(JSON.stringify({ error: "Invalid ID" }), { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const barber = await db.collection("barbers").findOne({ _id: new ObjectId(id) });

    if (!barber) {
      return new Response(JSON.stringify({ error: "Barber not found" }), { status: 404 });
    }

    return new Response(JSON.stringify(barber), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });
    }

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return new Response(JSON.stringify({ error: "Invalid ID" }), { status: 400 });
    }

    const body = await request.json();

    // Validate request body
    // Allow partial updates by using partial() on the schema
    const validation = barberSchema.partial().safeParse(body);

    if (!validation.success) {
      return new Response(JSON.stringify({ error: validation.error.format() }), { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Check ownership
    const existingBarber = await db.collection("barbers").findOne({ _id: new ObjectId(id) });
    if (!existingBarber) {
      return new Response(JSON.stringify({ error: "Barber not found" }), { status: 404 });
    }

    // Ensure only the owner or admin can update
    if (existingBarber.userId !== session.user.id && session.user.role !== 'admin') {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
    }

    const updateData = { ...validation.data, updatedAt: new Date() };
    delete updateData.userId; // Prevent changing ownership

    const res = await db.collection("barbers").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    return new Response(JSON.stringify({ ok: true, message: "Barber updated" }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });
    }

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return new Response(JSON.stringify({ error: "Invalid ID" }), { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Check ownership
    const existingBarber = await db.collection("barbers").findOne({ _id: new ObjectId(id) });
    if (!existingBarber) {
      return new Response(JSON.stringify({ error: "Barber not found" }), { status: 404 });
    }

    if (existingBarber.userId !== session.user.id && session.user.role !== 'admin') {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
    }

    await db.collection("barbers").deleteOne({ _id: new ObjectId(id) });

    return new Response(JSON.stringify({ ok: true, message: "Barber deleted" }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
