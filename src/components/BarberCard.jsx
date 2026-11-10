import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Scissors, ArrowRight, Users, Armchair, Star, Camera } from "lucide-react";

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
    if (day && closedDays.includes(day)) {
      return false;
    }

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

export default function BarberCard({ barber, index = 0 }) {
  const isOpen = checkIsOpenNow(barber);
  const waitTime = Math.max(0, barber.waitingTime || 0);
  const waitLabel = waitTime === 0 ? "Available now" : `~${waitTime} min wait`;
  const waitClass =
    waitTime === 0
      ? "bg-green-500/10 text-green-600 border-green-500/20"
      : waitTime <= 30
      ? "bg-yellow-500/10 text-yellow-700 border-yellow-500/20"
      : "bg-red-500/10 text-red-600 border-red-500/20";
  const seed = barber.shopName ? barber.shopName.charCodeAt(0) % 5 : index % 5;
  const gradients = [
    "from-blue-500/20 to-purple-500/20",
    "from-emerald-500/20 to-teal-500/20",
    "from-orange-500/20 to-red-500/20",
    "from-pink-500/20 to-rose-500/20",
    "from-indigo-500/20 to-cyan-500/20",
  ];

  const heroImage = barber.shopExteriorImage || barber.shopInteriorImage || barber.workPhotos?.[0]?.url;
  const reviewCount = Number(barber.reviewCount || 0);
  const averageRating = Number(barber.averageRating || 0);
  const workPhotoCount = Array.isArray(barber.workPhotos) ? barber.workPhotos.length : 0;

  return (
    <article
      className="group relative bg-card/60 backdrop-blur-xl border border-border/50 hover:border-primary/50 transition-all duration-300 rounded-3xl overflow-hidden flex flex-col shadow-sm hover:shadow-lg animate-in fade-in slide-in-from-bottom-8"
      style={{ animationFillMode: "both", animationDelay: `${Math.min(index, 8) * 80}ms` }}
    >
      {/* Banner / Storefront image */}
      <div className={`h-36 w-full bg-gradient-to-br ${gradients[seed]} relative overflow-hidden`}>
        {heroImage && (
          <img
            src={heroImage}
            alt={barber.shopName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        {/* Rating Badge on top left of banner */}
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full border border-white/20 flex items-center gap-1.5 text-xs font-bold bg-background/90 backdrop-blur text-foreground shadow-sm">
          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
          {reviewCount > 0 ? (
            <span>
              {averageRating.toFixed(1)} <span className="text-[10px] font-normal text-muted-foreground">({reviewCount})</span>
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-primary">New</span>
          )}
        </div>

        {/* Status (Open/Closed) and wait time on top right */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {isOpen ? (
            <span className="px-2.5 py-1 rounded-full border border-emerald-500/30 bg-background/95 backdrop-blur text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Open Now
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full border border-rose-500/30 bg-background/95 backdrop-blur text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Closed
            </span>
          )}

          {isOpen && (
            <div
              className={`px-2.5 py-1 rounded-full border flex items-center gap-1.5 text-xs font-bold bg-background/90 backdrop-blur shadow-sm ${waitClass}`}
            >
              <Clock className="w-3.5 h-3.5" />
              {waitLabel}
            </div>
          )}
        </div>
      </div>

      {/* Avatar & Badges Header */}
      <div className="px-6 relative -mt-8 mb-2 flex items-end justify-between">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border-4 border-background flex items-center justify-center shadow-lg text-white font-bold text-xl uppercase shrink-0">
          {barber.shopName?.substring(0, 2) || "TR"}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background/80 backdrop-blur px-2.5 py-1 rounded-full border">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-primary" />
            {barber.staffCount ?? 1} staff
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Armchair className="w-3.5 h-3.5 text-primary" />
            {barber.chairsCount ?? 1} chairs
          </span>
          {workPhotoCount > 0 && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1 text-primary font-medium">
                <Camera className="w-3.5 h-3.5" />
                {workPhotoCount} photos
              </span>
            </>
          )}
        </div>
      </div>

      <div className="px-6 pb-6 flex-1 flex flex-col">
        <h3 className="font-bold text-xl tracking-tight group-hover:text-primary transition-colors">
          {barber.shopName}
        </h3>

        <div className="flex items-center justify-between text-sm text-muted-foreground mt-1.5 mb-3 gap-2">
          <p className="flex items-center gap-1.5 line-clamp-1 flex-1">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
            {barber.address}
          </p>
          {barber.distanceKm !== undefined && barber.distanceKm !== null && (
            <span className="text-xs font-semibold text-primary shrink-0 bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
              {barber.distanceKm < 1
                ? `${Math.round(barber.distanceKm * 1000)}m away`
                : `${barber.distanceKm} km away`}
            </span>
          )}
        </div>

        {/* Specialties / tags */}
        {!!barber.specialties?.length && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {barber.specialties.slice(0, 2).map((spec) => (
              <span
                key={spec}
                className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-medium flex items-center gap-1 border border-primary/20"
              >
                <Scissors className="w-2.5 h-2.5" />
                {spec}
              </span>
            ))}
            {barber.specialties.length > 2 && (
              <span className="px-1.5 py-0.5 rounded-md bg-secondary/60 text-muted-foreground text-[10px]">
                +{barber.specialties.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Services preview */}
        {!!barber.services?.length && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {barber.services.slice(0, 3).map((service) => (
              <span
                key={service.id || service.name}
                className="px-2 py-0.5 rounded-md bg-secondary/50 text-xs font-medium flex items-center gap-1 text-muted-foreground"
              >
                <Scissors className="w-3 h-3 text-primary/70" />
                {service.name}
              </span>
            ))}
            {barber.services.length > 3 && (
              <span className="px-2 py-0.5 rounded-md bg-secondary/30 text-muted-foreground text-xs">
                +{barber.services.length - 3} more
              </span>
            )}
          </div>
        )}

        <div className="mt-auto pt-4 border-t">
          <Link href={barber.canonicalSlug || `/barbers/${barber._id}`} className="block">
            <Button className="w-full rounded-xl gap-2 font-semibold">
              View & Book <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </article>
  );
}
