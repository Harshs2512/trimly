import Link from "next/link";
import { Star, ShieldCheck, MessageSquare, ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function StarRating({ rating }) {
  const rounded = Math.round(Number(rating) || 5);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rounded
              ? "fill-amber-400 text-amber-400"
              : "fill-muted text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

export default function Testimonials({ reviews = [] }) {
  const hasRealReviews = Array.isArray(reviews) && reviews.length >= 3;

  return (
    <section className="py-20 bg-background border-b border-border/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs font-bold text-amber-500 uppercase tracking-wider">
            <Star className="w-3.5 h-3.5 fill-amber-500" />
            Verified Customer Feedback
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Real Experiences from <span className="text-primary">Real Appointments</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Every review on Trimly is submitted by customers after a completed salon appointment. We never publish fake testimonials.
          </p>
        </div>

        {hasRealReviews ? (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviews.slice(0, 6).map((review) => (
                <Card
                  key={review._id}
                  className="bg-card/70 border-border/80 rounded-2xl hover:border-primary/40 transition-all hover:shadow-md"
                >
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <StarRating rating={review.rating} />
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        Verified Visit
                      </div>
                    </div>

                    <p className="text-sm text-foreground/90 leading-relaxed italic line-clamp-4">
                      &ldquo;{review.comment || "Great experience and on-time haircut!"}&rdquo;
                    </p>

                    <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-foreground">{review.userName}</p>
                        <p className="text-muted-foreground">
                          {review.barberName} {review.barberCity ? `• ${review.barberCity}` : ""}
                        </p>
                      </div>
                      <span className="text-muted-foreground">{review.service}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Link href="/reviews">
                <Button variant="outline" size="lg" className="rounded-xl px-8 font-semibold gap-2">
                  View All Customer Reviews
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <div className="max-w-2xl mx-auto p-8 sm:p-10 rounded-3xl bg-card border border-border/80 text-center space-y-6 shadow-sm">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary">
              <MessageSquare className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold tracking-tight">Be the First to Review</h3>
              <p className="text-muted-foreground text-sm max-w-lg mx-auto leading-relaxed">
                Book a haircut, beard trim, or grooming session at your favorite neighborhood salon. After your visit, share your honest feedback to help fellow customers!
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link href="/barbers">
                <Button size="lg" className="w-full sm:w-auto rounded-xl px-6 font-semibold">
                  Find a Salon Near You
                </Button>
              </Link>
              <Link href="/reviews">
                <Button variant="outline" size="lg" className="w-full sm:w-auto rounded-xl px-6 font-semibold">
                  Browse Reviews Page
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
