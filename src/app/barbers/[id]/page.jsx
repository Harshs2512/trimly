"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import BookingModal from "@/components/BookingModal";
import BarberReviewsSection from "@/components/BarberReviewsSection";
import WorkShowcaseGallery from "@/components/WorkShowcaseGallery";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  MapPin,
  Clock,
  ArrowLeft,
  Scissors,
  CalendarCheck,
  ShieldCheck,
  Users,
  Armchair,
  Camera,
  Eye,
  Star,
} from "lucide-react";

export default function BarberDetail() {
  const params = useParams();
  const router = useRouter();
  const [barber, setBarber] = useState(null);
  const [open, setOpen] = useState(false);
  const [initialServiceKey, setInitialServiceKey] = useState("");
  const [previewImage, setPreviewImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [liveStats, setLiveStats] = useState(null);

  useEffect(() => {
    let mounted = true;
    axios
      .get(`/api/barbers/${params.id}`)
      .then((response) => {
        if (mounted) setBarber(response.data);
      })
      .catch((err) => {
        if (mounted) setError(err.response?.data?.error || "Unable to load barber profile.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [params.id]);

  if (loading)
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-muted-foreground">
        Loading barber profile...
      </div>
    );
  if (!barber)
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Barber unavailable</h1>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => router.push("/barbers")} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Barbers
        </Button>
      </div>
    );

  const waitTime = Math.max(0, barber.waitingTime || 0);
  const waitText = waitTime === 0 ? "Available now" : `Approximately ${waitTime} minutes`;
  const closedDays = barber.closedDays || [];
  const hasPhotos = barber.shopExteriorImage || barber.shopInteriorImage;
  const displayReviewCount = liveStats ? liveStats.reviewCount : Number(barber.reviewCount || 0);
  const displayAverageRating = liveStats && liveStats.reviewCount > 0 ? liveStats.averageRating : Number(barber.averageRating || 0);

  const displayAddress = barber.city && barber.address?.toLowerCase().includes(barber.city.toLowerCase())
    ? barber.address
    : [barber.address, barber.city].filter(Boolean).join(", ");

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero Header */}
      <div className="relative pt-28 pb-16 px-6 bg-gradient-to-b from-primary/10 via-background/60 to-background border-b">
        <div className="container mx-auto max-w-5xl">
          <Button onClick={() => router.push("/barbers")} variant="ghost" size="sm" className="mb-6 -ml-3">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Directory
          </Button>

          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
            <div className="flex items-start md:items-end gap-5">
              <div className="w-20 h-20 md:w-28 md:h-28 rounded-3xl overflow-hidden bg-gradient-to-br from-primary/20 via-zinc-900 to-zinc-950 border-4 border-background shadow-xl flex items-center justify-center text-white font-bold text-3xl uppercase shrink-0">
                {barber.avatar ? (
                  <img src={barber.avatar} alt={barber.shopName} className="w-full h-full object-cover" />
                ) : (
                  barber.shopName?.substring(0, 2) || "TR"
                )}
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">{barber.shopName}</h1>
                  <ShieldCheck className="w-6 h-6 text-green-600 shrink-0" aria-label="Verified shop" />
                  
                  {/* Rating Badge */}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/10 text-yellow-600 border border-yellow-500/20">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    {displayReviewCount > 0 ? (
                      <span>
                        {displayAverageRating.toFixed(1)}{" "}
                        <span className="font-normal text-muted-foreground">
                          ({displayReviewCount} {displayReviewCount === 1 ? "review" : "reviews"})
                        </span>
                      </span>
                    ) : (
                      <span>New on Trimly</span>
                    )}
                  </span>
                </div>
                <p className="flex items-center gap-1.5 text-muted-foreground text-sm">
                  <MapPin className="w-4 h-4 shrink-0 text-muted-foreground/80" />
                  {displayAddress}
                </p>

                {/* Team & Capacity Badges */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-secondary/80 text-foreground border">
                    <Users className="w-3.5 h-3.5 text-primary" /> {barber.staffCount ?? 1} Barbers
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-secondary/80 text-foreground border">
                    <Armchair className="w-3.5 h-3.5 text-primary" /> {barber.chairsCount ?? 1} Styling Chairs
                  </span>
                </div>
              </div>
            </div>

            <Button
              onClick={() => {
                setInitialServiceKey("");
                setOpen(true);
              }}
              disabled={!barber.services?.length}
              size="lg"
              className="rounded-full gap-2 px-8 shadow-lg w-full md:w-auto"
            >
              <CalendarCheck className="w-5 h-5" />
              Book Appointment
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Side: Photos, Specialties & Booking Rules */}
        <aside className="space-y-8">
          {/* Shop Photos Gallery if available */}
          {hasPhotos && (
            <div className="space-y-3">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Camera className="w-4 h-4 text-primary" /> Shop Photos
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {barber.shopExteriorImage && (
                  <div
                    onClick={() => setPreviewImage(barber.shopExteriorImage)}
                    className="group relative cursor-pointer h-28 rounded-2xl overflow-hidden border bg-zinc-950 flex items-center justify-center hover:ring-2 hover:ring-primary transition"
                  >
                    <img
                      src={barber.shopExteriorImage}
                      alt="Storefront"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-medium gap-1">
                      <Eye className="w-3.5 h-3.5" /> Exterior
                    </div>
                  </div>
                )}
                {barber.shopInteriorImage && (
                  <div
                    onClick={() => setPreviewImage(barber.shopInteriorImage)}
                    className="group relative cursor-pointer h-28 rounded-2xl overflow-hidden border bg-zinc-950 flex items-center justify-center hover:ring-2 hover:ring-primary transition"
                  >
                    <img
                      src={barber.shopInteriorImage}
                      alt="Interior Setup"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-medium gap-1">
                      <Eye className="w-3.5 h-3.5" /> Interior
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Current Availability */}
          <div className="bg-card/70 backdrop-blur border rounded-3xl p-6 shadow-sm">
            <h3 className="font-bold text-lg mb-4">Current Availability</h3>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4" /> Estimated wait
              </span>
              <span className="font-semibold">{waitText}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
              This estimate reflects active appointments around the current time; actual service start may vary.
            </p>
          </div>

          {/* Specialties */}
          {!!barber.specialties?.length && (
            <div className="space-y-3">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Scissors className="w-4 h-4 text-primary" /> Signature Specialties
              </h3>
              <div className="flex flex-wrap gap-2">
                {barber.specialties.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {barber.description && (
            <div className="space-y-2">
              <h3 className="font-bold text-lg">About the Shop</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{barber.description}</p>
            </div>
          )}

          {/* Booking Hours */}
          <div className="space-y-3">
            <h3 className="font-bold text-lg">Operating Schedule</h3>
            <div className="space-y-2.5 text-sm bg-card/40 p-4 rounded-2xl border">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Opening time</span>
                <span className="font-medium">{barber.workingHours?.open || "09:00"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Closing time</span>
                <span className="font-medium">{barber.workingHours?.close || "17:00"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Closed days</span>
                <span className="font-medium capitalize text-right">
                  {closedDays.length ? closedDays.join(", ") : "Open all days"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Timezone</span>
                <span className="font-medium">{barber.timezone || "Asia/Kolkata"}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Side: Services Menu & Reviews Section */}
        <div className="lg:col-span-2 space-y-12">
          {/* Services Menu */}
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <h2 className="text-2xl font-bold">Services Menu</h2>
              <span className="text-xs text-muted-foreground font-medium">
                {barber.services?.length || 0} services available
              </span>
            </div>

            {barber.services?.length ? (
              <div className="grid gap-4">
                {barber.services.map((service) => (
                  <button
                    type="button"
                    key={service.id || service.name}
                    className="group flex justify-between items-center p-5 rounded-2xl bg-card/60 backdrop-blur border border-border/80 hover:border-primary/50 transition-all text-left shadow-sm hover:shadow-md"
                    onClick={() => {
                      setInitialServiceKey(service.id || service.name);
                      setOpen(true);
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                        <Scissors className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg group-hover:text-primary transition">
                          {service.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">{service.duration} minutes</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-2xl text-foreground">₹{service.price}</div>
                      <span className="text-xs font-semibold text-primary">Select slot &rarr;</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 rounded-3xl border border-dashed text-muted-foreground">
                No services are available for booking yet.
              </div>
            )}
          </section>

          {/* Work Showcase & Photo Gallery */}
          {!!barber.workPhotos?.length && (
            <section>
              <WorkShowcaseGallery
                photos={barber.workPhotos}
                shopName={barber.shopName}
                onBookClick={() => {
                  setInitialServiceKey("");
                  setOpen(true);
                }}
              />
            </section>
          )}

          {/* Customer Reviews Section */}
          <section>
            <BarberReviewsSection barberId={barber._id} onStatsLoaded={setLiveStats} />
          </section>
        </div>
      </div>

      {/* Booking Modal */}
      {open && (
        <BookingModal
          barber={barber}
          initialServiceKey={initialServiceKey}
          onClose={() => setOpen(false)}
        />
      )}

      {/* Fullscreen Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-2 bg-black/95 border-border/40">
          {previewImage && (
            <div className="relative w-full max-h-[80vh] flex items-center justify-center">
              <img
                src={previewImage}
                alt="Shop preview"
                className="max-w-full max-h-[78vh] object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
