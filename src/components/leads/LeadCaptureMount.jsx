"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const ExitIntentModal = dynamic(() => import("./ExitIntentModal"), { ssr: false });
const StickyMobileBar = dynamic(() => import("./StickyMobileBar"), { ssr: false });

const EXCLUDED_PREFIXES = [
  "/login",
  "/dashboard",
  "/admin",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/resend-verification",
];

export default function LeadCaptureMount() {
  const pathname = usePathname();
  const isExcluded = EXCLUDED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (isExcluded) return null;

  return (
    <>
      <ExitIntentModal />
      <StickyMobileBar />
    </>
  );
}

