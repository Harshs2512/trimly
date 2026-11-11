export function getAppUrl() {
  // If running on Vercel with a designated production domain, auto-resolve
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  let configured =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL;

  // If configured points to a temporary vercel.app preview URL but a custom domain is assigned:
  if (
    vercelProd &&
    (!configured ||
      (configured.includes(".vercel.app") && !vercelProd.endsWith(".vercel.app")))
  ) {
    configured = `https://${vercelProd}`;
  } else if (!configured && vercelProd) {
    configured = `https://${vercelProd}`;
  } else if (!configured && process.env.VERCEL_URL) {
    configured = `https://${process.env.VERCEL_URL}`;
  }

  if (!configured) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("NEXT_PUBLIC_APP_URL or NEXTAUTH_URL must be configured in production.");
    }
    return "http://localhost:3000";
  }

  let url;
  try {
    const raw =
      configured.startsWith("http://") || configured.startsWith("https://")
        ? configured
        : `https://${configured}`;
    url = new URL(raw);
  } catch {
    throw new Error("NEXT_PUBLIC_APP_URL/NEXTAUTH_URL must be a valid absolute URL.");
  }

  const isLocalhost =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "[::1]";
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:" && !isLocalhost) {
    throw new Error("The production application URL must use HTTPS.");
  }
  return url.toString().replace(/\/+$/, "");
}
