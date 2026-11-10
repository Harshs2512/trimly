"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, MessageCircle, ChevronRight, Phone, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { CHATBOT_FAQ, CHATBOT_SERVICES, CHATBOT_CITIES, BUSINESS_HOURS, isWithinBusinessHours } from "@/content/chatbotFaq";

// ─── Constants ───────────────────────────────────────────────────────────────
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919999999999";
const SUPPORT_PHONE = process.env.NEXT_PUBLIC_SUPPORT_PHONE || "+919999999999";
const SESSION_KEY = "trimlly_chat";
const TEASER_KEY = "trimlly_chat_teaser_dismissed";

// ─── GA4 Tracking Helper ──────────────────────────────────────────────────────
function trackEvent(name, params = {}) {
  try {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", name, params);
    }
  } catch {}
}

// ─── POST Lead / Event helpers ────────────────────────────────────────────────
async function postEvent(type, page) {
  try {
    await fetch("/api/leads/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, page, source: "chatbot" }),
    });
  } catch {}
}

async function submitLead(data) {
  const res = await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || "Submission failed");
  }
  return res.json();
}

// ─── Message builders ─────────────────────────────────────────────────────────
function botMsg(text, chips = [], extra = {}) {
  return { from: "bot", text, chips, id: Date.now() + Math.random(), ...extra };
}
function userMsg(text) {
  return { from: "user", text, id: Date.now() + Math.random() };
}

// ─── STEP MACHINE ─────────────────────────────────────────────────────────────
const STEPS = {
  GREETING: "greeting",
  CUSTOMER_CITY: "customer_city",
  CUSTOMER_SERVICE: "customer_service",
  OWNER_CITY: "owner_city",
  OWNER_DETAILS: "owner_details",
  FAQ: "faq",
  LEAD_FORM: "lead_form",
  SUCCESS: "success",
};

// ─── Initial State ────────────────────────────────────────────────────────────
const INIT_STATE = {
  step: STEPS.GREETING,
  path: null, // "customer" | "owner" | "explore"
  city: null,
  service: null,
  faqCount: 0,
  leadSubmitted: false,
  name: "",
  phone: "",
  email: "",
  consent: false,
  barbers: null, // fetched barbers for customer path
};

function loadSession() {
  if (typeof window === "undefined") return INIT_STATE;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) return { ...INIT_STATE, ...JSON.parse(raw) };
  } catch {}
  return INIT_STATE;
}

function saveSession(state) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {}
}

// ─── Main Chat Panel ──────────────────────────────────────────────────────────
export default function ChatbotPanel({ onClose, page, referrer, utms }) {
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [state, setState] = useState(() => loadSession());
  const [inputVal, setInputVal] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fetchingBarbers, setFetchingBarbers] = useState(false);
  const messagesEndRef = useRef(null);
  const panelRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus trap inside panel
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    function trap(e) {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }
    el.addEventListener("keydown", trap);
    first?.focus();
    return () => el.removeEventListener("keydown", trap);
  }, []);

  // Escape to close
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Push an initial greeting on first open
  useEffect(() => {
    if (messages.length === 0) {
      const withinHours = isWithinBusinessHours();
      const greetSuffix = withinHours
        ? " Our team is online now."
        : ` We're offline right now (${BUSINESS_HOURS.display}), but leave your number and we'll call back.`;

      setMessages([
        botMsg(
          `Hi! 👋 I'm the Trimlly assistant.${greetSuffix} Are you looking to…`,
          [
            { label: "📅 Book a barber / salon", value: "customer" },
            { label: "💼 List my salon on Trimlly", value: "owner" },
            { label: "🔍 Just exploring", value: "explore" },
          ]
        ),
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist session
  useEffect(() => {
    saveSession(state);
  }, [state]);

  // ── Add a bot message after a short delay (feels natural) ──
  const addBotMsg = useCallback((text, chips = [], extra = {}) => {
    setTimeout(() => {
      setMessages((prev) => [...prev, botMsg(text, chips, extra)]);
    }, 350);
  }, []);

  // ── Fetch matching barbers for city/service ──
  const fetchBarbers = useCallback(async (city, service) => {
    if (!city || city === "other") return null;
    setFetchingBarbers(true);
    try {
      const params = new URLSearchParams({ city, limit: "3", status: "verified" });
      if (service && service !== "other") params.set("service", service);
      const res = await fetch(`/api/barbers?${params}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data?.barbers?.slice(0, 3) || null;
    } catch {
      return null;
    } finally {
      setFetchingBarbers(false);
    }
  }, []);

  // ── Handle chip / button click ──
  const handleChip = useCallback(
    async (value, label) => {
      setMessages((prev) => [...prev, userMsg(label)]);

      if (state.step === STEPS.GREETING) {
        if (value === "customer") {
          setState((s) => ({ ...s, step: STEPS.CUSTOMER_CITY, path: "customer" }));
          trackEvent("chat_path_selected", { path: "customer" });
          addBotMsg(
            "Great! Which city are you looking for a barber in?",
            CHATBOT_CITIES.map((c) => ({ label: c.label, value: c.id }))
          );
        } else if (value === "owner") {
          setState((s) => ({ ...s, step: STEPS.OWNER_CITY, path: "owner" }));
          trackEvent("chat_path_selected", { path: "owner" });
          addBotMsg(
            "Excellent! Let's get your salon listed. Which city is your salon in?",
            CHATBOT_CITIES.map((c) => ({ label: c.label, value: c.id }))
          );
        } else {
          setState((s) => ({ ...s, step: STEPS.FAQ, path: "explore" }));
          trackEvent("chat_path_selected", { path: "explore" });
          addBotMsg(
            "No problem! Here are some common questions — tap one to get the answer:",
            CHATBOT_FAQ.slice(0, 5).map((f) => ({ label: f.question, value: f.id }))
          );
        }
        return;
      }

      if (state.step === STEPS.CUSTOMER_CITY) {
        const cityLabel = CHATBOT_CITIES.find((c) => c.id === value)?.label || value;
        setState((s) => ({ ...s, step: STEPS.CUSTOMER_SERVICE, city: value, cityLabel }));
        addBotMsg(
          `Got it — ${cityLabel}! What service are you looking for?`,
          CHATBOT_SERVICES.map((s) => ({ label: s.label, value: s.id }))
        );
        return;
      }

      if (state.step === STEPS.CUSTOMER_SERVICE) {
        const serviceLabel = CHATBOT_SERVICES.find((s) => s.id === value)?.label || value;
        setState((s) => ({ ...s, step: STEPS.LEAD_FORM, service: value, serviceLabel }));

        // Fetch barbers first, THEN ask for contact
        const barbers = await fetchBarbers(state.city, value);
        setState((s) => ({ ...s, barbers }));

        if (barbers && barbers.length > 0) {
          const names = barbers.map((b) => `• **${b.shopName}** (${b.city})`).join("\n");
          addBotMsg(
            `Here are top verified salons near you for ${serviceLabel}:\n${names}\n\nWant us to confirm the best slot for you on WhatsApp?`,
            [{ label: "Yes, share my number →", value: "__lead_form__" }],
            { barbeResults: barbers }
          );
        } else {
          addBotMsg(
            `I'll help you find the right barber for ${serviceLabel}! Share your name and mobile and we'll confirm the best available slot.`,
            [{ label: "Sure, let's do it →", value: "__lead_form__" }]
          );
        }
        return;
      }

      if (state.step === STEPS.OWNER_CITY) {
        const cityLabel = CHATBOT_CITIES.find((c) => c.id === value)?.label || value;
        setState((s) => ({ ...s, step: STEPS.OWNER_DETAILS, city: value, cityLabel }));
        addBotMsg(
          `Here's what listing on Trimlly gives your salon in ${cityLabel}:

✅ Free listing — zero monthly fees
✅ Customers find you through city directory search
✅ Real-time slot calendar on any phone
✅ Automated SMS & email reminders
✅ Verified badge to build trust
✅ Direct UPI & cash payments — you keep it all

Ready to get started? Tell us your name and mobile and our team will guide you through setup.`,
          [{ label: "List my salon free →", value: "__lead_form__" }]
        );
        return;
      }

      if (state.step === STEPS.FAQ) {
        const faq = CHATBOT_FAQ.find((f) => f.id === value);
        if (faq) {
          addBotMsg(faq.answer);
          const newCount = state.faqCount + 1;
          setState((s) => ({ ...s, faqCount: newCount }));

          // After 2 FAQ answers — soft-ask for lead
          if (newCount >= 2 && !state.leadSubmitted) {
            setTimeout(() => {
              addBotMsg(
                "Want grooming tips and updates on WhatsApp? Share your number — it's optional.",
                [
                  { label: "Sure, add me →", value: "__lead_form__" },
                  { label: "No thanks", value: "__skip__" },
                ]
              );
            }, 800);
          } else {
            setTimeout(() => {
              addBotMsg(
                "Any other questions?",
                CHATBOT_FAQ.filter((f) => f.id !== value)
                  .slice(0, 4)
                  .map((f) => ({ label: f.question, value: f.id }))
              );
            }, 800);
          }
        }
        return;
      }

      if (value === "__lead_form__") {
        setState((s) => ({ ...s, step: STEPS.LEAD_FORM }));
        addBotMsg("Perfect! Just fill in your details below 👇", [], { showForm: true });
        return;
      }

      if (value === "__skip__") {
        addBotMsg(
          "No problem! Browse verified barbers or reach us anytime on WhatsApp.",
          [{ label: "Browse Barbers →", value: "__browse__", href: "/barbers" }]
        );
        return;
      }

      if (value === "__browse__") {
        router.push("/barbers");
        return;
      }

      // Fallback
      addBotMsg(
        "I can't answer that here, but our team can help immediately. Use the WhatsApp or Call buttons below.",
        []
      );
    },
    [state, addBotMsg, fetchBarbers]
  );

  // ── Lead form submit ──
  const handleLeadSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setPhoneError("");

      if (!state.name.trim()) return;

      // Indian mobile validation
      const phoneClean = state.phone.replace(/\D/g, "");
      if (!/^[6-9]\d{9}$/.test(phoneClean)) {
        setPhoneError("Please enter a valid 10-digit Indian mobile number starting with 6–9.");
        return;
      }

      if (!state.consent) {
        setPhoneError("Please accept the consent checkbox.");
        return;
      }

      setSubmitting(true);

      const leadType = state.path === "owner" ? "owner" : "customer";
      const interest =
        state.path === "owner"
          ? `Salon owner — ${state.cityLabel || state.city || "India"}`
          : `${state.serviceLabel || state.service || "salon"} in ${state.cityLabel || state.city || "India"}`;

      try {
        await submitLead({
          type: leadType,
          name: state.name.trim(),
          phone: state.phone.trim(),
          email: state.email?.trim() || "",
          city: state.city || "India",
          interest,
          source: "chatbot",
          page,
          referrer,
          utm_source: utms?.source || "",
          utm_medium: utms?.medium || "",
          utm_campaign: utms?.campaign || "",
          consent: true,
          consentText: "I agree to be contacted by Trimlly regarding my enquiry. See Privacy Policy.",
          website: "", // honeypot
        });

        trackEvent("lead_submitted", { source: "chatbot", type: leadType });

        const firstName = state.name.trim().split(" ")[0];
        const withinHours = isWithinBusinessHours();
        const responseTime = withinHours
          ? "within a few hours"
          : "on the next business day (Mon–Sat, 10 AM – 7 PM IST)";

        setState((s) => ({ ...s, step: STEPS.SUCCESS, leadSubmitted: true }));
        setMessages((prev) => [
          ...prev,
          botMsg(
            `Thanks ${firstName}! 🎉 We've got your details and will contact you ${responseTime}.`,
            [],
            { isSuccess: true }
          ),
        ]);
      } catch (err) {
        addBotMsg(`Sorry, something went wrong: ${err.message}. Please try WhatsApp instead.`);
      } finally {
        setSubmitting(false);
      }
    },
    [state, addBotMsg, page, referrer, utms]
  );

  // ── WhatsApp / Call CTA handlers ──
  const whatsappHref = (() => {
    const path = state.path === "owner"
      ? `Hi Trimlly, I run a salon in ${state.cityLabel || "India"} and want to list it.`
      : state.service
      ? `Hi Trimlly, I'm looking for ${state.serviceLabel || state.service} in ${state.cityLabel || "India"}. Saw your site: ${page}`
      : `Hi Trimlly, I'd like to know more. Saw your site: ${page}`;
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(path)}`;
  })();

  async function handleWhatsAppClick() {
    trackEvent("whatsapp_click", { source: "chatbot", page });
    await postEvent("whatsapp_click", page);
    window.open(whatsappHref, "_blank", "noopener,noreferrer");
  }

  async function handleCallClick() {
    trackEvent("call_click", { source: "chatbot", page });
    await postEvent("call_click", page);
  }

  // ─── Lead Form Component (inline) ────────────────────────────────────────────
  function LeadFormInline() {
    return (
      <form onSubmit={handleLeadSubmit} className="mt-2 space-y-2.5" aria-label="Contact form">
        {/* Honeypot - hidden from real users */}
        <input
          type="text"
          name="website"
          value=""
          readOnly
          tabIndex={-1}
          aria-hidden="true"
          className="hidden"
        />

        <div>
          <label htmlFor="chat-name" className="block text-xs font-semibold text-foreground mb-1">
            Your Name *
          </label>
          <input
            id="chat-name"
            type="text"
            required
            maxLength={100}
            value={state.name}
            onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
            placeholder="Aman Sharma"
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
          />
        </div>

        <div>
          <label htmlFor="chat-phone" className="block text-xs font-semibold text-foreground mb-1">
            Mobile Number (+91) *
          </label>
          <div className="flex items-center gap-1">
            <span className="px-2 py-2 text-sm bg-muted border border-border rounded-l-lg text-muted-foreground font-medium select-none">
              +91
            </span>
            <input
              id="chat-phone"
              ref={inputRef}
              type="tel"
              required
              maxLength={10}
              inputMode="numeric"
              value={state.phone.replace(/^\+91/, "").replace(/\D/g, "").slice(0, 10)}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                setState((s) => ({ ...s, phone: digits }));
                setPhoneError("");
              }}
              placeholder="98765 43210"
              className="flex-1 px-3 py-2 text-sm bg-background border border-border border-l-0 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>
          {phoneError && (
            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              {phoneError}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="chat-email" className="block text-xs font-semibold text-foreground mb-1">
            Email <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <input
            id="chat-email"
            type="email"
            maxLength={254}
            value={state.email}
            onChange={(e) => setState((s) => ({ ...s, email: e.target.value }))}
            placeholder="email@example.com"
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
          />
        </div>

        <div className="flex items-start gap-2 pt-1">
          <input
            id="chat-consent"
            type="checkbox"
            required
            checked={state.consent}
            onChange={(e) => {
              setState((s) => ({ ...s, consent: e.target.checked }));
              setPhoneError("");
            }}
            className="mt-0.5 w-4 h-4 rounded border-border accent-primary cursor-pointer shrink-0"
          />
          <label htmlFor="chat-consent" className="text-[11px] text-muted-foreground leading-relaxed cursor-pointer">
            I agree to be contacted by Trimlly about my enquiry.{" "}
            <a href="/privacy" target="_blank" className="text-primary underline underline-offset-2">
              Privacy Policy
            </a>
          </label>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
        >
          {submitting ? (
            <span className="animate-spin w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full" />
          ) : (
            <>
              <Send className="w-4 h-4" />
              Send Enquiry
            </>
          )}
        </button>
      </form>
    );
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Trimlly chat assistant"
      aria-modal="true"
      className="flex flex-col bg-background border border-border/80 rounded-2xl shadow-2xl overflow-hidden"
      style={{ width: "clamp(300px, 90vw, 380px)", height: "clamp(400px, 80vh, 560px)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-primary text-primary-foreground shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center shrink-0">
            <MessageCircle className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight">Trimlly Assistant</p>
            <p className="text-[11px] opacity-80 leading-tight">
              {isWithinBusinessHours() ? "● Online now" : `● Back ${BUSINESS_HOURS.display}`}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close chat"
          className="w-8 h-8 rounded-full hover:bg-primary-foreground/20 transition-colors flex items-center justify-center shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-3 py-3 space-y-3"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[88%] ${msg.from === "user" ? "ml-auto" : ""}`}>
              {/* Bubble */}
              <div
                className={`px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.from === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : msg.isSuccess
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-foreground rounded-bl-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                }`}
              >
                {msg.isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-500 inline mr-1.5 -mt-0.5" />}
                {msg.text}
              </div>

              {/* Chips */}
              {msg.chips && msg.chips.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {msg.chips.map((chip) => (
                    <button
                      key={chip.value}
                      onClick={() => (chip.href ? router.push(chip.href) : handleChip(chip.value, chip.label))}
                      className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground transition-colors min-h-[32px]"
                    >
                      {chip.label}
                      <ChevronRight className="w-3 h-3 opacity-60" />
                    </button>
                  ))}
                </div>
              )}

              {/* Inline lead form */}
              {msg.showForm && state.step === STEPS.LEAD_FORM && !state.leadSubmitted && (
                <div className="mt-2 bg-card border border-border rounded-xl p-3">
                  <LeadFormInline />
                </div>
              )}

              {/* Post-success actions */}
              {msg.isSuccess && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    onClick={handleWhatsAppClick}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-[#25d366] text-white hover:bg-[#1ebe5d] transition-colors min-h-[32px]"
                  >
                    Continue on WhatsApp
                  </button>
                  <Link
                    href="/barbers"
                    className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground transition-colors min-h-[32px]"
                  >
                    Browse Barbers
                  </Link>
                </div>
              )}

              {/* Fetching indicator */}
              {fetchingBarbers && msg.from === "bot" && (
                <p className="text-[10px] text-muted-foreground mt-1 animate-pulse">Finding barbers near you…</p>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* WhatsApp + Call footer */}
      <div className="shrink-0 px-3 py-2.5 border-t border-border/60 bg-muted/30 flex items-center gap-2">
        <button
          onClick={handleWhatsAppClick}
          aria-label="Open WhatsApp chat"
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#25d366] text-white text-xs font-bold hover:bg-[#1ebe5d] transition-colors min-h-[44px]"
        >
          {/* WhatsApp SVG icon - no AI icon */}
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Chat on WhatsApp
        </button>
        <a
          href={`tel:${SUPPORT_PHONE}`}
          onClick={handleCallClick}
          aria-label="Call Trimlly support"
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-bold hover:bg-muted transition-colors min-h-[44px]"
        >
          <Phone className="w-4 h-4" />
          Call
        </a>
      </div>
    </div>
  );
}

