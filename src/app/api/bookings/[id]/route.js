import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request, { params }) {
    try {
        const { id } = await params; // await params in Next.js 15+ if needed, or just params depending on version. 15.5 usually async params
        if (!ObjectId.isValid(id)) {
            return new Response(JSON.stringify({ error: "Invalid ID" }), { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db();
        const booking = await db.collection("bookings").findOne({ _id: new ObjectId(id) });

        if (!booking) {
            return new Response(JSON.stringify({ error: "Booking not found" }), { status: 404 });
        }

        return new Response(JSON.stringify(booking), { status: 200 });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}

export async function PATCH(request, { params }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { status } = body;

        if (!ObjectId.isValid(id)) {
            return new Response(JSON.stringify({ error: "Invalid ID" }), { status: 400 });
        }

        if (!["pending", "confirmed", "completed", "cancelled"].includes(status)) {
            return new Response(JSON.stringify({ error: "Invalid status" }), { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db();

        const res = await db.collection("bookings").updateOne(
            { _id: new ObjectId(id) },
            { $set: { status, updatedAt: new Date() } }
        );

        if (res.matchedCount === 0) {
            return new Response(JSON.stringify({ error: "Booking not found" }), { status: 404 });
        }

        return new Response(JSON.stringify({ ok: true, message: "Booking updated" }), { status: 200 });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
