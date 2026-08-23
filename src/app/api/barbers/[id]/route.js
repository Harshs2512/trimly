import crypto from "crypto";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getActiveSession } from "@/lib/authz";
import { barberUpdateSchema } from "@/lib/validations";
import { calculateBarberWaitingTime } from "@/lib/waitingTime";
import { safeInternalError, rejectCrossSiteRequest } from "@/lib/api";
import { cancelActiveBookingsForBarber } from "@/lib/accountLifecycle";

function normalizeServices(services = []) {
  const names = new Set();
  return services.map((service) => {
    const name = service.name.trim();
    const key = name.toLowerCase();
    if (names.has(key)) throw new Error(`Duplicate service: ${name}`);
    names.add(key);
    return { ...service, id: service.id || crypto.randomUUID(), name };
  });
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) return Response.json({ error: "Invalid ID" }, { status: 400 });

    const db = await getDb();
    const barber = await db.collection("barbers").findOne({ _id: new ObjectId(id), deletedAt: { $exists: false } });
    if (!barber) return Response.json({ error: "Barber not found" }, { status: 404 });

    const session = await getActiveSession();
    const isOwnerOrAdmin = session && (barber.userId === session.user.id || session.user.role === "admin");
    const isPublic = barber.verificationStatus === "verified";
    if (!isPublic && !isOwnerOrAdmin) return Response.json({ error: "Barber not found" }, { status: 404 });

    const waitingTime = await calculateBarberWaitingTime(db, id);
    const { userId, ...safe } = barber;
    return Response.json({ ...safe, waitingTime, ...(isOwnerOrAdmin ? { ownerUserId: userId } : {}) });
  } catch (error) {
    return safeInternalError(error, "barber-get");
  }
}

export async function PUT(request, { params }) {
  try {
    const originError = rejectCrossSiteRequest(request);
    if (originError) return originError;
    const session = await getActiveSession();
    if (!session) return Response.json({ error: "Not authenticated" }, { status: 401 });

    const { id } = await params;
    if (!ObjectId.isValid(id)) return Response.json({ error: "Invalid ID" }, { status: 400 });

    const validation = barberUpdateSchema.safeParse(await request.json());
    if (!validation.success) return Response.json({ error: validation.error.flatten() }, { status: 400 });

    const db = await getDb();
    const existing = await db.collection("barbers").findOne({ _id: new ObjectId(id), deletedAt: { $exists: false } });
    if (!existing) return Response.json({ error: "Barber not found" }, { status: 404 });
    const canManage = session.user.role === "admin" ||
      (session.user.role === "barber" && existing.userId === session.user.id);
    if (!canManage) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const update = { ...validation.data, updatedAt: new Date() };
    if (update.services) {
      try {
        update.services = normalizeServices(update.services);
      } catch (error) {
        return Response.json({ error: "Service names must be unique." }, { status: 400 });
      }
    }
    if (session.user.role !== "admin" && existing.verificationStatus === "verified") {
      update.verificationStatus = "pending";
      update.verifiedAt = null;
    }
    await db.collection("barbers").updateOne({ _id: existing._id }, { $set: update });
    return Response.json({ ok: true, message: "Barber updated" });
  } catch (error) {
    return safeInternalError(error, "barber-update");
  }
}

export async function DELETE(request, { params }) {
  try {
    const originError = rejectCrossSiteRequest(request);
    if (originError) return originError;
    const session = await getActiveSession();
    if (!session) return Response.json({ error: "Not authenticated" }, { status: 401 });

    const { id } = await params;
    if (!ObjectId.isValid(id)) return Response.json({ error: "Invalid ID" }, { status: 400 });

    const db = await getDb();
    const barber = await db.collection("barbers").findOne({ _id: new ObjectId(id), deletedAt: { $exists: false } });
    if (!barber) return Response.json({ error: "Barber not found" }, { status: 404 });
    const canManage = session.user.role === "admin" ||
      (session.user.role === "barber" && barber.userId === session.user.id);
    if (!canManage) return Response.json({ error: "Forbidden" }, { status: 403 });

    const now = new Date();
    await db.collection("barbers").updateOne(
      { _id: barber._id },
      { $set: { deletedAt: now, verificationStatus: "rejected", updatedAt: now } }
    );

    await cancelActiveBookingsForBarber(
      db,
      barber,
      "The barber profile is no longer available.",
    );

    return Response.json({ ok: true, message: "Barber profile deactivated" });
  } catch (error) {
    return safeInternalError(error, "barber-delete");
  }
}
