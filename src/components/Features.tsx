import { Calendar, MapPin, Bell, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const Features = () => {
  const features = [
    {
      icon: Calendar,
      title: "Real-time Booking & Queue Tracking",
      description: "Book appointments instantly and see live queue status. No more guessing wait times.",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: MapPin,
      title: "Nearest Salon Finder",
      description: "Find top-rated salons near you with directions, reviews, and availability.",
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      icon: Bell,
      title: "Appointment Reminders",
      description: "Never miss your appointment with smart notifications and reminders.",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: Clock,
      title: "Smart Time-slot Management",
      description: "Barbers can optimize schedules and reduce gaps with intelligent time-slot allocation.",
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
  ];

  return (
    <section id="features" className="py-20 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-block px-4 py-2 bg-primary/10 rounded-full">
            <span className="text-primary font-semibold text-sm">Features</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
            Everything You Need for a{" "}
            <span className="text-primary">Seamless Experience</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Powerful features designed to save time for customers and boost productivity for barbers.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-border bg-card"
            >
              <CardContent className="p-6 space-y-4">
                <div className={`w-14 h-14 ${feature.bgColor} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <feature.icon className={`w-7 h-7 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-bold text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
