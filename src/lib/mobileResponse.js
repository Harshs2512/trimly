import crypto from "crypto";
import { getZonedParts, resolveBarberTimezone, timeToMinutes } from "./booking.js";

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

export const APP_CONFIG = {
  minSupportedAppVersion: {
    ios: process.env.MIN_APP_VERSION_IOS || "1.0.0",
    android: process.env.MIN_APP_VERSION_ANDROID || "1.0.0",
  },
  latestVersion: {
    ios: process.env.LATEST_APP_VERSION_IOS || "1.0.0",
    android: process.env.LATEST_APP_VERSION_ANDROID || "1.0.0",
  },
  maintenance: process.env.MAINTENANCE_MODE === "true",
  featureFlags: {
    socialLogin: true,
    geoSearch: true,
    pushNotifications: true,
    mediaStorage: true,
  },
  legalUrls: {
    terms: "https://trimly.app/terms",
    privacy: "https://trimly.app/privacy",
  },
};

export function compareSemver(v1, v2) {
  const p1 = (v1 || "0.0.0").split(".").map(Number);
  const p2 = (v2 || "0.0.0").split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const n1 = p1[i] || 0;
    const n2 = p2[i] || 0;
    if (n1 > n2) return 1;
    if (n1 < n2) return -1;
  }
  return 0;
}

export function enforceAppVersion(request) {
  const clientVersion = request.headers.get("x-app-version");
  const platform = (request.headers.get("x-platform") || "").toLowerCase();
  const requestId = getRequestId(request);

  if (APP_CONFIG.maintenance) {
    return mobileError({
      code: "MAINTENANCE_MODE",
      message: "The service is temporarily undergoing scheduled maintenance. Please check back shortly.",
      status: 503,
      requestId,
    });
  }

  if (clientVersion && (platform === "ios" || platform === "android")) {
    const minVersion = APP_CONFIG.minSupportedAppVersion[platform];
    if (minVersion && compareSemver(clientVersion, minVersion) < 0) {
      return mobileError({
        code: "UPGRADE_REQUIRED",
        message: "Your application version is no longer supported. Please update to continue.",
        status: 426,
        details: { minVersion, currentVersion: clientVersion, platform },
        requestId,
      });
    }
  }

  return null;
}

/**
 * Minimal Response Serializers:
 * Explicit allow-lists preventing credential, token, reservation key or PII leaks.
 */

export function serializeBarber(barber, { isOwnerOrAdmin = false } = {}) {
  if (!barber) return null;

  // Compute isOpen based on barber's working hours & closed days in their timezone
  let isOpen = false;
  try {
    const tz = resolveBarberTimezone(barber);
    const now = new Date();
    const parts = getZonedParts(now, tz);
    const isClosedDay = (barber.closedDays || [])
      .map((d) => d.toLowerCase())
      .includes(parts.weekday);
    if (!isClosedDay) {
      const currentMinutes = parts.hour * 60 + parts.minute;
      const openMin = timeToMinutes(barber.workingHours?.open || "09:00");
      const closeMin = timeToMinutes(barber.workingHours?.close || "17:00");
      isOpen =
        openMin !== null &&
        closeMin !== null &&
        currentMinutes >= openMin &&
        currentMinutes < closeMin;
    }
  } catch {
    isOpen = false;
  }

  // Build avatar: prefer shopExteriorImage, then shopInteriorImage, then first workPhoto
  const workPhotos = (barber.workPhotos || []).map((p) => (typeof p === "string" ? p : p.url));
  const avatar =
    barber.shopExteriorImage ||
    barber.shopInteriorImage ||
    workPhotos[0] ||
    null;

  return {
    id: barber._id?.toString() || barber.id,
    userId: barber.userId ? String(barber.userId) : null,
    name: barber.name || "",
    shopName: barber.shopName || "",
    address: barber.address || "",
    city: barber.city || null,
    area: barber.area || null,
    location: barber.location || null,
    phone: barber.phone || null,
    avatar,
    isOpen,
    waitingTimeMinutes: barber.waitingTime ?? barber.waitingTimeMinutes ?? 0,
    bio: barber.bio || barber.description || "",
    services: (barber.services || []).map((s) => ({
      id: s.id,
      name: s.name,
      price: s.price,
      duration: s.duration,
      durationMinutes: s.duration || s.durationMinutes || 30,
    })),
    workingHours: barber.workingHours || { open: "09:00", close: "17:00" },
    closedDays: barber.closedDays || [],
    slotIntervalMinutes: barber.slotIntervalMinutes || 30,
    rating: barber.rating || 0,
    reviewCount: barber.reviewCount || 0,
    description: barber.description || "",
    staffCount: barber.staffCount ?? 1,
    chairsCount: barber.chairsCount ?? 1,
    specialties: barber.specialties || [],
    leadTimeMinutes: barber.leadTimeMinutes ?? 30,
    bookingHorizonDays: barber.bookingHorizonDays ?? 90,
    timezone: barber.timezone || "Asia/Kolkata",
    workPhotos,
    shopExteriorImage: barber.shopExteriorImage || null,
    shopInteriorImage: barber.shopInteriorImage || null,
    verificationStatus: barber.verificationStatus || "pending",
    distanceKm: barber.distanceKm !== undefined ? barber.distanceKm : null,
    ...(isOwnerOrAdmin
      ? {
          idType: barber.idType || "aadhaar",
          idNumber: barber.idNumber || "",
          idDocumentImage: barber.idDocumentImage || null,
        }
      : {}),
  };
}

export function serializeBooking(booking) {
  if (!booking) return null;
  return {
    id: booking._id?.toString() || booking.id,
    barberId: booking.barberId ? String(booking.barberId) : "",
    barberName: booking.barberName || null,
    barberShopName: booking.barberShopName || null,
    userId: booking.userId ? String(booking.userId) : "",
    customerName: booking.customerName || null,
    service: booking.service || "",
    serviceId: booking.serviceId || null,
    price: booking.price,
    duration: booking.duration,
    timeSlot: booking.timeSlot,
    endTime: booking.endTime || null,
    status: booking.status,
    cancelReason: booking.cancelReason || null,
    rescheduleReason: booking.rescheduleReason || null,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}

export function serializeReview(review) {
  if (!review) return null;
  return {
    id: review._id?.toString() || review.id,
    bookingId: review.bookingId ? String(review.bookingId) : null,
    barberId: review.barberId ? String(review.barberId) : null,
    userId: review.userId ? String(review.userId) : null,
    customerName: review.customerName || "Customer",
    rating: review.rating,
    comment: review.comment || "",
    createdAt: review.createdAt,
  };
}

export function serializeNotification(notification) {
  if (!notification) return null;
  return {
    id: notification._id?.toString() || notification.id,
    type: notification.type,
    message: notification.message,
    bookingId: notification.bookingId ? String(notification.bookingId) : null,
    read: Boolean(notification.read),
    createdAt: notification.createdAt,
  };
}

export function serializeUserProfile(user) {
  if (!user) return null;
  return {
    id: user._id?.toString() || user.id,
    name: user.name || "",
    email: user.email || "",
    role: user.role || "user",
    phone: user.phone || null,
    createdAt: user.createdAt,
  };
}
