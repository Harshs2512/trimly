import Link from "next/link";
import { ArrowRight, MapPin, Scissors } from "lucide-react";
import { POPULAR_SERVICES } from "@/lib/barbers";

const POPULAR_CITIES = [
  { slug: "indore", name: "Indore", state: "Madhya Pradesh", tag: "Hot Spot" },
  { slug: "bhopal", name: "Bhopal", state: "Madhya Pradesh", tag: "Popular" },
  { slug: "mumbai", name: "Mumbai", state: "Maharashtra", tag: "Top Rated" },
  { slug: "delhi", name: "Delhi-NCR", state: "National Capital Region", tag: "High Demand" },
  { slug: "bengaluru", name: "Bengaluru", state: "Karnataka", tag: "Popular" },
  { slug: "pune", name: "Pune", state: "Maharashtra", tag: "Trending" },
  { slug: "hyderabad", name: "Hyderabad", state: "Telangana", tag: "Emerging" },
  { slug: "ahmedabad", name: "Ahmedabad", state: "Gujarat", tag: "Emerging" },
];

export default function PopularGrids() {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
        {/* Cities Grid */}
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 rounded-full text-xs font-bold text-primary uppercase tracking-wider mb-2">
                <MapPin className="w-3.5 h-3.5" />
                Explore By City
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Top Indian Cities for <span className="text-primary">Salon Appointments</span>
              </h2>
            </div>
            <Link
              href="/barbers"
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              View all locations
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {POPULAR_CITIES.map((city) => (
              <Link
                key={city.slug}
                href={`/barbers/city/${city.slug}`}
                className="group p-5 rounded-2xl bg-card border border-border/70 hover:border-primary/50 transition-all hover:shadow-md space-y-2 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <MapPin className="w-4 h-4" />
                  </div>
                  {city.tag && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary/15 text-secondary border border-secondary/25">
                      {city.tag}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                    Barbers in {city.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">{city.state}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Services Grid */}
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-secondary/10 rounded-full text-xs font-bold text-secondary uppercase tracking-wider mb-2">
                <Scissors className="w-3.5 h-3.5" />
                Browse Services
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Popular Men&apos;s & Unisex <span className="text-primary">Grooming Services</span>
              </h2>
            </div>
            <Link
              href="/barbers"
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              Browse all treatments
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {POPULAR_SERVICES.map((srv) => (
              <Link
                key={srv.slug}
                href={`/services/${srv.slug}`}
                className="group p-6 rounded-2xl bg-card border border-border/70 hover:border-primary/50 transition-all hover:shadow-md space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                    <Scissors className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                    {srv.priceRange}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                    {srv.name}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                    {srv.description}
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground border-t border-border/50">
                  <span>Typical duration: {srv.duration}</span>
                  <span className="font-semibold text-primary group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    View barbers <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

