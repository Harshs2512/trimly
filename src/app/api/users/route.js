// app/api/users/route.js
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });
    }

    if (session.user?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const client = await clientPromise;
    const db = client.db("trimly");
    const col = db.collection("users");

    const total = await col.countDocuments();
    const users = await col.find({}, { projection: { password: 0 } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return new Response(JSON.stringify({
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
