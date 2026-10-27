"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Clock, Scissors, MapPin, ArrowRight, UserCircle2, Star, Trash2 } from "lucide-react";
import ReviewModal from "@/components/ReviewModal";

const RESCHEDULABLE = new Set(["declined", "cancelled", "expired"]);
const ACTIVE = new Set(["pending", "confirmed"]);

function dateInputInTimeZone(date = new Date(), timeZone = "Asia/Kolkata") {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function addCalendarDays(dateInput, days) {
  const [year, month, day] = dateInput.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function formatBookingDate(value, timeZone, options) {
  return new Intl.DateTimeFormat(undefined, { timeZone: timeZone || "Asia/Kolkata", ...options }).format(new Date(value));
}

export default function DashboardClient({ user, bookings, initialReviewedMap = {}, initialUserReviews = [] }) {
  const router = useRouter();
  const [cancelBooking, setCancelBooking] = useState(null);
  const [rescheduleBooking, setRescheduleBooking] = useState(null);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [editingReview, setEditingReview] = useState(null);
  const [reviewedMap, setReviewedMap] = useState(initialReviewedMap);
  const [userReviews, setUserReviews] = useState(initialUserReviews);
  const [date, setDate] = useState(dateInputInTimeZone());
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState("");
  const [deleteReviewTarget, setDeleteReviewTarget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [error, setError] = useState("");

  const now = Date.now();
  const upcomingBookings = useMemo(
    () => bookings.filter((booking) => ACTIVE.has(booking.status) && new Date(booking.timeSlot).getTime() >= now),
    [bookings, now]
  );
  const pastBookings = useMemo(
    () => bookings.filter((booking) => !ACTIVE.has(booking.status) || new Date(booking.timeSlot).getTime() < now),
    [bookings, now]
  );

  const reviewStats = useMemo(() => {
    if (!userReviews.length) return { average: 0, count: 0, fiveStarCount: 0 };
    const total = userReviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    const fiveStars = userReviews.filter((r) => Number(r.rating) === 5).length;
    return {
      average: (total / userReviews.length).toFixed(1),
      count: userReviews.length,
      fiveStarCount: fiveStars,
    };
  }, [userReviews]);

  function statusClass(status) {
    if (status === "confirmed" || status === "completed") return "bg-green-500/10 text-green-600 border-green-500/20";
    if (["cancelled", "declined", "no_show", "expired"].includes(status)) return "bg-red-500/10 text-red-600 border-red-500/20";
    return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
  }

  async function cancel() {
    if (!cancelBooking) return;
    setLoading(true); setError("");
    try {
      await axios.put(`/api/bookings/${cancelBooking._id}`, { status: "cancelled", cancelReason: "Cancelled by customer" });
      setCancelBooking(null);
      router.refresh();
    } catch (err) {
      setError(typeof err.response?.data?.error === "string" ? err.response.data.error : "Failed to cancel booking.");
    } finally { setLoading(false); }
  }

  async function removeReview() {
    if (!deleteReviewTarget) return;
    setLoading(true); setError("");
    try {
      await axios.delete(`/api/reviews/${deleteReviewTarget.reviewId}`);
      setReviewedMap((prev) => {
        const copy = { ...prev };
        delete copy[deleteReviewTarget.bookingId];
        return copy;
      });
      setUserReviews((prev) => prev.filter((r) => r._id !== deleteReviewTarget.reviewId));
      setDeleteReviewTarget(null);
      router.refresh();
    } catch (err) {
      setError(typeof err.response?.data?.error === "string" ? err.response.data.error : "Failed to remove review.");
    } finally { setLoading(false); }
  }

  async function loadAvailability(booking, selectedDate) {
    if (!booking || !selectedDate) return;
    setAvailabilityLoading(true); setError(""); setSlots([]); setSlot("");
    try {
      const params = new URLSearchParams({ date: selectedDate, service: booking.service });
      if (booking.serviceId) params.set("serviceId", booking.serviceId);
      const response = await fetch(`/api/barbers/${booking.barberProfileId || booking.barberId}/availability?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load available times.");
      setSlots(data.slots || []);
    } catch (err) { setError(err.message); } finally { setAvailabilityLoading(false); }
  }

  function openReschedule(booking) {
    const today = dateInputInTimeZone(new Date(), booking.shopTimezone);
    setRescheduleBooking(booking);
    setDate(today);
    setError("");
    loadAvailability(booking, today);
  }

  async function reschedule() {
    if (!rescheduleBooking || !slot) return;
    setLoading(true); setError("");
    try {
      await axios.put(`/api/bookings/${rescheduleBooking._id}`, { status: "pending", timeSlot: slot });
      setRescheduleBooking(null); setSlot(""); setSlots([]);
      router.refresh();
    } catch (err) {
      setError(typeof err.response?.data?.error === "string" ? err.response.data.error : "Failed to reschedule booking.");
    } finally { setLoading(false); }
  }

  function openEditReview(review) {
    setEditingReview(review);
    setReviewBooking({
      _id: review.bookingId,
      barberId: review.barberId,
      barberProfileId: review.barberProfileId,
      shopName: review.shopName,
      service: review.serviceName,
    });
  }

  const BookingCard = ({ booking }) => {
    const isCompleted = booking.status === "completed" ||
      (booking.status === "confirmed" && new Date(booking.timeSlot).getTime() < now);
    const existingReview = reviewedMap[booking._id];

    return (
      <div className="group bg-card/60 border border-border/60 hover:border-primary/40 rounded-2xl p-6 flex flex-col md:flex-row justify-between gap-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0"><Scissors className="w-6 h-6" /></div>
          <div className="space-y-2">
            <div><h3 className="font-bold text-lg">{booking.service}</h3><p className="font-medium text-sm">{booking.shopName}</p></div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{formatBookingDate(booking.timeSlot, booking.shopTimezone, { weekday: "short", month: "short", day: "numeric" })}</span>
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{formatBookingDate(booking.timeSlot, booking.shopTimezone, { hour: "2-digit", minute: "2-digit" })}</span>
              {booking.shopAddress && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{booking.shopAddress}</span>}
            </div>
            {booking.cancelReason && <p className="text-xs text-red-600 bg-red-500/10 px-2.5 py-1 rounded-md w-fit">{booking.cancelReason}</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 self-stretch md:self-center">
          <span className={`px-3 py-1 rounded-full border text-xs font-semibold uppercase ${statusClass(booking.status)}`}>{booking.status.replace("_", " ")}</span>
          
          {ACTIVE.has(booking.status) && new Date(booking.timeSlot).getTime() >= now && (
            <Button variant="ghost" size="sm" className="text-red-600" onClick={() => { setError(""); setCancelBooking(booking); }}>
              Cancel
            </Button>
          )}

          {RESCHEDULABLE.has(booking.status) && (
            <Button variant="outline" size="sm" onClick={() => openReschedule(booking)}>
              Reschedule
            </Button>
          )}

          {/* Review actions for completed bookings */}
          {isCompleted && (
            existingReview ? (
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/10 text-yellow-600 border border-yellow-500/20">
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" /> Rated {existingReview.rating}★
                </span>
                {existingReview._id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600 rounded-lg"
                    title="Remove review"
                    onClick={() => {
                      setError("");
                      setDeleteReviewTarget({ bookingId: booking._id, reviewId: existingReview._id });
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs text-primary border-primary/40 hover:bg-primary/10 rounded-xl"
                onClick={() => {
                  setEditingReview(null);
                  setReviewBooking(booking);
                }}
              >
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-400" /> Rate & Review
              </Button>
            )
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-6 pt-12 max-w-5xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Hello, <span className="text-primary">{(user.name || "there").split(" ")[0]}</span></h1>
            <p className="text-muted-foreground text-lg flex items-center gap-2"><UserCircle2 className="w-5 h-5" />Manage your appointments and reviews</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/reviews">
              <Button variant="outline" className="h-12 px-5 rounded-full gap-2 border-primary/30 text-foreground hover:text-primary">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-400" /> All Customer Reviews
              </Button>
            </Link>
            <Link href="/barbers">
              <Button className="h-12 px-6 rounded-full gap-2">Book New Appointment <ArrowRight className="w-4 h-4" /></Button>
            </Link>
          </div>
        </div>

        {user.role === "barber" && <div className="mb-10 rounded-3xl border bg-card p-6 flex flex-col md:flex-row justify-between gap-4"><div><h2 className="text-2xl font-bold">Barber Workspace</h2><p className="text-muted-foreground">Manage your requests, services and shop profile.</p></div><Link href="/dashboard/barber"><Button variant="outline">Open Workspace</Button></Link></div>}

        <Tabs defaultValue="upcoming">
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold">Your Appointments & Reviews</h2>
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming ({upcomingBookings.length})</TabsTrigger>
              <TabsTrigger value="past">History ({pastBookings.length})</TabsTrigger>
              <TabsTrigger value="reviews" className="gap-1.5">
                <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" /> My Reviews ({userReviews.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="upcoming" className="space-y-4">
            {upcomingBookings.length ? upcomingBookings.map((booking) => <BookingCard key={booking._id} booking={booking} />) : <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">No upcoming appointments.</div>}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {pastBookings.length ? pastBookings.map((booking) => <BookingCard key={booking._id} booking={booking} />) : <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">No booking history yet.</div>}
          </TabsContent>

          {/* Customer Reviews & Ratings Tab */}
          <TabsContent value="reviews" className="space-y-6">
            {/* Customer Review Summary Card */}
            {userReviews.length > 0 && (
              <div className="bg-card/70 border border-border/80 rounded-3xl p-6 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center text-center">
                  <div className="p-2 sm:border-r border-border/60">
                    <div className="text-4xl font-extrabold text-foreground flex items-center justify-center gap-1.5">
                      {reviewStats.average}
                      <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">Average Rating Given</p>
                  </div>
                  <div className="p-2 sm:border-r border-border/60">
                    <div className="text-4xl font-extrabold text-foreground">{reviewStats.count}</div>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">Reviews Submitted</p>
                  </div>
                  <div className="p-2">
                    <div className="text-4xl font-extrabold text-foreground">{reviewStats.fiveStarCount}</div>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">5-Star Experiences</p>
                  </div>
                </div>
              </div>
            )}

            {/* List of customer reviews */}
            {userReviews.length > 0 ? (
              <div className="space-y-4">
                {userReviews.map((rev) => (
                  <div
                    key={rev._id}
                    className="bg-card/60 border border-border/70 hover:border-primary/40 rounded-2xl p-6 space-y-4 transition shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/barbers/${rev.barberProfileId || rev.barberId}`}
                            className="font-bold text-lg hover:text-primary transition underline-offset-4 hover:underline"
                          >
                            {rev.shopName}
                          </Link>
                          {rev.serviceName && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-secondary/80 text-xs font-medium text-muted-foreground">
                              <Scissors className="w-3 h-3 text-primary" /> {rev.serviceName}
                            </span>
                          )}
                        </div>
                        {rev.shopAddress && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" /> {rev.shopAddress}
                          </p>
                        )}
                        <div className="flex items-center gap-2 pt-1">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= Number(rev.rating)
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "fill-muted text-muted-foreground/30"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs font-semibold text-yellow-600 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">
                            {rev.rating} / 5 Stars
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {rev.createdAt ? new Intl.DateTimeFormat("en-IN", { month: "short", day: "numeric", year: "numeric" }).format(new Date(rev.createdAt)) : ""}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-start shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-8 rounded-xl gap-1"
                          onClick={() => openEditReview(rev)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-8 px-2 text-muted-foreground hover:text-red-600 rounded-xl"
                          title="Remove review"
                          onClick={() => {
                            setError("");
                            setDeleteReviewTarget({ bookingId: rev.bookingId, reviewId: rev._id });
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Link href={`/barbers/${rev.barberProfileId || rev.barberId}`}>
                          <Button size="sm" variant="secondary" className="text-xs h-8 rounded-xl gap-1">
                            Visit Shop <ArrowRight className="w-3 h-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {rev.comment ? (
                      <div className="bg-background/60 p-3.5 rounded-xl border border-border/50 text-sm text-foreground/90 italic">
                        &ldquo;{rev.comment}&rdquo;
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No written comment provided.</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed p-12 text-center space-y-4">
                <div className="w-14 h-14 bg-yellow-500/10 rounded-2xl flex items-center justify-center mx-auto text-yellow-500">
                  <Star className="w-7 h-7 fill-yellow-400 text-yellow-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">No reviews submitted yet</h3>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto mt-1">
                    Once your haircut or grooming appointment is marked completed, you can share your rating and review here to help other customers.
                  </p>
                </div>
                <Link href="/barbers">
                  <Button className="rounded-full px-6 gap-2">
                    Explore Barbers & Book <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!cancelBooking} onOpenChange={(open) => !open && setCancelBooking(null)}>
        <DialogContent><DialogHeader><DialogTitle>Cancel appointment?</DialogTitle><DialogDescription>This will release the reserved time and notify the barber.</DialogDescription></DialogHeader>{error && <p className="text-sm text-red-600">{error}</p>}<DialogFooter><Button variant="outline" onClick={() => setCancelBooking(null)}>Keep booking</Button><Button variant="destructive" disabled={loading} onClick={cancel}>{loading ? "Cancelling..." : "Cancel appointment"}</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={!!rescheduleBooking} onOpenChange={(open) => !open && setRescheduleBooking(null)}>
        <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Reschedule appointment</DialogTitle><DialogDescription>Select a new available time. The new request will return to pending until the barber accepts it.</DialogDescription></DialogHeader><div className="space-y-4"><input type="date" value={date} min={rescheduleBooking ? dateInputInTimeZone(new Date(), rescheduleBooking.shopTimezone) : dateInputInTimeZone()} max={rescheduleBooking ? addCalendarDays(dateInputInTimeZone(new Date(), rescheduleBooking.shopTimezone), rescheduleBooking.shopBookingHorizonDays || 90) : undefined} onChange={(event) => { setDate(event.target.value); loadAvailability(rescheduleBooking, event.target.value); }} className="w-full h-11 rounded-lg border bg-background px-3" />{availabilityLoading ? <p className="text-sm text-muted-foreground">Checking availability...</p> : <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{slots.map((item) => <Button type="button" key={item.value} variant={slot === item.value ? "default" : "outline"} onClick={() => setSlot(item.value)}>{item.label}</Button>)}</div>}{!availabilityLoading && !slots.length && <p className="text-sm text-muted-foreground">No available times on this date.</p>}{error && <p className="text-sm text-red-600">{error}</p>}</div><DialogFooter><Button variant="outline" onClick={() => setRescheduleBooking(null)}>Cancel</Button><Button onClick={reschedule} disabled={!slot || loading}>{loading ? "Rescheduling..." : "Send new request"}</Button></DialogFooter></DialogContent>
      </Dialog>

      {/* Delete Review Dialog */}
      <Dialog open={!!deleteReviewTarget} onOpenChange={(open) => !open && setDeleteReviewTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove your review?</DialogTitle>
            <DialogDescription>
              This will remove your rating and feedback for this appointment. You will be able to submit a new review if you wish.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteReviewTarget(null)}>Keep review</Button>
            <Button variant="destructive" disabled={loading} onClick={removeReview}>
              {loading ? "Removing..." : "Remove review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Modal */}
      {reviewBooking && (
        <ReviewModal
          booking={reviewBooking}
          initialReview={editingReview}
          onClose={() => {
            setReviewBooking(null);
            setEditingReview(null);
          }}
          onSuccess={(res) => {
            const returnedReview = res?.review;
            if (reviewBooking?._id && returnedReview) {
              const reviewId = returnedReview._id || editingReview?._id;
              const newRating = Number(returnedReview.rating);
              const newComment = returnedReview.comment || "";

              setReviewedMap((prev) => ({
                ...prev,
                [reviewBooking._id]: {
                  _id: reviewId,
                  rating: newRating,
                  comment: newComment,
                },
              }));

              setUserReviews((prev) => {
                const existingIndex = prev.findIndex((r) => r._id === reviewId || r.bookingId === reviewBooking._id);
                if (existingIndex >= 0) {
                  const updated = [...prev];
                  updated[existingIndex] = {
                    ...updated[existingIndex],
                    rating: newRating,
                    comment: newComment,
                    updatedAt: new Date().toISOString(),
                  };
                  return updated;
                } else {
                  return [
                    {
                      _id: reviewId,
                      bookingId: reviewBooking._id,
                      barberId: reviewBooking.barberProfileId || reviewBooking.barberId,
                      barberProfileId: reviewBooking.barberProfileId || reviewBooking.barberId,
                      shopName: reviewBooking.shopName,
                      shopAddress: reviewBooking.shopAddress || "",
                      serviceName: reviewBooking.service,
                      rating: newRating,
                      comment: newComment,
                      createdAt: new Date().toISOString(),
                    },
                    ...prev,
                  ];
                }
              });
            }
            setEditingReview(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
