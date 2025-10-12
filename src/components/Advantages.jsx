import { CheckCircle2, TrendingUp, Users, Zap } from "lucide-react";

const Advantages = () => {
  const customerBenefits = [
    "Save hours every month — no more waiting",
    "Book appointments 24/7 from anywhere",
    "Get instant confirmation and reminders",
    "Choose from verified, top-rated salons",
    "Real-time queue updates on your phone",
  ];

  const barberBenefits = [
    "Reduce no-shows with automated reminders",
    "Optimize your schedule and maximize revenue",
    "Build loyal customer base with ratings",
    "Manage walk-ins and bookings seamlessly",
    "Access analytics to grow your business",
  ];

  return (
    <section id="benefits" className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-block px-4 py-2 bg-accent/10 rounded-full">
            <span className="text-accent-foreground font-semibold text-sm">Why Trimly?</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
            Built for <span className="text-primary">Everyone</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Whether you&apos;re a customer or a salon owner, Trimly transforms your experience.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* For Customers */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">For Customers</h3>
            </div>
            <p className="text-muted-foreground text-lg">
              Time-saving convenience and instant booking at your fingertips.
            </p>
            <ul className="space-y-4">
              {customerBenefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-3 group">
                  <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-foreground/90">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* For Barbers/Owners */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-accent-foreground" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">For Barbers & Owners</h3>
            </div>
            <p className="text-muted-foreground text-lg">
              Increase productivity, retain customers, and grow your business.
            </p>
            <ul className="space-y-4">
              {barberBenefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-3 group">
                  <Zap className="w-6 h-6 text-accent-foreground flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-foreground/90">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Advantages;
