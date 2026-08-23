import { Card, CardContent } from "@/components/ui/card";
import { CalendarCheck, ShieldCheck, Scissors } from "lucide-react";

const cards = [
  { icon: CalendarCheck, title: "Clear customer workflow", text: "Customers can see whether a booking is pending, confirmed, declined, cancelled, completed or expired instead of receiving misleading instant-confirmation messaging." },
  { icon: Scissors, title: "Barber-controlled operations", text: "Barbers control their own shop profile, services and booking decisions without gaining access to another barber's data." },
  { icon: ShieldCheck, title: "Admin verification", text: "Administrators can explicitly approve or reject barber profiles and manage user roles through guarded actions with session invalidation." },
];

export default function Testimonials() {
  return <section className="py-20 bg-background"><div className="container mx-auto px-4 sm:px-6 lg:px-8"><div className="text-center max-w-3xl mx-auto mb-14"><div className="inline-block px-4 py-2 bg-accent/10 rounded-full"><span className="font-semibold text-sm">Product Workflow</span></div><h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold">Designed around <span className="text-primary">explicit states and ownership</span></h2></div><div className="grid md:grid-cols-3 gap-8">{cards.map((card) => <Card key={card.title}><CardContent className="p-6 space-y-4"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><card.icon className="w-6 h-6 text-primary" /></div><h3 className="text-xl font-bold">{card.title}</h3><p className="text-muted-foreground leading-relaxed">{card.text}</p></CardContent></Card>)}</div></div></section>;
}
