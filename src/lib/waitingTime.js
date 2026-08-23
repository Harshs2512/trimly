import { ACTIVE_BOOKING_STATUSES, legacyBarberIdentifiers, resolveBarber } from "@/lib/booking";

export async function calculateBarberWaitingTime(db, barberId, now = new Date()) {
  const barber = await resolveBarber(db, barberId);
  if (!barber) return 0;

  const identifiers = legacyBarberIdentifiers(barber);
  const legacyFloor = new Date(now.getTime() - 30 * 60000).toISOString();
  const bookings = await db.collection("bookings").find({
    barberId: { $in: identifiers },
    status: { $in: ACTIVE_BOOKING_STATUSES },
    $or: [
      { endTime: { $gt: now.toISOString() } },
      { endTime: { $exists: false }, timeSlot: { $gt: legacyFloor } },
    ],
  }).sort({ timeSlot: 1 }).toArray();

  let cursor = new Date(now);
  for (const booking of bookings) {
    const start = new Date(booking.timeSlot);
    const end = new Date(booking.endTime || new Date(start.getTime() + (booking.duration || 30) * 60000));
    if (end <= cursor) continue;
    if (start > cursor) break;
    if (end > cursor) cursor = end;
  }

  return Math.max(0, Math.ceil((cursor.getTime() - now.getTime()) / 60000));
}

export async function updateBarberWaitingTime(db, barberId) {
  try {
    const barber = await resolveBarber(db, barberId);
    if (!barber) return 0;
    const waitingTime = await calculateBarberWaitingTime(db, barberId);
    await db.collection("barbers").updateOne(
      { _id: barber._id },
      { $set: { waitingTime, waitingTimeUpdatedAt: new Date() } }
    );
    return waitingTime;
  } catch (error) {
    console.error("[waiting-time] Failed to update waiting time", error);
    return 0;
  }
}
