import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import {
  ACTIVE_BOOKING_STATUSES,
  getService,
  getSlotIntervalMinutes,
  getZonedParts,
  legacyBarberIdentifiers,
  resolveBarberTimezone,
  timeToMinutes,
  validateBookingWindow,
  zonedDateTimeToUtc,
  expirePendingBookings,
} from "@/lib/booking";
import { safeInternalError } from "@/lib/api";
import { ensureIndexes } from "@/lib/indexes";

export async function GET(request, { params }) {
  try {
    await ensureIndexes();
    const { id } = await params;
    if (!ObjectId.isValid(id)) return Response.json({ error: "Invalid barber ID" }, { status: 400 });

    const url = new URL(request.url);
    const date = url.searchParams.get("date")?.trim();
    const serviceId = url.searchParams.get("serviceId")?.trim();
    const serviceName = url.searchParams.get("service")?.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return Response.json({ error: "A valid date is required" }, { status: 400 });
    const [inputYear, inputMonth, inputDay] = date.split("-").map(Number);
    const normalizedDate = new Date(Date.UTC(inputYear, inputMonth - 1, inputDay)).toISOString().slice(0, 10);
    if (normalizedDate !== date) return Response.json({ error: "A valid date is required" }, { status: 400 });

    const db = await getDb();
    const barber = await db.collection("barbers").findOne({ _id: new ObjectId(id), deletedAt: { $exists: false } });
    if (!barber || barber.verificationStatus !== "verified") {
      return Response.json({ error: "Barber not available" }, { status: 404 });
    }

    const service = getService(barber, { serviceId, serviceName });
    if (!service) return Response.json({ error: "Selected service is not available" }, { status: 400 });

    const timezone = resolveBarberTimezone(barber);
    const dateAtNoon = zonedDateTimeToUtc(date, "12:00", timezone);
    if (!dateAtNoon) return Response.json({ error: "Invalid date" }, { status: 400 });
    const weekday = getZonedParts(dateAtNoon, timezone).weekday;
    if ((barber.closedDays || []).map((day) => String(day).toLowerCase()).includes(weekday)) {
      return Response.json({ date, timezone, slots: [] });
    }

    const openMinutes = timeToMinutes(barber.workingHours?.open || "09:00");
    const closeMinutes = timeToMinutes(barber.workingHours?.close || "17:00");
    if (openMinutes === null || closeMinutes === null || openMinutes >= closeMinutes) {
      return Response.json({ error: "Barber working hours are not configured correctly" }, { status: 409 });
    }
    const interval = getSlotIntervalMinutes(barber);
    const duration = service.duration;
    const dayStart = zonedDateTimeToUtc(date, "00:00", timezone);
    const [year, month, day] = date.split("-").map(Number);
    const nextDateString = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
    const dayEnd = zonedDateTimeToUtc(nextDateString, "00:00", timezone);
    await expirePendingBookings(db, { barberId: { $in: legacyBarberIdentifiers(barber) } });

    const active = await db.collection("bookings").find({
      barberId: { $in: legacyBarberIdentifiers(barber) },
      status: { $in: ACTIVE_BOOKING_STATUSES },
      timeSlot: { $gte: dayStart.toISOString(), $lt: dayEnd.toISOString() },
    }, { projection: { timeSlot: 1, endTime: 1, duration: 1 } }).toArray();

    const slots = [];
    for (let minute = openMinutes; minute + duration <= closeMinutes; minute += interval) {
      const hh = String(Math.floor(minute / 60)).padStart(2, "0");
      const mm = String(minute % 60).padStart(2, "0");
      const start = zonedDateTimeToUtc(date, `${hh}:${mm}`, timezone);
      const end = new Date(start.getTime() + duration * 60000);
      const validation = validateBookingWindow(barber, start, duration);
      if (!validation.ok) continue;

      const overlap = active.some((booking) => {
        const bStart = new Date(booking.timeSlot);
        const bEnd = new Date(booking.endTime || new Date(bStart.getTime() + (booking.duration || 30) * 60000));
        return start < bEnd && end > bStart;
      });
      if (overlap) continue;

      slots.push({
        value: start.toISOString(),
        label: new Intl.DateTimeFormat("en-IN", { timeZone: timezone, hour: "2-digit", minute: "2-digit" }).format(start),
      });
    }

    return Response.json({ date, timezone, service: { id: service.id, name: service.name, duration: service.duration, price: service.price }, slots });
  } catch (error) {
    return safeInternalError(error, "booking-availability");
  }
}
