import { legacyBarberIdentifiers, resolveBarber, canonicalBarberId } from "@/lib/booking";
import { createNotification } from "@/lib/notifications";
import { updateBarberWaitingTime } from "@/lib/waitingTime";

const ACTIVE_STATUSES = ["pending", "confirmed"];

async function cancelBookingIfActive(db, booking, reason) {
  const result = await db.collection("bookings").findOneAndUpdate(
    { _id: booking._id, status: { $in: ACTIVE_STATUSES } },
    {
      $set: { status: "cancelled", cancelReason: reason, updatedAt: new Date() },
      $unset: { reservationKeys: "" },
    },
    { returnDocument: "after" },
  );

  return result || null;
}

export async function cancelActiveBookingsForBarber(db, barber, reason) {
  if (!barber) return 0;

  const identifiers = legacyBarberIdentifiers(barber);
  const bookings = await db.collection("bookings").find({
    barberId: { $in: identifiers },
    status: { $in: ACTIVE_STATUSES },
  }).toArray();

  const cancelled = (await Promise.all(
    bookings.map((booking) => cancelBookingIfActive(db, booking, reason)),
  )).filter(Boolean);

  await Promise.all(cancelled.map((booking) => createNotification(db, {
    userId: booking.userId,
    type: "booking_update",
    message: `Your ${booking.service} booking was cancelled. ${reason}`,
    bookingId: booking._id.toString(),
  })));

  if (cancelled.length) {
    await updateBarberWaitingTime(db, canonicalBarberId(barber));
  }
  return cancelled.length;
}

export async function cancelActiveBookingsForCustomer(db, userId, reason) {
  const bookings = await db.collection("bookings").find({
    userId,
    status: { $in: ACTIVE_STATUSES },
  }).toArray();

  const cancelled = (await Promise.all(
    bookings.map((booking) => cancelBookingIfActive(db, booking, reason)),
  )).filter(Boolean);

  const barberIds = new Set();
  await Promise.all(cancelled.map(async (booking) => {
    const barber = await resolveBarber(db, booking.barberId);
    if (!barber) return;
    barberIds.add(canonicalBarberId(barber));
    if (barber.userId) {
      await createNotification(db, {
        userId: barber.userId,
        type: "booking_update",
        message: `A ${booking.service} booking was cancelled because the customer account is no longer active.`,
        bookingId: booking._id.toString(),
      });
    }
  }));

  await Promise.all([...barberIds].map((barberId) => updateBarberWaitingTime(db, barberId)));
  return cancelled.length;
}
