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
  if (!barber) return "";
  if (typeof barber === "string") return barber;
  return barber._id?.toString?.() || String(barber._id || "");
}

export function legacyBarberIdentifiers(barber) {
  if (!barber) return [];
  if (typeof barber === "string") return [barber];
  const ids = [canonicalBarberId(barber)];
  if (barber.userId) ids.push(String(barber.userId));
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

export async function getBarberAvailability(db, { barber, date, serviceId, serviceName }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
    return { ok: false, status: 400, code: "INVALID_DATE", error: "A valid date (YYYY-MM-DD) is required" };
  }
  const [inputYear, inputMonth, inputDay] = date.split("-").map(Number);
  const normalizedDate = new Date(Date.UTC(inputYear, inputMonth - 1, inputDay)).toISOString().slice(0, 10);
  if (normalizedDate !== date) {
    return { ok: false, status: 400, code: "INVALID_DATE", error: "A valid date is required" };
  }

  const service = getService(barber, { serviceId, serviceName });
  if (!service) {
    return { ok: false, status: 400, code: "SERVICE_NOT_FOUND", error: "Selected service is not available" };
  }

  const timezone = resolveBarberTimezone(barber);
  const dateAtNoon = zonedDateTimeToUtc(date, "12:00", timezone);
  if (!dateAtNoon) {
    return { ok: false, status: 400, code: "INVALID_DATE", error: "Invalid date" };
  }
  const weekday = getZonedParts(dateAtNoon, timezone).weekday;
  if ((barber.closedDays || []).map((day) => String(day).toLowerCase()).includes(weekday)) {
    return {
      ok: true,
      data: {
        date,
        timezone,
        isClosedDay: true,
        service: { id: service.id, name: service.name, duration: service.duration, price: service.price },
        slots: [],
      },
    };
  }

  const openMinutes = timeToMinutes(barber.workingHours?.open || "09:00");
  const closeMinutes = timeToMinutes(barber.workingHours?.close || "17:00");
  if (openMinutes === null || closeMinutes === null || openMinutes >= closeMinutes) {
    return { ok: false, status: 409, code: "HOURS_MISCONFIGURED", error: "Barber working hours are not configured correctly" };
  }

  const interval = getSlotIntervalMinutes(barber);
  const duration = service.duration;
  const dayStart = zonedDateTimeToUtc(date, "00:00", timezone);
  const nextDateString = new Date(Date.UTC(inputYear, inputMonth - 1, inputDay + 1)).toISOString().slice(0, 10);
  const dayEnd = zonedDateTimeToUtc(nextDateString, "00:00", timezone);

  await expirePendingBookings(db, { barberId: { $in: legacyBarberIdentifiers(barber) } });

  const active = await db
    .collection("bookings")
    .find(
      {
        barberId: { $in: legacyBarberIdentifiers(barber) },
        status: { $in: ACTIVE_BOOKING_STATUSES },
        timeSlot: { $gte: dayStart.toISOString(), $lt: dayEnd.toISOString() },
      },
      { projection: { timeSlot: 1, endTime: 1, duration: 1 } }
    )
    .toArray();

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

  return {
    ok: true,
    data: {
      date,
      timezone,
      isClosedDay: false,
      service: { id: service.id, name: service.name, duration: service.duration, price: service.price },
      slots,
    },
  };
}

/**
 * Shared domain logic for updating booking status across web and mobile.
 */
export async function updateBookingStatus(db, { bookingId, user, status, cancelReason, timeSlot }) {
  if (!ObjectId.isValid(bookingId)) {
    return { ok: false, status: 400, code: "INVALID_BOOKING_ID", error: "Invalid booking ID" };
  }

  const bookings = db.collection("bookings");
  const bookingObjectId = new ObjectId(bookingId);
  await expirePendingBookings(db, { _id: bookingObjectId });
  const existing = await bookings.findOne({ _id: bookingObjectId });
  if (!existing) {
    return { ok: false, status: 404, code: "BOOKING_NOT_FOUND", error: "Booking not found" };
  }

  const barber = await resolveBarber(db, existing.barberId);
  if (!barber) {
    return { ok: false, status: 404, code: "BARBER_NOT_FOUND", error: "Barber profile not found" };
  }

  let actor = null;
  if (user.role === "admin") actor = "admin";
  else if (user.role === "barber" && barber.userId === user.id) actor = "barber";
  else if (existing.userId === user.id) actor = "customer";
  if (!actor) {
    return { ok: false, status: 403, code: "FORBIDDEN", error: "Forbidden" };
  }

  if (!canTransition(actor, existing.status, status)) {
    return {
      ok: false,
      status: 409,
      code: "INVALID_TRANSITION",
      error: `A ${actor} cannot change a booking from ${existing.status} to ${status}.`,
    };
  }

  const scheduledStart = new Date(existing.timeSlot);
  const now = new Date();
  if (actor === "customer" && status === "cancelled" && scheduledStart <= now) {
    return {
      ok: false,
      status: 409,
      code: "CANCEL_AFTER_START",
      error: "An appointment cannot be cancelled after its scheduled start time.",
    };
  }
  if (actor === "barber" && status === "no_show" && scheduledStart > now) {
    return {
      ok: false,
      status: 409,
      code: "NO_SHOW_FUTURE",
      error: "A future appointment cannot be marked no show.",
    };
  }
  const scheduledEnd = new Date(existing.endTime || new Date(scheduledStart.getTime() + (existing.duration || 30) * 60000));
  if (actor === "barber" && status === "completed" && scheduledEnd > now) {
    return {
      ok: false,
      status: 409,
      code: "COMPLETE_BEFORE_END",
      error: "An appointment cannot be completed before its scheduled service end time.",
    };
  }

  if (actor === "customer" && status === "pending" && !timeSlot) {
    return {
      ok: false,
      status: 400,
      code: "RESCHEDULE_TIME_REQUIRED",
      error: "A new time slot is required when rescheduling.",
    };
  }

  if (actor === "customer" && status === "pending") {
    if (barber.deletedAt || barber.verificationStatus !== "verified") {
      return {
        ok: false,
        status: 409,
        code: "BARBER_NOT_AVAILABLE",
        error: "This barber profile is no longer available for booking.",
      };
    }
    const currentService = getService(barber, {
      serviceId: existing.serviceId,
      serviceName: existing.service,
    });
    if (!currentService) {
      return {
        ok: false,
        status: 409,
        code: "SERVICE_NOT_OFFERED",
        error: "This service is no longer offered. Please create a new booking with an available service.",
      };
    }
  }

  if (actor !== "customer" && timeSlot) {
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      error: "Only the customer can choose a new time while rescheduling.",
    };
  }

  const updateFields = { status, updatedAt: new Date() };
  const unsetFields = {};
  let newStart = new Date(existing.timeSlot);
  let newEnd = new Date(existing.endTime || new Date(newStart.getTime() + (existing.duration || 30) * 60000));

  if (timeSlot) {
    newStart = new Date(timeSlot);
    newEnd = new Date(newStart.getTime() + (existing.duration || 30) * 60000);
    const windowValidation = validateBookingWindow(barber, newStart, existing.duration || 30);
    if (!windowValidation.ok) {
      return {
        ok: false,
        status: windowValidation.status,
        code: "INVALID_BOOKING_WINDOW",
        error: windowValidation.error,
      };
    }

    const conflict = await hasBookingConflict(db, {
      barber,
      userId: existing.userId,
      start: newStart,
      end: newEnd,
      excludeBookingId: bookingId,
    });
    if (conflict.conflict) {
      return {
        ok: false,
        status: 409,
        code: conflict.type === "user" ? "USER_CONFLICT" : "SLOT_TAKEN",
        error:
          conflict.type === "user"
            ? "You already have another appointment during this time."
            : "This time slot is no longer available.",
      };
    }

    updateFields.timeSlot = newStart.toISOString();
    updateFields.endTime = newEnd.toISOString();
    updateFields.reservationKeys = getReservationKeys(newStart, newEnd);
  } else if (status === "confirmed" && !existing.reservationKeys) {
    const conflict = await hasBookingConflict(db, {
      barber,
      userId: existing.userId,
      start: newStart,
      end: newEnd,
      excludeBookingId: bookingId,
    });
    if (conflict.conflict) {
      return {
        ok: false,
        status: 409,
        code: "BOOKING_CONFLICT",
        error: "This booking now conflicts with another appointment.",
      };
    }
    updateFields.reservationKeys = getReservationKeys(newStart, newEnd);
  }

  if (["cancelled", "declined"].includes(status)) {
    updateFields.cancelReason = cancelReason || (status === "declined" ? "Declined by barber" : `Cancelled by ${actor}`);
    unsetFields.reservationKeys = "";
  } else if (["completed", "no_show"].includes(status)) {
    unsetFields.reservationKeys = "";
    unsetFields.cancelReason = "";
  } else {
    unsetFields.cancelReason = "";
  }

  const updateQuery = { $set: updateFields };
  if (Object.keys(unsetFields).length) updateQuery.$unset = unsetFields;

  const updateResult = await bookings.updateOne(
    { _id: existing._id, status: existing.status },
    updateQuery
  );

  if (!updateResult.matchedCount) {
    return {
      ok: false,
      status: 409,
      code: "BOOKING_CHANGED",
      error: "This booking changed while your request was being processed. Refresh and try again.",
    };
  }

  const canonicalId = canonicalBarberId(barber);
  const { updateBarberWaitingTime } = await import("./waitingTime.js");
  const { createNotification } = await import("./notifications.js");

  await updateBarberWaitingTime(db, canonicalId);

  if (actor === "customer") {
    await createNotification(db, {
      userId: barber.userId,
      type: "booking_update",
      message:
        status === "pending"
          ? `A customer rescheduled their ${existing.service} booking request.`
          : `A customer cancelled their ${existing.service} booking.`,
      bookingId,
    });
  } else {
    let message = `Your ${existing.service} booking is now ${status.replace("_", " ")}.`;
    if (["cancelled", "declined"].includes(status) && updateFields.cancelReason) {
      message += ` Reason: ${updateFields.cancelReason}`;
    }
    await createNotification(db, {
      userId: existing.userId,
      type: "booking_update",
      message,
      bookingId,
    });
  }

  const updatedBooking = await bookings.findOne({ _id: existing._id });
  return { ok: true, status, booking: updatedBooking };
}

