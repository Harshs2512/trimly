import { getDb } from "@/lib/mongodb";
import { getAppUrl } from "@/lib/appUrl";
import { POPULAR_SERVICES, getBarberCanonicalSlug, slugify } from "@/lib/barbers";

const MIN_INDEX_BARBERS = parseInt(process.env.MIN_CITY_BARBERS_INDEX || "3", 10);

export default async function sitemap() {
  const appUrl = getAppUrl();
  const now = new Date();

  // Core static money and info routes
  const staticPages = [
    { url: `${appUrl}`, changeFrequency: "weekly", priority: 1.0, lastModified: now },
    { url: `${appUrl}/barbers`, changeFrequency: "daily", priority: 0.9, lastModified: now },
    { url: `${appUrl}/for-barbers`, changeFrequency: "weekly", priority: 0.85, lastModified: now },
    { url: `${appUrl}/reviews`, changeFrequency: "daily", priority: 0.8, lastModified: now },
    { url: `${appUrl}/blog`, changeFrequency: "daily", priority: 0.85, lastModified: now },
    { url: `${appUrl}/about`, changeFrequency: "monthly", priority: 0.7, lastModified: now },
    { url: `${appUrl}/contact`, changeFrequency: "monthly", priority: 0.7, lastModified: now },
    { url: `${appUrl}/faq`, changeFrequency: "weekly", priority: 0.8, lastModified: now },
    { url: `${appUrl}/privacy`, changeFrequency: "yearly", priority: 0.3, lastModified: now },
    { url: `${appUrl}/terms`, changeFrequency: "yearly", priority: 0.3, lastModified: now },
  ];

  // Service Hub Pages
  const servicePages = POPULAR_SERVICES.map((srv) => ({
    url: `${appUrl}/services/${srv.slug}`,
    changeFrequency: "weekly",
    priority: 0.8,
    lastModified: now,
  }));

  try {
    const db = await getDb();

    // 1. Fetch verified barbers for dynamic profiles
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
            updatedAt: 1,
            createdAt: 1,
          },
        }
      )
      .limit(50000)
      .toArray();

    // Map barbers to canonical slugs
    const barberPages = barbers.map((b) => ({
      url: `${appUrl}${getBarberCanonicalSlug(b)}`,
      lastModified: b.updatedAt || b.createdAt || now,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    // 2. City Directory Aggregation (Only indexable cities with >= N verified barbers)
    const cityCounts = {};
    for (const b of barbers) {
      if (b.city) {
        const cityKey = slugify(b.city);
        cityCounts[cityKey] = (cityCounts[cityKey] || 0) + 1;
      }
    }

    const cityPages = Object.entries(cityCounts)
      .filter(([_, count]) => count >= MIN_INDEX_BARBERS)
      .map(([citySlug]) => ({
        url: `${appUrl}/barbers/city/${citySlug}`,
        changeFrequency: "weekly",
        priority: 0.85,
        lastModified: now,
      }));

    // 3. Blog posts collection (ready for Phase 5)
    let blogPages = [];
    try {
      const posts = await db
        .collection("posts")
        .find(
          { status: "published" },
          { projection: { slug: 1, updatedAt: 1, publishedAt: 1 } }
        )
        .toArray();

      blogPages = posts.map((p) => ({
        url: `${appUrl}/blog/${p.slug}`,
        lastModified: p.updatedAt || p.publishedAt || now,
        changeFrequency: "monthly",
        priority: 0.65,
      }));
    } catch {
      blogPages = [];
    }

    return [
      ...staticPages,
      ...servicePages,
      ...cityPages,
      ...barberPages,
      ...blogPages,
    ];
  } catch (error) {
    console.error("Failed to build dynamic sitemap entries", error);
    return [...staticPages, ...servicePages];
  }
}
