export function getAppUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
  if (!configured) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("NEXT_PUBLIC_APP_URL or NEXTAUTH_URL must be configured in production.");
    }
    return "http://localhost:3000";
  }

  let url;
  try {
    url = new URL(configured);
  } catch {
    throw new Error("NEXT_PUBLIC_APP_URL/NEXTAUTH_URL must be a valid absolute URL.");
  }

  const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:" && !isLocalhost) {
    throw new Error("The production application URL must use HTTPS.");
  }
  return url.toString().replace(/\/$/, "");
}
