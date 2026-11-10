"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  ShieldCheck,
  Bell,
  Clock3,
  Users,
  Store,
  DollarSign,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const customerFeatures = [
  {
    icon: CalendarCheck,
    title: "Guaranteed Slot Locking",
    description: "Book verified appointment windows based on exact service durations and live chair availability. Zero queue anxiety.",
  },
  {
    icon: ShieldCheck,
    title: "100% Verified Salons",
    description: "Every barber lounge, sanitation standard, and stylist portfolio is thoroughly reviewed before listing on Trimlly.",
  },
  {
    icon: DollarSign,
    title: "Transparent INR Menus",
    description: "Know exact service pricing in INR upfront before you step into the chair. No hidden surge charges.",
  },
  {
    icon: Bell,
    title: "Smart SMS & Email Alerts",
    description: "Receive instant booking confirmations, gentle reminders before your slot, and 1-click reschedule options.",
  },
];

const barberFeatures = [
  {
    icon: Store,
    title: "Zero Setup Cost",
    description: "Create your verified salon profile and showcase your portfolio, operating hours, and service rates for free.",
  },
  {
    icon: TrendingUp,
    title: "Fill Off-Peak Chairs",
    description: "Attract local clients in your neighborhood during quieter weekday hours and maximize your chair utilization.",
  },
  {
    icon: Clock3,
    title: "Autonomous Schedule Control",
    description: "Set your own weekly working hours, customize service buffers, mark holidays, and accept or decline appointments easily.",
  },
  {
    icon: Users,
    title: "Genuine Customer Reviews",
    description: "Build organic digital reputation through reviews verified from real completed appointments in your salon.",
  },
];

export default function Features() {
  const [activeTab, setActiveTab] = useState("customers");

  return (
    <section id="features" className="py-20 bg-muted/20 border-y border-border/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <div className="inline-block px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
            <span className="text-primary font-bold text-xs uppercase tracking-wider">
              Trimlly Experience
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Built for Customers, <span className="text-primary">Powered for Barbers</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Whether you&apos;re booking your regular haircut or managing a busy neighborhood salon, Trimlly simplifies every step.
          </p>

          {/* Tab Switcher */}
          <div className="inline-flex p-1.5 rounded-2xl bg-card border border-border/80 shadow-sm mt-4">
            <button
              type="button"
              onClick={() => setActiveTab("customers")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "customers"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-4 h-4" />
              For Customers
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("barbers")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "barbers"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Store className="w-4 h-4" />
              For Barbers & Salon Owners
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {(activeTab === "customers" ? customerFeatures : barberFeatures).map((feature) => (
            <Card
              key={feature.title}
              className="group hover:shadow-xl hover:border-primary/50 transition-all duration-300 border-border/80 bg-card/60 backdrop-blur-sm rounded-2xl overflow-hidden"
            >
              <CardContent className="p-6 space-y-4">
                <div className="w-14 h-14 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold tracking-tight">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tab CTA */}
        <div className="mt-12 text-center">
          {activeTab === "customers" ? (
            <Link href="/barbers">
              <Button size="lg" className="rounded-xl px-8 font-semibold shadow-md gap-2">
                Browse Barbers & Salons Near You
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          ) : (
            <Link href="/login?role=barber">
              <Button size="lg" className="rounded-xl px-8 font-semibold shadow-md gap-2">
                List Your Salon on Trimlly
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
