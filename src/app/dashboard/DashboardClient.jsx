"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Clock, Scissors, MapPin, ArrowRight, UserCircle2 } from "lucide-react";

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

export default function DashboardClient({ user, bookings }) {
  const router = useRouter();
  const [cancelBooking, setCancelBooking] = useState(null);
  const [rescheduleBooking, setRescheduleBooking] = useState(null);
  const [date, setDate] = useState(dateInputInTimeZone());
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState("");
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

  const BookingCard = ({ booking }) => (
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
      <div className="flex items-center gap-3 self-stretch md:self-center">
        <span className={`px-3 py-1 rounded-full border text-xs font-semibold uppercase ${statusClass(booking.status)}`}>{booking.status.replace("_", " ")}</span>
        {ACTIVE.has(booking.status) && new Date(booking.timeSlot).getTime() >= Date.now() && <Button variant="ghost" size="sm" className="text-red-600" onClick={() => { setError(""); setCancelBooking(booking); }}>Cancel</Button>}
        {RESCHEDULABLE.has(booking.status) && <Button variant="outline" size="sm" onClick={() => openReschedule(booking)}>Reschedule</Button>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-6 pt-12 max-w-5xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Hello, <span className="text-primary">{(user.name || "there").split(" ")[0]}</span></h1>
            <p className="text-muted-foreground text-lg flex items-center gap-2"><UserCircle2 className="w-5 h-5" />Manage your appointments</p>
          </div>
          <Link href="/barbers"><Button className="h-12 px-6 rounded-full gap-2">Book New Appointment <ArrowRight className="w-4 h-4" /></Button></Link>
        </div>

        {user.role === "barber" && <div className="mb-10 rounded-3xl border bg-card p-6 flex flex-col md:flex-row justify-between gap-4"><div><h2 className="text-2xl font-bold">Barber Workspace</h2><p className="text-muted-foreground">Manage your requests, services and shop profile.</p></div><Link href="/dashboard/barber"><Button variant="outline">Open Workspace</Button></Link></div>}

        <Tabs defaultValue="upcoming">
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6"><h2 className="text-2xl font-bold">Your Appointments</h2><TabsList><TabsTrigger value="upcoming">Upcoming ({upcomingBookings.length})</TabsTrigger><TabsTrigger value="past">History ({pastBookings.length})</TabsTrigger></TabsList></div>
          <TabsContent value="upcoming" className="space-y-4">{upcomingBookings.length ? upcomingBookings.map((booking) => <BookingCard key={booking._id} booking={booking} />) : <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">No upcoming appointments.</div>}</TabsContent>
          <TabsContent value="past" className="space-y-4">{pastBookings.length ? pastBookings.map((booking) => <BookingCard key={booking._id} booking={booking} />) : <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">No booking history yet.</div>}</TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!cancelBooking} onOpenChange={(open) => !open && setCancelBooking(null)}>
        <DialogContent><DialogHeader><DialogTitle>Cancel appointment?</DialogTitle><DialogDescription>This will release the reserved time and notify the barber.</DialogDescription></DialogHeader>{error && <p className="text-sm text-red-600">{error}</p>}<DialogFooter><Button variant="outline" onClick={() => setCancelBooking(null)}>Keep booking</Button><Button variant="destructive" disabled={loading} onClick={cancel}>{loading ? "Cancelling..." : "Cancel appointment"}</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={!!rescheduleBooking} onOpenChange={(open) => !open && setRescheduleBooking(null)}>
        <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Reschedule appointment</DialogTitle><DialogDescription>Select a new available time. The new request will return to pending until the barber accepts it.</DialogDescription></DialogHeader><div className="space-y-4"><input type="date" value={date} min={rescheduleBooking ? dateInputInTimeZone(new Date(), rescheduleBooking.shopTimezone) : dateInputInTimeZone()} max={rescheduleBooking ? addCalendarDays(dateInputInTimeZone(new Date(), rescheduleBooking.shopTimezone), rescheduleBooking.shopBookingHorizonDays || 90) : undefined} onChange={(event) => { setDate(event.target.value); loadAvailability(rescheduleBooking, event.target.value); }} className="w-full h-11 rounded-lg border bg-background px-3" />{availabilityLoading ? <p className="text-sm text-muted-foreground">Checking availability...</p> : <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{slots.map((item) => <Button type="button" key={item.value} variant={slot === item.value ? "default" : "outline"} onClick={() => setSlot(item.value)}>{item.label}</Button>)}</div>}{!availabilityLoading && !slots.length && <p className="text-sm text-muted-foreground">No available times on this date.</p>}{error && <p className="text-sm text-red-600">{error}</p>}</div><DialogFooter><Button variant="outline" onClick={() => setRescheduleBooking(null)}>Cancel</Button><Button onClick={reschedule} disabled={!slot || loading}>{loading ? "Rescheduling..." : "Send new request"}</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}
