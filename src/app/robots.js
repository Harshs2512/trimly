export default function robots() {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard/"],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
