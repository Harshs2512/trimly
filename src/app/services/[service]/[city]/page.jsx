import Link from "next/link";
import { notFound } from "next/navigation";
import { Scissors, MapPin, Clock, ArrowRight, ShieldCheck } from "lucide-react";
import { getAppUrl } from "@/lib/appUrl";
import { getVerifiedBarbers, POPULAR_SERVICES } from "@/lib/barbers";
import { resolveCity } from "@/lib/cities";
import BarberCard from "@/components/BarberCard";

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { service: serviceParam, city: cityParam } = await params;
  const srv = POPULAR_SERVICES.find((s) => s.slug === serviceParam);

  if (!srv) {
    return { title: "Service Not Found" };
  }

  const cityInfo = resolveCity(cityParam);
  const { pagination } = await getVerifiedBarbers({
    city: cityInfo.slug,
    service: srv.name.split(" ")[0],
    limit: 1,
  });
  const hasInventory = pagination.total > 0;

  const canonical = `/services/${srv.slug}/${cityInfo.slug}`;
  const title = `Best ${srv.name} in ${cityInfo.name}: Book Online`;
  const description = `Looking for ${srv.name.toLowerCase()} in ${cityInfo.name}? Compare top-rated barbers, check live slot availability and transparent pricing (${srv.priceRange}) on Trimlly.`.slice(0, 155);

  return {
    title,
    description,
    alternates: { canonical },
    robots: hasInventory
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      title: `${title} | Trimlly`,
      description,
      url: canonical,
      type: "website",
      locale: "en_IN",
    },
  };
}

export default async function ServiceCityPage({ params }) {
  const { service: serviceParam, city: cityParam } = await params;
  const srv = POPULAR_SERVICES.find((s) => s.slug === serviceParam);

  if (!srv) {
    notFound();
  }

  const cityInfo = resolveCity(cityParam);
  const cityName = cityInfo.name;
  const appUrl = getAppUrl();
  const { barbers, pagination } = await getVerifiedBarbers({
    city: cityInfo.slug,
    service: srv.name.split(" ")[0],
    limit: 18,
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="pt-24 pb-12 px-4 sm:px-6 bg-gradient-to-b from-primary/10 via-background/60 to-background border-b">
        <div className="container mx-auto max-w-6xl">
          <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted-foreground">
            <ol className="flex items-center gap-2">
              <li><Link href="/" className="hover:text-primary transition">Home</Link></li>
              <li>/</li>
              <li><Link href={`/services/${srv.slug}`} className="hover:text-primary transition">{srv.name}</Link></li>
              <li>/</li>
              <li className="text-foreground font-medium">{cityName}</li>
            </ol>
          </nav>

          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider border border-primary/20">
              <MapPin className="w-3.5 h-3.5" /> {cityName}
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              {srv.name} in <span className="text-primary">{cityName}</span>
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
              Book verified master stylists for {srv.name.toLowerCase()} in {cityName}. Experience zero waiting queues with live confirmed slots.
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
              <span>Typical Duration: <strong className="text-foreground">{srv.duration}</strong></span>
              <span>•</span>
              <span>Price Range: <strong className="text-foreground">{srv.priceRange}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-12 space-y-12">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            Available Lounges in {cityName} ({pagination.total})
          </h2>
          <Link
            href={`/barbers/city/${cityInfo.slug}`}
            className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
          >
            All lounges in {cityName} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {barbers.length === 0 ? (
          <div className="text-center py-16 border border-dashed rounded-3xl p-8 space-y-3">
            <p className="text-sm text-muted-foreground">
              No lounges in {cityName} are currently tagged with &quot;{srv.name}&quot;.
            </p>
            <Link href={`/barbers/city/${cityInfo.slug}`} className="text-xs text-primary underline font-medium">
              Browse all salons in {cityName} &rarr;
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {barbers.map((b, idx) => (
              <BarberCard key={b._id} barber={b} index={idx} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

