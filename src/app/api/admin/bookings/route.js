import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getSessionWithRole } from "@/lib/authz";
import { escapeRegex, parsePagination, safeInternalError } from "@/lib/api";
import { expirePendingBookings } from "@/lib/booking";

export async function GET(request) {
  try {
    const { error } = await getSessionWithRole(["admin"]);
    if (error) return error;

    const url = new URL(request.url);
    const { page, limit, skip } = parsePagination(url.searchParams);
    const status = url.searchParams.get("status")?.trim();
    const search = url.searchParams.get("search")?.trim();
    const date = url.searchParams.get("date")?.trim();

    const db = await getDb();
    await expirePendingBookings(db, {});

    const filter = {};
    if (status && status !== "all") {
      filter.status = status;
    }

    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const dayStart = new Date(`${date}T00:00:00.000Z`);
      const dayEnd = new Date(`${date}T23:59:59.999Z`);
      filter.timeSlot = { $gte: dayStart, $lte: dayEnd };
    }

    // If search term provided, find matching userIds or barberIds first
    if (search) {
      const reg = { $regex: escapeRegex(search), $options: "i" };
      const [matchedUsers, matchedBarbers] = await Promise.all([
        db.collection("users").find({ $or: [{ name: reg }, { email: reg }] }, { projection: { _id: 1 } }).toArray(),
        db.collection("barbers").find({ $or: [{ shopName: reg }, { address: reg }] }, { projection: { _id: 1, userId: 1 } }).toArray(),
      ]);

      const userIds = matchedUsers.map((u) => u._id.toString());
      const barberIds = [
        ...matchedBarbers.map((b) => b._id.toString()),
        ...matchedBarbers.map((b) => b.userId ? String(b.userId) : null).filter(Boolean),
      ];

      filter.$or = [
        { service: reg },
        ...(userIds.length ? [{ userId: { $in: userIds } }] : []),
        ...(barberIds.length ? [{ barberId: { $in: barberIds } }] : []),
      ];
    }

    const bookingsCol = db.collection("bookings");
    const [
      total,
      rawBookings,
      pendingCount,
      confirmedCount,
      completedCount,
      cancelledCount,
      declinedCount,
      noShowCount,
    ] = await Promise.all([
      bookingsCol.countDocuments(filter),
      bookingsCol.find(filter).sort({ timeSlot: -1 }).skip(skip).limit(limit).toArray(),
      bookingsCol.countDocuments({ status: "pending" }),
      bookingsCol.countDocuments({ status: "confirmed" }),
      bookingsCol.countDocuments({ status: "completed" }),
      bookingsCol.countDocuments({ status: "cancelled" }),
      bookingsCol.countDocuments({ status: "declined" }),
      bookingsCol.countDocuments({ status: "no_show" }),
    ]);

    // Enriched customer and barber details
    const userIds = [...new Set(rawBookings.map((b) => String(b.userId)).filter(Boolean))];
    const objectUserIds = userIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
    const users = objectUserIds.length
      ? await db.collection("users").find({ _id: { $in: objectUserIds } }, { projection: { name: 1, email: 1, phone: 1 } }).toArray()
      : [];
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const barberIds = [...new Set(rawBookings.map((b) => String(b.barberId)).filter(Boolean))];
    const objectBarberIds = barberIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
    const barbers = barberIds.length
      ? await db.collection("barbers").find(
          {
            $or: [
              ...(objectBarberIds.length ? [{ _id: { $in: objectBarberIds } }] : []),
              { userId: { $in: barberIds } },
            ],
          },
          { projection: { shopName: 1, address: 1, userId: 1, phone: 1, timezone: 1 } },
        ).toArray()
      : [];
    const barberMap = new Map();
    for (const b of barbers) {
      barberMap.set(b._id.toString(), b);
      if (b.userId) barberMap.set(String(b.userId), b);
    }

    const bookings = rawBookings.map((b) => {
      const u = userMap.get(String(b.userId));
      const s = barberMap.get(String(b.barberId));
      return {
        ...b,
        _id: b._id.toString(),
        timeSlot: b.timeSlot instanceof Date ? b.timeSlot.toISOString() : b.timeSlot,
        createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt,
        customerName: u?.name || "Customer",
        customerEmail: u?.email || "Unknown",
        customerPhone: u?.phone || "",
        shopName: s?.shopName || "Barbershop",
        shopAddress: s?.address || "",
        shopPhone: s?.phone || "",
        shopTimezone: s?.timezone || "Asia/Kolkata",
      };
    });

    return Response.json({
      bookings,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      counts: {
        all: pendingCount + confirmedCount + completedCount + cancelledCount + declinedCount + noShowCount,
        pending: pendingCount,
        confirmed: confirmedCount,
        completed: completedCount,
        cancelled: cancelledCount,
        declined: declinedCount,
        no_show: noShowCount,
      },
    });
  } catch (error) {
    return safeInternalError(error, "admin-bookings-list");
  }
}

