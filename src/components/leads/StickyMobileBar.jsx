"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Phone, Calendar } from "lucide-react";
import { LEAD_CAPTURE_CONFIG } from "@/config/leadCapture";

const EXCLUDED_PREFIXES = [
  "/login",
  "/dashboard",
  "/admin",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/resend-verification",
];

function trackEvent(name, params = {}) {
  try {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", name, params);
    }
  } catch {}
}

export default function StickyMobileBar() {
  const pathname = usePathname();
  const cfg = LEAD_CAPTURE_CONFIG.stickyMobileBar;
  const whatsappNum = LEAD_CAPTURE_CONFIG.contact.whatsappNumber;
  const supportPhone = LEAD_CAPTURE_CONFIG.contact.supportPhone;

  if (!cfg.enabled) return null;

  const isExcluded = EXCLUDED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (isExcluded) return null;

  // Contextual booking button on barber or service pages
  const isBarberPage = pathname.startsWith("/barbers/") && pathname.split("/").length >= 4;

  const handleWhatsApp = async () => {
    trackEvent("whatsapp_click", { source: "sticky_bar", page: pathname });
    try {
      await fetch("/api/leads/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "whatsapp_click", page: pathname, source: "sticky_bar" }),
      });
    } catch {}

    const text = encodeURIComponent(`Hi Trimlly, I need help with booking an appointment. Saw your site: ${pathname}`);
    window.open(`https://wa.me/${whatsappNum}?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const handleCall = async () => {
    trackEvent("call_click", { source: "sticky_bar", page: pathname });
    try {
      await fetch("/api/leads/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "call_click", page: pathname, source: "sticky_bar" }),
      });
    } catch {}
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border px-3 py-2 shadow-lg safe-bottom">
      <div className="flex items-center gap-2 max-w-md mx-auto">
        {/* WhatsApp Button */}
        <button
          onClick={handleWhatsApp}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#25d366] text-white text-xs font-bold hover:bg-[#1ebe5d] active:scale-95 transition min-h-[44px]"
          aria-label="Chat on WhatsApp"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white shrink-0" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          <span>WhatsApp</span>
        </button>

        {/* Call Button */}
        <a
          href={`tel:${supportPhone}`}
          onClick={handleCall}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-muted active:scale-95 transition min-h-[44px]"
          aria-label="Call support"
        >
          <Phone className="w-4 h-4 text-primary shrink-0" />
          <span>Call Us</span>
        </a>

        {/* Optional Barber Page Quick Book */}
        {isBarberPage ? (
          <a
            href="#booking"
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 active:scale-95 transition min-h-[44px]"
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <span>Book Slot</span>
          </a>
        ) : (
          <Link
            href="/barbers"
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 active:scale-95 transition min-h-[44px]"
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <span>Find Barber</span>
          </Link>
        )}
      </div>
    </div>
  );
}

