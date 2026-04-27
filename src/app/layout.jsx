// app/layout.jsx
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Providers from "@/components/Providers";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Trimlly - Skip the wait",
    template: "%s | Trimlly",
  },
  description: "Trimlly - smart queue & booking for barbers.",
  keywords: [
    "barbershop",
    "haircut",
    "booking",
    "queue management",
    "barber appointment",
  ],
  authors: [{ name: "Trimlly Team" }],
  creator: "Trimlly",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: APP_URL,
    title: "Trimlly - Skip the wait",
    description: "Smart queue & booking for barbers.",
    siteName: "Trimlly",
  },
  twitter: {
    card: "summary_large_image",
    title: "Trimlly - Skip the wait",
    description: "Smart queue & booking for barbers.",
    creator: "@trimlyapp",
  },
};

export default function RootLayout({ children }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Trimlly",
    operatingSystem: "Web",
    applicationCategory: "BusinessApplication",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description: "Trimlly is a smart queue and booking application for barbers.",
    url: APP_URL,
  };

  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 flex flex-col min-h-screen">
        <Providers>
          <Navbar />
          <main className="flex-grow">{children}</main>
          <Footer />
        </Providers>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
