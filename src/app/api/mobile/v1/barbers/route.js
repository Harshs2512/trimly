import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { ensureIndexes } from "@/lib/indexes";
import {
  checkEtag,
  enforceAppVersion,
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
    const { searchParams } = new URL(request.url);

    const search = (searchParams.get("search") || "").trim();
    const city = (searchParams.get("city") || "").trim();
    const serviceFilter = (searchParams.get("service") || "").trim();
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

    // Geo query if coordinates are provided
    const isGeo = Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
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
    const barbers = await db
      .collection("barbers")
      .find(query)
      .sort(sortSpec)
      .limit(limit + 1)
      .toArray();

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
