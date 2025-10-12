import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const Testimonials = () => {
  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Regular Customer",
      content: "Trimly saved me so much time! I used to wait 45 minutes at the salon every weekend. Now I just book ahead and walk right in. Absolute game changer!",
      rating: 5,
      avatar: "SJ",
    },
    {
      name: "Mike Rodriguez",
      role: "Salon Owner",
      content: "Since using Trimly, our no-show rate dropped by 60% and we've seen a 35% increase in bookings. The analytics help us optimize our schedule perfectly.",
      rating: 5,
      avatar: "MR",
    },
    {
      name: "Emily Chen",
      role: "Busy Professional",
      content: "As someone who travels a lot, finding a good salon in a new city was always a hassle. Trimly makes it super easy with reviews and real-time availability.",
      rating: 5,
      avatar: "EC",
    },
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-block px-4 py-2 bg-accent/10 rounded-full">
            <span className="text-accent-foreground font-semibold text-sm">Testimonials</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
            What Our <span className="text-primary">Users Say</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Join thousands of happy customers and salon owners who trust Trimly.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card
              key={index}
              className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-border bg-card"
            >
              <CardContent className="p-6 space-y-4">
                {/* Rating */}
                <div className="flex gap-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-accent text-accent" />
                  ))}
                </div>

                {/* Content */}
                <p className="text-foreground/90 leading-relaxed italic">
                  "{testimonial.content}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 pt-4 border-t border-border">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
