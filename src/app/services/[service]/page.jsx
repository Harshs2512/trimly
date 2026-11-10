import Link from "next/link";
import { notFound } from "next/navigation";
import { Scissors, Clock, ArrowRight, ShieldCheck } from "lucide-react";
import { getAppUrl } from "@/lib/appUrl";
import { getVerifiedBarbers, getCityDirectoryStats, POPULAR_SERVICES } from "@/lib/barbers";
import BarberCard from "@/components/BarberCard";

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { service: serviceParam } = await params;
  const srv = POPULAR_SERVICES.find((s) => s.slug === serviceParam);

  if (!srv) {
    return { title: "Service Not Found | Trimly" };
  }

  const appUrl = getAppUrl();
  const canonical = `${appUrl}/services/${srv.slug}`;
  const title = `Book ${srv.name} Online in India | Trimly`.slice(0, 60);
  const description = `Find verified barbers and salons offering ${srv.name.toLowerCase()} in India. Compare prices (${srv.priceRange}), check real-time slots, and book with zero wait time.`.slice(0, 155);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      locale: "en_IN",
    },
  };
}

export default async function ServiceHubPage({ params }) {
  const { service: serviceParam } = await params;
  const srv = POPULAR_SERVICES.find((s) => s.slug === serviceParam);

  if (!srv) {
    notFound();
  }

  const appUrl = getAppUrl();
  const [{ barbers, pagination }, cityStats] = await Promise.all([
    getVerifiedBarbers({ service: srv.name.split(" ")[0], limit: 12 }),
    getCityDirectoryStats(),
  ]);

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: srv.name,
    description: srv.description,
    provider: {
      "@type": "Organization",
      name: "Trimly",
      url: appUrl,
    },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "INR",
      price: srv.priceRange,
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: appUrl },
      { "@type": "ListItem", position: 2, name: "Services", item: `${appUrl}/barbers` },
      { "@type": "ListItem", position: 3, name: srv.name, item: `${appUrl}/services/${srv.slug}` },
    ],
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div className="pt-24 pb-12 px-4 sm:px-6 bg-gradient-to-b from-primary/10 via-background/60 to-background border-b">
        <div className="container mx-auto max-w-6xl">
          <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted-foreground">
            <ol className="flex items-center gap-2">
              <li><Link href="/" className="hover:text-primary transition">Home</Link></li>
              <li>/</li>
              <li><Link href="/barbers" className="hover:text-primary transition">Services</Link></li>
              <li>/</li>
              <li className="text-foreground font-medium">{srv.name}</li>
            </ol>
          </nav>

          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider border border-primary/20">
              <Scissors className="w-3.5 h-3.5" /> Grooming Service Guide
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              Book <span className="text-primary">{srv.name}</span> in India
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
              {srv.description} Compare certified stylists, verify real-time slots, and book with zero wait times.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2 text-sm">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary border text-foreground">
                <Clock className="w-4 h-4 text-primary" /> Duration: <strong>{srv.duration}</strong>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary border text-foreground">
                Typical Price: <strong>{srv.priceRange}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-12 space-y-16">
        {/* Cities Offering Service */}
        {cityStats.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-bold">Browse {srv.name} by City</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {cityStats.map((c) => (
                <Link
                  key={c.citySlug}
                  href={`/services/${srv.slug}/${c.citySlug}`}
                  className="p-3 rounded-2xl bg-card border border-border/80 hover:border-primary/50 text-center transition flex flex-col items-center justify-center gap-1 group"
                >
                  <span className="font-semibold text-xs text-foreground group-hover:text-primary">
                    {c.cityName}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{c.count} lounges</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Featured Lounges Offering This Service */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Top Lounges Offering {srv.name}</h2>
            <Link href="/barbers" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
              View all directory <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {barbers.length === 0 ? (
            <div className="text-center py-16 border border-dashed rounded-3xl p-8 space-y-2">
              <p className="text-sm text-muted-foreground">
                No salons are currently listed for this specific service name.
              </p>
              <Link href="/barbers" className="text-xs text-primary underline font-medium">
                Browse all verified salons &rarr;
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

        {/* Other Grooming Services */}
        <section className="space-y-6 pt-6 border-t">
          <h2 className="text-2xl font-bold">Other Popular Grooming Services</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {POPULAR_SERVICES.filter((s) => s.slug !== srv.slug).map((s) => (
              <Link
                key={s.slug}
                href={`/services/${s.slug}`}
                className="p-3.5 rounded-2xl bg-card border border-border/60 hover:border-primary/50 text-center transition flex flex-col items-center justify-center gap-1 group"
              >
                <Scissors className="w-4 h-4 text-primary group-hover:scale-110 transition" />
                <span className="font-semibold text-xs text-foreground group-hover:text-primary">
                  {s.name}
                </span>
                <span className="text-[11px] text-muted-foreground">{s.priceRange}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

