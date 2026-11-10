"use client";

import { useState, useEffect, useCallback, Suspense, lazy } from "react";
import { MessageCircle, X } from "lucide-react";

// Lazy-load the heavy panel only after first interaction
const ChatPanel = lazy(() => import("./ChatPanel"));

const DISMISSED_KEY = "trimlly_chat_teaser_dismissed";
const SESSION_OPEN_KEY = "trimlly_chat_open";

function getUtms() {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem("trimlly_utms");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export default function ChatWidget({ page }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [referrer, setReferrer] = useState("");
  const [utms, setUtms] = useState({});
  const prefersReducedMotion = typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  useEffect(() => {
    setMounted(true);
    setReferrer(document.referrer || "");

    // Capture UTM params once per session
    const params = new URLSearchParams(window.location.search);
    const captured = {
      source: params.get("utm_source") || "",
      medium: params.get("utm_medium") || "",
      campaign: params.get("utm_campaign") || "",
    };
    if (captured.source || captured.medium || captured.campaign) {
      try { sessionStorage.setItem("trimlly_utms", JSON.stringify(captured)); } catch {}
    }
    setUtms(getUtms());

    // Restore open state if page refreshed mid-chat
    try {
      if (sessionStorage.getItem(SESSION_OPEN_KEY) === "1") setIsOpen(true);
    } catch {}

    // Show teaser bubble after 8s — once per session, respects 7-day dismiss
    const teaserShownThisSession = (() => {
      try { return sessionStorage.getItem("trimlly_teaser_shown") === "1"; } catch { return false; }
    })();

    const teaserDismissed = (() => {
      try {
        const ts = localStorage.getItem(DISMISSED_KEY);
        if (!ts) return false;
        return Date.now() - parseInt(ts, 10) < 7 * 24 * 60 * 60 * 1000;
      } catch { return false; }
    })();

    if (!teaserShownThisSession && !teaserDismissed) {
      const timer = setTimeout(() => {
        setShowTeaser(true);
        try { sessionStorage.setItem("trimlly_teaser_shown", "1"); } catch {}
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
    setShowTeaser(false);
    try {
      sessionStorage.setItem(SESSION_OPEN_KEY, "1");
      window.gtag?.("event", "chat_open", { page });
    } catch {}
  }, [page]);

  const close = useCallback(() => {
    setIsOpen(false);
    try { sessionStorage.removeItem(SESSION_OPEN_KEY); } catch {}
  }, []);

  const dismissTeaser = useCallback((e) => {
    e.stopPropagation();
    setShowTeaser(false);
    try { localStorage.setItem(DISMISSED_KEY, String(Date.now())); } catch {}
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 print:hidden">
      {/* Floating chat panel */}
      {isOpen && (
        <div
          className={prefersReducedMotion ? "" : "animate-in fade-in slide-in-from-bottom-4 duration-300"}
        >
          <Suspense
            fallback={
              <div className="bg-background border border-border rounded-2xl shadow-2xl flex items-center justify-center"
                style={{ width: 360, height: 400 }}>
                <span className="animate-spin w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full" />
              </div>
            }
          >
            <ChatPanel
              onClose={close}
              page={page}
              referrer={referrer}
              utms={utms}
            />
          </Suspense>
        </div>
      )}

      {/* Teaser bubble */}
      {showTeaser && !isOpen && (
        <div
          className={`relative bg-card border border-border rounded-2xl shadow-lg px-4 py-3 max-w-[220px] cursor-pointer hover:border-primary/40 transition-all ${
            prefersReducedMotion ? "" : "animate-in fade-in slide-in-from-bottom-3 duration-300"
          }`}
          onClick={open}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && open()}
          aria-label="Open chat assistant"
        >
          <button
            onClick={dismissTeaser}
            aria-label="Dismiss chat teaser"
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-muted border border-border text-muted-foreground hover:bg-muted/80 flex items-center justify-center"
          >
            <X className="w-3 h-3" />
          </button>
          <p className="text-xs text-foreground font-medium leading-relaxed">
            👋 Need help finding a barber? Ask us!
          </p>
        </div>
      )}

      {/* FAB button */}
      {!isOpen && (
        <button
          onClick={open}
          aria-label="Open Trimlly chat assistant"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          className="relative w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <MessageCircle className="w-6 h-6" />
          {/* Unread dot */}
          <span
            aria-hidden="true"
            className="absolute top-1 right-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-background"
          />
        </button>
      )}
    </div>
  );
}

