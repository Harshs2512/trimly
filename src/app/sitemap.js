import { getDb } from "@/lib/mongodb";
import { getAppUrl } from "@/lib/appUrl";
import { POPULAR_SERVICES, getBarberCanonicalSlug, slugify } from "@/lib/barbers";

const MIN_INDEX_BARBERS = parseInt(process.env.MIN_CITY_BARBERS_INDEX || "3", 10);

// Accurate baseline content dates (avoids telling Google unchanged static pages changed every second)
const STATIC_PAGE_LASTMOD = {
  home: new Date("2026-11-12T00:00:00.000Z"),
  forBarbers: new Date("2026-11-12T00:00:00.000Z"),
  about: new Date("2026-11-10T00:00:00.000Z"),
  contact: new Date("2026-11-10T00:00:00.000Z"),
  faq: new Date("2026-11-12T00:00:00.000Z"),
  legal: new Date("2026-08-21T00:00:00.000Z"), // Matches "Last Updated: August 21, 2026"
  services: new Date("2026-11-10T00:00:00.000Z"),
};

export default async function sitemap() {
  const appUrl = getAppUrl();

  try {
    const db = await getDb();

    // 1. Fetch verified barbers with timestamps for accurate lastModified
    const barbers = await db
      .collection("barbers")
      .find(
        {
          deletedAt: { $exists: false },
          verificationStatus: "verified",
        },
        {
          projection: {
            _id: 1,
            shopName: 1,
            city: 1,
            services: 1,
            updatedAt: 1,
            createdAt: 1,
          },
        }
      )
      .limit(50000)
      .toArray();

    // Determine latest update across all verified barbers
    let latestBarberUpdate = STATIC_PAGE_LASTMOD.home;
    const cityCounts = {};
    const cityLatestUpdate = {};

    for (const b of barbers) {
      const bDate = b.updatedAt ? new Date(b.updatedAt) : b.createdAt ? new Date(b.createdAt) : STATIC_PAGE_LASTMOD.home;
      if (bDate > latestBarberUpdate) {
        latestBarberUpdate = bDate;
      }
      if (b.city) {
        const cityKey = slugify(b.city);
        cityCounts[cityKey] = (cityCounts[cityKey] || 0) + 1;
        if (!cityLatestUpdate[cityKey] || bDate > cityLatestUpdate[cityKey]) {
          cityLatestUpdate[cityKey] = bDate;
        }
      }
    }

    // Determine latest review update for /reviews lastmod
    let latestReviewUpdate = latestBarberUpdate;
    try {
      const latestReview = await db
        .collection("reviews")
        .findOne(
          { deletedAt: { $exists: false } },
          { sort: { createdAt: -1 }, projection: { createdAt: 1, updatedAt: 1 } }
        );
      if (latestReview) {
        latestReviewUpdate = new Date(latestReview.updatedAt || latestReview.createdAt);
      }
    } catch {
      // Fallback to latestBarberUpdate
    }

    // 2. Fetch published blog posts with accurate publication/modification timestamps
    let blogPages = [];
    let latestBlogUpdate = STATIC_PAGE_LASTMOD.home;
    try {
      const posts = await db
        .collection("posts")
        .find(
          { status: "published" },
          { projection: { slug: 1, updatedAt: 1, publishedAt: 1, createdAt: 1 } }
        )
        .toArray();

      for (const p of posts) {
        const pDate = p.updatedAt ? new Date(p.updatedAt) : p.publishedAt ? new Date(p.publishedAt) : new Date(p.createdAt || STATIC_PAGE_LASTMOD.home);
        if (pDate > latestBlogUpdate) {
          latestBlogUpdate = pDate;
        }
        blogPages.push({
          url: `${appUrl}/blog/${p.slug}`,
          lastModified: pDate,
          changeFrequency: "monthly",
          priority: 0.7,
        });
      }
    } catch {
      blogPages = [];
    }

    // Core static money and info routes with realistic, non-fabricated lastModified dates
    const staticPages = [
      { url: `${appUrl}`, changeFrequency: "weekly", priority: 1.0, lastModified: STATIC_PAGE_LASTMOD.home },
      { url: `${appUrl}/barbers`, changeFrequency: "daily", priority: 0.9, lastModified: latestBarberUpdate },
      { url: `${appUrl}/for-barbers`, changeFrequency: "weekly", priority: 0.85, lastModified: STATIC_PAGE_LASTMOD.forBarbers },
      { url: `${appUrl}/reviews`, changeFrequency: "daily", priority: 0.8, lastModified: latestReviewUpdate },
      { url: `${appUrl}/blog`, changeFrequency: "daily", priority: 0.85, lastModified: latestBlogUpdate },
      { url: `${appUrl}/about`, changeFrequency: "monthly", priority: 0.7, lastModified: STATIC_PAGE_LASTMOD.about },
      { url: `${appUrl}/contact`, changeFrequency: "monthly", priority: 0.7, lastModified: STATIC_PAGE_LASTMOD.contact },
      { url: `${appUrl}/faq`, changeFrequency: "weekly", priority: 0.8, lastModified: STATIC_PAGE_LASTMOD.faq },
      { url: `${appUrl}/privacy`, changeFrequency: "yearly", priority: 0.3, lastModified: STATIC_PAGE_LASTMOD.legal },
      { url: `${appUrl}/terms`, changeFrequency: "yearly", priority: 0.3, lastModified: STATIC_PAGE_LASTMOD.legal },
    ];

    // Service Hub Pages (Static parent categories)
    const servicePages = POPULAR_SERVICES.map((srv) => ({
      url: `${appUrl}/services/${srv.slug}`,
      changeFrequency: "weekly",
      priority: 0.8,
      lastModified: STATIC_PAGE_LASTMOD.services,
    }));

    // City Directory Pages (Filtered by verified salon threshold)
    const eligibleCities = Object.entries(cityCounts).filter(([_, count]) => count >= MIN_INDEX_BARBERS);

    const cityPages = eligibleCities.map(([citySlug]) => ({
      url: `${appUrl}/barbers/city/${citySlug}`,
      changeFrequency: "weekly",
      priority: 0.85,
      lastModified: cityLatestUpdate[citySlug] || STATIC_PAGE_LASTMOD.home,
    }));

    // Dynamic Service-City Combinations (e.g. /services/haircut/indore)
    // Only indexed for cities with sufficient salon inventory to guarantee index quality
    const serviceCityPages = [];
    for (const [citySlug] of eligibleCities) {
      const cityMod = cityLatestUpdate[citySlug] || STATIC_PAGE_LASTMOD.home;
      for (const srv of POPULAR_SERVICES) {
        serviceCityPages.push({
          url: `${appUrl}/services/${srv.slug}/${citySlug}`,
          changeFrequency: "weekly",
          priority: 0.75,
          lastModified: cityMod,
        });
      }
    }

    // Barber individual canonical profile pages
    const barberPages = barbers.map((b) => ({
      url: `${appUrl}${getBarberCanonicalSlug(b)}`,
      lastModified: b.updatedAt ? new Date(b.updatedAt) : b.createdAt ? new Date(b.createdAt) : STATIC_PAGE_LASTMOD.home,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    return [
      ...staticPages,
      ...servicePages,
      ...cityPages,
      ...serviceCityPages,
      ...barberPages,
      ...blogPages,
    ];
  } catch (error) {
    console.error("Failed to build dynamic sitemap entries", error);
    return [
      { url: `${appUrl}`, changeFrequency: "weekly", priority: 1.0, lastModified: STATIC_PAGE_LASTMOD.home },
      { url: `${appUrl}/barbers`, changeFrequency: "daily", priority: 0.9, lastModified: STATIC_PAGE_LASTMOD.home },
      { url: `${appUrl}/for-barbers`, changeFrequency: "weekly", priority: 0.85, lastModified: STATIC_PAGE_LASTMOD.forBarbers },
    ];
  }
}
