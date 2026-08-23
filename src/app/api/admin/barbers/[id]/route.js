import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getSessionWithRole } from "@/lib/authz";
import { adminBarberUpdateSchema } from "@/lib/validations";
import { writeAuditLog } from "@/lib/audit";
import { safeInternalError, rejectCrossSiteRequest } from "@/lib/api";
import { cancelActiveBookingsForBarber } from "@/lib/accountLifecycle";

export async function PUT(request, { params }) {
  try {
    const originError = rejectCrossSiteRequest(request);
    if (originError) return originError;
    const { session, error } = await getSessionWithRole(["admin"]);
    if (error) return error;
    const { id } = await params;
    if (!ObjectId.isValid(id)) return Response.json({ error: "Invalid barber ID" }, { status: 400 });

    const validation = adminBarberUpdateSchema.safeParse(await request.json());
    if (!validation.success) return Response.json({ error: validation.error.flatten() }, { status: 400 });

    const db = await getDb();
    const barberId = new ObjectId(id);
    const barber = await db.collection("barbers").findOne({ _id: barberId, deletedAt: { $exists: false } });
    if (!barber) return Response.json({ error: "Barber profile not found" }, { status: 404 });

    const nextStatus = validation.data.verificationStatus;
    if (nextStatus === "verified") {
      if (!ObjectId.isValid(barber.userId)) {
        return Response.json({ error: "This barber profile does not have a valid owner account." }, { status: 409 });
      }
      const owner = await db.collection("users").findOne(
        { _id: new ObjectId(barber.userId) },
        { projection: { role: 1, active: 1 } },
      );
      if (!owner || owner.active === false || owner.role !== "barber") {
        return Response.json({ error: "Only an active barber account can own an approved barber profile." }, { status: 409 });
      }
    }

    const now = new Date();
    await db.collection("barbers").updateOne(
      { _id: barberId },
      { $set: { verificationStatus: nextStatus, verifiedAt: nextStatus === "verified" ? now : null, updatedAt: now } },
    );

    const wasPubliclyVerified = barber.verificationStatus === "verified";
    if (wasPubliclyVerified && nextStatus !== "verified") {
      await cancelActiveBookingsForBarber(
        db,
        barber,
        "The barber profile is no longer approved for bookings.",
      );
    }

    await writeAuditLog(db, {
      actorId: session.user.id,
      action: "admin.barber.verification",
      targetType: "barber",
      targetId: id,
      metadata: validation.data,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return safeInternalError(error, "admin-barber-update");
  }
}
