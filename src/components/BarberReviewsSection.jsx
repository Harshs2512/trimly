"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import { useSession } from "next-auth/react";
import {
  Star,
  MessageSquare,
  CheckCircle2,
  Scissors,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

export default function BarberReviewsSection({ barberId, onStatsLoaded }) {
  const { data: session } = useSession();
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({
    averageRating: 0,
    reviewCount: 0,
    ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [selectedRating, setSelectedRating] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch reviews whenever barberId, page, selectedRating, debouncedSearch, or sortBy change
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const queryParams = new URLSearchParams({
      barberId: String(barberId || ""),
      page: String(page),
      limit: "5",
      sortBy,
    });

    if (selectedRating !== null) {
      queryParams.set("rating", String(selectedRating));
    }
    if (debouncedSearch) {
      queryParams.set("search", debouncedSearch);
    }

    axios
      .get(`/api/reviews?${queryParams.toString()}`)
      .then((res) => {
        if (mounted) {
          setReviews(res.data.reviews || []);
          const fetchedStats = res.data.stats || {
            averageRating: 0,
            reviewCount: 0,
            ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          };
          setStats(fetchedStats);
          setTotalPages(res.data.pagination?.totalPages || 1);
          if (onStatsLoaded) {
            onStatsLoaded(fetchedStats);
          }
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
  }, [barberId, page, selectedRating, debouncedSearch, sortBy]);

  async function removeReview() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await axios.delete(`/api/reviews/${deleteTarget}`);
      setReviews((prev) => prev.filter((r) => r._id !== deleteTarget));
      if (res.data?.stats) {
        setStats(res.data.stats);
        if (onStatsLoaded) onStatsLoaded(res.data.stats);
      }
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err.response?.data?.error || "Failed to remove review.");
    } finally {
      setDeleting(false);
    }
  }

  const { averageRating, reviewCount, ratingBreakdown } = stats;
  const isFiltering = selectedRating !== null || Boolean(debouncedSearch);

  return (
    <div className="space-y-6">
      {/* Section Header */}
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
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Based on {reviewCount} verified{" "}
              {reviewCount === 1 ? "appointment" : "appointments"}
            </p>
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 mt-3">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Verified Shop
            </span>
          </div>

          {/* Rating Breakdown Bars */}
          <div className="md:col-span-2 space-y-2 px-2">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = ratingBreakdown?.[stars] || 0;
              const percent = reviewCount > 0 ? Math.round((count / reviewCount) * 100) : 0;
              const isSelected = selectedRating === stars;
              return (
                <button
                  type="button"
                  key={stars}
                  onClick={() => {
                    setSelectedRating((prev) => (prev === stars ? null : stars));
                    setPage(1);
                  }}
                  className={`w-full flex items-center gap-3 text-xs p-1.5 rounded-xl transition-all text-left ${
                    isSelected
                      ? "bg-primary/15 border border-primary/30 ring-1 ring-primary/20 shadow-sm"
                      : "hover:bg-secondary/60"
                  }`}
                  title={`Filter by ${stars} star reviews (${count})`}
                >
                  <span className="w-12 font-medium flex items-center gap-1 text-muted-foreground">
                    {stars} <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  </span>
                  <div className="flex-1 h-2.5 bg-secondary/80 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isSelected ? "bg-primary" : "bg-yellow-400"
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-muted-foreground font-mono text-[11px]">
                    {count} ({percent}%)
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Star Filter Pills & Search / Sort Controls */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Star Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedRating(null);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                selectedRating === null
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card/70 hover:bg-secondary text-muted-foreground border-border/80"
              }`}
            >
              All ({reviewCount})
            </button>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratingBreakdown?.[star] || 0;
              if (count === 0 && selectedRating !== star) return null;
              const isSelected = selectedRating === star;
              return (
                <button
                  type="button"
                  key={star}
                  onClick={() => {
                    setSelectedRating((prev) => (prev === star ? null : star));
                    setPage(1);
                  }}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card/70 hover:bg-secondary text-muted-foreground border-border/80"
                  }`}
                >
                  <Star
                    className={`w-3 h-3 ${
                      isSelected ? "fill-white text-white" : "fill-yellow-400 text-yellow-400"
                    }`}
                  />
                  <span>{star}</span>
                  <span className="opacity-80">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-7 py-1.5 rounded-full bg-card/80 border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              aria-label="Sort customer reviews"
              className="text-xs py-1.5 px-3 rounded-full bg-card/80 border border-border/80 text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shrink-0"
            >
              <option value="newest">Newest first</option>
              <option value="highest">Highest rating</option>
              <option value="lowest">Lowest rating</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        </div>

        {/* Active Filter Badge */}
        {isFiltering && (
          <div className="flex items-center justify-between text-xs bg-secondary/40 border border-border/60 px-3 py-1.5 rounded-xl">
            <span className="text-muted-foreground">
              Filtering by:{" "}
              {selectedRating !== null && (
                <strong className="text-foreground">{selectedRating} Stars</strong>
              )}
              {selectedRating !== null && debouncedSearch && " • "}
              {debouncedSearch && (
                <span className="text-foreground">
                  Keyword &ldquo;<strong>{debouncedSearch}</strong>&rdquo;
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedRating(null);
                setSearchQuery("");
                setPage(1);
              }}
              className="text-primary hover:underline font-medium"
            >
              Clear filters
            </button>
          </div>
        )}
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
              className="bg-card/40 border border-border/60 hover:border-primary/30 transition rounded-2xl p-5 space-y-3 shadow-xs"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center font-bold text-primary text-sm uppercase shadow-xs shrink-0">
                    {rev.userName?.substring(0, 2) || "CU"}
                  </div>
                  <div>
                    <div className="font-semibold text-sm flex items-center gap-1.5">
                      {rev.userName}
                      <span className="inline-flex items-center gap-1 text-[10px] text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20 font-medium">
                        <CheckCircle2 className="w-3 h-3" /> Verified Booking
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
                <div className="bg-secondary/30 rounded-xl p-3.5 border border-border/40 text-sm text-foreground/90 leading-relaxed italic">
                  &ldquo;{rev.comment}&rdquo;
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-12 px-4 rounded-3xl border border-dashed text-muted-foreground text-sm space-y-3">
            <p>
              {isFiltering
                ? "No reviews match your selected star rating or search criteria."
                : "No customer reviews yet. Be the first to review after booking an appointment!"}
            </p>
            {isFiltering && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedRating(null);
                  setSearchQuery("");
                  setPage(1);
                }}
              >
                Reset Filters
              </Button>
            )}
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

      {/* Trimly Community Reviews Showcase Banner */}
      <Link
        href="/reviews"
        className="group flex items-center justify-between p-4 rounded-2xl bg-card/60 hover:bg-card border border-border/80 hover:border-primary/40 transition-all shadow-xs"
      >
        <div className="space-y-0.5">
          <div className="font-semibold text-sm flex items-center gap-1.5 text-foreground group-hover:text-primary transition">
            <MessageSquare className="w-4 h-4 text-primary" /> Explore All Trimly Customer Reviews
          </div>
          <p className="text-xs text-muted-foreground">
            Browse verified ratings, client feedback, and community recommendations across all salons
          </p>
        </div>
        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:translate-x-1 transition">
          <ArrowRight className="w-4 h-4" />
        </div>
      </Link>

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
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={deleting} onClick={removeReview}>
              {deleting ? "Deleting..." : "Delete Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
