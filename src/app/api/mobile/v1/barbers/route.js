import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { ensureIndexes } from "@/lib/indexes";
import { calculateDistanceKm, isValidCoordinate } from "@/lib/geo";
import { getZonedParts, resolveBarberTimezone, timeToMinutes } from "@/lib/booking";
import { enforceMobileRateLimit } from "@/lib/rateLimit";
import {
  checkEtag,
  enforceAppVersion,
  getMobileClientIp,
  getRequestId,
  mobileError,
  mobileSuccess,
  serializeBarber,
} from "@/lib/mobileResponse";

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
