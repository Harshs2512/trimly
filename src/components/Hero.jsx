import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarCheck, ShieldCheck, Scissors, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Hero() {
  return (
    <section id="home" className="relative min-h-[85vh] flex items-center py-12 md:py-20 overflow-hidden">
      {/* Ambient background glow matching Stitch Luxury styling */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[128px] pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[128px] pointer-events-none -z-10" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column: Copy & CTAs */}
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-secondary/10 border border-secondary/25 rounded-full text-secondary text-xs font-bold uppercase tracking-wider">
              <Star className="w-3.5 h-3.5 fill-secondary text-secondary" />
              Modern Luxury Grooming
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.12]">
              Curated Master Stylists. <br />
              <span className="text-primary bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
                Guaranteed Available Slots.
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed">
              Experience atelier barber lounges with real-time slot booking, zero wait anxiety, and medical-grade sterilization standards.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link href="/barbers" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto rounded-xl text-base px-8 py-6 font-semibold shadow-lg shadow-primary/20 group">
                  Explore Lounges
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-xl text-base px-8 py-6 border-2 font-semibold hover:border-primary/50">
                  Client & Barber Sign In
                </Button>
              </Link>
            </div>

            {/* Reassurance Feature Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-border/60 text-sm">
              <div className="flex items-center gap-2.5 text-foreground/90 font-medium">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <CalendarCheck className="w-4 h-4 text-primary" />
                </div>
                <span>Real-time Slots</span>
              </div>
              <div className="flex items-center gap-2.5 text-foreground/90 font-medium">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Scissors className="w-4 h-4 text-primary" />
                </div>
                <span>Curated Artisans</span>
              </div>
              <div className="flex items-center gap-2.5 text-foreground/90 font-medium">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                </div>
                <span>Trimly Verified</span>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Visual Card */}
          <div className="relative animate-in fade-in duration-700 mt-6 lg:mt-0">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-border/80 aspect-[4/3] bg-card">
              <Image
                src="/images/hero-salon.jpg"
                alt="Modern luxury barber lounge interior"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />

              {/* Verified Atelier Floating Pill */}
              <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-background/90 backdrop-blur-md border border-white/20 text-xs font-bold text-foreground flex items-center gap-1.5 shadow-md">
                <ShieldCheck className="w-4 h-4 text-primary" />
                Trimly Certified Atelier
              </div>
            </div>

            {/* Floating Live Badge */}
            <div className="absolute -bottom-6 left-4 sm:-left-6 bg-card/95 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-border/80 max-w-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-primary mb-1 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Live Availability Active
              </div>
              <div className="font-semibold text-foreground text-sm">Instant Server-Confirmed Slots</div>
              <div className="text-xs text-muted-foreground mt-0.5">Free reschedule up to 2 hours before</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
