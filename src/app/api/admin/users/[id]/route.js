import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), { status: 403 });
    }

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return new Response(JSON.stringify({ error: "Invalid User ID" }), { status: 400 });
    }

    const body = await request.json();
    const { role, active } = body;

    const updateFields = { updatedAt: new Date() };
    if (role && ["user", "barber", "admin"].includes(role)) {
      updateFields.role = role;
    }
    if (typeof active === "boolean") {
      updateFields.active = active;
    }

    const client = await clientPromise;
    const db = client.db("trimly");
    const res = await db.collection("users").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );

    if (res.matchedCount === 0) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
    }

    return new Response(JSON.stringify({ ok: true, message: "User updated successfully" }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
