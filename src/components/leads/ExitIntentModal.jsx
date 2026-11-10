"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { X, Phone, MessageSquare, CheckCircle2, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
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

export default function ExitIntentModal() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("Indore");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const modalRef = useRef(null);
  const mountTimeRef = useRef(0);
  const lastScrollYRef = useRef(0);
  const lastScrollTimeRef = useRef(0);

  const cfg = LEAD_CAPTURE_CONFIG.exitIntent;
  const whatsappNum = LEAD_CAPTURE_CONFIG.contact.whatsappNumber;

  const isExcluded = EXCLUDED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  useEffect(() => {
    mountTimeRef.current = Date.now();
    lastScrollTimeRef.current = Date.now();
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    try {
      localStorage.setItem(cfg.dismissStorageKey, String(Date.now()));
    } catch {}
  }, [cfg.dismissStorageKey]);

  const canTrigger = useCallback(() => {
    if (!cfg.enabled || isExcluded) return false;
    if (typeof window === "undefined") return false;

    // Minimum 10s on page
    if (Date.now() - mountTimeRef.current < cfg.minLandingTimeMs) return false;

    // Skip if chat is currently open
    try {
      if (sessionStorage.getItem("trimlly_chat_open") === "1") return false;
    } catch {}

    // Check session frequency cap
    try {
      if (sessionStorage.getItem(cfg.sessionStorageKey) === "1") return false;
    } catch {}

    // Check 7-day dismiss memory
    try {
      const dismissed = localStorage.getItem(cfg.dismissStorageKey);
      if (dismissed) {
        const timeSince = Date.now() - parseInt(dismissed, 10);
        if (timeSince < cfg.dismissDays * 24 * 60 * 60 * 1000) return false;
      }
    } catch {}

    return true;
  }, [cfg, isExcluded]);

  const triggerModal = useCallback(() => {
    if (!canTrigger()) return;
    try {
      sessionStorage.setItem(cfg.sessionStorageKey, "1");
    } catch {}
    setIsOpen(true);
    trackEvent("exit_intent_shown", { page: pathname });
  }, [canTrigger, cfg.sessionStorageKey, pathname]);

  // Desktop exit intent: mouse leaves viewport top
  useEffect(() => {
    if (!cfg.enabled || isExcluded) return;

    function handleMouseLeave(e) {
      if (e.clientY <= 0) {
        triggerModal();
      }
    }

    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [cfg.enabled, isExcluded, triggerModal]);

  // Mobile exit intent: fast scroll-up after 30s
  useEffect(() => {
    if (!cfg.enabled || isExcluded) return;

    function handleScroll() {
      const now = Date.now();
      const currentY = window.scrollY;
      const dwellTime = now - mountTimeRef.current;

      if (dwellTime > cfg.mobileMinDwellTimeMs) {
        const deltaY = lastScrollYRef.current - currentY;
        const deltaTime = now - lastScrollTimeRef.current;
        if (deltaTime > 0 && deltaY > 100) {
          const velocity = deltaY / deltaTime;
          if (velocity > cfg.mobileScrollVelocityThreshold) {
            triggerModal();
          }
        }
      }

      lastScrollYRef.current = currentY;
      lastScrollTimeRef.current = now;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [cfg.enabled, cfg.mobileMinDwellTimeMs, cfg.mobileScrollVelocityThreshold, isExcluded, triggerModal]);

  // Escape key & focus trap
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        closeModal();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeModal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const phoneClean = phone.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(phoneClean)) {
      setError("Please enter a valid 10-digit Indian mobile number starting with 6–9.");
      return;
    }

    if (!consent) {
      setError("Please agree to the contact consent to proceed.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "customer",
          name: name.trim(),
          phone: phone.trim(),
          city: city.trim(),
          interest: `Exit-intent recommendation for ${city}`,
          source: "exit_intent",
          page: pathname,
          consent: true,
          consentText: "I agree to be contacted by Trimlly regarding my enquiry. See Privacy Policy.",
          website: "", // honeypot
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Submission failed");
      }

      setSubmitted(true);
      trackEvent("exit_intent_submitted", { page: pathname });
    } catch (err) {
      setError(err.message || "Failed to submit. Please try WhatsApp instead.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWhatsApp = async () => {
    trackEvent("exit_intent_whatsapp_click", { page: pathname });
    try {
      await fetch("/api/leads/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "whatsapp_click", page: pathname, source: "exit_intent" }),
      });
    } catch {}

    const text = encodeURIComponent(`Hi Trimlly, I'm looking for a top-rated barber in ${city}. Saw your site: ${pathname}`);
    window.open(`https://wa.me/${whatsappNum}?text=${text}`, "_blank", "noopener,noreferrer");
    closeModal();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-lg bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200"
      >
        <button
          onClick={closeModal}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">We&apos;re On It!</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Thank you, <strong>{name}</strong>. Our team will message you the best verified salon recommendations for <strong>{city}</strong> within business hours.
            </p>
            <div className="pt-2">
              <button
                onClick={closeModal}
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Continue Browsing
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2 text-center sm:text-left">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified Salon Match
              </span>
              <h2 id="exit-modal-title" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Before You Go — Get the Best Barber in Your City
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Skip the trial-and-error. Share what you need and our team will recommend top-rated stylists near you with open appointment slots.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Honeypot hidden input */}
              <input type="text" name="website" value="" readOnly className="hidden" aria-hidden="true" />

              <div>
                <label htmlFor="exit-name" className="block text-xs font-semibold text-foreground mb-1">
                  Your Name *
                </label>
                <input
                  id="exit-name"
                  type="text"
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Verma"
                  className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="exit-phone" className="block text-xs font-semibold text-foreground mb-1">
                    Mobile Number (+91) *
                  </label>
                  <div className="flex items-center">
                    <span className="px-3 py-2.5 text-sm bg-muted border border-border border-r-0 rounded-l-xl text-muted-foreground font-semibold select-none">
                      +91
                    </span>
                    <input
                      id="exit-phone"
                      type="tel"
                      required
                      maxLength={10}
                      inputMode="numeric"
                      value={phone.replace(/^\+91/, "").replace(/\D/g, "").slice(0, 10)}
                      onChange={(e) => {
                        setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                        setError("");
                      }}
                      placeholder="98765 43210"
                      className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-r-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="exit-city" className="block text-xs font-semibold text-foreground mb-1">
                    City *
                  </label>
                  <select
                    id="exit-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  >
                    <option value="Indore">Indore</option>
                    <option value="Bhopal">Bhopal</option>
                    <option value="Mumbai">Mumbai</option>
                    <option value="Delhi-NCR">Delhi-NCR</option>
                    <option value="Bengaluru">Bengaluru</option>
                    <option value="Pune">Pune</option>
                    <option value="Other">Other City</option>
                  </select>
                </div>
              </div>

              <div className="flex items-start gap-2 pt-1">
                <input
                  id="exit-consent"
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => {
                    setConsent(e.target.checked);
                    setError("");
                  }}
                  className="mt-0.5 w-4 h-4 rounded border-border accent-primary cursor-pointer shrink-0"
                />
                <label htmlFor="exit-consent" className="text-[11px] text-muted-foreground leading-relaxed cursor-pointer">
                  I agree to receive salon recommendations from Trimlly via WhatsApp/call. See{" "}
                  <a href="/privacy" target="_blank" className="text-primary underline">
                    Privacy Policy
                  </a>
                  .
                </label>
              </div>

              {error && (
                <p className="text-xs text-destructive flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </p>
              )}

              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-md shadow-primary/20 disabled:opacity-60"
                >
                  {submitting ? (
                    <span className="animate-spin w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full" />
                  ) : (
                    <>
                      Get Barber Recommendations <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="relative text-center my-3">
                  <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-border" />
                  <span className="relative bg-card px-2 text-[11px] text-muted-foreground uppercase font-semibold">
                    Or prefer instant reply?
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleWhatsApp}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#25d366] text-white rounded-xl text-sm font-semibold hover:bg-[#1ebe5d] transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Chat with Team on WhatsApp
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

