import Link from "next/link";
import { ArrowRight, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CTA() {
  return (
    <section id="contact" className="py-24 bg-gradient-to-br from-primary/10 via-background to-secondary/10 border-t border-border/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-8 bg-card/70 backdrop-blur-md border border-border/80 rounded-3xl p-8 sm:p-14 shadow-xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
            <Scissors className="w-4 h-4 text-primary" />
            <span className="text-primary font-bold text-xs uppercase tracking-wider">Book Your Slot Today</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Step into the modern luxury of <span className="text-primary">Trimly</span>
          </h2>

          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Discover premier grooming ateliers near you, or sign in to manage your appointments and client schedules.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <Link href="/barbers" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto rounded-xl text-base px-8 py-6 font-semibold shadow-lg shadow-primary/20 group">
                Browse Barbers
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-xl text-base px-8 py-6 border-2 font-semibold hover:border-primary/50">
                Sign In / Register
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
