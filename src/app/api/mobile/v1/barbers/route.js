import crypto from "crypto";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { ensureIndexes } from "@/lib/indexes";
import { calculateDistanceKm, isValidCoordinate } from "@/lib/geo";
import { getZonedParts, resolveBarberTimezone, timeToMinutes } from "@/lib/booking";
import { enforceMobileRateLimit } from "@/lib/rateLimit";
import { getMobileSession } from "@/lib/mobileAuth";
import { barberSchema } from "@/lib/validations";
import {
  checkEtag,
  enforceAppVersion,
  getMobileClientIp,
  getRequestId,
  mobileError,
  mobileSuccess,
  serializeBarber,
} from "@/lib/mobileResponse";

function normalizeServices(services = []) {
  const names = new Set();
  return services.map((service) => {
    const name = (service.name || "").trim();
    const key = name.toLowerCase();
    if (names.has(key)) throw new Error(`Duplicate service: ${name}`);
    names.add(key);
    return {
      id: service.id || crypto.randomUUID(),
      name,
      price: Number(service.price) || 0,
      duration: Number(service.duration || service.durationMinutes) || 30,
    };
  });
}

export async function GET(request) {
  const versionError = enforceAppVersion(request);
  if (versionError) return versionError;

  const requestId = getRequestId(request);
  try {
    await ensureIndexes();
    const ip = getMobileClientIp(request);

    // Search and list rate limiting: 120 requests per minute per IP
    const rateLimitError = await enforceMobileRateLimit(
      `mobile:barbers:search:ip:${ip}`,
      120,
      60 * 1000,
      { requestId, message: "Too many search requests. Please slow down." }
    );
    if (rateLimitError) return rateLimitError;
    const { searchParams } = new URL(request.url);

    const search = (searchParams.get("search") || "").trim();
    const city = (searchParams.get("city") || "").trim();
    const serviceFilter = (searchParams.get("service") || "").trim();
    const minRating = parseFloat(searchParams.get("minRating"));
    const maxPrice = parseFloat(searchParams.get("maxPrice"));
    const openNow = searchParams.get("openNow") === "true";
    const lat = parseFloat(searchParams.get("lat"));
    const lng = parseFloat(searchParams.get("lng"));
    const radiusKm = Math.min(Math.max(parseFloat(searchParams.get("radiusKm")) || 25, 1), 100);
    const cursor = searchParams.get("cursor");
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10), 1), 50);
    const sort = searchParams.get("sort") || "rating";

    const query = {
      verificationStatus: "verified",
      deletedAt: { $exists: false },
    };

    if (cursor && ObjectId.isValid(cursor)) {
      query._id = { $lt: new ObjectId(cursor) };
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { shopName: { $regex: escaped, $options: "i" } },
        { address: { $regex: escaped, $options: "i" } },
        { city: { $regex: escaped, $options: "i" } },
        { area: { $regex: escaped, $options: "i" } },
      ];
    }

    if (city) {
      query.city = { $regex: `^${city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" };
    }

    if (serviceFilter) {
      query["services.name"] = { $regex: serviceFilter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    }

    if (Number.isFinite(minRating)) {
      query.rating = { $gte: minRating };
    }

    if (Number.isFinite(maxPrice)) {
      query["services.price"] = { $lte: maxPrice };
    }

    // Geo query if coordinates are provided
    const isGeo = isValidCoordinate(lng, lat);
    if (isGeo) {
      query.location = {
        $nearSphere: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat],
          },
          $maxDistance: radiusKm * 1000,
        },
      };
    }

    let sortSpec = { _id: -1 };
    if (!isGeo) {
      if (sort === "rating") {
        sortSpec = { rating: -1, _id: -1 };
      } else if (sort === "waiting_time") {
        sortSpec = { waitingTime: 1, _id: -1 };
      } else if (sort === "name") {
        sortSpec = { name: 1, _id: -1 };
      }
    }

    const db = await getDb();
    let barbers = await db
      .collection("barbers")
      .find(query)
      .sort(sortSpec)
      .limit(limit * 2) // Fetch a bit extra for post-filtering open-now
      .toArray();

    // Attach distanceKm if coordinates were supplied
    if (isGeo) {
      barbers = barbers.map((b) => {
        if (b.location?.coordinates && b.location.coordinates.length === 2) {
          const [bLng, bLat] = b.location.coordinates;
          const dist = calculateDistanceKm(lat, lng, bLat, bLng);
          return { ...b, distanceKm: dist };
        }
        return b;
      });
    }

    // Filter by openNow in barber's own timezone if requested
    if (openNow) {
      const now = new Date();
      barbers = barbers.filter((barber) => {
        const tz = resolveBarberTimezone(barber);
        const parts = getZonedParts(now, tz);
        const isClosedDay = (barber.closedDays || []).map((d) => d.toLowerCase()).includes(parts.weekday);
        if (isClosedDay) return false;

        const currentMinutes = parts.hour * 60 + parts.minute;
        const openMin = timeToMinutes(barber.workingHours?.open || "09:00");
        const closeMin = timeToMinutes(barber.workingHours?.close || "17:00");
        return openMin !== null && closeMin !== null && currentMinutes >= openMin && currentMinutes < closeMin;
      });
    }

    const hasMore = barbers.length > limit;
    const items = (hasMore ? barbers.slice(0, limit) : barbers).map(serializeBarber);
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

    const responsePayload = {
      items,
      nextCursor,
      count: items.length,
    };

    const payloadJson = JSON.stringify(responsePayload);
    const { etag, isMatch } = checkEtag(request, payloadJson);

    if (isMatch) {
      return new Response(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "public, max-age=60",
          "X-Request-Id": requestId,
        },
      });
    }

    return mobileSuccess(responsePayload, {
      requestId,
      headers: {
        ETag: etag,
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (error) {
    console.error("[mobile-barbers-list]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "Failed to fetch barbers.",
      status: 500,
      requestId,
    });
  }
}

export async function POST(request) {
  const versionError = enforceAppVersion(request);
  if (versionError) return versionError;

  const requestId = getRequestId(request);
  try {
    await ensureIndexes();
    const auth = await getMobileSession(request, ["barber"]);
    if (!auth.session) {
      return mobileError({
        code: auth.error.code,
        message: auth.error.message,
        status: auth.error.status,
        requestId,
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return mobileError({
        code: "INVALID_JSON",
        message: "Invalid JSON request body.",
        status: 400,
        requestId,
      });
    }

    // Adapt mobile payload: support bio as description, durationMinutes as duration
    if (body.bio !== undefined && body.description === undefined) {
      body.description = body.bio;
    }
    if (Array.isArray(body.services)) {
      body.services = body.services.map((s) => ({
        ...s,
        duration: s.duration || s.durationMinutes || 30,
      }));
    }

    const validation = barberSchema.safeParse(body);
    if (!validation.success) {
      return mobileError({
        code: "VALIDATION_ERROR",
        message: "Validation failed.",
        details: validation.error.flatten(),
        status: 400,
        requestId,
      });
    }

    const db = await getDb();
    const existing = await db.collection("barbers").findOne({
      userId: auth.session.user.id,
      deletedAt: { $exists: false },
    });
    if (existing) {
      return mobileError({
        code: "BARBER_ALREADY_EXISTS",
        message: "A barber profile already exists for this account.",
        status: 409,
        requestId,
      });
    }

    let services = [];
    try {
      services = normalizeServices(validation.data.services || []);
    } catch (err) {
      return mobileError({
        code: "DUPLICATE_SERVICE",
        message: err.message,
        status: 400,
        requestId,
      });
    }

    const now = new Date();
    const newBarber = {
      ...validation.data,
      userId: auth.session.user.id,
      services,
      waitingTime: 0,
      rating: 0,
      reviewCount: 0,
      verificationStatus: "pending",
      createdAt: now,
      updatedAt: now,
    };

    const insertResult = await db.collection("barbers").insertOne(newBarber);
    const created = await db.collection("barbers").findOne({ _id: insertResult.insertedId });

    return mobileSuccess(serializeBarber(created), {
      status: 201,
      requestId,
    });
  } catch (error) {
    console.error("[mobile-barbers-create]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "Failed to create barber profile.",
      status: 500,
      requestId,
    });
  }
}

