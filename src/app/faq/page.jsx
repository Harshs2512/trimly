import Link from "next/link";
import { HelpCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getAppUrl } from "@/lib/appUrl";

export const metadata = {
  title: "Frequently Asked Questions (FAQ) | Trimlly India",
  description:
    "Find answers to common questions about booking barber appointments, slot availability, cancellation rules, payments in INR, and salon verification on Trimlly.",
  alternates: {
    canonical: `${getAppUrl()}/faq`,
  },
};

const FAQS = [
  {
    category: "Booking & Availability",
    items: [
      {
        q: "How does real-time slot booking work on Trimlly?",
        a: "When you select a barber and service, Trimlly's booking engine checks the barber's working hours, closed days, existing bookings, and buffer times to calculate available slots down to the exact minute. Once you select a slot, it is reserved atomically so double-bookings are strictly impossible.",
      },
      {
        q: "What does the estimated wait time mean?",
        a: "The estimated wait time on each barber profile calculates active appointments currently underway around the present time. If a barber is listed as 'Available now', there is currently zero wait queue.",
      },
      {
        q: "Can I book appointments for the weekend in advance?",
        a: "Yes. You can book slots up to 30 to 90 days in advance depending on the individual lounge's booking horizon. We highly recommend booking weekend appointments at least 24 hours prior to secure your preferred stylist.",
      },
    ],
  },
  {
    category: "Cancellations, Rescheduling & Refunds",
    items: [
      {
        q: "Can I cancel or reschedule my appointment?",
        a: "Yes. You can freely reschedule or cancel any eligible appointment directly from your customer dashboard up to 2 hours before the scheduled service time. Within 2 hours of the appointment, cancellations are locked to respect the barber's reserved time.",
      },
      {
        q: "How does rescheduling work?",
        a: "When you reschedule, our server revalidates the barber's available working hours, closed days, and conflicts in real time before transferring your reservation to the new slot.",
      },
    ],
  },
  {
    category: "Pricing & Payments",
    items: [
      {
        q: "How do I pay for my appointment?",
        a: "You can pay either directly at the venue using cash or UPI (Google Pay, PhonePe, Paytm), or online if the lounge has enabled integrated advance checkout. All prices on Trimlly are in Indian Rupees (INR) with no hidden platform fees.",
      },
      {
        q: "Are the prices listed on Trimlly guaranteed?",
        a: "Yes. The service price shown when you book is snapshotted into your booking confirmation record. Barbers cannot change the price of an already confirmed booking.",
      },
    ],
  },
  {
    category: "Barber Verification & Quality",
    items: [
      {
        q: "How do barbers and salons get verified on Trimlly?",
        a: "New barbers register with their business details, address, and government identification. Our team manually reviews and verifies their physical salon premises, stylist credentials, and hygiene standards before the shop is approved for public booking.",
      },
      {
        q: "Are customer reviews on Trimlly genuine?",
        a: "Strictly yes. Only customers with completed, confirmed bookings on Trimlly can submit a star rating and written review. We enforce a zero-tolerance policy against fake, incentivized, or unverified reviews in compliance with Indian consumer protection laws.",
      },
      {
        q: "Which cities are currently supported?",
        a: "Trimlly is currently active in Indore, Bhopal, Mumbai, Delhi-NCR, Bengaluru, and Pune, with ongoing expansion into Jaipur, Ahmedabad, Chandigarh, and Hyderabad.",
      },
    ],
  },
];

export default function FAQPage() {
  const appUrl = getAppUrl();
  const allQuestions = FAQS.flatMap((cat) => cat.items);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: allQuestions.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: appUrl },
      { "@type": "ListItem", position: 2, name: "FAQ", item: `${appUrl}/faq` },
    ],
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      {/* Hero */}
      <div className="pt-24 pb-14 px-4 sm:px-6 bg-gradient-to-b from-primary/10 via-background/60 to-background border-b">
        <div className="container mx-auto max-w-4xl text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider border border-primary/20">
            <HelpCircle className="w-3.5 h-3.5" /> Help & Knowledge Base
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            Frequently Asked <span className="text-primary">Questions</span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Everything you need to know about booking, slot confirmation, reschedule policies, and salon verification on Trimlly.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 sm:px-6 py-16 space-y-12">
        {FAQS.map((category) => (
          <section key={category.category} className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground border-b pb-2">
              {category.category}
            </h2>
            <Accordion type="single" collapsible className="w-full">
              {category.items.map((item, idx) => (
                <AccordionItem key={idx} value={`${category.category}-${idx}`}>
                  <AccordionTrigger className="text-left font-semibold text-sm sm:text-base">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ))}

        {/* Still have questions? */}
        <div className="p-8 rounded-3xl bg-card border border-border/80 text-center space-y-4 mt-12">
          <h3 className="text-xl font-bold">Have a question that wasn&apos;t answered here?</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Our support team is available Monday through Saturday to assist you with any questions.
          </p>
          <Link href="/contact" className="inline-block pt-2">
            <Button className="rounded-xl px-6 font-semibold gap-2">
              Contact Support <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

