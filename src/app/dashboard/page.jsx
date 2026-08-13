import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import clientPromise from "@/lib/mongodb";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const client = await clientPromise;
  const db = client.db("trimly");
  
  const rawBookings = await db.collection("bookings")
    .find({ userId: session.user.id }) 
    .sort({ createdAt: -1 })
    .toArray();

  const bookings = rawBookings.map(b => ({
    ...b,
    _id: b._id.toString()
  }));

  return <DashboardClient user={session.user} bookings={bookings} />;
}
