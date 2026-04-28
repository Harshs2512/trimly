"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Scissors, Check, X, User, AlertCircle } from "lucide-react";

export default function BookingManager({ barberId }) {
    const [bookings, setBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null); // stores booking ID being processed

    useEffect(() => {
        fetchBookings();
    }, [barberId]);

    const fetchBookings = () => {
        setIsLoading(true);
        axios.get(`/api/bookings?barberId=${barberId}`)
            .then(res => {
                setBookings(res.data);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch bookings", err);
                setIsLoading(false);
            });
    };

    const updateStatus = async (id, status) => {
        setActionLoading(id);
        try {
            await axios.put(`/api/bookings/${id}`, { status });
            // Refresh list locally
            setBookings(prev => prev.map(b => b._id === id ? { ...b, status } : b));
        } catch (err) {
            console.error("Failed to update status", err);
            alert("Failed to update booking status. Please try again.");
        } finally {
            setActionLoading(null);
        }
    };

    if (isLoading) {
        return (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground font-medium animate-pulse">Loading appointments...</p>
            </div>
        );
    }

    const pending = bookings.filter(b => b.status === "pending");
    const upcoming = bookings.filter(b => b.status === "confirmed" && new Date(b.timeSlot) >= new Date());
    const pastOrCancelled = bookings.filter(b => b.status === "cancelled" || new Date(b.timeSlot) < new Date());

    const BookingCard = ({ booking, isPending }) => (
        <div className="group relative bg-card/50 backdrop-blur-md border border-border/50 hover:border-primary/30 transition-all duration-300 rounded-2xl p-5 shadow-sm hover:shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-start gap-4 w-full md:w-auto">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <User className="w-6 h-6" />
                </div>
                <div className="space-y-1 w-full">
                    <div className="flex justify-between items-start md:block">
                        <h3 className="font-bold text-lg text-foreground tracking-tight">Client #{booking.userId.substring(0, 4)}</h3>
                        {/* Mobile Status Badge */}
                        <div className="md:hidden">
                            <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${booking.status === 'confirmed' ? 'bg-green-500/10 text-green-500' : booking.status === 'cancelled' ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                                {booking.status}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground font-medium">
                        <div className="flex items-center gap-1.5">
                            <Scissors className="w-4 h-4" />
                            {booking.service}
                        </div>
                        <div className="hidden sm:block w-1 h-1 rounded-full bg-border" />
                        <div className="flex items-center gap-1.5 text-foreground">
                            <Calendar className="w-4 h-4 text-primary" />
                            {new Date(booking.timeSlot).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                        <div className="hidden sm:block w-1 h-1 rounded-full bg-border" />
                        <div className="flex items-center gap-1.5 text-foreground">
                            <Clock className="w-4 h-4 text-primary" />
                            {new Date(booking.timeSlot).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0 justify-end">
                {isPending ? (
                    <div className="flex gap-2 w-full md:w-auto">
                        <Button 
                            variant="outline" 
                            className="flex-1 md:flex-none text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/20"
                            onClick={() => updateStatus(booking._id, "cancelled")}
                            disabled={actionLoading === booking._id}
                        >
                            <X className="w-4 h-4 mr-1.5" /> Decline
                        </Button>
                        <Button 
                            className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => updateStatus(booking._id, "confirmed")}
                            disabled={actionLoading === booking._id}
                        >
                            {actionLoading === booking._id ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                            ) : (
                                <Check className="w-4 h-4 mr-1.5" />
                            )}
                            Accept
                        </Button>
                    </div>
                ) : (
                    <div className="hidden md:block">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${booking.status === 'confirmed' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : booking.status === 'cancelled' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'}`}>
                            {booking.status}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            
            {/* Pending Requests Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                    <h2 className="text-xl font-bold tracking-tight">Pending Requests ({pending.length})</h2>
                </div>
                {pending.length === 0 ? (
                    <div className="text-center py-8 bg-card/30 rounded-2xl border border-dashed border-border/80 text-muted-foreground">
                        No pending booking requests.
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {pending.map(b => <BookingCard key={b._id} booking={b} isPending={true} />)}
                    </div>
                )}
            </div>

            {/* Upcoming Appointments Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                    <Calendar className="w-5 h-5 text-green-500" />
                    <h2 className="text-xl font-bold tracking-tight">Upcoming Appointments ({upcoming.length})</h2>
                </div>
                {upcoming.length === 0 ? (
                    <div className="text-center py-8 bg-card/30 rounded-2xl border border-dashed border-border/80 text-muted-foreground">
                        No upcoming appointments confirmed.
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {upcoming.map(b => <BookingCard key={b._id} booking={b} isPending={false} />)}
                    </div>
                )}
            </div>

            {/* Past/Cancelled Section */}
            <div className="space-y-4 opacity-75 hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <h2 className="text-xl font-bold tracking-tight text-muted-foreground">Past & Cancelled</h2>
                </div>
                {pastOrCancelled.length === 0 ? (
                    <div className="text-center py-8 bg-card/30 rounded-2xl border border-dashed border-border/80 text-muted-foreground">
                        No past history.
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {pastOrCancelled.map(b => <BookingCard key={b._id} booking={b} isPending={false} />)}
                    </div>
                )}
            </div>

        </div>
    );
}
