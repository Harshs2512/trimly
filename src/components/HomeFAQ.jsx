"use client";

import Link from "next/link";
import { HelpCircle, ArrowRight } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { HOME_FAQS } from "@/lib/faqData";

export { HOME_FAQS };


export default function HomeFAQ() {
  return (
    <section className="py-20 bg-muted/20 border-b border-border/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 rounded-full text-xs font-bold text-primary uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5" />
            Got Questions?
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Frequently Asked <span className="text-primary">Questions</span>
          </h2>
          <p className="text-muted-foreground text-base max-w-xl mx-auto">
            Everything you need to know about booking hair, beard, and grooming appointments on Trimlly.
          </p>
        </div>

        <Accordion type="single" collapsible defaultValue="item-0" className="w-full bg-card rounded-2xl border border-border/70 p-4 sm:p-6 shadow-sm">
          {HOME_FAQS.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="border-border/60">
              <AccordionTrigger className="text-left font-bold text-base hover:text-primary transition-colors py-4">
                <span>{faq.question}</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed pt-1 pb-4">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-10 text-center">
          <Link href="/faq">
            <Button variant="outline" className="rounded-xl px-6 font-semibold gap-2">
              View More FAQs & Help Center
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
