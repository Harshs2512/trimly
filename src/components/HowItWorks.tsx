import { Search, Calendar, Scissors, Bell } from "lucide-react";

const steps = [
  {
    icon: Search,
    step: "01",
    title: "Browse Curated Lounges",
    description: "Explore verified atelier profiles, master stylist portfolios, services, and live lounge distances.",
  },
  {
    icon: Calendar,
    step: "02",
    title: "Select an Open Slot",
    description: "Trimly guarantees slots based on selected service durations, operating hours, and active appointments.",
  },
  {
    icon: Bell,
    step: "03",
    title: "Instant Confirmation",
    description: "Your request is synchronized with the chair queue with real-time push and email notifications.",
  },
  {
    icon: Scissors,
    step: "04",
    title: "Enjoy Master Service",
    description: "Arrive at your confirmed time with zero waiting, then review your artisan once completed.",
  },
];

export default function HowItWorks() {
  return (
    <section id="about" className="py-20 bg-muted/20 border-t border-border/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-block px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
            <span className="text-primary font-bold text-xs uppercase tracking-wider">How It Works</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Four steps from <span className="text-primary">curation to chair</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            A seamless ritual designed to respect your valuable schedule.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {steps.map((item) => (
            <div
              key={item.step}
              className="relative bg-card/60 backdrop-blur-sm border border-border/80 rounded-3xl p-6 sm:p-7 space-y-4 hover:border-primary/50 transition-all hover:shadow-lg"
            >
              <div className="w-10 h-10 bg-secondary/15 border border-secondary/30 text-secondary rounded-xl flex items-center justify-center font-extrabold text-sm">
                {item.step}
              </div>
              <div className="w-14 h-14 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center">
                <item.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold tracking-tight">{item.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
