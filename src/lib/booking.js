import { ObjectId } from "mongodb";

export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "declined",
  "no_show",
  "expired",
];

export const ACTIVE_BOOKING_STATUSES = ["pending", "confirmed"];
export const TERMINAL_BOOKING_STATUSES = ["completed", "cancelled", "declined", "no_show", "expired"];

const DEFAULT_TIMEZONE = "Asia/Kolkata";
const DEFAULT_LEAD_TIME_MINUTES = 30;
const DEFAULT_HORIZON_DAYS = 90;
const DEFAULT_SLOT_INTERVAL_MINUTES = 30;

export function resolveBarberTimezone(barber) {
  return barber?.timezone || DEFAULT_TIMEZONE;
}

export function getZonedParts(date, timeZone = DEFAULT_TIMEZONE) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "long",
    hourCycle: "h23",
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, part.value])
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: parts.weekday.toLowerCase(),
  };
}

function getTimeZoneOffsetMs(date, timeZone) {
  const parts = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - date.getTime();
}

export function zonedDateTimeToUtc(dateString, timeString, timeZone = DEFAULT_TIMEZONE) {
  const [year, month, day] = dateString.split("-").map(Number);
  const [hour, minute] = timeString.split(":").map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) return null;

  const wallClockAsUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  let offset = getTimeZoneOffsetMs(wallClockAsUtc, timeZone);
  let utc = new Date(wallClockAsUtc.getTime() - offset);
  const correctedOffset = getTimeZoneOffsetMs(utc, timeZone);
  if (correctedOffset !== offset) {
    utc = new Date(wallClockAsUtc.getTime() - correctedOffset);
  }
  return utc;
}

export function getLocalDateString(date, timeZone = DEFAULT_TIMEZONE) {
  const p = getZonedParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function formatLocalTime(date, timeZone = DEFAULT_TIMEZONE) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function timeToMinutes(value) {
  const [hours, minutes] = String(value || "").split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

export function isClosedOnDate(barber, date) {
  const timezone = resolveBarberTimezone(barber);
  const weekday = getZonedParts(date, timezone).weekday;
  return (barber.closedDays || []).map((day) => String(day).toLowerCase()).includes(weekday);
}

export function validateWorkingHours(workingHours) {
  if (!workingHours?.open || !workingHours?.close) return true;
  const openMinutes = timeToMinutes(workingHours.open);
  const closeMinutes = timeToMinutes(workingHours.close);
  return openMinutes !== null && closeMinutes !== null && openMinutes < closeMinutes;
}

export function getReservationKeys(start, end) {
  const startMinute = Math.floor(start.getTime() / 60000);
  const endMinute = Math.ceil(end.getTime() / 60000);
  const keys = [];
  for (let minute = startMinute; minute < endMinute; minute += 1) {
    keys.push(String(minute));
  }
  return keys;
}

export async function resolveBarber(db, barberId) {
  if (!barberId) return null;
  const col = db.collection("barbers");
  if (ObjectId.isValid(barberId)) {
    const byId = await col.findOne({ _id: new ObjectId(barberId) });
    if (byId) return byId;
  }
  return col.findOne({ userId: barberId });
}

export function getService(barber, { serviceId, serviceName }) {
  const services = barber?.services || [];
  if (serviceId) {
    const byId = services.find((service) => service.id === serviceId);
    if (byId) return byId;
  }
  if (serviceName) {
    return services.find((service) => service.name === serviceName) || null;
  }
  return null;
}

export function validateBookingWindow(barber, start, durationMinutes, now = new Date()) {
  if (!(start instanceof Date) || Number.isNaN(start.getTime())) {
    return { ok: false, status: 400, error: "Invalid date and time" };
  }

  const leadTimeMinutes = Number.isFinite(barber.leadTimeMinutes)
    ? barber.leadTimeMinutes
    : DEFAULT_LEAD_TIME_MINUTES;
  const horizonDays = Number.isFinite(barber.bookingHorizonDays)
    ? barber.bookingHorizonDays
    : DEFAULT_HORIZON_DAYS;

  const earliest = new Date(now.getTime() + leadTimeMinutes * 60000);
  if (start < earliest) {
    return { ok: false, status: 400, error: `Bookings require at least ${leadTimeMinutes} minutes notice` };
  }

  const latest = new Date(now.getTime() + horizonDays * 24 * 60 * 60 * 1000);
  if (start > latest) {
    return { ok: false, status: 400, error: `Bookings can only be made up to ${horizonDays} days in advance` };
  }

  if (isClosedOnDate(barber, start)) {
    return { ok: false, status: 400, error: "The shop is closed on the selected day" };
  }

  const timezone = resolveBarberTimezone(barber);
  const parts = getZonedParts(start, timezone);
  const startMinutes = parts.hour * 60 + parts.minute;
  const endMinutes = startMinutes + durationMinutes;
  const openMinutes = timeToMinutes(barber.workingHours?.open || "09:00");
  const closeMinutes = timeToMinutes(barber.workingHours?.close || "17:00");

  if (parts.second !== 0 || start.getMilliseconds() !== 0) {
    return { ok: false, status: 400, error: "Appointment times must start on an exact minute" };
  }

  if (openMinutes === null || closeMinutes === null || openMinutes >= closeMinutes) {
    return { ok: false, status: 400, error: "Barber working hours are not configured correctly" };
  }

  if (startMinutes < openMinutes || endMinutes > closeMinutes) {
    return {
      ok: false,
      status: 400,
      error: `Barber is only available between ${barber.workingHours?.open || "09:00"} and ${barber.workingHours?.close || "17:00"}`,
    };
  }

  const interval = getSlotIntervalMinutes(barber);
  if ((startMinutes - openMinutes) % interval !== 0) {
    return { ok: false, status: 400, error: `Appointment times must follow the ${interval}-minute slot interval` };
  }

  return { ok: true };
}

export function canonicalBarberId(barber) {
  return barber?._id?.toString?.() || String(barber?._id || "");
}

export function legacyBarberIdentifiers(barber) {
  const ids = [canonicalBarberId(barber)];
  if (barber?.userId) ids.push(barber.userId);
  return [...new Set(ids.filter(Boolean))];
}

export async function hasBookingConflict(db, { barber, userId, start, end, excludeBookingId = null }) {
  const col = db.collection("bookings");
  const barberIds = legacyBarberIdentifiers(barber);
  const legacyAssumedStartFloor = new Date(start.getTime() - 30 * 60000).toISOString();
  const base = {
    status: { $in: ACTIVE_BOOKING_STATUSES },
    $or: [
      {
        endTime: { $exists: true, $gt: start.toISOString() },
        timeSlot: { $lt: end.toISOString() },
      },
      {
        endTime: { $exists: false },
        timeSlot: { $gt: legacyAssumedStartFloor, $lt: end.toISOString() },
      },
    ],
  };
  if (excludeBookingId && ObjectId.isValid(excludeBookingId)) {
    base._id = { $ne: new ObjectId(excludeBookingId) };
  }

  const barberConflict = await col.findOne({ ...base, barberId: { $in: barberIds } }, { projection: { _id: 1 } });
  if (barberConflict) return { conflict: true, type: "barber" };

  const userConflict = await col.findOne({ ...base, userId }, { projection: { _id: 1 } });
  if (userConflict) return { conflict: true, type: "user" };

  return { conflict: false, type: null };
}

export async function expirePendingBookings(db, scope = {}) {
  const nowIso = new Date().toISOString();
  await db.collection("bookings").updateMany(
    {
      ...scope,
      status: "pending",
      timeSlot: { $lt: nowIso },
    },
    {
      $set: { status: "expired", updatedAt: new Date() },
      $unset: { reservationKeys: "", cancelReason: "" },
    }
  );
}

export function allowedTransitionsForActor(actor, currentStatus) {
  const table = {
    customer: {
      pending: ["cancelled"],
      confirmed: ["cancelled"],
      declined: ["pending"],
      cancelled: ["pending"],
      expired: ["pending"],
    },
    barber: {
      pending: ["confirmed", "declined"],
      confirmed: ["completed", "no_show", "cancelled"],
    },
    admin: {
      pending: ["confirmed", "declined", "cancelled"],
      confirmed: ["completed", "no_show", "cancelled"],
    },
  };
  return table[actor]?.[currentStatus] || [];
}

export function canTransition(actor, currentStatus, nextStatus) {
  return allowedTransitionsForActor(actor, currentStatus).includes(nextStatus);
}

export function getSlotIntervalMinutes(barber) {
  const value = Number(barber?.slotIntervalMinutes);
  if (Number.isFinite(value) && value >= 5 && value <= 120) return value;
  return DEFAULT_SLOT_INTERVAL_MINUTES;
}
