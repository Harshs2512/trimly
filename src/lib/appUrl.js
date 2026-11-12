export function getAppUrl() {
  const canonicalProductionDomain = "https://trimlly.solvantis.in";
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  let configured =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL;

  // In production or on Vercel, prevent temporary vercel.app URLs from leaking into canonical tags
  if (!configured || configured.includes(".vercel.app")) {
    if (vercelProd && !vercelProd.endsWith(".vercel.app")) {
      configured = `https://${vercelProd}`;
    } else if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
      configured = canonicalProductionDomain;
    }
  } else if (!configured && vercelProd) {
    configured = `https://${vercelProd}`;
  } else if (!configured && process.env.VERCEL_URL) {
    configured = `https://${process.env.VERCEL_URL}`;
  }

  if (!configured) {
    if (process.env.NODE_ENV === "production") {
      return canonicalProductionDomain;
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
