import { notFound } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  Clock,
  ArrowLeft,
  Scissors,
  ShieldCheck,
  Users,
  Armchair,
  Star,
  Camera,
  Calendar,
} from "lucide-react";
import { getAppUrl } from "@/lib/appUrl";
import { getBarberById, getBarberReviewsSummary } from "@/lib/barbers";
import BarberDetailClientInteractive from "@/components/BarberDetailClientInteractive";

export const revalidate = 60;

function checkIsOpenNow(barber) {
  if (!barber?.workingHours?.open || !barber?.workingHours?.close) return true;
  try {
    const tz = barber.timezone || "Asia/Kolkata";
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "long",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const day = parts.find((p) => p.type === "weekday")?.value?.toLowerCase();
    const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
    const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);

    const closedDays = (barber.closedDays || []).map((d) => d.toLowerCase());
    if (day && closedDays.includes(day)) return false;

    const [openH, openM] = barber.workingHours.open.split(":").map(Number);
    const [closeH, closeM] = barber.workingHours.close.split(":").map(Number);
    const currentMinutes = hour * 60 + minute;
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  } catch {
    return true;
  }
}

function getOpeningHoursSpecifications(barber) {
  if (!barber?.workingHours?.open || !barber?.workingHours?.close) return [];
  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const closed = (barber.closedDays || []).map((d) => d.toLowerCase());

  return daysOfWeek
    .filter((day) => !closed.includes(day.toLowerCase()))
    .map((day) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: `https://schema.org/${day}`,
      opens: barber.workingHours.open,
      closes: barber.workingHours.close,
    }));
}

export async function generateMetadata({ params }) {
  const { city, slug } = await params;
  const barber = await getBarberById(slug);

  if (!barber) {
    return {
      title: "Barber Not Found | Trimly",
      description: "This salon or barber profile is unavailable.",
    };
  }

  const appUrl = getAppUrl();
  const shopName = barber.shopName || "Barber Shop";
  const cityName = barber.city || city || "India";
  const title = `${shopName} in ${cityName}: Book Online | Trimly`.slice(0, 60);

  const rawDesc = barber.description
    ? `${shopName} in ${cityName}. ${barber.description}`
    : `Book verified grooming appointments at ${shopName} in ${cityName}. Check real-time slots, pricing in INR, and reviews on Trimly.`;
  const description = rawDesc.slice(0, 155);

  const canonical = `${appUrl}${barber.canonicalSlug}`;
  const ogImage =
    barber.shopExteriorImage || barber.shopInteriorImage || barber.avatar || `${appUrl}/images/logo.png`;

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
      images: [{ url: ogImage, width: 1200, height: 630, alt: shopName }],
    },
  };
}

export default async function BarberSlugPage({ params }) {
  const { city, slug } = await params;
  const barber = await getBarberById(slug);

  if (!barber) {
    notFound();
  }

  const appUrl = getAppUrl();
  const reviewsSummary = await getBarberReviewsSummary(barber._id);

  const isOpen = checkIsOpenNow(barber);
  const waitTime = Math.max(0, barber.waitingTime || 0);
  const waitText = waitTime === 0 ? "Available now" : `Approximately ${waitTime} minutes`;
  const closedDays = barber.closedDays || [];
  const hasPhotos = Boolean(barber.shopExteriorImage || barber.shopInteriorImage);

  const displayAddress =
    barber.city && barber.address?.toLowerCase().includes(barber.city.toLowerCase())
      ? barber.address
      : [barber.address, barber.city].filter(Boolean).join(", ");

  const minPrice = barber.services?.length
    ? Math.min(...barber.services.map((s) => s.price || 0))
    : 150;
  const maxPrice = barber.services?.length
    ? Math.max(...barber.services.map((s) => s.price || 0))
    : 1500;

  // JSON-LD: BarberShop
  const barberShopSchema = {
    "@context": "https://schema.org",
    "@type": "BarberShop",
    name: barber.shopName,
    url: `${appUrl}${barber.canonicalSlug}`,
    image: barber.shopExteriorImage || barber.shopInteriorImage || barber.avatar,
    description: barber.description || `Barber lounge in ${barber.city || "India"}`,
    priceRange: `₹${minPrice} - ₹${maxPrice}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: barber.address || "",
      addressLocality: barber.city || city || "",
      addressCountry: "IN",
    },
    ...(barber.location?.coordinates && {
      geo: {
        "@type": "GeoCoordinates",
        longitude: barber.location.coordinates[0],
        latitude: barber.location.coordinates[1],
      },
    }),
    openingHoursSpecification: getOpeningHoursSpecifications(barber),
    // ONLY include aggregateRating if real approved reviews exist in the database
    ...(reviewsSummary.count > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: reviewsSummary.rating,
        reviewCount: reviewsSummary.count,
        bestRating: 5,
        worstRating: 1,
      },
      review: reviewsSummary.reviews.slice(0, 5).map((r) => ({
        "@type": "Review",
        author: { "@type": "Person", name: r.author },
        datePublished: r.date,
        reviewRating: {
          "@type": "Rating",
          ratingValue: r.rating,
          bestRating: 5,
          worstRating: 1,
        },
        reviewBody: r.comment,
      })),
    }),
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
      {
        "@type": "ListItem",
        position: 3,
        name: barber.city || "City",
        item: `${appUrl}/barbers/city/${encodeURIComponent((barber.city || "india").toLowerCase())}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: barber.shopName,
        item: `${appUrl}${barber.canonicalSlug}`,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(barberShopSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* Header Banner */}
      <div className="relative pt-24 pb-14 px-4 sm:px-6 bg-gradient-to-b from-primary/10 via-background/60 to-background border-b">
        <div className="container mx-auto max-w-5xl">
          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="mb-6 text-xs text-muted-foreground">
            <ol className="flex items-center gap-2 flex-wrap">
              <li>
                <Link href="/" className="hover:text-primary transition-colors">
                  Home
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link href="/barbers" className="hover:text-primary transition-colors">
                  Barbers
                </Link>
              </li>
              {barber.city && (
                <>
                  <li>/</li>
                  <li>
                    <Link
                      href={`/barbers/city/${encodeURIComponent(barber.city.toLowerCase())}`}
                      className="hover:text-primary transition-colors"
                    >
                      {barber.city}
                    </Link>
                  </li>
                </>
              )}
              <li>/</li>
              <li className="text-foreground font-medium truncate max-w-[200px]">{barber.shopName}</li>
            </ol>
          </nav>

          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
            <div className="flex items-start md:items-end gap-5">
              <div className="w-20 h-20 md:w-28 md:h-28 rounded-3xl overflow-hidden bg-gradient-to-br from-primary/20 via-zinc-900 to-zinc-950 border-4 border-background shadow-xl flex items-center justify-center text-white font-bold text-3xl uppercase shrink-0">
                {barber.avatar ? (
                  <img src={barber.avatar} alt={barber.shopName} className="w-full h-full object-cover" />
                ) : (
                  barber.shopName?.substring(0, 2) || "TR"
                )}
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">
                    {barber.shopName}
                  </h1>
                  <ShieldCheck className="w-6 h-6 text-green-600 shrink-0" aria-label="Verified shop" />

                  {/* Status Badge */}
                  {isOpen ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Open Now
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      Closed
                    </span>
                  )}

                  {/* Rating Badge */}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/10 text-yellow-600 border border-yellow-500/20">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    {reviewsSummary.count > 0 ? (
                      <span>
                        {reviewsSummary.rating.toFixed(1)}{" "}
                        <span className="font-normal text-muted-foreground">
                          ({reviewsSummary.count} {reviewsSummary.count === 1 ? "review" : "reviews"})
                        </span>
                      </span>
                    ) : (
                      <span>Verified Lounge</span>
                    )}
                  </span>
                </div>

                <p className="flex items-center gap-1.5 text-muted-foreground text-sm">
                  <MapPin className="w-4 h-4 shrink-0 text-muted-foreground/80" />
                  {displayAddress}
                </p>

                {/* Team & Capacity Badges */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-secondary/80 text-foreground border">
                    <Users className="w-3.5 h-3.5 text-primary" /> {barber.staffCount ?? 1} Barbers
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-secondary/80 text-foreground border">
                    <Armchair className="w-3.5 h-3.5 text-primary" /> {barber.chairsCount ?? 1} Styling Chairs
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 sm:px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Column: Operating info, photos, schedule */}
        <aside className="space-y-8">
          {/* Shop Photos */}
          {hasPhotos && (
            <div className="space-y-3">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Camera className="w-4 h-4 text-primary" /> Shop Photos
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {barber.shopExteriorImage && (
                  <div className="h-28 rounded-2xl overflow-hidden border bg-zinc-950">
                    <img
                      src={barber.shopExteriorImage}
                      alt={`${barber.shopName} exterior`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                {barber.shopInteriorImage && (
                  <div className="h-28 rounded-2xl overflow-hidden border bg-zinc-950">
                    <img
                      src={barber.shopInteriorImage}
                      alt={`${barber.shopName} interior`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Availability */}
          <div className="bg-card/70 backdrop-blur border rounded-3xl p-6 shadow-sm">
            <h3 className="font-bold text-lg mb-4">Current Availability</h3>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4" /> Estimated wait
              </span>
              <span className="font-semibold">{waitText}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
              Live estimate based on active appointments; instant confirmation for booked slots.
            </p>
          </div>

          {/* Specialties */}
          {!!barber.specialties?.length && (
            <div className="space-y-3">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Scissors className="w-4 h-4 text-primary" /> Signature Specialties
              </h3>
              <div className="flex flex-wrap gap-2">
                {barber.specialties.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {barber.description && (
            <div className="space-y-2">
              <h3 className="font-bold text-lg">About the Lounge</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{barber.description}</p>
            </div>
          )}

          {/* Schedule */}
          <div className="space-y-3">
            <h3 className="font-bold text-lg">Operating Schedule</h3>
            <div className="space-y-2.5 text-sm bg-card/40 p-4 rounded-2xl border">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-muted-foreground">Current Status</span>
                {isOpen ? (
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Open Now</span>
                ) : (
                  <span className="font-semibold text-rose-600 dark:text-rose-400">Closed</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Opening time</span>
                <span className="font-medium">{barber.workingHours?.open || "09:00"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Closing time</span>
                <span className="font-medium">{barber.workingHours?.close || "20:00"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Closed days</span>
                <span className="font-medium capitalize text-right">
                  {closedDays.length ? closedDays.join(", ") : "Open all days"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Timezone</span>
                <span className="font-medium">{barber.timezone || "Asia/Kolkata"}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Column: Interactive client area (Services, booking modal, reviews) */}
        <div className="lg:col-span-2 space-y-8">
          <BarberDetailClientInteractive barber={barber} />
        </div>
      </div>
    </div>
  );
}

