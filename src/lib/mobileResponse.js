import crypto from "crypto";

export function getRequestId(request) {
  return request.headers.get("x-request-id") || crypto.randomUUID();
}

/**
 * Mobile client IP resolution.
 * Prioritizes trusted cloud proxy headers (e.g. cf-connecting-ip) and
 * applies configurable TRUSTED_PROXY_HOPS for x-forwarded-for chains.
 */
export function getMobileClientIp(request) {
  // Cloudflare Connecting IP
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  // Fastly / Akamai / standard Real IP
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  // X-Forwarded-For chain handling
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded.split(",").map((ip) => ip.trim()).filter(Boolean);
    const hops = parseInt(process.env.TRUSTED_PROXY_HOPS || "1", 10);
    // Take the IP preceding the trusted proxy hops, or the first client IP if single proxy
    const targetIdx = Math.max(0, ips.length - hops);
    return ips[targetIdx] || ips[0] || "unknown";
  }

  return "unknown";
}

/**
 * Standardized success response envelope for mobile clients:
 * { data: T, meta?: Object, requestId: string }
 */
export function mobileSuccess(data, { status = 200, meta = undefined, headers = {}, requestId = null } = {}) {
  const reqId = requestId || crypto.randomUUID();
  const body = {
    data,
    ...(meta ? { meta } : {}),
    requestId: reqId,
  };

  const responseHeaders = new Headers(headers);
  responseHeaders.set("Content-Type", "application/json");
  responseHeaders.set("X-Request-Id", reqId);

  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders,
  });
}

/**
 * Standardized error response envelope for mobile clients:
 * { error: { code: string, message: string, details?: unknown, requestId: string } }
 */
export function mobileError({
  code = "INTERNAL_ERROR",
  message = "An unexpected error occurred.",
  status = 500,
  details = undefined,
  headers = {},
  requestId = null,
} = {}) {
  const reqId = requestId || crypto.randomUUID();
  const body = {
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
      requestId: reqId,
    },
  };

  const responseHeaders = new Headers(headers);
  responseHeaders.set("Content-Type", "application/json");
  responseHeaders.set("X-Request-Id", reqId);

  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders,
  });
}

/**
 * Generates an ETag hash for caching and checks If-None-Match header.
 */
export function checkEtag(request, contentString) {
  const hash = `"${crypto.createHash("md5").update(contentString).digest("hex")}"`;
  const ifNoneMatch = request.headers.get("if-none-match");
  const isMatch = ifNoneMatch === hash;
  return { etag: hash, isMatch };
}
