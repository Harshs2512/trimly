"use client";

export function hasAnalyticsConsent() {
  if (typeof window === "undefined") return false;
  try {
    const consent = localStorage.getItem("trimly_consent");
    if (!consent) return false;
    const parsed = JSON.parse(consent);
    return parsed.analytics === true;
  } catch {
    return false;
  }
}

export function trackEvent(eventName, params = {}) {
  if (typeof window === "undefined") return;

  // Verify DPDP consent before tracking
  if (!hasAnalyticsConsent()) {
    return;
  }

  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, {
      ...params,
      timestamp: new Date().toISOString(),
    });
  } else if (process.env.NODE_ENV === "development") {
    console.log(`[GA4 Event (Dev)] ${eventName}:`, params);
  }
}

export function trackSearch({ city, service, search }) {
  trackEvent("search_barber", {
    search_city: city || "all",
    search_service: service || "all",
    search_term: search || "",
  });
}

export function trackViewBarber(barber) {
  if (!barber) return;
  trackEvent("view_barber", {
    barber_id: barber._id || barber.id,
    barber_name: barber.shopName || barber.name,
    city: barber.city || "unknown",
  });
}

export function trackStartBooking({ barberId, barberName, serviceName, priceInr }) {
  trackEvent("start_booking", {
    barber_id: barberId,
    barber_name: barberName,
    service_name: serviceName,
    value: priceInr || 0,
    currency: "INR",
  });
}

export function trackBookingConfirmed({ bookingId, barberId, serviceName, priceInr, city }) {
  trackEvent("booking_confirmed", {
    transaction_id: bookingId,
    barber_id: barberId,
    service_name: serviceName,
    value: priceInr || 0,
    currency: "INR",
    city: city || "unknown",
  });
}

