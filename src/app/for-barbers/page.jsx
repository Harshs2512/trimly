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
  title: "List Your Salon Free on Trimlly | India Barber Booking Platform",
  description:
    "Grow your salon business with Trimlly. Zero monthly subscription fees, live chair calendar, local customer discovery, and automated SMS appointment reminders.",
  alternates: {
    canonical: "/for-barbers",
  },
  openGraph: {
    title: "List Your Salon Free on Trimlly | India Barber Booking Platform",
    description:
      "Grow your salon business with Trimlly. Zero monthly fees, real-time slot calendar, and verified customer bookings in INR.",
    url: "/for-barbers",
    siteName: "Trimlly",
    locale: "en_IN",
    type: "website",
  },
};

const B2B_FAQS = [
  {
    question: "How much does it cost to list my salon on Trimlly?",
    answer:
      "Listing your salon profile on Trimlly is 100% free with zero monthly subscription fees and zero setup costs. Unlike expensive foreign software that charges ₹2,000 to ₹5,000 every month, Trimlly only grows when your chairs are full.",
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
      "When a customer books a slot, Trimlly automatically sends an instant confirmation via SMS and email. A gentle reminder is sent prior to the appointment, reducing no-shows by up to 85%.",
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

  return (
    <div className="bg-background min-h-screen py-12 md:py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl space-y-24">
        {/* Hero Section */}
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-primary/10 border border-primary/25 rounded-full text-primary text-xs font-bold uppercase tracking-wider">
            <Store className="w-3.5 h-3.5 text-primary" />
            For Barber Shops & Salon Owners
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.12]">
            Fill Every Chair. <br />
            <span className="text-primary bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
              Zero Monthly Software Fees.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
            Stop paying ₹3,000/month for clunky POS software. Trimlly connects your barbershop or unisex salon with nearby clients, eliminates no-shows, and manages your appointment calendar right from your phone.
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
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 5-Minute Phone Setup
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
                      <span>₹1,500 – ₹5,000 / month</span>
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

