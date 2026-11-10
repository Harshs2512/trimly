import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Scissors, ShieldCheck, ArrowRight, Clock, Star } from "lucide-react";
import { getAppUrl } from "@/lib/appUrl";
import { getVerifiedBarbers, getCityDirectoryStats, POPULAR_SERVICES, slugify } from "@/lib/barbers";
import BarberCard from "@/components/BarberCard";
import { CityInlineLead } from "@/components/leads/InlineLeadCapture";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const revalidate = 60;

const MIN_INDEX_BARBERS = parseInt(process.env.MIN_CITY_BARBERS_INDEX || "3", 10);

const CITY_METADATA = {
  indore: {
    name: "Indore",
    state: "Madhya Pradesh",
    popularAreas: ["Vijay Nagar", "Palasia", "Chappan Dukan", "Bhawarkua", "Scheme 54"],
    intro:
      "Indore's bustling lifestyle demands grooming that fits busy schedules. From classic fades in Vijay Nagar to modern beard sculpting in Palasia, discover verified salons with guaranteed available slots and zero waiting.",
  },
  bhopal: {
    name: "Bhopal",
    state: "Madhya Pradesh",
    popularAreas: ["Arera Colony", "10 No. Market", "MP Nagar", "Kolar Road", "Bittan Market"],
    intro:
      "Explore Bhopal's top master barbershops and artisan grooming lounges. Check live wait times, transparent INR pricing, and book confirmed appointments near Arera Colony and MP Nagar.",
  },
  mumbai: {
    name: "Mumbai",
    state: "Maharashtra",
    popularAreas: ["Bandra West", "Juhu", "Andheri", "Colaba", "Powai"],
    intro:
      "Experience premier grooming lounges across Mumbai. Skip the weekend salon queues with confirmed appointment booking in Bandra, Juhu, and South Mumbai.",
  },
  delhi: {
    name: "Delhi NCR",
    state: "Delhi",
    popularAreas: ["Connaught Place", "South Extension", "Hauz Khas", "Saket", "Gurugram Cyber Hub"],
    intro:
      "From heritage barber lounges in Connaught Place to luxury grooming studios in South Delhi and Gurugram, book verified master stylists with real-time slot availability.",
  },
  bengaluru: {
    name: "Bengaluru",
    state: "Karnataka",
    popularAreas: ["Indiranagar", "Koramangala", "HSR Layout", "Whitefield", "JP Nagar"],
    intro:
      "Bangalore's tech and startup professionals trust Trimly to avoid long weekend wait times. Find top-rated styling chairs in Indiranagar, Koramangala, and HSR Layout.",
  },
  pune: {
    name: "Pune",
    state: "Maharashtra",
    popularAreas: ["Koregaon Park", "Baner", "Viman Nagar", "Kothrud", "Aundh"],
    intro:
      "Discover modern barber lounges and verified salons across Pune. Reserve instant appointment slots in Koregaon Park and Baner with confirmed pricing in INR.",
  },
};

export async function generateMetadata({ params }) {
  const { city: cityParam } = await params;
  const cityKey = slugify(cityParam);
  const info = CITY_METADATA[cityKey] || {
    name: cityParam.charAt(0).toUpperCase() + cityParam.slice(1),
    state: "India",
  };

  const { pagination } = await getVerifiedBarbers({ city: info.name, limit: 1 });
  const count = pagination.total;
  const isIndexable = count >= MIN_INDEX_BARBERS;

  const appUrl = getAppUrl();
  const canonical = `${appUrl}/barbers/city/${cityKey}`;
  const title = `Top Barbers & Salons in ${info.name}: Book Online | Trimly`.slice(0, 60);
  const description = `Find verified barbers in ${info.name}, ${info.state}. Compare real-time slots, ratings, and haircut prices in INR. Zero wait times with instant confirmation.`.slice(0, 155);

  return {
    title,
    description,
    alternates: { canonical },
    robots: isIndexable
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      locale: "en_IN",
    },
  };
}

export default async function BarberCityPage({ params }) {
  const { city: cityParam } = await params;
  const cityKey = slugify(cityParam);
  const cityInfo = CITY_METADATA[cityKey] || {
    name: cityParam.charAt(0).toUpperCase() + cityParam.slice(1),
    state: "India",
    popularAreas: ["Central", "North", "South"],
    intro: `Find and book verified barbershops and grooming lounges in ${cityParam}. Check real-time availability and book online.`,
  };

  const appUrl = getAppUrl();
  const [{ barbers, pagination }, allCities] = await Promise.all([
    getVerifiedBarbers({ city: cityInfo.name, limit: 24 }),
    getCityDirectoryStats(),
  ]);

  const nearbyCities = allCities.filter((c) => c.citySlug !== cityKey);

  const cityFaqs = [
    {
      q: `How do I book a barber appointment in ${cityInfo.name} on Trimly?`,
      a: `Simply choose a verified lounge in ${cityInfo.name}, pick your desired service (haircut, beard trim, facial), select an open real-time time slot, and confirm. You can pay securely online or at the venue.`,
    },
    {
      q: `What is the average cost of a men's haircut in ${cityInfo.name}?`,
      a: `A quality haircut in ${cityInfo.name} typically ranges between ₹200 and ₹600 depending on the stylist tier and salon amenities. Exact prices are clearly listed on every barber's Trimly profile.`,
    },
    {
      q: `Can I reschedule or cancel my appointment?`,
      a: `Yes! Free rescheduling and cancellations are supported up to 2 hours before your scheduled time slot directly from your user dashboard.`,
    },
    {
      q: `How does Trimly verify barbers in ${cityInfo.name}?`,
      a: `Every shop profile on Trimly is manually reviewed by our team to confirm physical salon ownership, stylist experience, hygiene standards, and valid Indian business registration.`,
    },
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: cityFaqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: appUrl },
      { "@type": "ListItem", position: 2, name: "Barbers", item: `${appUrl}/barbers` },
      { "@type": "ListItem", position: 3, name: cityInfo.name, item: `${appUrl}/barbers/city/${cityKey}` },
    ],
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      {/* Hero */}
      <div className="pt-24 pb-12 px-4 sm:px-6 bg-gradient-to-b from-primary/10 via-background/60 to-background border-b">
        <div className="container mx-auto max-w-6xl">
          <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted-foreground">
            <ol className="flex items-center gap-2">
              <li><Link href="/" className="hover:text-primary transition">Home</Link></li>
              <li>/</li>
              <li><Link href="/barbers" className="hover:text-primary transition">Barbers</Link></li>
              <li>/</li>
              <li className="text-foreground font-medium">{cityInfo.name}</li>
            </ol>
          </nav>

          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider border border-primary/20">
              <MapPin className="w-3.5 h-3.5" /> {cityInfo.name}, {cityInfo.state}
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              Best Barbers & Salons in <span className="text-primary">{cityInfo.name}</span>
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
              {cityInfo.intro}
            </p>

            {cityInfo.popularAreas?.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
                <span className="text-muted-foreground font-medium">Popular Areas:</span>
                {cityInfo.popularAreas.map((area) => (
                  <span
                    key={area}
                    className="px-2.5 py-1 rounded-full bg-secondary/80 text-foreground font-medium border border-border/60"
                  >
                    {area}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-12 space-y-16">
        {/* Barbers Grid */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              Verified Lounges in {cityInfo.name} ({pagination.total})
            </h2>
            <Link href="/barbers" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
              View all cities <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {barbers.length === 0 ? (
            <div className="text-center py-16 border border-dashed rounded-3xl p-8 space-y-3">
              <p className="text-muted-foreground text-sm">
                We are actively onboarding verified salon partners in {cityInfo.name}.
              </p>
              <Link href="/login" className="inline-block pt-2">
                <span className="text-xs font-semibold text-primary underline">
                  Are you a barber in {cityInfo.name}? List your salon on Trimly &rarr;
                </span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {barbers.map((b, idx) => (
                <BarberCard key={b._id} barber={b} index={idx} />
              ))}
            </div>
          )}
        </section>

        {/* Popular Services in City */}
        <section className="space-y-6 pt-6 border-t">
          <h2 className="text-2xl font-bold">Popular Grooming Services in {cityInfo.name}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {POPULAR_SERVICES.map((srv) => (
              <Link
                key={srv.slug}
                href={`/services/${srv.slug}/${cityKey}`}
                className="p-3.5 rounded-2xl bg-card border border-border/60 hover:border-primary/50 text-center transition flex flex-col items-center justify-center gap-1 group"
              >
                <Scissors className="w-4 h-4 text-primary group-hover:scale-110 transition" />
                <span className="font-semibold text-xs text-foreground group-hover:text-primary">
                  {srv.name}
                </span>
                <span className="text-[11px] text-muted-foreground">{srv.priceRange}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Inline Lead Capture: "Can't find the right barber?" */}
        <CityInlineLead cityName={cityInfo.name} />

        {/* FAQ Accordion with Schema */}
        <section className="space-y-6 pt-6 border-t max-w-3xl">
          <div>
            <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Everything you need to know about booking hair and grooming services in {cityInfo.name}.
            </p>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {cityFaqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left font-semibold text-sm">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* Nearby Cities Links */}
        {nearbyCities.length > 0 && (
          <section className="space-y-4 pt-6 border-t">
            <h3 className="font-bold text-base text-foreground">Explore More Cities</h3>
            <div className="flex flex-wrap gap-2 text-xs">
              {nearbyCities.map((c) => (
                <Link
                  key={c.citySlug}
                  href={`/barbers/city/${c.citySlug}`}
                  className="px-3 py-1.5 rounded-full bg-secondary hover:bg-primary/20 hover:text-primary transition text-foreground font-medium"
                >
                  {c.cityName} ({c.count})
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

