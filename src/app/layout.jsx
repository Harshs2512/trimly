import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import AppChrome from "@/components/AppChrome";
import { getAppUrl } from "@/lib/appUrl";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const APP_URL = getAppUrl();

export const metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: "Trimly - Modern Grooming & Barber Appointments", template: "%s | Trimly" },
  description: "Browse curated artisan barbers, check real-time availability, and book luxury grooming appointments with Trimly.",
  keywords: ["barbershop", "haircut booking", "barber appointment", "salon booking", "grooming lounge"],
  authors: [{ name: "Trimly Team" }],
  creator: "Trimly",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: APP_URL,
    title: "Trimly - Modern Grooming & Barber Appointments",
    description: "Browse curated artisan barbers, check real-time availability, and book luxury grooming appointments with Trimly.",
    siteName: "Trimly",
  },
  twitter: {
    card: "summary_large_image",
    title: "Trimly - Modern Grooming & Barber Appointments",
    description: "Browse curated artisan barbers, check real-time availability, and book luxury grooming appointments with Trimly.",
  },
};

export default function RootLayout({ children }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Trimly",
    operatingSystem: "Web",
    applicationCategory: "BusinessApplication",
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
    description: "Trimly helps customers browse verified barber lounges and request available appointments.",
    url: APP_URL,
  };

  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className={`${inter.className} bg-background text-foreground flex flex-col min-h-screen antialiased`}>
        <Providers>
          <AppChrome>{children}</AppChrome>
        </Providers>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </body>
    </html>
  );
}
