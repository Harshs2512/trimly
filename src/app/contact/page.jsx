import Link from "next/link";
import { Mail, Phone, MapPin, MessageSquare, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAppUrl } from "@/lib/appUrl";

export const metadata = {
  title: "Contact Trimlly Support & Partner Help | India",
  description:
    "Get in touch with Trimlly support for appointment assistance, barber onboarding, or partnership inquiries. We respond within 24 hours.",
  alternates: {
    canonical: `${getAppUrl()}/contact`,
  },
};

export default function ContactPage() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "support@trimly.app";
  const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME || "Trimlly";

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero */}
      <div className="pt-24 pb-14 px-4 sm:px-6 bg-gradient-to-b from-primary/10 via-background/60 to-background border-b">
        <div className="container mx-auto max-w-4xl text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider border border-primary/20">
            <MessageSquare className="w-3.5 h-3.5" /> Support & Inquiries
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            We&apos;re Here to <span className="text-primary">Help You</span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Have questions about an upcoming appointment, salon verification, or onboarding your barbershop on {companyName}? Reach out to our team.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 sm:px-6 py-16 space-y-12">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Customer Support Card */}
          <div className="p-8 rounded-3xl bg-card border border-border/80 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Mail className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold">Email Support</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Send us an email for booking inquiries, cancellations, refund queries, or feedback. We reply to all inquiries within 24 business hours.
              </p>
              <div className="pt-2">
                <a
                  href={`mailto:${supportEmail}`}
                  className="text-primary font-semibold text-lg hover:underline block break-all"
                >
                  {supportEmail}
                </a>
                <span className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
                  <Clock className="w-3.5 h-3.5" /> Monday to Saturday: 9:00 AM – 7:00 PM IST
                </span>
              </div>
            </div>

            <a href={`mailto:${supportEmail}?subject=Support%20Request%20-%20Trimlly`}>
              <Button className="w-full rounded-xl font-semibold gap-2">
                Send an Email <ArrowRight className="w-4 h-4" />
              </Button>
            </a>
          </div>

          {/* Barber Onboarding Help Card */}
          <div className="p-8 rounded-3xl bg-card border border-border/80 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <MapPin className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold">Barber & Salon Partnerships</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Looking to list your barbershop, manage live availability, and get more clients? Our partner onboarding team will guide you through profile verification.
              </p>
              <div className="pt-2 space-y-1.5 text-xs text-muted-foreground">
                <p><strong>Operating Across:</strong> Indore, Bhopal, Mumbai, Delhi-NCR, Bengaluru, Pune</p>
                <p><strong>Verification SLA:</strong> Accounts approved within 24–48 hours</p>
              </div>
            </div>

            <Link href="/login">
              <Button variant="outline" className="w-full rounded-xl font-semibold border-primary/30 text-primary hover:bg-primary/10">
                Partner / Barber Registration
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick FAQ Link Banner */}
        <div className="p-6 rounded-2xl bg-secondary/50 border border-border/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <h3 className="font-bold text-foreground">Need quick answers?</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Check our Frequently Asked Questions for instant answers on reschedule rules, slot confirmations, and payments.
            </p>
          </div>
          <Link href="/faq">
            <Button variant="secondary" size="sm" className="rounded-xl shrink-0 font-medium">
              Visit FAQ Page &rarr;
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

