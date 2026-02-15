import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ObjectId } from "mongodb";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return Response.json({ message: "Not authenticated" }, { status: 401 });
        }

        const client = await clientPromise;
        const db = client.db("trimly");
        const user = await db.collection("users").findOne({ email: session.user.email });

        if (!user) {
            return Response.json({ message: "User not found" }, { status: 404 });
        }

        // Remove sensitive data
        const { password, ...userProfile } = user;

        return Response.json(userProfile);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return Response.json({ message: "Not authenticated" }, { status: 401 });
        }

        const body = await req.json();
        const { name, role } = body; // Allow updating name and role only for now

        const client = await clientPromise;
        const db = client.db("trimly");

        // We update by email since it's unique and present in session
        const updateResult = await db.collection("users").updateOne(
            { email: session.user.email },
            { $set: { name, role, updatedAt: new Date() } }
        );

        if (updateResult.modifiedCount === 0) {
            return Response.json({ message: "No changes made or user not found" }, { status: 400 });
        }

        return Response.json({ message: "Profile updated successfully" });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
