import Hero from "@/components/Hero";
import TrustStrip from "@/components/TrustStrip";
import PopularGrids from "@/components/PopularGrids";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import Advantages from "@/components/Advantages";
import Testimonials from "@/components/Testimonials";
import HomeFAQ from "@/components/HomeFAQ";
import { HOME_FAQS } from "@/lib/faqData";
import { HomeInlineLead } from "@/components/leads/InlineLeadCapture";
import CTA from "@/components/CTA";
import { getPlatformTrustStats, getRecentGenuineReviews } from "@/lib/barbers";

export const revalidate = 300; // Revalidate every 5 minutes

export const metadata = {
  title: "Trimlly: Book Barber & Salon Appointments Online in India",
  description:
    "Book top-rated barbers and salons across India. Verified stylists, real-time slots, upfront INR pricing, and zero wait times on Trimlly.",
  alternates: {
    canonical: "/",
  },
};

export default async function Home() {
  const [stats, reviews] = await Promise.all([
    getPlatformTrustStats(),
    getRecentGenuineReviews(6),
  ]);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: HOME_FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <div className="bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Hero />
      <TrustStrip stats={stats} />
      <PopularGrids />
      <Features />
      <HowItWorks />
      <Advantages />
      <Testimonials reviews={reviews} />
      <HomeFAQ />
      <HomeInlineLead />
      <CTA />
    </div>
  );
}
