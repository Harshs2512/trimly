"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarCheck, ShieldCheck, Scissors, MapPin, Search, Store } from "lucide-react";
import { Button } from "@/components/ui/button";

const POPULAR_CITIES = [
  { slug: "indore", name: "Indore" },
  { slug: "bhopal", name: "Bhopal" },
  { slug: "mumbai", name: "Mumbai" },
  { slug: "delhi", name: "Delhi-NCR" },
  { slug: "bengaluru", name: "Bengaluru" },
  { slug: "pune", name: "Pune" },
];

const POPULAR_SERVICES = [
  { slug: "haircut", name: "Haircut" },
  { slug: "beard-trim", name: "Beard Trim" },
  { slug: "hair-color", name: "Hair Color" },
  { slug: "facial", name: "Facial & Cleanup" },
  { slug: "head-massage", name: "Head Massage" },
];

export default function Hero() {
  const router = useRouter();
  const [selectedCity, setSelectedCity] = useState("indore");
  const [selectedService, setSelectedService] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    if (selectedService && selectedCity) {
      router.push(`/services/${selectedService}/${selectedCity}`);
    } else if (selectedCity) {
      router.push(`/barbers/city/${selectedCity}`);
    } else if (selectedService) {
      router.push(`/services/${selectedService}`);
    } else {
      router.push("/barbers");
    }
  };

  return (
    <section id="home" className="relative min-h-[85vh] flex items-center py-12 md:py-20 overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[128px] pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[128px] pointer-events-none -z-10" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column: Copy, Search & CTAs */}
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-primary/10 border border-primary/25 rounded-full text-primary text-xs font-bold uppercase tracking-wider">
              <Scissors className="w-3.5 h-3.5 text-primary" />
              India&apos;s Smart Salon Booking Platform
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.12]">
              Book Barber & Salon <br />
              <span className="text-primary bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
                Appointments Online
              </span>{" "}
              in India
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed">
              Find top-rated local barbers and hair salons across Indian cities. Browse verified profiles, check real-time slots, and book in INR with zero wait time.
            </p>

            {/* Quick Search Bar */}
            <form
              onSubmit={handleSearch}
              className="p-3 bg-card/90 backdrop-blur-md rounded-2xl border border-border/80 shadow-lg flex flex-col sm:flex-row gap-2.5 max-w-xl"
            >
              <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-background rounded-xl border border-border/60">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full bg-transparent text-sm font-medium text-foreground focus:outline-none cursor-pointer"
                  aria-label="Select City"
                >
                  <option value="">All Indian Cities</option>
                  {POPULAR_CITIES.map((c) => (
                    <option key={c.slug} value={c.slug} className="text-foreground bg-background">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-background rounded-xl border border-border/60">
                <Scissors className="w-4 h-4 text-muted-foreground shrink-0" />
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="w-full bg-transparent text-sm font-medium text-foreground focus:outline-none cursor-pointer"
                  aria-label="Select Service"
                >
                  <option value="">All Services</option>
                  {POPULAR_SERVICES.map((s) => (
                    <option key={s.slug} value={s.slug} className="text-foreground bg-background">
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <Button type="submit" size="lg" className="rounded-xl px-6 font-semibold shrink-0 gap-2">
                <Search className="w-4 h-4" />
                <span>Find Slots</span>
              </Button>
            </form>

            <div className="flex flex-col sm:flex-row gap-4 pt-1">
              <Link href="/barbers" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto rounded-xl text-base px-8 py-6 font-semibold shadow-lg shadow-primary/20 group">
                  Find a Barber Near Me
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/login?role=barber" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-xl text-base px-8 py-6 border-2 font-semibold hover:border-primary/50 gap-2">
                  <Store className="w-4 h-4 text-primary" />
                  List Your Salon Free
                </Button>
              </Link>
            </div>

            {/* Reassurance Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-border/60 text-sm">
              <div className="flex items-center gap-2.5 text-foreground/90 font-medium">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <CalendarCheck className="w-4 h-4 text-primary" />
                </div>
                <span>Real-Time Slots</span>
              </div>
              <div className="flex items-center gap-2.5 text-foreground/90 font-medium">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                </div>
                <span>100% Verified Barbers</span>
              </div>
              <div className="flex items-center gap-2.5 text-foreground/90 font-medium">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="font-bold text-primary text-xs">₹</span>
                </div>
                <span>Transparent INR Pricing</span>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Visual Card */}
          <div className="relative animate-in fade-in duration-700 mt-6 lg:mt-0">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-border/80 aspect-[4/3] bg-card">
              <Image
                src="/images/hero-salon.webp"
                alt="Modern barber salon interior in India"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />

              {/* Verified Salon Floating Pill */}
              <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-background/90 backdrop-blur-md border border-white/20 text-xs font-bold text-foreground flex items-center gap-1.5 shadow-md">
                <ShieldCheck className="w-4 h-4 text-primary" />
                Trimly Verified Partner
              </div>
            </div>

            {/* Floating Live Availability Badge */}
            <div className="absolute -bottom-6 left-4 sm:-left-6 bg-card/95 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-border/80 max-w-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-primary mb-1 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Live Availability Active
              </div>
              <div className="font-semibold text-foreground text-sm">Instant Server-Confirmed Slots</div>
              <div className="text-xs text-muted-foreground mt-0.5">Pay at salon or online in INR</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
