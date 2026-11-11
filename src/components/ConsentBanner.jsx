"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("trimly_consent");
      if (!stored) {
        // Show banner after brief delay
        const timer = setTimeout(() => setVisible(true), 1000);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleConsent = (analyticsGranted) => {
    try {
      const consentRecord = {
        essential: true,
        analytics: analyticsGranted,
        timestamp: new Date().toISOString(),
        version: "dpdp-2023-v1",
      };
      localStorage.setItem("trimly_consent", JSON.stringify(consentRecord));

      // Update GA consent if available
      if (typeof window.gtag === "function") {
        window.gtag("consent", "update", {
          analytics_storage: analyticsGranted ? "granted" : "denied",
        });
      }
    } catch (e) {
      console.warn("Failed to save consent choice:", e);
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Privacy & Cookie Preferences"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
      <div className="p-5 rounded-2xl bg-card/95 backdrop-blur-md border border-border/90 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <p className="font-bold text-sm text-foreground">Your Privacy &amp; Data Rights</p>
          </div>
          <button
            onClick={() => handleConsent(false)}
            className="text-muted-foreground hover:text-foreground p-1"
            aria-label="Close and decline analytics"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          In compliance with India&apos;s Digital Personal Data Protection (DPDP) Act 2023, Trimlly uses essential cookies for phone OTP authentication and optional analytics to improve local salon discovery.
        </p>

        <div className="flex items-center justify-between text-xs pt-1">
          <Link href="/privacy" className="text-primary font-semibold hover:underline">
            Read DPDP Privacy Policy
          </Link>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleConsent(false)}
            className="flex-1 rounded-xl text-xs font-semibold"
          >
            Essential Only
          </Button>
          <Button
            size="sm"
            onClick={() => handleConsent(true)}
            className="flex-1 rounded-xl text-xs font-semibold shadow-sm"
          >
            Accept All
          </Button>
        </div>
      </div>
    </div>
  );
}

