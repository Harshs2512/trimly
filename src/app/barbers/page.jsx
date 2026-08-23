"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import BarberCard from "@/components/BarberCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Sparkles, AlertCircle } from "lucide-react";

const PAGE_SIZE = 24;

export default function BarbersPage() {
  const [list, setList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
        if (searchQuery.trim()) params.set("search", searchQuery.trim());
        const response = await axios.get(`/api/barbers?${params}`, { signal: controller.signal });
        setList(response.data.barbers || []);
        setPagination(response.data.pagination || { total: 0, totalPages: 1 });
      } catch (err) {
        if (err.code !== "ERR_CANCELED" && err.name !== "CanceledError") {
          setError("We could not load the barber directory. Please try again.");
          setList([]);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [page, searchQuery]);

  function updateSearch(value) {
    setSearchQuery(value);
    setPage(1);
  }

  return (
    <div className="min-h-screen bg-background pb-20 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none -z-10" />
      <div className="relative pt-28 pb-14 px-6 container mx-auto max-w-7xl">
        <div className="flex flex-col items-center text-center space-y-6 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-bold uppercase tracking-wider border border-primary/20"><Sparkles className="w-4 h-4" /> Barber Directory</div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">Find the right <span className="text-primary">barber</span> for your next visit</h1>
          <p className="text-lg md:text-xl text-muted-foreground">Browse verified shop profiles, compare services and request an available appointment time.</p>
          <div className="w-full max-w-xl relative mt-4 shadow-lg rounded-full group">
            <Search className="w-6 h-6 absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input type="search" placeholder="Search by shop, service or address..." className="w-full h-16 pl-16 pr-6 rounded-full bg-card border-2 text-lg" value={searchQuery} onChange={(event) => updateSearch(event.target.value)} />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 max-w-7xl">
        <div className="mb-8"><h2 className="text-2xl font-bold">Verified Barbers</h2><p className="text-muted-foreground">{isLoading ? "Loading results..." : `${pagination.total} result${pagination.total === 1 ? "" : "s"}`}</p></div>
        {error ? (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-10 text-center text-red-700"><AlertCircle className="w-10 h-10 mx-auto mb-3" /><h3 className="font-bold text-lg">Unable to load barbers</h3><p className="mt-1">{error}</p></div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {isLoading ? Array.from({ length: 8 }, (_, i) => <div key={i} className="h-96 rounded-3xl bg-card/40 border animate-pulse" />) : list.length ? list.map((barber, index) => <BarberCard key={barber._id} barber={barber} index={index} />) : <div className="col-span-full py-24 flex flex-col items-center text-center rounded-3xl border border-dashed"><div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-5"><MapPin className="w-9 h-9 text-muted-foreground" /></div><h3 className="text-2xl font-bold">No matching barbers</h3><p className="text-muted-foreground mt-2">Try a different shop name, service or address.</p></div>}
            </div>
            {!isLoading && pagination.totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-3">
                <Button variant="outline" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
                <span className="text-sm text-muted-foreground">Page {page} of {pagination.totalPages}</span>
                <Button variant="outline" disabled={page >= pagination.totalPages} onClick={() => setPage((value) => Math.min(pagination.totalPages, value + 1))}>Next</Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
