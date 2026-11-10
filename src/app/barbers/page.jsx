import Link from "next/link";
import { Scissors, MapPin } from "lucide-react";
import { getAppUrl } from "@/lib/appUrl";
import { getVerifiedBarbers, getCityDirectoryStats, POPULAR_SERVICES } from "@/lib/barbers";
import BarbersDirectoryClient from "@/components/BarbersDirectoryClient";

export const revalidate = 60;
const PAGE_SIZE = 24; // Bounded pagination matching response.data.pagination contract

export async function generateMetadata({ searchParams }) {
  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams?.page || "1", 10);
  const search = resolvedParams?.search?.trim() || "";
  const appUrl = getAppUrl();

  const title = search
    ? `Barbers & Salons matching "${search}" | Trimly`
    : page > 1
    ? `Verified Barbers & Salons in India (Page ${page}) | Trimly`
    : "Find & Book Verified Barbers and Salons Online in India | Trimly";

  const description =
    "Browse verified artisan barbers and modern grooming lounges across India. Real-time slot availability, transparent INR pricing, and zero wait times.";

  const canonical = page > 1 ? `${appUrl}/barbers?page=${page}` : `${appUrl}/barbers`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      locale: "en_IN",
    },
  };
}

export default async function BarbersPage({ searchParams }) {
  const resolvedParams = await searchParams;
  const page = Math.max(1, parseInt(resolvedParams?.page || "1", 10));
  const search = resolvedParams?.search?.trim() || "";
  const service = resolvedParams?.service?.trim() || "";
  const city = resolvedParams?.city?.trim() || "";
  const lat = resolvedParams?.lat ? parseFloat(resolvedParams.lat) : null;
  const lng = resolvedParams?.lng ? parseFloat(resolvedParams.lng) : null;

  const appUrl = getAppUrl();
  const [{ barbers, pagination }, cityStats] = await Promise.all([
    getVerifiedBarbers({ page, limit: 24, search, service, city, lat, lng }),
    getCityDirectoryStats(),
  ]);

  // Structured Data: ItemList
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: barbers.map((b, index) => ({
      "@type": "ListItem",
      position: (page - 1) * 24 + index + 1,
      name: b.shopName,
      url: `${appUrl}${b.canonicalSlug}`,
    })),
  };

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
    ],
  };

  return (
    <div className="min-h-screen bg-background pb-20 relative overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none -z-10" />

      <div className="relative pt-24 pb-10 px-4 sm:px-6 container mx-auto max-w-7xl">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-muted-foreground">
          <ol className="flex items-center gap-2">
            <li>
              <Link href="/" className="hover:text-primary transition-colors">
                Home
              </Link>
            </li>
            <li>/</li>
            <li className="text-foreground font-medium">Barbers</li>
          </ol>
        </nav>

        {/* Directory Header */}
        <header className="flex flex-col items-center text-center space-y-4 max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider border border-primary/20">
            <Scissors className="w-3.5 h-3.5" /> Verified Barber Directory
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            Book Verified <span className="text-primary">Barbers & Salons</span> in India
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Real-time appointment slots, confirmed stylists, and zero wait anxiety. Pay at venue or online in INR.
          </p>

          {/* Quick city links */}
          {cityStats.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs">
              <span className="text-muted-foreground font-medium">Popular Cities:</span>
              {cityStats.slice(0, 6).map((c) => (
                <Link
                  key={c.citySlug}
                  href={`/barbers/city/${c.citySlug}`}
                  className="px-2.5 py-1 rounded-full bg-secondary/80 hover:bg-primary/20 hover:text-primary transition-colors text-foreground font-medium"
                >
                  {c.cityName} ({c.count})
                </Link>
              ))}
            </div>
          )}
        </header>

        {/* Interactive Directory List */}
        <BarbersDirectoryClient
          initialBarbers={barbers}
          pagination={pagination}
          selectedCity={city}
          selectedService={service}
        />

        {/* Popular Services Quick Hub */}
        <section className="mt-20 pt-12 border-t border-border/60">
          <h2 className="text-2xl font-bold text-center mb-6">Explore Grooming Services</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {POPULAR_SERVICES.map((srv) => (
              <Link
                key={srv.slug}
                href={`/services/${srv.slug}`}
                className="p-3.5 rounded-2xl bg-card border border-border/60 hover:border-primary/50 text-center transition-all group flex flex-col items-center justify-center gap-1.5"
              >
                <span className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                  {srv.name}
                </span>
                <span className="text-[11px] text-muted-foreground">{srv.priceRange}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
