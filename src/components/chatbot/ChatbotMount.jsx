"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

// Lazy-load the entire widget after idle to avoid affecting CLS/LCP
const ChatWidget = dynamic(() => import("./ChatWidget"), {
  ssr: false,
  loading: () => null,
});

// Routes where the chatbot should NOT appear
const EXCLUDED_PREFIXES = ["/login", "/dashboard", "/admin", "/forgot-password", "/reset-password", "/verify-email", "/resend-verification"];

export default function ChatbotMount() {
  const pathname = usePathname();

  // Don't mount on excluded routes
  const isExcluded = EXCLUDED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );

  if (isExcluded) return null;

  return <ChatWidget page={pathname} />;
}

