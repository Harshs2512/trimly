import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { escapeRegex } from "@/lib/api";
import { calculateBarberWaitingTime } from "@/lib/waitingTime";
import { calculateDistanceKm, resolveCityCoordinates, isValidCoordinate } from "@/lib/geo";

export function slugify(text = "") {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "") || "barber";
}

export function getBarberCanonicalSlug(barber) {
  if (!barber) return "";
  const city = slugify(barber.city || "india");
  const name = slugify(barber.shopName || "salon");
  const shortId = barber._id ? barber._id.toString().slice(-6) : "000000";
  return `/barbers/${city}/${name}-${shortId}`;
}

export function parseBarberSlug(slugParam) {
  if (!slugParam) return null;
  // Match a trailing 6-char hex shortId: e.g. "classic-cuts-a1b2c3" -> "a1b2c3"
  const match = slugParam.match(/-([a-f0-9]{6})$/i);
  if (match) {
    return { shortId: match[1] };
  }
  // Check if it's a full 24-char ObjectId
  if (/^[a-f0-9]{24}$/i.test(slugParam)) {
    return { fullId: slugParam };
  }
  return null;
}

export function sanitizePublicBarber(barber, waitingTime = 0) {
  if (!barber) return null;
  const { userId, idType, idNumber, idDocumentImage, ...safe } = barber;
  return {
    ...safe,
    _id: safe._id.toString(),
    waitingTime,
    canonicalSlug: getBarberCanonicalSlug(barber),
  };
}

export async function getVerifiedBarbers({
  page = 1,
  limit = 24,
  search = "",
  service = "",
  city = "",
  lat = null,
  lng = null,
} = {}) {
  const db = await getDb();
  const query = {
    deletedAt: { $exists: false },
    verificationStatus: "verified",
  };

  if (city) {
    query.city = { $regex: new RegExp(`^${escapeRegex(city.trim())}$`, "i") };
  }

  if (service) {
    query["services.name"] = { $regex: escapeRegex(service), $options: "i" };
  }

  if (search) {
    const matcher = { $regex: escapeRegex(search), $options: "i" };
    query.$and = [
      ...(query.$and || []),
      { $or: [{ shopName: matcher }, { address: matcher }, { city: matcher }, { "services.name": matcher }] },
    ];
  }

  const collection = db.collection("barbers");
  const skip = Math.max(0, (page - 1) * limit);

  const [total, list] = await Promise.all([
    collection.countDocuments(query),
    collection.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
  ]);

  const hasCoords = isValidCoordinate(lng, lat);

  const barbers = await Promise.all(
    list.map(async (doc) => {
      let waitingTime = 0;
      try {
        waitingTime = await calculateBarberWaitingTime(db, doc._id.toString());
      } catch {
        waitingTime = 0;
      }
      const item = sanitizePublicBarber(doc, waitingTime);

      if (hasCoords) {
        let bLat = doc.location?.coordinates?.[1];
        let bLng = doc.location?.coordinates?.[0];
        if (!bLat || !bLng) {
          const fallback = resolveCityCoordinates(doc.city || doc.address);
          if (fallback) {
            bLng = fallback[0];
            bLat = fallback[1];
          }
        }
        if (bLat && bLng) {
          item.distanceKm = calculateDistanceKm(lat, lng, bLat, bLng);
        }
      }
      return item;
    })
  );

  if (hasCoords) {
    barbers.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }

  return {
    barbers,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function getBarberById(idOrSlug) {
  if (!idOrSlug) return null;
  const db = await getDb();
  let query = null;

  if (ObjectId.isValid(idOrSlug) && idOrSlug.length === 24) {
    query = { _id: new ObjectId(idOrSlug) };
  } else {
    const parsed = parseBarberSlug(idOrSlug);
    if (parsed?.fullId && ObjectId.isValid(parsed.fullId)) {
      query = { _id: new ObjectId(parsed.fullId) };
    } else if (parsed?.shortId) {
      // Find barber matching shortId in the last 6 chars of _id string
      query = {
        $expr: {
          $eq: [
            { $substrCP: [{ $toString: "$_id" }, 18, 6] },
            parsed.shortId.toLowerCase(),
          ],
        },
      };
    }
  }

  if (!query) return null;

  const doc = await db.collection("barbers").findOne({
    ...query,
    deletedAt: { $exists: false },
    verificationStatus: "verified",
  });

  if (!doc) return null;

  let waitingTime = 0;
  try {
    waitingTime = await calculateBarberWaitingTime(db, doc._id.toString());
  } catch {
    waitingTime = 0;
  }

  return sanitizePublicBarber(doc, waitingTime);
}

export async function getBarberReviewsSummary(barberId) {
  if (!barberId) return { count: 0, rating: 0, reviews: [] };
  const db = await getDb();
  const idStr = barberId.toString();

  const reviews = await db
    .collection("reviews")
    .find({
      barberId: idStr,
      status: { $in: ["approved", "active", "published"] },
      deletedAt: { $exists: false },
    })
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();

  if (!reviews.length) {
    return { count: 0, rating: 0, reviews: [] };
  }

  const totalRating = reviews.reduce((sum, r) => sum + (r.rating || 5), 0);
  const avg = Number((totalRating / reviews.length).toFixed(1));

  return {
    count: reviews.length,
    rating: avg,
    reviews: reviews.map((r) => ({
      _id: r._id.toString(),
      author: r.userName || r.customerName || "Verified Customer",
      rating: r.rating || 5,
      comment: r.comment || "",
      date: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
    })),
  };
}

export async function getCityDirectoryStats() {
  const db = await getDb();
  const pipeline = [
    {
      $match: {
        deletedAt: { $exists: false },
        verificationStatus: "verified",
        city: { $exists: true, $ne: "" },
      },
    },
    {
      $group: {
        _id: { $toLower: "$city" },
        cityOriginal: { $first: "$city" },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ];

  const results = await db.collection("barbers").aggregate(pipeline).toArray();
  return results.map((r) => ({
    citySlug: slugify(r._id),
    cityName: r.cityOriginal,
    count: r.count,
  }));
}

export const POPULAR_SERVICES = [
  {
    slug: "haircut",
    name: "Haircut & Styling",
    description: "Precision cuts, fades, crops and styling tailored to your face shape.",
    priceRange: "₹200 - ₹800",
    duration: "30-45 mins",
  },
  {
    slug: "beard-trim",
    name: "Beard Trim & Shape",
    description: "Hot towel beard sculpting, razor lining, and conditioning oils.",
    priceRange: "₹150 - ₹400",
    duration: "20-30 mins",
  },
  {
    slug: "hair-colour",
    name: "Hair Colour & Highlights",
    description: "Ammonia-free grey coverage, global tinting and modern highlights.",
    priceRange: "₹500 - ₹2,500",
    duration: "45-90 mins",
  },
  {
    slug: "facial",
    name: "Facial & De-Tan Cleanup",
    description: "Charcoal detox, vitamin C brightening, and post-sun skin rejuvenation.",
    priceRange: "₹400 - ₹1,500",
    duration: "40-60 mins",
  },
  {
    slug: "bridal-grooming",
    name: "Pre-Groom & Wedding Package",
    description: "Comprehensive grooming package including cut, beard styling, facial, and mani-pedi.",
    priceRange: "₹2,000 - ₹7,000",
    duration: "90-180 mins",
  },
  {
    slug: "kids-haircut",
    name: "Kids Haircut",
    description: "Gentle, stress-free grooming for children with patient stylists.",
    priceRange: "₹150 - ₹350",
    duration: "20-30 mins",
  },
];

export async function getPlatformTrustStats() {
  try {
    const db = await getDb();
    const [barbersCount, distinctCities, bookingsCount, reviewStats] = await Promise.all([
      db.collection("barbers").countDocuments({ verificationStatus: "verified" }),
      db.collection("barbers").distinct("city", { verificationStatus: "verified" }),
      db.collection("bookings").countDocuments({ status: "completed" }),
      db.collection("reviews").aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: null, avgRating: { $avg: "$rating" }, totalReviews: { $sum: 1 } } },
      ]).toArray(),
    ]);

    const avg = reviewStats[0]?.avgRating ? Number(reviewStats[0].avgRating.toFixed(1)) : 4.8;
    const totalRev = reviewStats[0]?.totalReviews || 0;

    return {
      verifiedBarbersCount: barbersCount,
      citiesCount: distinctCities.filter(Boolean).length,
      completedBookingsCount: bookingsCount,
      averageRating: avg,
      totalReviews: totalRev,
    };
  } catch (err) {
    console.error("Failed to fetch platform trust stats:", err);
    return {
      verifiedBarbersCount: 0,
      citiesCount: 0,
      completedBookingsCount: 0,
      averageRating: 4.8,
      totalReviews: 0,
    };
  }
}

export async function getRecentGenuineReviews(limit = 6) {
  try {
    const db = await getDb();
    const reviews = await db
      .collection("reviews")
      .find({
        isDeleted: { $ne: true },
        rating: { $gte: 4 },
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return reviews.map((r) => ({
      _id: r._id.toString(),
      rating: r.rating,
      comment: r.comment || "",
      userName: r.userName || "Verified Customer",
      barberName: r.barberShopName || r.barberName || "Verified Salon",
      barberCity: r.barberCity || "",
      service: r.serviceName || r.service || "Haircut & Styling",
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
    }));
  } catch (err) {
    console.error("Failed to load genuine reviews:", err);
    return [];
  }
}


