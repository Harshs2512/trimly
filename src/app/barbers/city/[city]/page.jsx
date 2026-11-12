import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Scissors, ShieldCheck, ArrowRight, Store, Bell, CheckCircle2 } from "lucide-react";
import { getAppUrl } from "@/lib/appUrl";
import { getVerifiedBarbers, POPULAR_SERVICES } from "@/lib/barbers";
import { resolveCity, getCitySalonCount, getUnifiedCityStats } from "@/lib/cities";
import BarberCard from "@/components/BarberCard";
import { CityInlineLead } from "@/components/leads/InlineLeadCapture";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { city: cityParam } = await params;
  const cityInfo = resolveCity(cityParam);
  const count = await getCitySalonCount(cityInfo.slug);

  // High quality indexing strategy:
  // Cities with active inventory (count > 0) are 100% indexed.
  // Cities with zero inventory are marked noindex, follow until genuine inventory arrives.
  const isIndexable = count > 0;

  const canonical = `/barbers/city/${cityInfo.slug}`;
  const title = `Top Barbers & Salons in ${cityInfo.name}: Book Online`;
  const description = count > 0
    ? `Book verified barbers in ${cityInfo.name}, ${cityInfo.state}. Compare real-time slots, ratings, and transparent INR haircut prices. Instant confirmation on Trimlly.`
    : `Explore upcoming verified salons and barber lounges in ${cityInfo.name}, ${cityInfo.state}. Reserve upcoming chairs and register your salon on Trimlly.`;

  return {
    title,
    description: description.slice(0, 155),
    alternates: { canonical },
    robots: isIndexable
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      title: `${title} | Trimlly`,
      description: description.slice(0, 155),
      url: canonical,
      type: "website",
      locale: "en_IN",
    },
  };
}

export default async function BarberCityPage({ params }) {
  const { city: cityParam } = await params;
  const cityInfo = resolveCity(cityParam);
  const appUrl = getAppUrl();

  const [{ barbers, pagination }, allCities] = await Promise.all([
    getVerifiedBarbers({ city: cityInfo.slug, limit: 24 }),
    getUnifiedCityStats(),
  ]);

  const nearbyCities = allCities.filter((c) => c.citySlug !== cityInfo.slug);

  const cityFaqs = [
    {
      q: `How do I book a barber appointment in ${cityInfo.name} on Trimlly?`,
      a: `Simply choose a verified lounge in ${cityInfo.name}, pick your desired service (haircut, beard trim, facial), select an open real-time time slot, and confirm. You can pay securely online or at the venue.`,
    },
    {
      q: `What is the average cost of a men's haircut in ${cityInfo.name}?`,
      a: `A quality haircut in ${cityInfo.name} typically ranges between ₹200 and ₹600 depending on the stylist tier and salon amenities. Exact prices are clearly listed on every barber's Trimlly profile.`,
    },
    {
      q: `Can I reschedule or cancel my appointment?`,
      a: `Yes! Free rescheduling and cancellations are supported up to 2 hours before your scheduled time slot directly from your user dashboard.`,
    },
    {
      q: `How does Trimlly verify barbers in ${cityInfo.name}?`,
      a: `Every shop profile on Trimlly is manually reviewed by our team to confirm physical salon ownership, stylist experience, hygiene standards, and valid Indian business registration.`,
    },
  ];

  // Breadcrumb schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: appUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Barbers",
        item: `${appUrl}/barbers`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: cityInfo.name,
        item: `${appUrl}/barbers/city/${cityInfo.slug}`,
      },
    ],
  };

  // Structured Data: ItemList of salons in city
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Verified Barbers & Salons in ${cityInfo.name}`,
    itemListElement: barbers.map((b, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: b.shopName,
      url: `${appUrl}${b.canonicalSlug}`,
    })),
  };

  return (
    <div className="bg-background min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {barbers.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      )}

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
            <div className="rounded-3xl border border-dashed border-border/80 bg-card/60 p-8 sm:p-12 text-center space-y-6 max-w-2xl mx-auto shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto text-primary">
                <Store className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Expanding to {cityInfo.name}
                </div>
                <h3 className="text-2xl font-extrabold tracking-tight">
                  No Verified Salons Listed in {cityInfo.name} Yet
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We are actively vetting neighborhood barbers and luxury grooming salons in {cityInfo.name} to ensure hygiene, confirmed pricing in INR, and verified master stylists.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Link href="/for-barbers">
                  <Button size="lg" className="w-full sm:w-auto rounded-xl px-6 font-semibold gap-2">
                    <Store className="w-4 h-4" />
                    Are You a Salon Owner in {cityInfo.name}? List Free
                  </Button>
                </Link>
                <Link href="/barbers">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto rounded-xl px-6 font-semibold">
                    Browse Other Cities
                  </Button>
                </Link>
              </div>

              <div className="pt-6 border-t border-border/60">
                <p className="text-xs text-muted-foreground mb-4">
                  Want to be notified when the first top-rated salon in {cityInfo.name} opens on Trimlly?
                </p>
                <CityInlineLead cityName={cityInfo.name} />
              </div>
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
                href={`/services/${srv.slug}/${cityInfo.slug}`}
                className="p-3.5 rounded-2xl bg-card border border-border/60 hover:border-primary/50 text-center transition flex flex-col items-center justify-center gap-1 group"
              >
                <Scissors className="w-4 h-4 text-primary group-hover:scale-110 transition" />
                <span className="font-semibold text-xs text-foreground group-hover:text-primary transition">
                  {srv.name}
                </span>
                <span className="text-[11px] text-muted-foreground">{srv.priceRange}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* City Inline Lead Capture Banner (Active Inventory Cities) */}
        {barbers.length > 0 && (
          <div className="pt-6">
            <CityInlineLead cityName={cityInfo.name} />
          </div>
        )}

        {/* Local City FAQs */}
        <section className="space-y-6 pt-6 border-t">
          <h2 className="text-2xl font-bold">Frequently Asked Questions — {cityInfo.name}</h2>
          <Accordion type="single" collapsible defaultValue="item-0" className="w-full bg-card rounded-2xl border p-4 sm:p-6">
            {cityFaqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-border/60">
                <AccordionTrigger className="text-left font-bold text-base hover:text-primary py-4">
                  <span>{faq.q}</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* Nearby Cities Links with Live Verified Counts */}
        {nearbyCities.length > 0 && (
          <section className="space-y-4 pt-6 border-t">
            <h3 className="font-bold text-base text-foreground">Explore More Cities</h3>
            <div className="flex flex-wrap gap-2 text-xs">
              {nearbyCities.map((c) => (
                <Link
                  key={c.citySlug}
                  href={`/barbers/city/${c.citySlug}`}
                  className="px-3 py-1.5 rounded-full bg-secondary hover:bg-primary/20 hover:text-primary transition text-foreground font-medium flex items-center gap-1.5"
                >
                  <span>{c.cityName}</span>
                  <span className="opacity-70">({c.count})</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
