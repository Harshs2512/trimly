"use client";

import { useState } from "react";
import BookingModal from "@/components/BookingModal";
import BarberReviewsSection from "@/components/BarberReviewsSection";
import WorkShowcaseGallery from "@/components/WorkShowcaseGallery";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Scissors, CalendarCheck, Camera, Eye } from "lucide-react";

export default function BarberDetailClientInteractive({ barber, children }) {
  const [open, setOpen] = useState(false);
  const [initialServiceKey, setInitialServiceKey] = useState("");
  const [previewImage, setPreviewImage] = useState(null);
  const [liveStats, setLiveStats] = useState(null);

  const hasPhotos = Boolean(barber.shopExteriorImage || barber.shopInteriorImage);

  return (
    <>
      {/* Action Header Button for Booking */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <Button
          onClick={() => {
            setInitialServiceKey("");
            setOpen(true);
          }}
          disabled={!barber.services?.length}
          size="lg"
          className="rounded-full gap-2 px-8 shadow-lg font-semibold w-full sm:w-auto"
        >
          <CalendarCheck className="w-5 h-5" />
          Book Appointment
        </Button>
      </div>

      {/* Services List with direct slot selection */}
      <div className="space-y-6 pt-4">
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
                className="group flex justify-between items-center p-5 rounded-2xl bg-card/60 backdrop-blur border border-border/80 hover:border-primary/50 transition-all text-left shadow-sm hover:shadow-md cursor-pointer"
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
            No services are currently listed for booking.
          </div>
        )}
      </div>

      {/* Work Showcase Gallery */}
      {!!barber.workPhotos?.length && (
        <section className="pt-6">
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

      {/* Real Reviews Section */}
      <section className="pt-6">
        <BarberReviewsSection barberId={barber._id} onStatsLoaded={setLiveStats} />
      </section>

      {/* Booking Modal */}
      {open && (
        <BookingModal
          barber={barber}
          initialServiceKey={initialServiceKey}
          onClose={() => setOpen(false)}
        />
      )}

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={(val) => !val && setPreviewImage(null)}>
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
    </>
  );
}

