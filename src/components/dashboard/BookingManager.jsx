"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, Scissors, Check, X, User, AlertCircle, CheckCircle2, UserX } from "lucide-react";

function formatBookingDate(value, timeZone, options) {
  return new Intl.DateTimeFormat(undefined, { timeZone, ...options }).format(new Date(value));
}

export default function BookingManager({ barberId, timezone = "Asia/Kolkata" }) {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [decision, setDecision] = useState(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1 });

  useEffect(() => { fetchBookings(page); }, [barberId, page]);

  async function fetchBookings(selectedPage = page) {
    setIsLoading(true); setError("");
    try {
      const response = await axios.get(`/api/bookings?barberId=${encodeURIComponent(barberId)}&page=${selectedPage}&limit=100`);
      setBookings(response.data.bookings || response.data);
      setPagination(response.data.pagination || { totalPages: 1 });
    } catch (err) {
      setError(typeof err.response?.data?.error === "string" ? err.response.data.error : "Failed to load appointments.");
    } finally { setIsLoading(false); }
  }

  async function updateStatus(id, status, cancelReason) {
    setActionLoading(id); setError("");
    try {
      await axios.put(`/api/bookings/${id}`, { status, ...(cancelReason ? { cancelReason } : {}) });
      await fetchBookings();
      setDecision(null); setReason("");
    } catch (err) {
      setError(typeof err.response?.data?.error === "string" ? err.response.data.error : "Failed to update booking status.");
    } finally { setActionLoading(null); }
  }

  const sections = useMemo(() => {
    const now = Date.now();
    return {
      pending: bookings.filter((b) => b.status === "pending"),
      upcoming: bookings.filter((b) => b.status === "confirmed" && new Date(b.timeSlot).getTime() >= now),
      needsCompletion: bookings.filter((b) => b.status === "confirmed" && new Date(b.timeSlot).getTime() < now),
      history: bookings.filter((b) => ["completed", "cancelled", "declined", "no_show", "expired"].includes(b.status)),
    };
  }, [bookings]);

  function badge(status) {
    const good = ["confirmed", "completed"].includes(status);
    const bad = ["cancelled", "declined", "no_show", "expired"].includes(status);
    return <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${good ? "bg-green-500/10 text-green-600 border-green-500/20" : bad ? "bg-red-500/10 text-red-600 border-red-500/20" : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"}`}>{status.replace("_", " ")}</span>;
  }

  const BookingCard = ({ booking, mode }) => (
    <div className="bg-card/60 border border-border/60 rounded-2xl p-5 flex flex-col md:flex-row justify-between gap-5">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0"><User className="w-6 h-6" /></div>
        <div className="space-y-1">
          <h3 className="font-bold text-lg">{booking.customerName || "Customer"}</h3>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Scissors className="w-4 h-4" />{booking.service}</span>
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{formatBookingDate(booking.timeSlot, timezone, { weekday: "short", month: "short", day: "numeric" })}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{formatBookingDate(booking.timeSlot, timezone, { hour: "2-digit", minute: "2-digit" })}</span>
            {booking.price != null && <span>₹{booking.price}</span>}
          </div>
          {booking.cancelReason && <p className="text-xs text-red-600 mt-2">{booking.cancelReason}</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        {badge(booking.status)}
        {mode === "pending" && <><Button variant="outline" className="text-red-600" onClick={() => { setReason(""); setDecision({ booking, status: "declined" }); }}><X className="w-4 h-4 mr-1" />Decline</Button><Button onClick={() => updateStatus(booking._id, "confirmed")} disabled={actionLoading === booking._id}><Check className="w-4 h-4 mr-1" />Accept</Button></>}
        {mode === "upcoming" && <Button variant="outline" className="text-red-600" onClick={() => { setReason(""); setDecision({ booking, status: "cancelled" }); }}>Cancel</Button>}
        {mode === "complete" && <><Button variant="outline" onClick={() => updateStatus(booking._id, "no_show")} disabled={actionLoading === booking._id}><UserX className="w-4 h-4 mr-1" />No show</Button><Button onClick={() => updateStatus(booking._id, "completed")} disabled={actionLoading === booking._id || new Date(booking.endTime || booking.timeSlot).getTime() > Date.now()} title={new Date(booking.endTime || booking.timeSlot).getTime() > Date.now() ? "Completion is available after the scheduled service end time." : undefined}><CheckCircle2 className="w-4 h-4 mr-1" />Complete</Button></>}
      </div>
    </div>
  );

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Loading appointments...</div>;

  return (
    <div className="space-y-8">
      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-600" role="alert">{error}</div>}
      <Section icon={AlertCircle} title={`Pending Requests (${sections.pending.length})`} empty="No pending booking requests.">{sections.pending.map((b) => <BookingCard key={b._id} booking={b} mode="pending" />)}</Section>
      <Section icon={Calendar} title={`Upcoming Appointments (${sections.upcoming.length})`} empty="No upcoming confirmed appointments.">{sections.upcoming.map((b) => <BookingCard key={b._id} booking={b} mode="upcoming" />)}</Section>
      <Section icon={Clock} title={`Needs Completion (${sections.needsCompletion.length})`} empty="No appointments need completion.">{sections.needsCompletion.map((b) => <BookingCard key={b._id} booking={b} mode="complete" />)}</Section>
      <Section icon={CheckCircle2} title="History" empty="No booking history yet.">{sections.history.map((b) => <BookingCard key={b._id} booking={b} mode="history" />)}</Section>
      {pagination.totalPages > 1 && <div className="flex items-center justify-center gap-3"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><span className="text-sm text-muted-foreground">Page {page} of {pagination.totalPages}</span><Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)}>Next</Button></div>}

      <Dialog open={!!decision} onOpenChange={(open) => !open && setDecision(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{decision?.status === "declined" ? "Decline request" : "Cancel appointment"}</DialogTitle><DialogDescription>Provide a clear reason. The customer will receive it in their notifications.</DialogDescription></DialogHeader>
          <div className="space-y-3"><Label htmlFor="reason">Reason</Label><div className="flex flex-wrap gap-2">{["Time slot is unavailable", "Shop closed unexpectedly", "Barber unavailable"].map((item) => <Button key={item} type="button" variant={reason === item ? "default" : "outline"} size="sm" onClick={() => setReason(item)}>{item}</Button>)}</div><Input id="reason" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} placeholder="Or enter a custom reason" /></div>
          <DialogFooter><Button variant="outline" onClick={() => setDecision(null)}>Back</Button><Button variant="destructive" disabled={!reason.trim() || actionLoading === decision?.booking?._id} onClick={() => updateStatus(decision.booking._id, decision.status, reason.trim())}>{actionLoading === decision?.booking?._id ? "Saving..." : "Confirm"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({ icon: Icon, title, empty, children }) {
  const items = Array.isArray(children) ? children : [children].filter(Boolean);
  return <section className="space-y-4"><div className="flex items-center gap-2 border-b pb-2"><Icon className="w-5 h-5 text-primary" /><h2 className="text-xl font-bold">{title}</h2></div>{items.length ? <div className="grid gap-3">{items}</div> : <div className="text-center py-8 rounded-2xl border border-dashed text-muted-foreground">{empty}</div>}</section>;
}
