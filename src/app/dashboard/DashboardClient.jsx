"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Calendar, Clock, Scissors, MapPin, ArrowRight, UserCircle2, ChevronRight } from "lucide-react";

export default function DashboardClient({ user, bookings }) {
  const router = useRouter();
  const [greeting, setGreeting] = useState("Hello");
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(null);
  const [newTimeSlot, setNewTimeSlot] = useState("");
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [minDateTime, setMinDateTime] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");

    const now = new Date();
    const tzoffset = (now).getTimezoneOffset() * 60000;
    const localNowISO = (new Date(now - tzoffset)).toISOString().slice(0,16);
    setMinDateTime(localNowISO);
  }, []);

  const upcomingBookings = bookings.filter(b => b.status === "confirmed" || b.status === "pending" || new Date(b.timeSlot) >= new Date());
  const pastBookings = bookings.filter(b => b.status === "cancelled" || new Date(b.timeSlot) < new Date());

  const getStatusBadge = (status) => {
    switch (status) {
      case "confirmed":
        return <span className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full text-xs font-semibold uppercase tracking-wider">Confirmed</span>;
      case "cancelled":
        return <span className="px-3 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full text-xs font-semibold uppercase tracking-wider">Cancelled</span>;
      default:
        return <span className="px-3 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full text-xs font-semibold uppercase tracking-wider">Pending</span>;
    }
  };

  const handleReschedule = async () => {
      setRescheduleLoading(true);
      try {
          await axios.put(`/api/bookings/${rescheduleModalOpen}`, {
              status: 'pending',
              timeSlot: new Date(newTimeSlot).toISOString()
          });
          router.refresh();
          setRescheduleModalOpen(null);
          setNewTimeSlot("");
      } catch(err) {
          alert(err.response?.data?.error || "Failed to reschedule.");
      } finally {
          setRescheduleLoading(false);
      }
  };

  const BookingCard = ({ booking }) => (
    <div className="group relative bg-card/50 backdrop-blur-md border border-border/50 hover:border-primary/50 transition-all duration-300 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
          <Scissors className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-lg text-foreground tracking-tight">{booking.service || "Haircut Service"}</h3>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground font-medium">
             <div className="flex items-center gap-1.5">
               <Calendar className="w-4 h-4" />
               {new Date(booking.timeSlot).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
             </div>
             <div className="hidden sm:block w-1 h-1 rounded-full bg-border" />
             <div className="flex items-center gap-1.5">
               <Clock className="w-4 h-4" />
               {new Date(booking.timeSlot).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
             </div>
          </div>
          {booking.status === 'cancelled' && booking.cancelReason && (
             <div className="mt-2 flex flex-col gap-2">
                 <div className="text-xs font-medium text-red-500/90 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-md inline-flex items-center w-fit">
                   <span className="font-bold mr-1">Reason:</span> {booking.cancelReason}
                 </div>
                 {booking.cancelReason === 'Time slot is busy' && (
                     <Button variant="outline" size="sm" className="w-fit border-primary text-primary hover:bg-primary/10" onClick={() => setRescheduleModalOpen(booking._id)}>
                        Reschedule
                     </Button>
                 )}
             </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-between w-full md:w-auto gap-4">
        {getStatusBadge(booking.status)}
        <Button variant="ghost" size="icon" className="md:hidden group-hover:bg-primary/10 group-hover:text-primary transition-colors rounded-full">
           <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background relative overflow-hidden pb-20">
      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] rounded-full bg-accent/10 blur-[100px] pointer-events-none -z-10" />

      <div className="container mx-auto px-6 pt-24 max-w-5xl">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12 animate-in slide-in-from-bottom-4 duration-700 fade-in">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
              {greeting}, <span className="text-primary">{user.name.split(' ')[0]}</span>
            </h1>
            <p className="text-muted-foreground text-lg font-medium flex items-center gap-2">
              <UserCircle2 className="w-5 h-5" /> Manage your appointments and profile
            </p>
          </div>
          <Link href="/barbers" className="w-full md:w-auto">
             <Button className="w-full md:w-auto h-12 px-6 rounded-full shadow-lg hover:shadow-xl transition-all gap-2 text-md font-semibold">
               Book New Appointment <ArrowRight className="w-4 h-4" />
             </Button>
          </Link>
        </div>

        {/* Barber Promotional Card */}
        {user.role === 'barber' && (
          <div className="mb-12 relative overflow-hidden bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-8 shadow-2xl animate-in slide-in-from-bottom-8 duration-700 fade-in delay-100">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] -z-0" />
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="space-y-2 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-2 border border-primary/20">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Workspace
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-white">Barber Dashboard</h2>
                <p className="text-zinc-400 font-medium max-w-md">Access your schedule, manage services, and track your daily performance seamlessly.</p>
              </div>
              <Link href="/dashboard/barber" className="w-full md:w-auto">
                <Button variant="outline" className="w-full md:w-auto h-12 px-8 rounded-full border-zinc-700 text-zinc-100 hover:bg-zinc-800 hover:text-white transition-all">
                  Enter Workspace
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Bookings Section */}
        <div className="animate-in slide-in-from-bottom-12 duration-700 fade-in delay-200">
          <Tabs defaultValue="upcoming" className="w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold tracking-tight">Your Appointments</h2>
              <TabsList className="bg-muted/50 p-1 rounded-xl">
                <TabsTrigger value="upcoming" className="rounded-lg px-6 font-medium">Upcoming ({upcomingBookings.length})</TabsTrigger>
                <TabsTrigger value="past" className="rounded-lg px-6 font-medium">Past</TabsTrigger>
              </TabsList>
            </div>

            {/* Upcoming Tab Content */}
            <TabsContent value="upcoming" className="mt-0 outline-none">
              <div className="space-y-4">
                {upcomingBookings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center bg-card/30 backdrop-blur-sm rounded-3xl border border-dashed border-border/80">
                     <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                       <Calendar className="w-10 h-10 text-muted-foreground/50" />
                     </div>
                     <h3 className="text-xl font-bold mb-2">No upcoming appointments</h3>
                     <p className="text-muted-foreground mb-6 max-w-sm">You haven't scheduled any haircuts yet. Book your next fresh fade today.</p>
                     <Link href="/barbers">
                       <Button variant="outline" className="rounded-full border-primary/50 hover:bg-primary/10 text-primary transition-colors">
                         Find a Barber Near You
                       </Button>
                     </Link>
                  </div>
                ) : (
                  upcomingBookings.map(booking => <BookingCard key={booking._id.toString()} booking={booking} />)
                )}
              </div>
            </TabsContent>

            {/* Past Tab Content */}
            <TabsContent value="past" className="mt-0 outline-none">
              <div className="space-y-4">
                {pastBookings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center bg-card/30 backdrop-blur-sm rounded-3xl border border-dashed border-border/80">
                     <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                       <Clock className="w-10 h-10 text-muted-foreground/50" />
                     </div>
                     <h3 className="text-xl font-bold mb-2">No past history</h3>
                     <p className="text-muted-foreground">Your past appointments will appear here.</p>
                  </div>
                ) : (
                  pastBookings.map(booking => <BookingCard key={booking._id.toString()} booking={booking} />)
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Reschedule Modal */}
        <Dialog open={!!rescheduleModalOpen} onOpenChange={(open) => !open && setRescheduleModalOpen(null)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Reschedule Appointment</DialogTitle>
                    <DialogDescription>
                        The barber is busy at the previously selected time. Please choose a new date and time.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-primary" /> Select New Date & Time
                        </label>
                        <div className="relative group">
                            <input 
                                type="datetime-local" 
                                value={newTimeSlot}
                                min={minDateTime}
                                onChange={(e) => setNewTimeSlot(e.target.value)}
                                className="w-full h-12 pl-12 pr-4 bg-background border-2 border-border/50 rounded-xl font-medium focus:border-primary focus:ring-0 transition-colors"
                                required
                            />
                            <Clock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setRescheduleModalOpen(null)}>Cancel</Button>
                    <Button onClick={handleReschedule} disabled={rescheduleLoading || !newTimeSlot}>
                        {rescheduleLoading ? "Submitting..." : "Submit Request"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
