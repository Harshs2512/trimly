export default function sitemap() {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return [
    {
      url: `${APP_URL}`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 1,
    },
    {
      url: `${APP_URL}/barbers`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${APP_URL}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}

