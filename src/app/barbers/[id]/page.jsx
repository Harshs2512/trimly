// app/barbers/[id]/page.jsx
"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import BookingModal from "@/components/BookingModal";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Star, ArrowLeft, Scissors, CalendarCheck } from "lucide-react";

export default function BarberDetail() {
    const params = useParams();
    const router = useRouter();
    const id = params.id;
    const [barber, setBarber] = useState(null);
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => { 
        axios.get(`/api/barbers/${id}`)
            .then(r => { setBarber(r.data); setIsLoading(false); })
            .catch(() => setIsLoading(false)); 
    }, [id]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground font-medium animate-pulse">Loading barber profile...</p>
            </div>
        );
    }

    if (!barber) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
                <h2 className="text-3xl font-bold mb-2">Barber Not Found</h2>
                <p className="text-muted-foreground mb-6">The barber profile you're looking for doesn't exist or has been removed.</p>
                <Button onClick={() => router.push('/barbers')} variant="outline" className="gap-2 rounded-full">
                    <ArrowLeft className="w-4 h-4" /> Back to Barbers
                </Button>
            </div>
        );
    }

    // Determine wait time badge color
    const waitTime = barber.waitingTime || 0;
    let waitColor = "bg-green-500/10 text-green-500 border-green-500/20";
    if (waitTime >= 15 && waitTime <= 30) waitColor = "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    else if (waitTime > 30) waitColor = "bg-red-500/10 text-red-500 border-red-500/20";

    // Generate gradient seed
    const seed = barber.shopName ? barber.shopName.charCodeAt(0) % 5 : 0;
    const gradients = [
        "from-blue-600/30 via-purple-600/20 to-background",
        "from-emerald-600/30 via-teal-600/20 to-background",
        "from-orange-600/30 via-red-600/20 to-background",
        "from-pink-600/30 via-rose-600/20 to-background",
        "from-indigo-600/30 via-cyan-600/20 to-background"
    ];

    return (
        <div className="min-h-screen bg-background pb-24 relative">
            {/* Hero Header Area */}
            <div className={`relative pt-32 pb-24 px-6 bg-gradient-to-b ${gradients[seed]} border-b border-border/50 animate-in fade-in duration-700`}>
                <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px]" />
                
                <div className="container mx-auto max-w-5xl relative z-10">
                    <Button 
                        onClick={() => router.push('/barbers')} 
                        variant="ghost" 
                        size="sm" 
                        className="mb-8 gap-2 text-muted-foreground hover:text-foreground -ml-4"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Directory
                    </Button>

                    <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
                        <div className="flex items-end gap-6">
                            {/* Avatar */}
                            <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-zinc-900 border-4 border-background shadow-2xl flex items-center justify-center text-white font-bold text-4xl md:text-5xl uppercase flex-shrink-0 animate-in slide-in-from-bottom-4">
                                {barber.shopName ? barber.shopName.substring(0, 2) : "TR"}
                            </div>
                            
                            <div className="space-y-2 animate-in slide-in-from-bottom-6">
                                <div className="flex items-center gap-3">
                                    <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground">{barber.shopName}</h1>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm md:text-base font-medium text-muted-foreground">
                                    <span className="flex items-center gap-1.5 text-yellow-500">
                                        <Star className="w-5 h-5 fill-current" /> 4.9 <span className="text-muted-foreground ml-1">(128 reviews)</span>
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <MapPin className="w-5 h-5" /> {barber.address}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="animate-in slide-in-from-bottom-8 delay-100">
                            <Button 
                                onClick={() => setOpen(true)} 
                                size="lg" 
                                className="rounded-full shadow-lg hover:shadow-xl transition-all gap-2 text-md font-semibold px-8 h-14"
                            >
                                <CalendarCheck className="w-5 h-5" /> Book Appointment
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="container mx-auto max-w-5xl px-6 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
                
                {/* Left Column: Info */}
                <div className="lg:col-span-1 space-y-8 animate-in slide-in-from-bottom-12 duration-700 delay-200">
                    
                    {/* Live Status Card */}
                    <div className="bg-card/50 backdrop-blur-md border border-border/80 rounded-3xl p-6 shadow-sm">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Live Status
                        </h3>
                        <div className="flex flex-col gap-4">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground font-medium flex items-center gap-2">
                                    <Clock className="w-4 h-4" /> Current Wait
                                </span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${waitColor}`}>
                                    {waitTime} mins
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground font-medium flex items-center gap-2">
                                    <Scissors className="w-4 h-4" /> Next Available
                                </span>
                                <span className="font-semibold text-foreground">Right now</span>
                            </div>
                        </div>
                    </div>

                    {/* About Section Placeholder */}
                    <div>
                        <h3 className="font-bold text-lg mb-3">About the Shop</h3>
                        <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                            Welcome to {barber.shopName}, your premier destination for top-tier grooming. Our master barbers specialize in precision cuts, classic hot towel shaves, and modern styling. Experience luxury service tailored just for you.
                        </p>
                    </div>

                    {/* Working Hours */}
                    <div>
                        <h3 className="font-bold text-lg mb-3">Working Hours</h3>
                        <div className="space-y-2 text-sm text-muted-foreground font-medium">
                            <div className="flex justify-between"><span className="text-foreground">Mon - Fri</span> <span>9:00 AM - 8:00 PM</span></div>
                            <div className="flex justify-between"><span className="text-foreground">Saturday</span> <span>10:00 AM - 6:00 PM</span></div>
                            <div className="flex justify-between"><span className="text-foreground">Sunday</span> <span className="text-red-500">Closed</span></div>
                        </div>
                    </div>

                </div>

                {/* Right Column: Services */}
                <div className="lg:col-span-2 space-y-6 animate-in slide-in-from-bottom-12 duration-700 delay-300">
                    <div className="flex items-center justify-between border-b border-border/50 pb-4">
                        <h2 className="text-2xl font-bold tracking-tight">Services Menu</h2>
                    </div>

                    {barber.services && barber.services.length > 0 ? (
                        <div className="grid gap-4">
                            {barber.services.map((s, idx) => (
                                <div key={idx} className="group flex justify-between items-center p-4 rounded-2xl bg-card/30 border border-border/50 hover:bg-card hover:border-primary/30 transition-all cursor-pointer" onClick={() => setOpen(true)}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center text-secondary-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                            <Scissors className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-foreground text-lg group-hover:text-primary transition-colors">{s.name}</h4>
                                            <p className="text-sm text-muted-foreground">Premium service</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-extrabold text-xl text-foreground">₹{s.price}</div>
                                        <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Starting at</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-card/30 rounded-3xl border border-dashed border-border/80">
                            <p className="text-muted-foreground">No services listed for this barber yet.</p>
                        </div>
                    )}
                </div>

            </div>

            {open && <BookingModal barber={barber} onClose={() => setOpen(false)} />}
        </div>
    );
}
