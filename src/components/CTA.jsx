import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CTA() {
  return <section id="contact" className="py-20 bg-gradient-to-br from-primary/5 via-background to-accent/5"><div className="container mx-auto px-4 sm:px-6 lg:px-8"><div className="max-w-4xl mx-auto text-center space-y-8"><h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">Ready to request your next <span className="text-primary">barber appointment?</span></h2><p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">Browse verified barber profiles or sign in to manage your appointment requests from one dashboard.</p><div className="flex flex-col sm:flex-row gap-4 justify-center"><Link href="/barbers"><Button size="lg" className="group text-base px-8 py-6">Browse Barbers <ArrowRight className="ml-2 w-5 h-5" /></Button></Link><Link href="/login"><Button size="lg" variant="outline" className="text-base px-8 py-6 border-2">Login / Register</Button></Link></div></div></div></section>;
}
