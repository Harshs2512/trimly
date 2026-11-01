import { redirect } from "next/navigation";
import { getActiveSession } from "@/lib/authz";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import AdminClient from "./AdminClient";

const PAGE_SIZE = 20;

export default async function AdminPage() {
  const session = await getActiveSession();
  if (!session) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard");

  const db = await getDb();
  const usersQuery = {};
  const barbersQuery = { deletedAt: { $exists: false } };
  const now = new Date();
  const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    rawUsers,
    rawBarbers,
    rawBookings,
    rawLogs,
    totalUsers,
    totalBarbers,
    totalBookings,
    pendingBarbers,
    blockedMobileAdmins,
    securityLockouts,
    bookings24h,
  ] = await Promise.all([
    db.collection("users").find(usersQuery, { projection: { password: 0 } }).sort({ createdAt: -1 }).limit(PAGE_SIZE).toArray(),
    db.collection("barbers").find(barbersQuery).sort({ createdAt: -1 }).limit(PAGE_SIZE).toArray(),
    db.collection("bookings").find().sort({ timeSlot: -1 }).limit(PAGE_SIZE).toArray(),
    db.collection("audit_logs").find().sort({ createdAt: -1 }).limit(PAGE_SIZE).toArray(),
    db.collection("users").countDocuments(usersQuery),
    db.collection("barbers").countDocuments(barbersQuery),
    db.collection("bookings").countDocuments(),
    db.collection("barbers").countDocuments({ verificationStatus: { $in: ["pending", null] }, deletedAt: { $exists: false } }),
    db.collection("audit_logs").countDocuments({ action: "auth.mobile.admin_login_blocked" }),
    db.collection("audit_logs").countDocuments({ action: { $in: ["auth.admin.lockout", "auth.barber.lockout", "auth.login.rate_limited"] } }),
    db.collection("bookings").countDocuments({ createdAt: { $gte: past24h } }),
  ]);

  // Enrich bookings with user & shop names
  const bookingUserIds = [...new Set(rawBookings.map((b) => String(b.userId)).filter(Boolean))];
  const objUserIds = bookingUserIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  const bookingUsers = objUserIds.length
    ? await db.collection("users").find({ _id: { $in: objUserIds } }, { projection: { name: 1, email: 1, phone: 1 } }).toArray()
    : [];
  const userMap = new Map(bookingUsers.map((u) => [u._id.toString(), u]));

  const bookingBarberIds = [...new Set(rawBookings.map((b) => String(b.barberId)).filter(Boolean))];
  const objBarberIds = bookingBarberIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  const bookingBarbers = bookingBarberIds.length
    ? await db.collection("barbers").find(
        {
          $or: [
            ...(objBarberIds.length ? [{ _id: { $in: objBarberIds } }] : []),
            { userId: { $in: bookingBarberIds } },
          ],
        },
        { projection: { shopName: 1, address: 1, phone: 1 } }
      ).toArray()
    : [];
  const barberMap = new Map();
  for (const b of bookingBarbers) {
    barberMap.set(b._id.toString(), b);
    if (b.userId) barberMap.set(String(b.userId), b);
  }

  // Enrich logs with actor names
  const logActorIds = [...new Set(rawLogs.map((l) => l.actorId).filter(Boolean))];
  const objActorIds = logActorIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  const logActors = objActorIds.length
    ? await db.collection("users").find({ _id: { $in: objActorIds } }, { projection: { name: 1, email: 1, role: 1 } }).toArray()
    : [];
  const actorMap = new Map(logActors.map((a) => [a._id.toString(), a]));

  const users = rawUsers.map((u) => ({
    ...u,
    _id: u._id.toString(),
    createdAt: u.createdAt?.toISOString?.() || u.createdAt,
    updatedAt: u.updatedAt?.toISOString?.() || u.updatedAt,
  }));

  const barbers = rawBarbers.map((b) => ({
    ...b,
    _id: b._id.toString(),
    createdAt: b.createdAt?.toISOString?.() || b.createdAt,
    updatedAt: b.updatedAt?.toISOString?.() || b.updatedAt,
  }));

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
    };
  });

  const activity = rawLogs.map((l) => {
    const actor = actorMap.get(String(l.actorId));
    return {
      ...l,
      _id: l._id.toString(),
      createdAt: l.createdAt instanceof Date ? l.createdAt.toISOString() : l.createdAt,
      actorName: actor?.name || l.actorId || "System",
      actorEmail: actor?.email || (typeof l.metadata?.email === "string" ? l.metadata.email : null),
      actorRole: actor?.role || null,
    };
  });

  const totals = {
    users: totalUsers,
    barbers: totalBarbers,
    bookings: totalBookings,
    pendingBarbers,
    blockedMobileAdmins,
    securityLockouts,
    bookings24h,
  };

  return (
    <AdminClient
      adminUser={session.user}
      initialUsers={users}
      initialBarbers={barbers}
      initialBookings={bookings}
      initialActivity={activity}
      totals={totals}
      pageSize={PAGE_SIZE}
    />
  );
}
