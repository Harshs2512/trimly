import { CheckCircle2, Users, Scissors } from "lucide-react";

export default function Advantages() {
  const customerBenefits = [
    "Browse verified artisan barbers, signature cuts & transparent INR menus",
    "Select guaranteed open appointment slots with zero wait time",
    "Live queue tracking and instant booking status confirmations",
    "Free cancellation & reschedule up to 2 hours before your appointment",
    "Multi-factor secured profile with saved style preferences",
  ];

  const barberBenefits = [
    "Accept, manage, and complete appointments from your chair dashboard",
    "Live walk-in queue management with real-time chair status sync",
    "Configure custom service durations, pricing, and buffer minutes",
    "Control shop schedules, closed days, and advance booking horizon",
    "Protected workspace and license verification for authorized stylists",
  ];

  return (
    <section id="benefits" className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-block px-4 py-1.5 bg-secondary/10 border border-secondary/20 rounded-full">
            <span className="text-secondary font-bold text-xs uppercase tracking-wider">Why Trimlly</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Tailored for <span className="text-primary">clients & master barbers</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Elevating everyday appointments into a bespoke, stress-free grooming ritual.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          <Benefit title="For Clients" subtitle="Effortless Booking & Luxury Care" icon={Users} items={customerBenefits} />
          <Benefit title="For Barbers & Lounges" subtitle="Autonomous Schedule & Business Control" icon={Scissors} items={barberBenefits} />
        </div>
      </div>
    </section>
  );
}

function Benefit({ title, subtitle, icon: Icon, items }) {
  return (
    <div className="bg-card/60 backdrop-blur-sm border border-border/80 rounded-3xl p-8 sm:p-10 space-y-6 hover:border-primary/40 transition-colors shadow-sm">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center shrink-0">
          <Icon className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h3 className="text-2xl font-bold tracking-tight">{title}</h3>
          <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mt-0.5">{subtitle}</p>
        </div>
      </div>
      <ul className="space-y-4 pt-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3 text-sm text-foreground/90">
            <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <span className="leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
