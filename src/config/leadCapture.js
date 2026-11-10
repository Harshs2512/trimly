/**
 * Lead Capture & Conversion Configuration
 * Enables turning triggers on/off and adjusting thresholds without code changes.
 */

export const LEAD_CAPTURE_CONFIG = {
  // Exit-Intent Popup (Desktop mouse-leave top, Mobile fast scroll-up after dwell)
  exitIntent: {
    enabled: true,
    minLandingTimeMs: 10000, // Do not trigger within 10s of landing
    mobileMinDwellTimeMs: 30000, // 30s+ on mobile before scroll-up can trigger
    mobileScrollVelocityThreshold: 1.5, // fast scroll-up threshold
    sessionStorageKey: "trimlly_exit_intent_shown",
    dismissStorageKey: "trimlly_exit_intent_dismissed",
    dismissDays: 7, // Suppress for 7 days if user explicitly closes dialog
  },

  // Sticky Bottom Bar for Mobile Visitors
  stickyMobileBar: {
    enabled: true,
    hideOnScrollDown: false,
    showOnRoutes: ["/", "/barbers", "/barbers/city", "/services"],
  },

  // Inline Capture Forms
  inlineForms: {
    home: true,
    cityPage: true,
    forBarbers: true,
    blogPost: true,
  },

  // Contact Info Defaults (overridden by env vars)
  contact: {
    whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919876543210",
    supportPhone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || "+919876543210",
    supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@trimly.app",
    companyName: process.env.NEXT_PUBLIC_COMPANY_NAME || "Trimlly",
  },
};

