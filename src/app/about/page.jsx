import Link from "next/link";
import { Scissors, ShieldCheck, Clock, Users, Award, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAppUrl } from "@/lib/appUrl";

export const metadata = {
  title: "About Us: Revolutionizing Barber & Salon Appointments | Trimlly",
  description:
    "Learn about Trimlly's mission to eliminate waiting queues in Indian barbershops and salons through verified master stylists and real-time appointment booking.",
  alternates: {
    canonical: `${getAppUrl()}/about`,
  },
};

export default function AboutPage() {
  const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME || "Trimlly";

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero */}
      <div className="pt-24 pb-16 px-4 sm:px-6 bg-gradient-to-b from-primary/10 via-background/60 to-background border-b">
        <div className="container mx-auto max-w-4xl text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider border border-primary/20">
            <Scissors className="w-3.5 h-3.5" /> Our Story & Mission
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
            Transforming Indian Grooming with <span className="text-primary">Zero Waiting Anxiety</span>
          </h1>
          <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
            {companyName} connects discerning customers with verified, artisan barbershops and luxury grooming lounges across India.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 sm:px-6 py-16 space-y-16">
        {/* The Problem We Solve */}
        <section className="space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold">The Problem with Traditional Salon Visits</h2>
          <p className="text-muted-foreground text-base leading-relaxed">
            In Indian cities, visiting a popular barbershop on a Saturday or Sunday morning often means enduring 45 to 90 minutes in an overcrowded waiting area. Appointments booked informally over phone or WhatsApp frequently overlap, leading to hurried services, stress for barbers, and frustration for customers.
          </p>
          <p className="text-muted-foreground text-base leading-relaxed">
            We built {companyName} to provide true certainty: an atomic server-confirmed reservation engine where both client and stylist are aligned on exact service durations, verified transparent INR pricing, and dedicated chair time.
          </p>
        </section>

        {/* Core Pillars */}
        <section className="grid sm:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-card border border-border/80 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg">Guaranteed Time Slots</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Real-time availability accounts for shop opening hours, closed days, and service durations down to the minute.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-card border border-border/80 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg">Rigorous Verification</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Every salon on Trimlly is manually vetted for physical premises, hygiene protocols, and stylist authenticity.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-card border border-border/80 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg">Fair Indian Economics</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pay at venue or digitally in INR. Free reschedule and cancellation up to 2 hours before scheduled appointments.
            </p>
          </div>
        </section>

        {/* Call to action */}
        <section className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-primary/15 via-card to-card border border-primary/30 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <h3 className="text-2xl font-bold">Ready to experience zero-wait grooming?</h3>
            <p className="text-sm text-muted-foreground">Browse verified barbershops near you and reserve your chair in seconds.</p>
          </div>
          <Link href="/barbers">
            <Button size="lg" className="rounded-xl px-8 font-semibold shadow-lg">
              Explore Barbers &rarr;
            </Button>
          </Link>
        </section>
      </div>
    </div>
  );
}

