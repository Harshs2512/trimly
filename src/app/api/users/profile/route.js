import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getActiveSession } from "@/lib/authz";
import { profileUpdateSchema } from "@/lib/validations";
import { safeInternalError, rejectCrossSiteRequest } from "@/lib/api";

export async function GET() {
  try {
    const session = await getActiveSession();
    if (!session) return Response.json({ error: "Not authenticated" }, { status: 401 });

    const db = await getDb();
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(session.user.id) },
      { projection: { password: 0 } }
    );
    if (!user) return Response.json({ error: "User not found" }, { status: 404 });
    return Response.json(user);
  } catch (error) {
    return safeInternalError(error, "profile-get");
  }
}

export async function PUT(req) {
  try {
    const originError = rejectCrossSiteRequest(req);
    if (originError) return originError;
    const session = await getActiveSession();
    if (!session) return Response.json({ error: "Not authenticated" }, { status: 401 });

    const validation = profileUpdateSchema.safeParse(await req.json());
    if (!validation.success) {
      return Response.json({ error: validation.error.flatten() }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(session.user.id), active: { $ne: false } },
      { $set: { name: validation.data.name, updatedAt: new Date() } }
    );
    if (!result.matchedCount) return Response.json({ error: "User not found" }, { status: 404 });
    return Response.json({ message: "Profile updated successfully" });
  } catch (error) {
    return safeInternalError(error, "profile-update");
  }
}
