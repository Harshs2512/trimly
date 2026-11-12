import Link from "next/link";
import { MessageSquare, ArrowRight } from "lucide-react";
import { getAppUrl } from "@/lib/appUrl";
import ContactPageInteractive from "@/components/leads/ContactPageInteractive";

export const metadata = {
  title: "Contact Support & Partner Help",
  description:
    "Get in touch with Trimlly for appointment bookings, salon onboarding, or support inquiries across Indore, Bhopal, Mumbai, Delhi, Bengaluru, and Pune.",
  alternates: {
    canonical: "/contact",
  },
};

export default function ContactPage() {
  const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME || "Trimlly";
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "support@trimly.app";
  const supportPhone = process.env.NEXT_PUBLIC_SUPPORT_PHONE?.trim() || "+919876543210";
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim() || "919876543210";
  const address = process.env.NEXT_PUBLIC_COMPANY_ADDRESS || "Indore, Madhya Pradesh, India";
  const appUrl = getAppUrl();

  const contactJsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: `Contact ${companyName}`,
    url: `${appUrl}/contact`,
    mainEntity: {
      "@type": "Organization",
      name: companyName,
      url: appUrl,
      logo: `${appUrl}/logo.webp`,
      contactPoint: [
        {
          "@type": "ContactPoint",
          telephone: supportPhone,
          contactType: "customer service",
          areaServed: "IN",
          availableLanguage: ["English", "Hindi"],
        },
      ],
      address: {
        "@type": "PostalAddress",
        addressLocality: address,
        addressCountry: "IN",
      },
    },
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactJsonLd) }}
      />

      {/* Hero */}
      <div className="pt-24 pb-14 px-4 sm:px-6 bg-gradient-to-b from-primary/10 via-background/60 to-background border-b">
        <div className="container mx-auto max-w-4xl text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider border border-primary/20">
            <MessageSquare className="w-3.5 h-3.5" /> Support & Inquiries
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            We&apos;re Here to <span className="text-primary">Help You</span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Have questions about booking an appointment, salon verification, or listing your shop on {companyName}? Reach out anytime.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 sm:px-6 py-12 space-y-12">
        <ContactPageInteractive
          companyName={companyName}
          supportEmail={supportEmail}
          supportPhone={supportPhone}
          whatsappNumber={whatsappNumber}
          address={address}
        />

        {/* Quick FAQ Link Banner */}
        <div className="p-6 rounded-2xl bg-secondary/50 border border-border/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <h3 className="font-bold text-foreground">Need immediate answers?</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Check our Frequently Asked Questions for rules on cancellation, payment, and salon verification.
            </p>
          </div>
          <Link
            href="/faq"
            className="px-5 py-2.5 rounded-xl bg-card border border-border text-xs font-semibold hover:bg-muted transition shrink-0"
          >
            Visit FAQ Page &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
