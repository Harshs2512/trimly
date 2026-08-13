import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import clientPromise from "@/lib/mongodb";
import { redirect } from "next/navigation";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const client = await clientPromise;
  const db = client.db("trimly");

  const rawUsers = await db.collection("users")
    .find({}, { projection: { password: 0 } })
    .sort({ createdAt: -1 })
    .toArray();

  const rawBarbers = await db.collection("barbers")
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  const totalBookings = await db.collection("bookings").countDocuments();

  const users = rawUsers.map(u => ({ ...u, _id: u._id.toString(), createdAt: u.createdAt?.toISOString() }));
  const barbers = rawBarbers.map(b => ({ ...b, _id: b._id.toString(), createdAt: b.createdAt?.toISOString() }));

  return (
    <AdminClient 
      adminUser={session.user} 
      initialUsers={users} 
      initialBarbers={barbers} 
      totalBookings={totalBookings} 
    />
  );
}
