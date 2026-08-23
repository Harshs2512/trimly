import { CalendarCheck, ShieldCheck, Bell, Clock3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  { icon: CalendarCheck, title: "Validated Available Slots", description: "Customers choose from server-generated times based on service duration, shop hours and existing active bookings." },
  { icon: ShieldCheck, title: "Verified Barber Profiles", description: "New barber profiles can be reviewed by an administrator before they become publicly bookable." },
  { icon: Bell, title: "Booking Notifications", description: "Customers and barbers receive in-app status updates for new requests, confirmations, cancellations and reschedules." },
  { icon: Clock3, title: "Booking Rules", description: "Barbers can configure opening hours, closed days, minimum notice, booking horizon and slot intervals." },
];

export default function Features() {
  return (
    <section id="features" className="py-20 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4"><div className="inline-block px-4 py-2 bg-primary/10 rounded-full"><span className="text-primary font-semibold text-sm">Features</span></div><h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">A clearer way to manage <span className="text-primary">barber appointments</span></h2><p className="text-lg text-muted-foreground">The current Trimlly workflow focuses on dependable appointment requests, availability checks and barber-side control.</p></div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">{features.map((feature) => <Card key={feature.title} className="group hover:shadow-xl transition-all duration-300 border-border bg-card"><CardContent className="p-6 space-y-4"><div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center"><feature.icon className="w-7 h-7 text-primary" /></div><h3 className="text-xl font-bold">{feature.title}</h3><p className="text-muted-foreground leading-relaxed">{feature.description}</p></CardContent></Card>)}</div>
      </div>
    </section>
  );
}
