"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Star,
  MessageSquare,
  Search,
  Scissors,
  CheckCircle2,
  Calendar,
  Store,
  MapPin,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Filter,
  SlidersHorizontal,
} from "lucide-react";

function StarRating({ rating, size = "w-4 h-4" }) {
  const rounded = Math.round(Number(rating) || 0);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${size} ${
            star <= rounded
              ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.4)]"
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

const RATING_FILTER_OPTIONS = [
  { label: "All Ratings", value: "" },
  { label: "5 Stars", value: "5" },
  { label: "4 Stars", value: "4" },
  { label: "3 Stars", value: "3" },
  { label: "2 Stars", value: "2" },
  { label: "1 Star", value: "1" },
];

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({
    averageRating: 0,
    reviewCount: 0,
    ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 12, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const fetchReviews = (pageToFetch = 1) => {
    setLoading(true);
    setError("");

    const params = new URLSearchParams({
      page: String(pageToFetch),
      limit: "12",
      sortBy,
    });
    if (search.trim()) params.set("search", search.trim());
    if (ratingFilter) params.set("rating", ratingFilter);

    axios
      .get(`/api/reviews?${params.toString()}`)
      .then((res) => {
        setReviews(res.data.reviews || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      })
      .catch((err) => {
        setError(err.response?.data?.error || "Unable to load reviews right now.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReviews(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, ratingFilter, sortBy]);

  const { averageRating, reviewCount, ratingBreakdown } = stats;
  const fiveStarPercent = reviewCount > 0 ? Math.round(((ratingBreakdown[5] || 0) / reviewCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-background pb-24 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-primary/5 blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-[20%] left-[-10%] w-[35%] h-[35%] rounded-full bg-yellow-500/5 blur-[100px] pointer-events-none -z-10" />

      {/* Hero Header */}
      <div className="pt-24 pb-12 px-6 container mx-auto max-w-7xl">
        <div className="flex flex-col items-center text-center space-y-5 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 text-xs font-bold uppercase tracking-wider">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            Verified Customer Feedback
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">
            Customer <span className="text-primary">Reviews & Ratings</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Explore authentic ratings, grooming experiences, and real reviews left by clients at verified barbershops across Trimly.
          </p>
        </div>

        {/* Global Statistics Overview */}
        <div className="mt-12 bg-card/70 backdrop-blur-md border border-border/80 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            {/* Average Rating Block */}
            <div className="flex flex-col items-center justify-center text-center p-4 border-b md:border-b-0 md:border-r border-border/60">
              <div className="text-6xl font-black tracking-tight text-foreground flex items-baseline gap-1">
                {reviewCount > 0 ? averageRating.toFixed(1) : "0.0"}
                <span className="text-2xl text-muted-foreground font-semibold">/ 5</span>
              </div>
              <div className="my-2.5">
                <StarRating rating={averageRating} size="w-6 h-6" />
              </div>
              <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                Based on {reviewCount} verified appointments
              </p>
            </div>

            {/* Star Distribution Breakdown */}
            <div className="space-y-2 md:col-span-2 px-2 sm:px-6">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = ratingBreakdown?.[stars] || 0;
                const percent = reviewCount > 0 ? Math.round((count / reviewCount) * 100) : 0;
                const isSelected = ratingFilter === String(stars);

                return (
                  <button
                    key={stars}
                    type="button"
                    onClick={() => setRatingFilter(isSelected ? "" : String(stars))}
                    className={`w-full flex items-center gap-3 text-xs p-1.5 rounded-xl transition ${
                      isSelected ? "bg-primary/10 font-bold" : "hover:bg-muted/40"
                    }`}
                  >
                    <span className="w-14 text-left font-medium flex items-center gap-1 text-foreground">
                      {stars} <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    </span>
                    <div className="flex-1 h-3 bg-secondary/80 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="w-16 text-right text-muted-foreground font-mono text-[11px]">
                      {count} ({percent}%)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="mt-10 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between bg-card/40 border border-border/60 p-4 rounded-2xl">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Search by haircut service, barber shop or customer comments..."
              className="pl-10 h-11 bg-background rounded-xl text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Star Rating Pills */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {RATING_FILTER_OPTIONS.map((opt) => (
              <Button
                key={opt.label}
                type="button"
                variant={ratingFilter === opt.value ? "default" : "outline"}
                size="sm"
                className="h-9 text-xs rounded-xl gap-1 shrink-0"
                onClick={() => setRatingFilter(opt.value)}
              >
                {opt.value && <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />}
                {opt.label}
              </Button>
            ))}
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-2 shrink-0">
            <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort customer reviews"
              className="h-9 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="newest">Newest Reviews</option>
              <option value="highest">Highest Rating</option>
              <option value="lowest">Lowest Rating</option>
              <option value="oldest">Oldest Reviews</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reviews Content Grid */}
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Verified Reviews {pagination.total > 0 && `(${pagination.total})`}
          </h2>
          {(search || ratingFilter) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-primary"
              onClick={() => {
                setSearch("");
                setRatingFilter("");
              }}
            >
              Reset Filters
            </Button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 rounded-2xl bg-card/40 border animate-pulse p-6" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-10 text-center text-red-600">
            <p className="font-semibold">{error}</p>
            <Button variant="outline" size="sm" onClick={() => fetchReviews(1)} className="mt-4">
              Try Again
            </Button>
          </div>
        ) : reviews.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.map((rev) => (
              <div
                key={rev._id}
                className="bg-card/60 backdrop-blur-sm border border-border/70 hover:border-primary/40 rounded-3xl p-6 flex flex-col justify-between gap-5 transition shadow-sm hover:shadow-md"
              >
                <div className="space-y-4">
                  {/* Customer Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center font-bold text-primary text-sm uppercase shrink-0">
                        {rev.userName?.substring(0, 2) || "CU"}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                          {rev.userName}
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" aria-label="Verified Appointment" />
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {formatDate(rev.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-full px-2.5 py-0.5 flex items-center gap-1 text-xs font-bold text-yellow-600 shrink-0">
                      <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                      {rev.rating}.0
                    </div>
                  </div>

                  {/* Rating Stars Visual */}
                  <div>
                    <StarRating rating={rev.rating} size="w-3.5 h-3.5" />
                  </div>

                  {/* Review Text */}
                  {rev.comment ? (
                    <p className="text-sm text-foreground/90 leading-relaxed italic line-clamp-4">
                      &ldquo;{rev.comment}&rdquo;
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      Customer left a {rev.rating}-star rating without additional comments.
                    </p>
                  )}
                </div>

                {/* Barber Shop & Service Footer */}
                <div className="pt-4 border-t border-border/60 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <Link
                      href={`/barbers/${rev.barberProfileId || rev.barberId}`}
                      className="font-semibold text-foreground hover:text-primary transition flex items-center gap-1.5 truncate"
                    >
                      <Store className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">{rev.barberShopName}</span>
                    </Link>
                    {rev.serviceName && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary/80 text-[11px] font-medium text-muted-foreground shrink-0">
                        <Scissors className="w-3 h-3 text-primary" /> {rev.serviceName}
                      </span>
                    )}
                  </div>

                  <Link href={`/barbers/${rev.barberProfileId || rev.barberId}`} className="w-full">
                    <Button variant="outline" size="sm" className="w-full text-xs rounded-xl gap-1.5 h-8">
                      Book with this Barber <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center rounded-3xl border border-dashed p-8 space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold">No matching customer reviews found</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Try searching for another service, keyword, or clearing the star rating filter.
              </p>
            </div>
            {(search || ratingFilter) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setRatingFilter("");
                }}
              >
                Clear all filters
              </Button>
            )}
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <div className="mt-12 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => fetchReviews(pagination.page - 1)}
              className="gap-1 text-xs"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </Button>
            <span className="text-xs text-muted-foreground font-medium">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchReviews(pagination.page + 1)}
              className="gap-1 text-xs"
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Call-to-action banner for customers */}
        <div className="mt-20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-3xl p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-2xl font-bold">Have you visited a Trimly barber recently?</h3>
            <p className="text-muted-foreground text-sm max-w-xl">
              Your feedback helps barbers elevate their craft and empowers fellow customers to find the perfect grooming experience.
            </p>
          </div>
          <Link href="/dashboard" className="shrink-0">
            <Button className="rounded-full px-7 h-12 gap-2 text-sm font-semibold">
              Leave a Review <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
