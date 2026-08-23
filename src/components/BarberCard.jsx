import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Scissors, ArrowRight } from "lucide-react";

export default function BarberCard({ barber, index = 0 }) {
  const waitTime = Math.max(0, barber.waitingTime || 0);
  const waitLabel = waitTime === 0 ? "Available now" : `~${waitTime} min current wait`;
  const waitClass = waitTime === 0 ? "bg-green-500/10 text-green-600 border-green-500/20" : waitTime <= 30 ? "bg-yellow-500/10 text-yellow-700 border-yellow-500/20" : "bg-red-500/10 text-red-600 border-red-500/20";
  const seed = barber.shopName ? barber.shopName.charCodeAt(0) % 5 : index % 5;
  const gradients = ["from-blue-500/20 to-purple-500/20", "from-emerald-500/20 to-teal-500/20", "from-orange-500/20 to-red-500/20", "from-pink-500/20 to-rose-500/20", "from-indigo-500/20 to-cyan-500/20"];

  return (
    <article className="group relative bg-card/60 backdrop-blur-xl border border-border/50 hover:border-primary/50 transition-all duration-300 rounded-3xl overflow-hidden flex flex-col shadow-sm hover:shadow-lg animate-in fade-in slide-in-from-bottom-8" style={{ animationFillMode: "both", animationDelay: `${Math.min(index, 8) * 80}ms` }}>
      <div className={`h-32 w-full bg-gradient-to-br ${gradients[seed]} relative`}><div className={`absolute top-4 right-4 px-3 py-1.5 rounded-full border flex items-center gap-1.5 text-xs font-bold bg-background/80 backdrop-blur ${waitClass}`}><Clock className="w-3.5 h-3.5" />{waitLabel}</div></div>
      <div className="px-6 relative -mt-10 mb-2"><div className="w-20 h-20 rounded-2xl bg-zinc-900 border-4 border-background flex items-center justify-center shadow-lg text-white font-bold text-2xl uppercase">{barber.shopName?.substring(0, 2) || "TR"}</div></div>
      <div className="px-6 pb-6 flex-1 flex flex-col">
        <h3 className="font-bold text-xl tracking-tight group-hover:text-primary transition-colors">{barber.shopName}</h3>
        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-2 mb-4 line-clamp-2"><MapPin className="w-4 h-4 shrink-0" />{barber.address}</p>
        {!!barber.services?.length && <div className="flex flex-wrap gap-2 mb-6">{barber.services.slice(0, 3).map((service) => <span key={service.id || service.name} className="px-2.5 py-1 rounded-md bg-secondary/50 text-xs font-medium flex items-center gap-1"><Scissors className="w-3 h-3" />{service.name}</span>)}{barber.services.length > 3 && <span className="px-2 py-1 rounded-md bg-secondary/30 text-muted-foreground text-xs">+{barber.services.length - 3} more</span>}</div>}
        <div className="mt-auto pt-4 border-t"><Link href={`/barbers/${barber._id}`} className="block"><Button className="w-full rounded-xl gap-2 font-semibold">View & Book <ArrowRight className="w-4 h-4" /></Button></Link></div>
      </div>
    </article>
  );
}
