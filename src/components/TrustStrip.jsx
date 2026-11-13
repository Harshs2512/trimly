import { ShieldCheck, MapPin, CalendarCheck, Star, Clock } from "lucide-react";

export default function TrustStrip({ stats }) {
  const showLiveCounters = Boolean(
    stats &&
      typeof stats.verifiedBarbersCount === "number" &&
      stats.verifiedBarbersCount >= 3
  );

  return (
    <section className="border-y border-border/60 bg-muted/30 py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {showLiveCounters ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-primary flex items-center justify-center gap-1">
                <span>{stats.verifiedBarbersCount}</span>
                <span className="text-xl">+</span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wider">
                Verified Barbers
              </p>
              <p className="text-xs text-muted-foreground">Independently vetted salons</p>
            </div>

            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-foreground flex items-center justify-center gap-1">
                <span>{Math.max(stats.citiesCount, 1)}</span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wider">
                Cities Active
              </p>
              <p className="text-xs text-muted-foreground">Growing nationwide across India</p>
            </div>

            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-primary flex items-center justify-center gap-1">
                <span>{stats.completedBookingsCount > 0 ? `${stats.completedBookingsCount}+` : "100%"}</span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wider">
                Completed Bookings
              </p>
              <p className="text-xs text-muted-foreground">Zero-queue appointment fulfillment</p>
            </div>

            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-amber-500 flex items-center justify-center gap-1">
                <Star className="w-6 h-6 fill-amber-500 text-amber-500 inline-block" />
                <span>{stats.averageRating || "4.9"}</span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wider">
                Customer Rating
              </p>
              <p className="text-xs text-muted-foreground">
                {stats.totalReviews > 0 ? `Based on ${stats.totalReviews} verified reviews` : "Verified customer feedback"}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border/50">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">100% Vetted Salons</p>
                <p className="text-xs text-muted-foreground">Every partner profile verified</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border/50">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <CalendarCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Real-Time Chair Slots</p>
                <p className="text-xs text-muted-foreground">Live availability, zero wait</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border/50">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <span className="font-extrabold text-primary text-base">₹</span>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Transparent INR Menus</p>
                <p className="text-xs text-muted-foreground">Upfront pricing, no hidden fees</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border/50">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Top Indian Cities</p>
                <p className="text-xs text-muted-foreground">Indore, Bhopal, Mumbai & more</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

