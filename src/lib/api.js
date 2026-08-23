export function json(data, status = 200, headers = {}) {
  return Response.json(data, { status, headers });
}

export function safeInternalError(error, context = "api") {
  console.error(`[${context}]`, error);
  return json({ error: "Internal server error" }, 500);
}

export function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",").at(-1)?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

export function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parsePagination(searchParams, { defaultLimit = 20, maxLimit = 50 } = {}) {
  const rawPage = Number.parseInt(searchParams.get("page") || "1", 10);
  const rawLimit = Number.parseInt(searchParams.get("limit") || String(defaultLimit), 10);
  const page = Number.isFinite(rawPage) ? Math.max(1, rawPage) : 1;
  const limit = Number.isFinite(rawLimit) ? Math.min(maxLimit, Math.max(1, rawLimit)) : defaultLimit;
  return { page, limit, skip: (page - 1) * limit };
}

export function rejectCrossSiteRequest(request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    return json({ error: "Cross-site request rejected" }, 403);
  }

  const origin = request.headers.get("origin");
  if (!origin) return null;

  let requestOrigin;
  try {
    requestOrigin = new URL(request.url).origin;
  } catch {
    return json({ error: "Invalid request origin" }, 400);
  }

  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
  const allowedOrigins = new Set([requestOrigin]);
  if (configured) {
    try {
      allowedOrigins.add(new URL(configured).origin);
    } catch {
      // Invalid deployment configuration is surfaced by getAppUrl() in the
      // application metadata/email paths; do not broaden origin access here.
    }
  }

  let normalizedOrigin;
  try {
    normalizedOrigin = new URL(origin).origin;
  } catch {
    return json({ error: "Invalid request origin" }, 403);
  }

  return allowedOrigins.has(normalizedOrigin)
    ? null
    : json({ error: "Cross-site request rejected" }, 403);
}
