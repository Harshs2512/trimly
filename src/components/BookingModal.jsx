// components/BookingModal.jsx
"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Scissors, X, CheckCircle2, AlertCircle } from "lucide-react";

export default function BookingModal({ barber, onClose }) {
    const { data: session } = useSession();
    const [service, setService] = useState((barber.services && barber.services[0]?.name) || "");
    const [timeSlot, setTimeSlot] = useState("");
    const [status, setStatus] = useState("idle"); // idle, loading, success, error
    const [msg, setMsg] = useState("");
    const [minDateTime, setMinDateTime] = useState("");

    // Set default time to next hour
    useEffect(() => {
        const now = new Date();
        const tzoffset = (new Date()).getTimezoneOffset() * 60000;
        const localNowISO = (new Date(now - tzoffset)).toISOString().slice(0,16);
        setMinDateTime(localNowISO);

        now.setHours(now.getHours() + 1);
        now.setMinutes(0);
        // Format to YYYY-MM-DDThh:mm
        const localISOTime = (new Date(now - tzoffset)).toISOString().slice(0,16);
        setTimeSlot(localISOTime);
    }, []);

    async function submit(e) {
        e.preventDefault();
        if (!session) {
            setStatus("error");
            setMsg("Please login to book an appointment.");
            return;
        }
        
        if (!timeSlot) {
            setStatus("error");
            setMsg("Please select a valid date and time.");
            return;
        }

        setStatus("loading");
        try {
            const payload = {
                userId: session.user.id,
                barberId: barber._id,
                service,
                timeSlot: new Date(timeSlot).toISOString()
            };
            await axios.post("/api/bookings", payload);
            setStatus("success");
            setMsg("Appointment confirmed! See you then.");
            setTimeout(() => onClose(), 2000);
        } catch (err) {
            setStatus("error");
            setMsg(err.response?.data?.error || "Failed to create booking.");
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
            
            {/* Modal Dialog */}
            <div className="relative bg-card w-full max-w-lg rounded-3xl shadow-2xl border border-border/80 overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="bg-muted/50 p-6 border-b border-border/50 flex justify-between items-start">
                    <div>
                        <h3 className="text-2xl font-bold tracking-tight">Book Appointment</h3>
                        <p className="text-muted-foreground font-medium">{barber.shopName}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full text-muted-foreground hover:text-foreground">
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Form Body */}
                <div className="p-6">
                    {status === "success" ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in">
                            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="w-10 h-10 text-green-500" />
                            </div>
                            <h3 className="text-2xl font-bold text-foreground">Booking Confirmed!</h3>
                            <p className="text-muted-foreground max-w-xs">{msg}</p>
                        </div>
                    ) : (
                        <form onSubmit={submit} className="space-y-6">
                            {status === "error" && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-500 animate-in shake">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm font-medium">{msg}</p>
                                </div>
                            )}

                            {/* Service Selection */}
                            <div className="space-y-3">
                                <label className="text-sm font-bold flex items-center gap-2">
                                    <Scissors className="w-4 h-4 text-primary" /> Select Service
                                </label>
                                <div className="grid gap-3">
                                    {(barber.services || []).map((s, i) => (
                                        <label 
                                            key={i} 
                                            className={`relative flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${service === s.name ? 'border-primary bg-primary/5' : 'border-border/50 bg-card hover:border-primary/50'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <input 
                                                    type="radio" 
                                                    name="service" 
                                                    value={s.name} 
                                                    checked={service === s.name}
                                                    onChange={() => setService(s.name)}
                                                    className="w-4 h-4 text-primary focus:ring-primary border-muted"
                                                />
                                                <span className="font-semibold">{s.name}</span>
                                            </div>
                                            <span className="font-bold text-lg">₹{s.price}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Date & Time Picker */}
                            <div className="space-y-3">
                                <label className="text-sm font-bold flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-primary" /> Select Date & Time
                                </label>
                                <div className="relative group">
                                    <input 
                                        type="datetime-local" 
                                        value={timeSlot}
                                        min={minDateTime}
                                        onChange={(e) => setTimeSlot(e.target.value)}
                                        className="w-full h-14 pl-12 pr-4 bg-background border-2 border-border/50 rounded-2xl font-medium focus:border-primary focus:ring-0 transition-colors"
                                        required
                                    />
                                    <Clock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-4 flex gap-3">
                                <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-14 rounded-2xl font-bold">
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={status === "loading" || !session} className="flex-1 h-14 rounded-2xl font-bold gap-2">
                                    {status === "loading" ? (
                                        <div className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin" />
                                    ) : "Confirm Booking"}
                                </Button>
                            </div>
                            
                            {!session && (
                                <p className="text-center text-sm text-muted-foreground">
                                    You need to be logged in to book an appointment.
                                </p>
                            )}
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
