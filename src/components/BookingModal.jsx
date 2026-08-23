"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Clock, Scissors, CheckCircle2, AlertCircle } from "lucide-react";

function dateInputInTimeZone(date, timeZone) {
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

export default function BookingModal({ barber, onClose, initialServiceKey = "" }) {
  const { data: session } = useSession();
  const services = barber.services || [];
  const timezone = barber.timezone || "Asia/Kolkata";
  const today = dateInputInTimeZone(new Date(), timezone);
  const [serviceKey, setServiceKey] = useState(initialServiceKey || services[0]?.id || services[0]?.name || "");
  const selectedService = useMemo(
    () => services.find((item) => (item.id || item.name) === serviceKey) || services[0],
    [services, serviceKey]
  );
  const [date, setDate] = useState(() => today);
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState("");
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [status, setStatus] = useState("idle");
  const [msg, setMsg] = useState("");

  const maxDate = useMemo(
    () => addCalendarDays(today, barber.bookingHorizonDays || 90),
    [today, barber.bookingHorizonDays],
  );

  useEffect(() => {
    if (!selectedService || !date) {
      setSlots([]);
      setSlot("");
      return;
    }

    const controller = new AbortController();
    async function load() {
      setAvailabilityLoading(true);
      setSlot("");
      setMsg("");
      try {
        const params = new URLSearchParams({ date });
        if (selectedService.id) params.set("serviceId", selectedService.id);
        else params.set("service", selectedService.name);
        const response = await fetch(`/api/barbers/${barber._id}/availability?${params}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load available times.");
        setSlots(data.slots || []);
      } catch (error) {
        if (error.name !== "AbortError") {
          setSlots([]);
          setMsg(error.message);
        }
      } finally {
        setAvailabilityLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [barber._id, date, selectedService]);

  async function submit(event) {
    event.preventDefault();
    if (!session) {
      setStatus("error");
      setMsg("Please sign in before requesting an appointment.");
      return;
    }
    if (!selectedService || !slot) {
      setStatus("error");
      setMsg("Select a service and an available time.");
      return;
    }

    setStatus("loading");
    setMsg("");
    try {
      const payload = {
        barberId: barber._id,
        ...(selectedService.id ? { serviceId: selectedService.id } : { service: selectedService.name }),
        timeSlot: slot,
      };
      const response = await axios.post("/api/bookings", payload);
      setStatus("success");
      setMsg(response.data?.message || "Booking request sent. Awaiting barber confirmation.");
    } catch (error) {
      setStatus("error");
      const serverError = error.response?.data?.error;
      setMsg(typeof serverError === "string" ? serverError : "Failed to create booking request.");
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl p-0">
        <DialogHeader className="p-6 pb-4 border-b text-left">
          <DialogTitle className="text-2xl">Request Appointment</DialogTitle>
          <DialogDescription>{barber.shopName}. Your request is confirmed only after the barber accepts it.</DialogDescription>
        </DialogHeader>

        <div className="p-6">
          {status === "success" ? (
            <div className="py-10 flex flex-col items-center text-center gap-4">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold">Request sent</h3>
              <p className="text-muted-foreground max-w-sm">{msg}</p>
              <Button onClick={onClose} className="mt-2">Done</Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-6">
              {status === "error" && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-600" role="alert">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{msg}</p>
                </div>
              )}

              <fieldset className="space-y-3">
                <legend className="text-sm font-bold flex items-center gap-2"><Scissors className="w-4 h-4 text-primary" /> Select Service</legend>
                {services.length ? (
                  <div className="grid gap-3">
                    {services.map((item) => {
                      const key = item.id || item.name;
                      return (
                        <label key={key} className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition ${serviceKey === key ? "border-primary bg-primary/5" : "border-border/60"}`}>
                          <span className="flex items-center gap-3">
                            <input type="radio" name="service" checked={serviceKey === key} onChange={() => setServiceKey(key)} />
                            <span><span className="font-semibold block">{item.name}</span><span className="text-xs text-muted-foreground">{item.duration} min</span></span>
                          </span>
                          <span className="font-bold">₹{item.price}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">This barber has not configured any services yet.</p>
                )}
              </fieldset>

              <div className="space-y-3">
                <label htmlFor="booking-date" className="text-sm font-bold flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> Select Date</label>
                <input id="booking-date" type="date" value={date} min={today} max={maxDate} onChange={(event) => setDate(event.target.value)} className="w-full h-12 px-4 bg-background border border-border rounded-xl" required />
              </div>

              <fieldset className="space-y-3">
                <legend className="text-sm font-bold flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Available Times</legend>
                {availabilityLoading ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Checking availability...</div>
                ) : slots.length ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {slots.map((item) => (
                      <Button key={item.value} type="button" variant={slot === item.value ? "default" : "outline"} onClick={() => setSlot(item.value)} aria-pressed={slot === item.value}>
                        {item.label}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-3">No available slots for this service on the selected date.</p>
                )}
              </fieldset>

              <div className="pt-2 flex gap-3">
                <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
                <Button type="submit" disabled={status === "loading" || !session || !slot || !selectedService} className="flex-1">
                  {status === "loading" ? "Sending..." : "Send Request"}
                </Button>
              </div>
              {!session && <p className="text-center text-sm text-muted-foreground">Sign in to request an appointment.</p>}
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
