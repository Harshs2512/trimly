import Link from "next/link";
import {
  Store,
  CalendarCheck,
  TrendingUp,
  ShieldCheck,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  ArrowRight,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SalonOwnerInlineLead } from "@/components/leads/InlineLeadCapture";

export const metadata = {
  title: "Free Salon Management Software & System in India",
  description:
    "Manage salon appointments, chair schedules and daily operations with Trimlly. Free salon management software designed for Indian salon owners.",
  alternates: {
    canonical: "/for-barbers",
  },
  openGraph: {
    title: "Free Salon Management System in India | Trimlly",
    description:
      "Manage salon appointments, chair schedules and daily operations with Trimlly. Free salon management software designed for Indian salon owners.",
    url: "/for-barbers",
    siteName: "Trimlly",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Trimlly - Free Salon Management System in India",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Salon Management System in India | Trimlly",
    description:
      "Manage salon appointments, chair schedules and daily operations with Trimlly. Free salon management software designed for Indian salon owners.",
    images: ["/og-image.jpg"],
  },
};

const B2B_FAQS = [
  {
    question: "How much does it cost to list my salon on Trimlly?",
    answer:
      "Listing your salon profile on Trimlly is free to start with zero upfront setup costs and no mandatory monthly software subscription. Salon owners can create their listing, set their chair hours, and begin accepting appointments directly.",
  },
  {
    question: "Do I need special computers or barcode scanners to use Trimlly?",
    answer:
      "No. Trimlly works seamlessly on any Android smartphone, iPhone, tablet, or laptop. You and your stylists can accept appointments, block time off, and mark services completed directly from your personal phones.",
  },
  {
    question: "How do customers pay for their appointments?",
    answer:
      "Customers pay directly at your salon using your existing UPI QR code (Google Pay, PhonePe, Paytm), credit/debit card machine, or cash in INR. You maintain 100% control of your customer cash flow.",
  },
  {
    question: "How do appointment reminders work?",
    answer:
      "When a customer books a slot, Trimlly sends an instant confirmation via email and notifications to keep both stylist and client aligned, helping minimize missed appointments and scheduling conflicts.",
  },
  {
    question: "What documents are required for salon verification?",
    answer:
      "To protect customers and maintain high trust, we ask for basic salon details (shop photos, address, operating hours, and a valid business or government ID). Our team verifies profiles within 24 to 48 hours.",
  },
];

export default function ForBarbersPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: B2B_FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Trimlly Salon Management & Booking System",
    operatingSystem: "Web, Android, iOS",
    applicationCategory: "BusinessApplication",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
    },
    description:
      "Free salon management and appointment booking software for Indian barbershops and salons. Real-time chair calendar, customer discovery, and automated appointment reminders.",
  };

  return (
    <div className="bg-background min-h-screen py-12 md:py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl space-y-24">
        {/* Hero Section */}
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-primary/10 border border-primary/25 rounded-full text-primary text-xs font-bold uppercase tracking-wider">
            <Store className="w-3.5 h-3.5 text-primary" />
            Free Salon Management System in India
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.12]">
            Free Salon Management Software for Indian Salons
          </h1>

          <p className="text-xl sm:text-2xl font-bold text-primary">
            Smart Salon Management. Zero Monthly Software Fees.
          </p>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            The free salon management and appointment booking system built for Indian barbers and salon owners. Manage your live chair calendar, fill off-peak slots, and eliminate no-shows right from your smartphone.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <Link href="/login?role=barber">
              <Button size="lg" className="w-full sm:w-auto rounded-xl px-8 py-6 font-semibold shadow-lg shadow-primary/20 gap-2">
                List Your Salon Free <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/barbers">
              <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-xl px-8 py-6 border-2 font-semibold">
                View Partner Directory
              </Button>
            </Link>
          </div>

          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> ₹0 Monthly Subscription
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Quick Phone Setup
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 100% Direct UPI Payments
            </span>
          </div>
        </div>

        {/* Feature Comparison Table */}
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-extrabold tracking-tight">
              Why Indian Salons Choose <span className="text-primary">Trimlly</span>
            </h2>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto">
              Compare Trimlly against traditional salon management software and booking tools.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-sm">
            <table className="w-full text-left text-sm table-fixed min-w-[620px]">
              <thead className="bg-muted/50 border-b border-border/60 text-xs uppercase font-bold text-muted-foreground">
                <tr>
                  <th className="p-4 sm:p-5 w-[30%]">Feature</th>
                  <th className="p-4 sm:p-5 w-[35%] text-muted-foreground">Traditional Salon Software</th>
                  <th className="p-4 sm:p-5 w-[35%] text-primary font-extrabold bg-primary/[0.04]">
                    Trimlly Partner Platform
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                <tr>
                  <td className="p-4 sm:p-5 font-semibold text-foreground align-middle">Monthly Fee</td>
                  <td className="p-4 sm:p-5 text-muted-foreground align-middle">
                    <span className="inline-flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-destructive shrink-0" />
                      <span>Monthly subscription fees</span>
                    </span>
                  </td>
                  <td className="p-4 sm:p-5 font-bold text-emerald-600 dark:text-emerald-400 bg-primary/[0.04] align-middle">
                    <span className="inline-flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>₹0 (Free to List)</span>
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-semibold text-foreground align-middle">Local Client Discovery</td>
                  <td className="p-4 sm:p-5 text-muted-foreground align-middle">
                    <span className="inline-flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-destructive shrink-0" />
                      <span>No (You bring all traffic)</span>
                    </span>
                  </td>
                  <td className="p-4 sm:p-5 font-bold text-primary bg-primary/[0.04] align-middle">
                    <span className="inline-flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      <span>Yes (Local city directory search)</span>
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-semibold text-foreground align-middle">Hardware Requirement</td>
                  <td className="p-4 sm:p-5 text-muted-foreground align-middle">
                    <span className="inline-flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-destructive shrink-0" />
                      <span>Desktop PC, thermal printer</span>
                    </span>
                  </td>
                  <td className="p-4 sm:p-5 font-bold text-primary bg-primary/[0.04] align-middle">
                    <span className="inline-flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      <span>Any Android or iPhone</span>
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-semibold text-foreground align-middle">Payment Collection</td>
                  <td className="p-4 sm:p-5 text-muted-foreground align-middle">
                    <span className="inline-flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-destructive shrink-0" />
                      <span>Complex gateway integrations</span>
                    </span>
                  </td>
                  <td className="p-4 sm:p-5 font-bold text-primary bg-primary/[0.04] align-middle">
                    <span className="inline-flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      <span>Direct UPI & Cash at Salon</span>
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-semibold text-foreground align-middle">SMS Reminders</td>
                  <td className="p-4 sm:p-5 text-muted-foreground align-middle">
                    <span className="inline-flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-destructive shrink-0" />
                      <span>Extra fee per SMS pack</span>
                    </span>
                  </td>
                  <td className="p-4 sm:p-5 font-bold text-primary bg-primary/[0.04] align-middle">
                    <span className="inline-flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      <span>Automated SMS & Email included</span>
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 4 Pillars of Value */}
        <div className="grid sm:grid-cols-2 gap-6">
          <Card className="p-6 rounded-2xl bg-card border-border/70 hover:border-primary/50 transition-all space-y-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold">Fill Empty Off-Peak Hours</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Quiet Tuesday and Wednesday afternoons eat into salon rent. Trimlly lets nearby customers discover open slots when your chairs are idle, turning slow hours into steady revenue.
            </p>
          </Card>

          <Card className="p-6 rounded-2xl bg-card border-border/70 hover:border-primary/50 transition-all space-y-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold">Eliminate No-Shows & Queues</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Customers hate waiting in crowded reception chairs. Real-time slot locking and automated reminders ensure clients arrive on time, keeping your chair schedule running smoothly.
            </p>
          </Card>

          <Card className="p-6 rounded-2xl bg-card border-border/70 hover:border-primary/50 transition-all space-y-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold">Build Genuine Local Reputation</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Every completed appointment gives your customer the option to leave a verified review. Showcase your master work photos, signature cuts, and real 5-star ratings to attract new clients.
            </p>
          </Card>

          <Card className="p-6 rounded-2xl bg-card border-border/70 hover:border-primary/50 transition-all space-y-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold">Complete Operational Autonomy</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You set your working hours, service durations, buffer times, and closed days. Accept or decline bookings with one tap from your dedicated barber dashboard.
            </p>
          </Card>
        </div>

        {/* How Onboarding Works */}
        <div className="space-y-8 text-center max-w-3xl mx-auto">
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold tracking-tight">How It Works in 3 Simple Steps</h2>
            <p className="text-muted-foreground text-sm">Start receiving customer appointments in less than 24 hours.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 text-left">
            <div className="p-6 rounded-2xl bg-card border border-border/70 space-y-3">
              <span className="w-8 h-8 rounded-full bg-primary/10 text-primary font-extrabold text-sm flex items-center justify-center">
                1
              </span>
              <h4 className="font-bold text-base">Register Your Salon</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Sign up with your phone number, enter your shop name, city, address, and upload your storefront photos.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border/70 space-y-3">
              <span className="w-8 h-8 rounded-full bg-primary/10 text-primary font-extrabold text-sm flex items-center justify-center">
                2
              </span>
              <h4 className="font-bold text-base">Set Rates & Hours</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Add your services (haircut, beard trim, facial, etc.) with your transparent INR rates and typical chair duration.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border/70 space-y-3">
              <span className="w-8 h-8 rounded-full bg-primary/10 text-primary font-extrabold text-sm flex items-center justify-center">
                3
              </span>
              <h4 className="font-bold text-base">Receive Bookings</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Once verified, nearby clients book open slots. Get SMS alerts, greet clients on time, and get paid directly.
              </p>
            </div>
          </div>
        </div>

        {/* Inline Salon Owner Lead Capture Form */}
        <div className="max-w-3xl mx-auto">
          <SalonOwnerInlineLead />
        </div>

        {/* B2B FAQ Accordion */}
        <div className="space-y-8 max-w-3xl mx-auto">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 rounded-full text-xs font-bold text-primary uppercase tracking-wider">
              <HelpCircle className="w-3.5 h-3.5" />
              Barber Partner FAQs
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight">Questions from Salon Owners</h2>
          </div>

          <Accordion type="single" collapsible defaultValue="item-0" className="w-full bg-card rounded-2xl border border-border/70 p-4 sm:p-6 shadow-sm">
            {B2B_FAQS.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-border/60">
                <AccordionTrigger className="text-left font-bold text-base hover:text-primary transition-colors py-4">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pt-1 pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Helpful Resources & Related Internal Links */}
        <section className="space-y-4 pt-6 border-t">
          <h3 className="font-bold text-lg text-foreground">Explore Trimlly Platform Resources</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/barbers"
              className="p-4 rounded-xl bg-card border border-border/70 hover:border-primary/50 transition group space-y-1"
            >
              <p className="font-semibold text-sm text-foreground group-hover:text-primary transition flex items-center justify-between">
                Verified Salons <ArrowRight className="w-3.5 h-3.5" />
              </p>
              <p className="text-xs text-muted-foreground">Browse active partner salons across Indian cities</p>
            </Link>
            <Link
              href="/reviews"
              className="p-4 rounded-xl bg-card border border-border/70 hover:border-primary/50 transition group space-y-1"
            >
              <p className="font-semibold text-sm text-foreground group-hover:text-primary transition flex items-center justify-between">
                Customer Reviews <ArrowRight className="w-3.5 h-3.5" />
              </p>
              <p className="text-xs text-muted-foreground">Real feedback from verified customer bookings</p>
            </Link>
            <Link
              href="/faq"
              className="p-4 rounded-xl bg-card border border-border/70 hover:border-primary/50 transition group space-y-1"
            >
              <p className="font-semibold text-sm text-foreground group-hover:text-primary transition flex items-center justify-between">
                Partner Help Center <ArrowRight className="w-3.5 h-3.5" />
              </p>
              <p className="text-xs text-muted-foreground">Answers to common onboarding and booking questions</p>
            </Link>
            <Link
              href="/contact"
              className="p-4 rounded-xl bg-card border border-border/70 hover:border-primary/50 transition group space-y-1"
            >
              <p className="font-semibold text-sm text-foreground group-hover:text-primary transition flex items-center justify-between">
                Contact Partner Support <ArrowRight className="w-3.5 h-3.5" />
              </p>
              <p className="text-xs text-muted-foreground">Get personalized assistance from our onboarding team</p>
            </Link>
          </div>
        </section>

        {/* Bottom CTA */}
        <div className="p-10 rounded-3xl bg-gradient-to-br from-primary/15 via-card to-secondary/10 border border-primary/30 text-center space-y-6 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto text-primary">
            <Store className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-xl mx-auto">
            <h3 className="text-3xl font-extrabold tracking-tight">Ready to Modernize Your Salon?</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Join verified barber lounges and hair styling salons across Indore, Bhopal, Mumbai, Delhi, Bengaluru and beyond.
            </p>
          </div>
          <Link href="/login?role=barber" className="inline-block">
            <Button size="lg" className="rounded-xl px-10 py-6 text-base font-semibold shadow-lg shadow-primary/20 gap-2">
              Get Started Free <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

