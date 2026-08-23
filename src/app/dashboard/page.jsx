import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { getActiveSession } from "@/lib/authz";
import { getDb } from "@/lib/mongodb";
import { expirePendingBookings } from "@/lib/booking";
import DashboardClient from "./DashboardClient";

export default async function Dashboard() {
  const session = await getActiveSession();
  if (!session) redirect("/login");

  const db = await getDb();
  await expirePendingBookings(db, { userId: session.user.id });
  const rawBookings = await db.collection("bookings").find({ userId: session.user.id }).sort({ timeSlot: -1 }).toArray();

  const barberIdentifiers = [...new Set(rawBookings.map((booking) => booking.barberId).filter(Boolean).map(String))];
  const objectBarberIds = barberIdentifiers.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  const barbers = barberIdentifiers.length
    ? await db.collection("barbers").find(
        {
          $or: [
            ...(objectBarberIds.length ? [{ _id: { $in: objectBarberIds } }] : []),
            { userId: { $in: barberIdentifiers } },
          ],
        },
        { projection: { shopName: 1, address: 1, userId: 1, timezone: 1, bookingHorizonDays: 1 } }
      ).toArray()
    : [];
  const barberMap = new Map();
  for (const barber of barbers) {
    barberMap.set(barber._id.toString(), barber);
    if (barber.userId) barberMap.set(String(barber.userId), barber);
  }

  const bookings = rawBookings.map((booking) => {
    const barber = barberMap.get(String(booking.barberId));
    return {
      ...booking,
      _id: booking._id.toString(),
      createdAt: booking.createdAt?.toISOString?.() || booking.createdAt,
      updatedAt: booking.updatedAt?.toISOString?.() || booking.updatedAt,
      shopName: barber?.shopName || "Barber shop",
      shopAddress: barber?.address || "",
      barberProfileId: barber?._id?.toString?.() || String(booking.barberId),
      shopTimezone: barber?.timezone || "Asia/Kolkata",
      shopBookingHorizonDays: barber?.bookingHorizonDays || 90,
    };
  });

  return <DashboardClient user={session.user} bookings={bookings} />;
}
