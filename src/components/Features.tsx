import { CalendarCheck, ShieldCheck, Bell, Clock3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: CalendarCheck,
    title: "Validated Available Slots",
    description: "Book verified appointment windows based on exact service duration, shop hours, and real-time chair availability.",
  },
  {
    icon: ShieldCheck,
    title: "Verified Master Stylists",
    description: "Every artisan profile and lounge facility is rigorously reviewed and verified before accepting bookings.",
  },
  {
    icon: Bell,
    title: "Live Booking Notifications",
    description: "Receive real-time status updates, reminders, and confirmations directly on web and mobile devices.",
  },
  {
    icon: Clock3,
    title: "Atelier Operating Hours",
    description: "Barbers configure exact operating schedules, closed days, reschedule windows, and custom service buffers.",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 bg-muted/20 border-y border-border/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-block px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
            <span className="text-primary font-bold text-xs uppercase tracking-wider">Atelier Experience</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            A refined standard for <span className="text-primary">grooming appointments</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Trimly replaces queue anxiety with guaranteed time slots, transparent pricing, and master craftsman care.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
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
      </div>
    </section>
  );
}
