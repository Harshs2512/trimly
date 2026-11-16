import { getAppUrl } from "@/lib/appUrl";

export default function robots() {
  const appUrl = getAppUrl();

  return {
    rules: [
      {
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
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "PerplexityBot",
          "ClaudeBot",
          "anthropic-ai",
          "Google-Extended",
          "Applebot-Extended",
        ],
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: ["/api/", "/admin", "/dashboard"],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
