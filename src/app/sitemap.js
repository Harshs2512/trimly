import { getDb } from "@/lib/mongodb";
import { getAppUrl } from "@/lib/appUrl";

export default async function sitemap() {
  const appUrl = getAppUrl();
  const staticPages = [
    { path: "", changeFrequency: "weekly", priority: 1 },
    { path: "/barbers", changeFrequency: "daily", priority: 0.9 },
    { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
    { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  ].map(({ path, ...metadata }) => ({
    url: `${appUrl}${path}`,
    ...metadata,
  }));

  try {
    const db = await getDb();
    const barbers = await db.collection("barbers")
      .find(
        {
          deletedAt: { $exists: false },
          verificationStatus: "verified",
        },
        { projection: { _id: 1, updatedAt: 1, createdAt: 1 } },
      )
      .limit(50000)
      .toArray();

    return [
      ...staticPages,
      ...barbers.map((barber) => ({
        url: `${appUrl}/barbers/${barber._id.toString()}`,
        lastModified: barber.updatedAt || barber.createdAt || undefined,
        changeFrequency: "weekly",
        priority: 0.7,
      })),
    ];
  } catch (error) {
    console.error("Failed to build dynamic sitemap entries", error);
    return staticPages;
  }
}
