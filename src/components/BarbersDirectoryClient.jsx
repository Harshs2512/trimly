"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import BarberCard from "@/components/BarberCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Scissors, Navigation, X, ChevronLeft, ChevronRight } from "lucide-react";

export default function BarbersDirectoryClient({
  initialBarbers = [],
  pagination = { total: 0, page: 1, limit: 24, totalPages: 1 },
  selectedCity = "",
  selectedService = "",
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const hasUserCoords = Boolean(searchParams.get("lat") && searchParams.get("lng"));

  function handleSearchSubmit(e) {
    if (e) e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (search.trim()) {
      params.set("search", search.trim());
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleClearSearch() {
    setSearch("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("search");
    params.set("page", "1");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleGetLocation() {
    if (typeof window === "undefined" || !navigator?.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("lat", pos.coords.latitude.toFixed(6));
        params.set("lng", pos.coords.longitude.toFixed(6));
        params.set("page", "1");
        setLocating(false);
        startTransition(() => {
          router.push(`${pathname}?${params.toString()}`);
        });
      },
      () => {
        setLocating(false);
        setLocationError("Could not retrieve your location. Check browser permissions.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  function handleClearLocation() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("lat");
    params.delete("lng");
    params.set("page", "1");
    setLocationError("");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function goToPage(newPage) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 200, behavior: "smooth" });
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Search & Location Controls */}
      <div className="max-w-2xl mx-auto space-y-4">
        <form onSubmit={handleSearchSubmit} className="relative flex items-center shadow-lg rounded-2xl bg-card border border-border/80">
          <Search className="absolute left-4 w-5 h-5 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search by salon name, service, or locality..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 pr-28 py-6 text-base rounded-2xl border-0 focus-visible:ring-1 focus-visible:ring-primary bg-transparent"
          />
          <div className="absolute right-2 flex items-center gap-1.5">
            {search && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <Button type="submit" size="sm" className="rounded-xl px-4 font-semibold">
              Search
            </Button>
          </div>
        </form>

        {/* Geolocation Button */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            {!hasUserCoords ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGetLocation}
                disabled={locating}
                className="rounded-xl gap-1.5 text-xs h-8 border-primary/30 text-primary hover:bg-primary/10"
              >
                <Navigation className={`w-3.5 h-3.5 ${locating ? "animate-spin" : ""}`} />
                {locating ? "Finding location..." : "Sort by Near Me"}
              </Button>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full font-medium">
                <MapPin className="w-3.5 h-3.5" />
                <span>Sorted by distance to you</span>
                <button
                  type="button"
                  onClick={handleClearLocation}
                  className="hover:text-foreground ml-1"
                  title="Remove location sorting"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {locationError && <span className="text-destructive">{locationError}</span>}
          </div>

          <span className="text-muted-foreground">
            Showing <strong className="text-foreground">{pagination.total}</strong> verified {pagination.total === 1 ? "lounge" : "lounges"}
          </span>
        </div>
      </div>

      {/* Directory Grid */}
      {isPending && (
        <div className="text-center py-6 text-xs text-muted-foreground animate-pulse">
          Updating directory...
        </div>
      )}

      {initialBarbers.length === 0 ? (
        <div className="text-center py-20 border border-dashed rounded-3xl max-w-xl mx-auto p-8 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Scissors className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold">No verified barbers found</h2>
          <p className="text-sm text-muted-foreground">
            {search
              ? `No lounges matched "${search}". Try searching for a broader location or common service like "haircut".`
              : "No verified barbers match the selected filters."}
          </p>
          {(search || hasUserCoords) && (
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                startTransition(() => {
                  router.push(pathname);
                });
              }}
              className="rounded-xl"
            >
              Reset Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {initialBarbers.map((barber, index) => (
            <BarberCard key={barber._id} barber={barber} index={index} />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <nav
          className="flex items-center justify-center gap-2 pt-10"
          aria-label="Barber directory pagination"
        >
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1 || isPending}
            onClick={() => goToPage(pagination.page - 1)}
            className="rounded-xl gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </Button>

          <span className="text-sm text-muted-foreground px-3">
            Page <strong className="text-foreground">{pagination.page}</strong> of{" "}
            <strong>{pagination.totalPages}</strong>
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages || isPending}
            onClick={() => goToPage(pagination.page + 1)}
            className="rounded-xl gap-1"
          >
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        </nav>
      )}
    </div>
  );
}

