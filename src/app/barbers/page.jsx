// app/barbers/page.jsx
"use client";
import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import BarberCard from "@/components/BarberCard";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Sparkles } from "lucide-react";

export default function BarbersPage() {
  const [list, setList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    axios.get("/api/barbers")
      .then(r => {
        setList(r.data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const filteredList = useMemo(() => {
    if (!searchQuery) return list;
    const lowerQuery = searchQuery.toLowerCase();
    return list.filter(b => 
      (b.shopName && b.shopName.toLowerCase().includes(lowerQuery)) ||
      (b.address && b.address.toLowerCase().includes(lowerQuery)) ||
      (b.services && b.services.some(s => s.name.toLowerCase().includes(lowerQuery)))
    );
  }, [list, searchQuery]);

  return (
    <div className="min-h-screen bg-background pb-20 relative overflow-hidden">
      {/* Decorative Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent/5 blur-[100px] pointer-events-none -z-10" />

      {/* Hero Section */}
      <div className="relative pt-32 pb-16 px-6 container mx-auto max-w-7xl">
        <div className="flex flex-col items-center text-center space-y-6 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-bold uppercase tracking-wider border border-primary/20">
            <Sparkles className="w-4 h-4" /> Discover Premium Grooming
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-foreground">
            Find your perfect <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">Barber</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground font-medium">
            Book top-rated professionals near you instantly and skip the waiting room.
          </p>

          {/* Search Bar */}
          <div className="w-full max-w-xl relative mt-6 shadow-2xl rounded-full group">
            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
               <Search className="w-6 h-6" />
            </div>
            <Input 
              type="text" 
              placeholder="Search by name, service, or location..." 
              className="w-full h-16 pl-16 pr-6 rounded-full bg-card/80 backdrop-blur-md border-2 border-border/80 focus-visible:ring-0 focus-visible:border-primary text-lg transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="flex justify-between items-end mb-8 animate-in fade-in duration-700 delay-200">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Available Barbers</h2>
            <p className="text-muted-foreground">Showing {filteredList.length} results</p>
          </div>
        </div>

        {/* Grid Layout */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {isLoading ? (
             // Skeleton loaders
             Array(8).fill(0).map((_, i) => (
                <div key={i} className="h-96 rounded-3xl bg-card/40 border border-border/50 animate-pulse" />
             ))
          ) : filteredList.length > 0 ? (
            filteredList.map((b, i) => <BarberCard key={b._id} barber={b} index={i} />)
          ) : (
            <div className="col-span-full py-24 flex flex-col items-center justify-center text-center bg-card/30 backdrop-blur-sm rounded-3xl border border-dashed border-border/80 animate-in fade-in">
               <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
                 <MapPin className="w-10 h-10 text-muted-foreground/50" />
               </div>
               <h3 className="text-2xl font-bold mb-2">No barbers found</h3>
               <p className="text-muted-foreground max-w-md">
                 We couldn't find any barbers matching "{searchQuery}". Try adjusting your search criteria.
               </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
