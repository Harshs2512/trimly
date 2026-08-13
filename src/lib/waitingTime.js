import { ObjectId } from "mongodb";

export async function updateBarberWaitingTime(db, barberId) {
  try {
    const barbers = db.collection("barbers");
    const bookingsCol = db.collection("bookings");

    let barber = null;
    if (ObjectId.isValid(barberId)) {
      barber = await barbers.findOne({ _id: new ObjectId(barberId) });
    }
    if (!barber) {
      barber = await barbers.findOne({ userId: barberId });
    }
    if (!barber) return;

    // Get today's start and end date
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const activeBookings = await bookingsCol.find({
      barberId: barberId,
      status: { $in: ["pending", "confirmed"] },
    }).toArray();

    // Filter bookings scheduled for today or remaining today
    const now = new Date();
    let totalWaitingTime = 0;

    for (const booking of activeBookings) {
      const bookingTime = new Date(booking.timeSlot);
      if (bookingTime >= startOfDay && bookingTime <= endOfDay) {
        // Look up service duration from barber services
        const serviceObj = barber.services?.find(s => s.name === booking.service);
        const duration = serviceObj?.duration || booking.duration || 30;
        totalWaitingTime += duration;
      }
    }

    await barbers.updateOne(
      { _id: barber._id },
      { $set: { waitingTime: totalWaitingTime } }
    );
  } catch (err) {
    console.error("Error updating barber waiting time:", err);
  }
}
