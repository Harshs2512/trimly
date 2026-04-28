import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Scissors, ArrowRight, Star } from "lucide-react";

export default function BarberCard({ barber, index = 0 }) {
    // Determine wait time badge color
    const waitTime = barber.waitingTime || 0;
    let waitColor = "bg-green-500/10 text-green-500 border-green-500/20";
    if (waitTime >= 15 && waitTime <= 30) waitColor = "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    else if (waitTime > 30) waitColor = "bg-red-500/10 text-red-500 border-red-500/20";

    // Generate a unique gradient seed based on the barber ID or name
    const seed = barber.shopName ? barber.shopName.charCodeAt(0) % 5 : index % 5;
    const gradients = [
        "from-blue-500/20 to-purple-500/20",
        "from-emerald-500/20 to-teal-500/20",
        "from-orange-500/20 to-red-500/20",
        "from-pink-500/20 to-rose-500/20",
        "from-indigo-500/20 to-cyan-500/20"
    ];

    return (
        <div 
          className="group relative bg-card/60 backdrop-blur-xl border border-border/50 hover:border-primary/50 transition-all duration-500 rounded-3xl overflow-hidden flex flex-col shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] animate-in fade-in slide-in-from-bottom-8"
          style={{ animationFillMode: "both", animationDelay: `${index * 100}ms` }}
        >
            {/* Top Placeholder/Gradient Area */}
            <div className={`h-32 w-full bg-gradient-to-br ${gradients[seed]} relative`}>
               <div className="absolute inset-0 bg-background/20 backdrop-blur-[2px]" />
               {/* Floating Wait Time Badge */}
               <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-full border flex items-center gap-1.5 text-xs font-bold shadow-sm backdrop-blur-md ${waitColor}`}>
                  <Clock className="w-3.5 h-3.5" />
                  {waitTime} min wait
               </div>
            </div>

            {/* Avatar / Logo overlap */}
            <div className="px-6 relative -mt-10 mb-2">
                <div className="w-20 h-20 rounded-2xl bg-zinc-900 border-4 border-background flex items-center justify-center shadow-lg text-white font-bold text-2xl uppercase relative z-10">
                    {barber.shopName ? barber.shopName.substring(0, 2) : "TR"}
                </div>
            </div>

            {/* Content Body */}
            <div className="px-6 pb-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-xl tracking-tight text-foreground group-hover:text-primary transition-colors">{barber.shopName}</h3>
                    <div className="flex items-center gap-1 text-yellow-500 text-sm font-semibold">
                       <Star className="w-4 h-4 fill-current" /> 4.9
                    </div>
                </div>
                
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-4 line-clamp-1">
                    <MapPin className="w-4 h-4 flex-shrink-0" /> {barber.address}
                </p>

                {/* Services Preview Tags */}
                {barber.services && barber.services.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                        {barber.services.slice(0, 3).map((svc, i) => (
                            <span key={i} className="px-2.5 py-1 rounded-md bg-secondary/50 text-secondary-foreground text-xs font-medium flex items-center gap-1">
                                <Scissors className="w-3 h-3" /> {svc.name}
                            </span>
                        ))}
                        {barber.services.length > 3 && (
                            <span className="px-2 py-1 rounded-md bg-secondary/30 text-muted-foreground text-xs font-medium">
                                +{barber.services.length - 3} more
                            </span>
                        )}
                    </div>
                )}

                <div className="mt-auto pt-4 border-t border-border/50">
                    <Link href={`/barbers/${barber._id}`} className="block w-full">
                        <Button className="w-full rounded-xl gap-2 font-semibold group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-none">
                            Book Appointment <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
