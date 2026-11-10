import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Providers from "@/components/Providers";
import AppChrome from "@/components/AppChrome";
import ConsentBanner from "@/components/ConsentBanner";
import { getAppUrl } from "@/lib/appUrl";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const APP_URL = getAppUrl();
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export const metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Trimlly: Book Barber & Salon Appointments Online in India",
    template: "%s | Trimlly",
  },
  description:
    "Find and book verified barbers and salons near you. Real-time slots, INR pricing, instant confirmation. Serving Indore, Bhopal, Delhi, Mumbai and 15+ Indian cities.",
  authors: [{ name: "Trimlly Team" }],
  creator: "Trimlly",
  alternates: {
    canonical: APP_URL,
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: APP_URL,
    title: "Trimlly: Book Barber & Salon Appointments Online in India",
    description:
      "Find and book verified barbers and salons near you. Real-time slots, INR pricing, instant confirmation.",
    siteName: "Trimlly",
    images: [
      {
        url: `${APP_URL}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: "Trimlly - Book Barber & Salon Appointments Online in India",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Trimlly: Book Barber & Salon Appointments Online in India",
    description:
      "Find and book verified barbers and salons near you. Real-time slots, INR pricing, instant confirmation.",
    images: [`${APP_URL}/og-image.jpg`],
  },
  // Google Search Console verification — set NEXT_PUBLIC_GSC_VERIFICATION in your env
  ...(process.env.NEXT_PUBLIC_GSC_VERIFICATION && {
    verification: {
      google: process.env.NEXT_PUBLIC_GSC_VERIFICATION,
    },
  }),
};

export default function RootLayout({ children }) {
  const companyName =
    process.env.NEXT_PUBLIC_COMPANY_NAME || "Trimlly";

  // Organization + WebSite structured data (replaces the generic SoftwareApplication)
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: companyName,
      url: APP_URL,
      logo: `${APP_URL}/logo.webp`,
      sameAs: [],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Trimlly",
      url: APP_URL,
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${APP_URL}/barbers?search={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  ];

  return (
    <html lang="en-IN" className={inter.variable} suppressHydrationWarning>
      <body
        className={`${inter.className} bg-background text-foreground flex flex-col min-h-screen antialiased`}
      >
        <Providers>
          <AppChrome>{children}</AppChrome>
          <ConsentBanner />
        </Providers>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {/* Google Analytics 4 — only loads when NEXT_PUBLIC_GA_ID is set */}
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', { send_page_view: true });
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
