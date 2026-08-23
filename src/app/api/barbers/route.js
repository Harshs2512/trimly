import crypto from "crypto";
import { getDb } from "@/lib/mongodb";
import { barberSchema, barberUpdateSchema } from "@/lib/validations";
import { getActiveSession } from "@/lib/authz";
import { escapeRegex, parsePagination, safeInternalError, rejectCrossSiteRequest } from "@/lib/api";
import { calculateBarberWaitingTime } from "@/lib/waitingTime";
import { ensureIndexes } from "@/lib/indexes";

function normalizeServices(services = []) {
  const names = new Set();
  return services.map((service) => {
    const normalizedName = service.name.trim();
    const key = normalizedName.toLowerCase();
    if (names.has(key)) throw new Error(`Duplicate service: ${normalizedName}`);
    names.add(key);
    return { ...service, id: service.id || crypto.randomUUID(), name: normalizedName };
  });
}

function publicBarber(barber, waitingTime) {
  const { userId, ...safe } = barber;
  return { ...safe, waitingTime };
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const service = url.searchParams.get("service")?.trim();
    const name = url.searchParams.get("name")?.trim();
    const search = url.searchParams.get("search")?.trim();
    const userId = url.searchParams.get("userId")?.trim();
    const { page, limit, skip } = parsePagination(url.searchParams, { defaultLimit: 24, maxLimit: 100 });

    const db = await getDb();
    const query = { deletedAt: { $exists: false } };

    if (userId) {
      const session = await getActiveSession();
      if (!session || (session.user.id !== userId && session.user.role !== "admin")) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
      query.userId = userId;
    } else {
      query.verificationStatus = "verified";
    }

    if (service) query["services.name"] = { $regex: escapeRegex(service), $options: "i" };
    if (name) query.shopName = { $regex: escapeRegex(name), $options: "i" };
    if (search) {
      const matcher = { $regex: escapeRegex(search), $options: "i" };
      query.$and = [
        ...(query.$and || []),
        { $or: [{ shopName: matcher }, { address: matcher }, { "services.name": matcher }] },
      ];
    }

    const collection = db.collection("barbers");
    const [total, list] = await Promise.all([
      collection.countDocuments(query),
      collection.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    ]);
    const result = await Promise.all(
      list.map(async (barber) => publicBarber(barber, await calculateBarberWaitingTime(db, barber._id.toString())))
    );
    return Response.json({
      barbers: result,
      pagination: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error) {
    return safeInternalError(error, "barbers-list");
  }
}

export async function POST(request) {
  try {
    const originError = rejectCrossSiteRequest(request);
    if (originError) return originError;
    await ensureIndexes();
    const session = await getActiveSession();
    if (!session) return Response.json({ error: "Not authenticated" }, { status: 401 });
    if (session.user.role !== "barber") {
      return Response.json({ error: "Only barber accounts can create a shop profile." }, { status: 403 });
    }

    const validation = barberSchema.safeParse(await request.json());
    if (!validation.success) return Response.json({ error: validation.error.flatten() }, { status: 400 });

    const db = await getDb();
    const existing = await db.collection("barbers").findOne({ userId: session.user.id });
    if (existing && !existing.deletedAt) {
      return Response.json({ error: "A barber profile already exists for this account." }, { status: 409 });
    }

    let services;
    try {
      services = normalizeServices(validation.data.services);
    } catch (error) {
      return Response.json({ error: "Service names must be unique." }, { status: 400 });
    }

    const now = new Date();
    const doc = {
      ...validation.data,
      userId: session.user.id,
      services,
      waitingTime: 0,
      verificationStatus: "pending",
      updatedAt: now,
    };

    if (existing?.deletedAt) {
      await db.collection("barbers").updateOne(
        { _id: existing._id },
        {
          $set: { ...doc, reactivatedAt: now },
          $unset: { deletedAt: "", verifiedAt: "" },
        },
      );
      return Response.json({ ok: true, id: existing._id, verificationStatus: "pending", reactivated: true }, { status: 201 });
    }

    const result = await db.collection("barbers").insertOne({ ...doc, createdAt: now });
    return Response.json({ ok: true, id: result.insertedId, verificationStatus: "pending" }, { status: 201 });
  } catch (error) {
    if (error?.code === 11000) return Response.json({ error: "A barber profile already exists for this account." }, { status: 409 });
    return safeInternalError(error, "barber-create");
  }
}

export async function PUT(request) {
  try {
    const originError = rejectCrossSiteRequest(request);
    if (originError) return originError;
    const session = await getActiveSession();
    if (!session) return Response.json({ error: "Not authenticated" }, { status: 401 });
    if (session.user.role !== "barber") return Response.json({ error: "Forbidden" }, { status: 403 });

    const validation = barberUpdateSchema.safeParse(await request.json());
    if (!validation.success) return Response.json({ error: validation.error.flatten() }, { status: 400 });

    const db = await getDb();
    const existing = await db.collection("barbers").findOne({ userId: session.user.id, deletedAt: { $exists: false } });
    if (!existing) return Response.json({ error: "Barber profile not found" }, { status: 404 });

    const update = { ...validation.data, updatedAt: new Date() };
    if (update.services) {
      try {
        update.services = normalizeServices(update.services);
      } catch (error) {
        return Response.json({ error: "Service names must be unique." }, { status: 400 });
      }
    }

    if (existing.verificationStatus === "verified") {
      update.verificationStatus = "pending";
      update.verifiedAt = null;
    }

    await db.collection("barbers").updateOne({ _id: existing._id }, { $set: update });
    return Response.json({ ok: true });
  } catch (error) {
    return safeInternalError(error, "barber-update-self");
  }
}
