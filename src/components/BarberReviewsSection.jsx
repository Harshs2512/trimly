"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useSession } from "next-auth/react";
import { Star, MessageSquare, CheckCircle2, Scissors, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function StarRating({ rating, size = "w-4 h-4" }) {
  const rounded = Math.round(Number(rating) || 0);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${size} ${
            star <= rounded
              ? "fill-yellow-400 text-yellow-400"
              : "fill-muted text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return "";
  }
}

export default function BarberReviewsSection({ barberId }) {
  const { data: session } = useSession();
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ averageRating: 0, reviewCount: 0, ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function removeReview() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await axios.delete(`/api/reviews/${deleteTarget}`);
      setReviews((prev) => prev.filter((r) => r._id !== deleteTarget));
      if (res.data?.stats) {
        setStats(res.data.stats);
      }
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err.response?.data?.error || "Failed to remove review.");
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    axios
      .get(`/api/reviews?barberId=${barberId}&page=${page}&limit=5`)
      .then((res) => {
        if (mounted) {
          setReviews(res.data.reviews || []);
          setStats(res.data.stats || { averageRating: 0, reviewCount: 0, ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
          setTotalPages(res.data.pagination?.totalPages || 1);
        }
      })
      .catch(() => {
        // non-fatal on review load failure
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [barberId, page]);

  const { averageRating, reviewCount, ratingBreakdown } = stats;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2.5">
          <MessageSquare className="w-5 h-5 text-primary" /> Customer Reviews & Ratings
        </h2>
        <span className="text-xs text-muted-foreground font-medium">
          {reviewCount} {reviewCount === 1 ? "verified review" : "verified reviews"}
        </span>
      </div>

      {/* Ratings Summary Card */}
      <div className="bg-card/60 backdrop-blur border border-border/80 rounded-3xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Big Score Box */}
          <div className="flex flex-col items-center justify-center text-center p-4 border-b md:border-b-0 md:border-r border-border/60">
            <div className="text-5xl font-extrabold tracking-tight text-foreground">
              {reviewCount > 0 ? averageRating.toFixed(1) : "0.0"}
            </div>
            <div className="my-2">
              <StarRating rating={averageRating} size="w-5 h-5" />
            </div>
            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Based on {reviewCount} verified appointments
            </p>
          </div>

          {/* Rating Breakdown Bars */}
          <div className="md:col-span-2 space-y-2 px-2">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = ratingBreakdown?.[stars] || 0;
              const percent = reviewCount > 0 ? Math.round((count / reviewCount) * 100) : 0;
              return (
                <div key={stars} className="flex items-center gap-3 text-xs">
                  <span className="w-12 font-medium flex items-center gap-1 text-muted-foreground">
                    {stars} <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  </span>
                  <div className="flex-1 h-2.5 bg-secondary/80 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-muted-foreground font-mono text-[11px]">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Loading reviews...
          </div>
        ) : reviews.length ? (
          reviews.map((rev) => (
            <div
              key={rev._id}
              className="bg-card/40 border border-border/60 hover:border-primary/30 transition rounded-2xl p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center font-bold text-primary text-sm uppercase">
                    {rev.userName?.substring(0, 2) || "CU"}
                  </div>
                  <div>
                    <div className="font-semibold text-sm flex items-center gap-1.5">
                      {rev.userName}
                      <span className="text-[10px] text-green-600 bg-green-500/10 px-1.5 py-0.2 rounded-full border border-green-500/20 font-medium">
                        Verified Booking
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StarRating rating={rev.rating} size="w-3 h-3" />
                      <span className="text-[11px] text-muted-foreground">
                        {formatDate(rev.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {rev.serviceName && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary/60 text-xs font-medium text-muted-foreground">
                      <Scissors className="w-3 h-3 text-primary" /> {rev.serviceName}
                    </span>
                  )}
                  {session?.user && (session.user.id === rev.userId || session.user.role === "admin") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600 rounded-lg"
                      title="Delete review"
                      onClick={() => {
                        setDeleteError("");
                        setDeleteTarget(rev._id);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {rev.comment && (
                <p className="text-sm text-foreground/90 leading-relaxed pt-1">
                  {rev.comment}
                </p>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-12 rounded-3xl border border-dashed text-muted-foreground text-sm">
            No customer reviews yet. Be the first to review after booking an appointment!
          </div>
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="gap-1 text-xs"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="gap-1 text-xs"
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Review?</DialogTitle>
            <DialogDescription>
              This action will remove the review and recalculate the shop rating.
            </DialogDescription>
          </DialogHeader>
          {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleting} onClick={removeReview}>
              {deleting ? "Deleting..." : "Delete Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
