"use client";

import { useState } from "react";
import axios from "axios";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Star, Scissors, Store, Sparkles } from "lucide-react";

const RATING_LABELS = {
  1: "Disappointing",
  2: "Could be better",
  3: "Good experience",
  4: "Great service",
  5: "Outstanding!",
};

export default function ReviewModal({ booking, onClose, onSuccess }) {
  const { toast } = useToast();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activeStars = hoverRating || rating;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!rating || rating < 1 || rating > 5) {
      setError("Please select a rating between 1 and 5 stars.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axios.post("/api/reviews", {
        barberId: booking.barberProfileId || booking.barberId,
        bookingId: booking._id,
        rating,
        comment: comment.trim(),
      });

      toast({
        title: "Review Submitted!",
        description: "Thank you for sharing your feedback with the community.",
      });

      if (onSuccess) onSuccess(response.data);
      onClose();
    } catch (err) {
      const msg = typeof err.response?.data?.error === "string"
        ? err.response.data.error
        : err.response?.data?.error?.formErrors?.[0] || "Failed to submit review. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" /> Rate Your Experience
          </DialogTitle>
          <DialogDescription>
            Share your feedback for your appointment at{" "}
            <span className="font-semibold text-foreground">{booking.shopName}</span>.
          </DialogDescription>
        </DialogHeader>

        {/* Appointment summary card */}
        <div className="bg-secondary/40 p-3.5 rounded-2xl border flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-foreground text-sm">{booking.service}</div>
              <div className="text-muted-foreground flex items-center gap-1 mt-0.5">
                <Store className="w-3 h-3" /> {booking.shopName}
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Interactive Star Rating */}
          <div className="flex flex-col items-center justify-center gap-2 py-2">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const filled = star <= activeStars;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1.5 focus:outline-none transition-transform hover:scale-125 duration-150"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        filled
                          ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]"
                          : "text-muted-foreground/30 hover:text-yellow-200"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <div className="text-sm font-semibold text-primary h-5">
              {RATING_LABELS[activeStars] || ""}
            </div>
          </div>

          {/* Comment textarea */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Your Review & Comments (Optional)
            </label>
            <Textarea
              placeholder="How was the haircut, grooming quality, waiting time, and atmosphere?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
              rows={4}
              className="resize-none text-sm rounded-xl"
            />
            <div className="text-[11px] text-right text-muted-foreground">
              {comment.length} / 1000 characters
            </div>
          </div>

          {error && (
            <div className="text-xs font-medium text-red-600 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
              {error}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-1.5 rounded-xl">
              {loading ? "Submitting..." : "Submit Review"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
