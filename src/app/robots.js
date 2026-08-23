import { getAppUrl } from "@/lib/appUrl";

export default function robots() {
  const appUrl = getAppUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin",
        "/dashboard",
        "/login",
        "/forgot-password",
        "/reset-password",
        "/verify-email",
        "/resend-verification",
      ],
    },
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
