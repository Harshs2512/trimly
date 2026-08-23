import "./globals.css";
import Providers from "@/components/Providers";
import AppChrome from "@/components/AppChrome";
import { getAppUrl } from "@/lib/appUrl";

const APP_URL = getAppUrl();

export const metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: "Trimlly - Barber booking made simpler", template: "%s | Trimlly" },
  description: "Browse barber services, check appointment availability and send booking requests with Trimlly.",
  keywords: ["barbershop", "haircut booking", "barber appointment", "salon booking"],
  authors: [{ name: "Trimlly Team" }],
  creator: "Trimlly",
  openGraph: { type: "website", locale: "en_IN", url: APP_URL, title: "Trimlly - Barber booking made simpler", description: "Browse barber services and request available appointment times.", siteName: "Trimlly" },
  twitter: { card: "summary_large_image", title: "Trimlly - Barber booking made simpler", description: "Browse barber services and request available appointment times." },
};

export default function RootLayout({ children }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Trimlly",
    operatingSystem: "Web",
    applicationCategory: "BusinessApplication",
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
    description: "Trimlly helps customers browse barber services and request available appointments.",
    url: APP_URL,
  };

  return (
    <html lang="en">
      <body className="bg-background text-foreground flex flex-col min-h-screen">
        <Providers><AppChrome>{children}</AppChrome></Providers>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </body>
    </html>
  );
}
