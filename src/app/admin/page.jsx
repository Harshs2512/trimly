import { redirect } from "next/navigation";
import { getActiveSession } from "@/lib/authz";
import { getDb } from "@/lib/mongodb";
import AdminClient from "./AdminClient";

const PAGE_SIZE = 20;

export default async function AdminPage() {
  const session = await getActiveSession();
  if (!session) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard");

  const db = await getDb();
  const usersQuery = {};
  const barbersQuery = { deletedAt: { $exists: false } };
  const [rawUsers, rawBarbers, totalUsers, totalBarbers, totalBookings] = await Promise.all([
    db.collection("users").find(usersQuery, { projection: { password: 0 } }).sort({ createdAt: -1 }).limit(PAGE_SIZE).toArray(),
    db.collection("barbers").find(barbersQuery).sort({ createdAt: -1 }).limit(PAGE_SIZE).toArray(),
    db.collection("users").countDocuments(usersQuery),
    db.collection("barbers").countDocuments(barbersQuery),
    db.collection("bookings").countDocuments(),
  ]);

  const users = rawUsers.map((u) => ({ ...u, _id: u._id.toString(), createdAt: u.createdAt?.toISOString?.() || u.createdAt }));
  const barbers = rawBarbers.map((b) => ({ ...b, _id: b._id.toString(), createdAt: b.createdAt?.toISOString?.() || b.createdAt, updatedAt: b.updatedAt?.toISOString?.() || b.updatedAt }));

  return <AdminClient adminUser={session.user} initialUsers={users} initialBarbers={barbers} totals={{ users: totalUsers, barbers: totalBarbers, bookings: totalBookings }} pageSize={PAGE_SIZE} />;
}
