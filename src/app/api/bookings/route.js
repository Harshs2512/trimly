import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getActiveSession } from "@/lib/authz";
import { bookingCreateSchema } from "@/lib/validations";
import {
  canonicalBarberId,
  expirePendingBookings,
  getReservationKeys,
  getService,
  hasBookingConflict,
  resolveBarber,
  legacyBarberIdentifiers,
  validateBookingWindow,
} from "@/lib/booking";
import { updateBarberWaitingTime } from "@/lib/waitingTime";
import { createNotification } from "@/lib/notifications";
import { ensureIndexes } from "@/lib/indexes";
import { parsePagination, safeInternalError, rejectCrossSiteRequest } from "@/lib/api";

export async function POST(request) {
  try {
    const originError = rejectCrossSiteRequest(request);
    if (originError) return originError;
    await ensureIndexes();
    const session = await getActiveSession();
    if (!session) return Response.json({ error: "Not authenticated" }, { status: 401 });

    const validation = bookingCreateSchema.safeParse(await request.json());
    if (!validation.success) return Response.json({ error: validation.error.flatten() }, { status: 400 });

    const db = await getDb();
    const barber = await resolveBarber(db, validation.data.barberId);
    if (!barber || barber.deletedAt || barber.verificationStatus !== "verified") {
      return Response.json({ error: "Barber profile is not available for booking" }, { status: 404 });
    }

    const service = getService(barber, {
      serviceId: validation.data.serviceId,
      serviceName: validation.data.service,
    });
    if (!service) return Response.json({ error: "Selected service is not offered by this barber" }, { status: 400 });
    await expirePendingBookings(db, { barberId: { $in: legacyBarberIdentifiers(barber) } });

    const start = new Date(validation.data.timeSlot);
    const duration = service.duration;
    const end = new Date(start.getTime() + duration * 60000);
    const windowValidation = validateBookingWindow(barber, start, duration);
    if (!windowValidation.ok) return Response.json({ error: windowValidation.error }, { status: windowValidation.status });

    const conflict = await hasBookingConflict(db, {
      barber,
      userId: session.user.id,
      start,
      end,
    });
    if (conflict.conflict) {
      return Response.json({
        error: conflict.type === "user"
          ? "You already have another appointment during this time."
          : "This time slot is no longer available.",
      }, { status: 409 });
    }

    const barberId = canonicalBarberId(barber);
    const reservationKeys = getReservationKeys(start, end);
    const newBooking = {
      userId: session.user.id,
      barberId,
      serviceId: service.id || null,
      service: service.name,
      price: service.price,
      duration,
      timeSlot: start.toISOString(),
      endTime: end.toISOString(),
      reservationKeys,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("bookings").insertOne(newBooking);
    await updateBarberWaitingTime(db, barberId);

    if (barber.userId) {
      await createNotification(db, {
        userId: barber.userId,
        type: "booking_created",
        message: `New booking request for ${service.name}.`,
        bookingId: result.insertedId.toString(),
      });
    }

    return Response.json({
      ok: true,
      id: result.insertedId,
      status: "pending",
      message: "Booking request sent. Awaiting barber confirmation.",
    }, { status: 201 });
  } catch (error) {
    if (error?.code === 11000) {
      return Response.json({ error: "This time slot was just booked. Please choose another available time." }, { status: 409 });
    }
    return safeInternalError(error, "booking-create");
  }
}

export async function GET(request) {
  try {
    const session = await getActiveSession();
    if (!session) return Response.json({ error: "Not authenticated" }, { status: 401 });

    const url = new URL(request.url);
    const requestedUserId = url.searchParams.get("userId")?.trim();
    const requestedBarberId = url.searchParams.get("barberId")?.trim();
    const { limit, skip } = parsePagination(url.searchParams, { defaultLimit: 50, maxLimit: 100 });
    const db = await getDb();

    const filter = {};
    let barber = null;

    if (requestedBarberId) {
      barber = await resolveBarber(db, requestedBarberId);
      if (!barber) return Response.json({ error: "Barber profile not found" }, { status: 404 });
      const canReadBarberBookings = session.user.role === "admin" ||
        (session.user.role === "barber" && barber.userId === session.user.id);
      if (!canReadBarberBookings) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
      filter.barberId = { $in: legacyBarberIdentifiers(barber) };
    } else if (requestedUserId) {
      if (session.user.role !== "admin" && requestedUserId !== session.user.id) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
      filter.userId = requestedUserId;
    } else if (session.user.role !== "admin") {
      filter.userId = session.user.id;
    }

    await expirePendingBookings(db, filter);
    const [total, bookings] = await Promise.all([
      db.collection("bookings").countDocuments(filter),
      db.collection("bookings").find(filter).sort({ timeSlot: -1 }).skip(skip).limit(limit).toArray(),
    ]);

    const userIds = [...new Set(bookings.map((booking) => String(booking.userId)).filter(Boolean))];
    const users = userIds.length
      ? await db.collection("users").find({ _id: { $in: userIds.map((id) => new ObjectId(id)) } }, { projection: { name: 1 } }).toArray()
      : [];
    const userMap = new Map(users.map((user) => [user._id.toString(), user.name]));

    const barberIdentifiers = [...new Set(bookings.map((booking) => booking.barberId).filter(Boolean).map(String))];
    const objectBarberIds = barberIdentifiers.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
    const barbers = barberIdentifiers.length
      ? await db.collection("barbers").find(
          {
            $or: [
              ...(objectBarberIds.length ? [{ _id: { $in: objectBarberIds } }] : []),
              { userId: { $in: barberIdentifiers } },
            ],
          },
          { projection: { shopName: 1, address: 1, userId: 1, timezone: 1, bookingHorizonDays: 1 } },
        ).toArray()
      : [];
    const barberMap = new Map();
    for (const item of barbers) {
      barberMap.set(item._id.toString(), item);
      if (item.userId) barberMap.set(String(item.userId), item);
    }

    const result = bookings.map((booking) => {
      const shop = barberMap.get(String(booking.barberId));
      return {
        ...booking,
        customerName: userMap.get(booking.userId) || "Customer",
        shopName: shop?.shopName,
        shopAddress: shop?.address,
        barberProfileId: shop?._id?.toString?.(),
        shopTimezone: shop?.timezone || "Asia/Kolkata",
        shopBookingHorizonDays: shop?.bookingHorizonDays || 90,
      };
    });
    return Response.json({
      bookings: result,
      pagination: { total, page: Math.floor(skip / limit) + 1, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error) {
    return safeInternalError(error, "bookings-list");
  }
}
