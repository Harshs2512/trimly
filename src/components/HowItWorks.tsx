import { Search, Calendar, Scissors, Star } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      icon: Search,
      step: "01",
      title: "Find & Book",
      description: "Search for nearby salons, check availability, and book your preferred time slot instantly.",
    },
    {
      icon: Calendar,
      step: "02",
      title: "Get Confirmed",
      description: "Receive instant confirmation with appointment details and reminders before your visit.",
    },
    {
      icon: Scissors,
      step: "03",
      title: "Arrive & Get Service",
      description: "Show up at your scheduled time — no waiting in line. Your barber is ready for you.",
    },
    {
      icon: Star,
      step: "04",
      title: "Rate Your Experience",
      description: "Leave a review to help others find great salons and improve the community.",
    },
  ];

  return (
    <section id="about" className="py-20 bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-block px-4 py-2 bg-primary/10 rounded-full">
            <span className="text-primary font-semibold text-sm">How It Works</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
            Get Started in <span className="text-primary">4 Simple Steps</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            From booking to rating — the entire process is seamless and intuitive.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {/* Connecting line for desktop */}
          <div className="hidden lg:block absolute top-20 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-accent to-primary opacity-20" />
          
          {steps.map((item, index) => (
            <div
              key={index}
              className="relative group"
            >
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 h-full">
                {/* Step number */}
                <div className="absolute -top-4 -right-4 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-lg shadow-lg group-hover:scale-110 transition-transform">
                  {item.step}
                </div>
                
                {/* Icon */}
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <item.icon className="w-8 h-8 text-primary" />
                </div>
                
                {/* Content */}
                <h3 className="text-xl font-bold text-foreground">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
