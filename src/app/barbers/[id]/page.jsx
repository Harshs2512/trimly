"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import BookingModal from "@/components/BookingModal";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, ArrowLeft, Scissors, CalendarCheck, ShieldCheck } from "lucide-react";

export default function BarberDetail() {
  const params = useParams();
  const router = useRouter();
  const [barber, setBarber] = useState(null);
  const [open, setOpen] = useState(false);
  const [initialServiceKey, setInitialServiceKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    axios.get(`/api/barbers/${params.id}`)
      .then((response) => { if (mounted) setBarber(response.data); })
      .catch((err) => { if (mounted) setError(err.response?.data?.error || "Unable to load barber profile."); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [params.id]);

  if (loading) return <div className="min-h-[70vh] flex items-center justify-center text-muted-foreground">Loading barber profile...</div>;
  if (!barber) return <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4"><h1 className="text-2xl font-bold">Barber unavailable</h1><p className="text-muted-foreground">{error}</p><Button onClick={() => router.push("/barbers")} variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Back to Barbers</Button></div>;

  const waitTime = Math.max(0, barber.waitingTime || 0);
  const waitText = waitTime === 0 ? "Available now" : `Approximately ${waitTime} minutes`;
  const closedDays = barber.closedDays || [];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="relative pt-28 pb-20 px-6 bg-gradient-to-b from-primary/10 to-background border-b">
        <div className="container mx-auto max-w-5xl">
          <Button onClick={() => router.push("/barbers")} variant="ghost" size="sm" className="mb-8 -ml-3"><ArrowLeft className="w-4 h-4 mr-2" />Back to Directory</Button>
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
            <div className="flex items-end gap-6"><div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-zinc-900 border-4 border-background shadow-xl flex items-center justify-center text-white font-bold text-4xl uppercase">{barber.shopName?.substring(0, 2) || "TR"}</div><div className="space-y-2"><div className="flex items-center gap-2"><h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">{barber.shopName}</h1><ShieldCheck className="w-5 h-5 text-green-600" aria-label="Verified barber" /></div><p className="flex items-center gap-1.5 text-muted-foreground"><MapPin className="w-5 h-5" />{barber.address}</p></div></div>
            <Button onClick={() => { setInitialServiceKey(""); setOpen(true); }} disabled={!barber.services?.length} size="lg" className="rounded-full gap-2 px-8"><CalendarCheck className="w-5 h-5" />Request Appointment</Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-6 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        <aside className="space-y-8">
          <div className="bg-card border rounded-3xl p-6"><h3 className="font-bold text-lg mb-4">Current Availability</h3><div className="flex justify-between items-center"><span className="text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4" />Estimated wait</span><span className="font-semibold">{waitText}</span></div><p className="text-xs text-muted-foreground mt-3">This estimate reflects active appointments around the current time; actual service start may vary.</p></div>
          {barber.description && <div><h3 className="font-bold text-lg mb-3">About the Shop</h3><p className="text-muted-foreground leading-relaxed">{barber.description}</p></div>}
          <div><h3 className="font-bold text-lg mb-3">Booking Hours</h3><div className="space-y-2 text-sm"><div className="flex justify-between"><span>Open</span><span>{barber.workingHours?.open || "09:00"}</span></div><div className="flex justify-between"><span>Close</span><span>{barber.workingHours?.close || "17:00"}</span></div><div className="flex justify-between"><span>Closed days</span><span className="capitalize text-right">{closedDays.length ? closedDays.join(", ") : "None configured"}</span></div><div className="flex justify-between"><span>Timezone</span><span>{barber.timezone || "Asia/Kolkata"}</span></div></div></div>
        </aside>

        <section className="lg:col-span-2 space-y-6"><h2 className="text-2xl font-bold border-b pb-4">Services Menu</h2>{barber.services?.length ? <div className="grid gap-4">{barber.services.map((service) => <button type="button" key={service.id || service.name} className="group flex justify-between items-center p-4 rounded-2xl bg-card/40 border hover:border-primary/30 transition text-left" onClick={() => { setInitialServiceKey(service.id || service.name); setOpen(true); }}><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center"><Scissors className="w-5 h-5" /></div><div><h3 className="font-bold text-lg">{service.name}</h3><p className="text-sm text-muted-foreground">{service.duration} minutes</p></div></div><div className="text-right"><div className="font-extrabold text-xl">₹{service.price}</div></div></button>)}</div> : <div className="text-center py-12 rounded-3xl border border-dashed text-muted-foreground">No services are available for booking yet.</div>}</section>
      </div>
      {open && <BookingModal barber={barber} initialServiceKey={initialServiceKey} onClose={() => setOpen(false)} />}
    </div>
  );
}
