"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Camera,
  Eye,
  Heart,
  ChevronLeft,
  ChevronRight,
  X,
  Scissors,
  CalendarCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WorkShowcaseGallery({ photos = [], shopName = "Barber", onBookClick }) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [likedPhotos, setLikedPhotos] = useState({});

  // Ensure all photos have standard structure
  const safePhotos = useMemo(() => {
    if (!Array.isArray(photos)) return [];
    return photos.filter((p) => p && p.url);
  }, [photos]);

  // Extract unique categories for filter tabs
  const categories = useMemo(() => {
    const set = new Set();
    safePhotos.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return ["all", ...Array.from(set)];
  }, [safePhotos]);

  // Filtered photos based on selected tab
  const filteredPhotos = useMemo(() => {
    if (activeCategory === "all") return safePhotos;
    return safePhotos.filter(
      (p) => (p.category || "").toLowerCase() === activeCategory.toLowerCase()
    );
  }, [safePhotos, activeCategory]);

  // Toggle like/favorite on a photo
  const toggleLike = (photoId, e) => {
    e?.stopPropagation();
    setLikedPhotos((prev) => ({
      ...prev,
      [photoId]: !prev[photoId],
    }));
  };

  // Keyboard navigation for lightbox
  const handleKeyDown = useCallback(
    (e) => {
      if (lightboxIndex === null) return;
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) => (prev > 0 ? prev - 1 : filteredPhotos.length - 1));
      }
      if (e.key === "ArrowRight") {
        setLightboxIndex((prev) => (prev < filteredPhotos.length - 1 ? prev + 1 : 0));
      }
    },
    [lightboxIndex, filteredPhotos.length]
  );

  useEffect(() => {
    if (lightboxIndex !== null) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [lightboxIndex, handleKeyDown]);

  if (!safePhotos.length) return null;

  const currentPhoto = lightboxIndex !== null ? filteredPhotos[lightboxIndex] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2.5">
            <Camera className="w-5 h-5 text-primary" /> Work Showcase & Gallery
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Real cuts, styling, and groomings by <span className="font-medium text-foreground">{shopName}</span>.
          </p>
        </div>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 w-fit">
          {safePhotos.length} {safePhotos.length === 1 ? "Showcase Photo" : "Showcase Photos"}
        </span>
      </div>

      {/* Category filter pills */}
      {categories.length > 2 && (
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const count =
              cat === "all"
                ? safePhotos.length
                : safePhotos.filter((p) => (p.category || "").toLowerCase() === cat.toLowerCase()).length;
            const active = activeCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setActiveCategory(cat);
                  setLightboxIndex(null);
                }}
                className={`text-xs px-3.5 py-1.5 rounded-full font-semibold transition-all flex items-center gap-1.5 ${
                  active
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105"
                    : "bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary border"
                }`}
              >
                <span>{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${active ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Photo Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {filteredPhotos.map((photo, idx) => {
          const photoId = photo.id || photo._id || `p_${idx}`;
          const isLiked = !!likedPhotos[photoId];

          return (
            <div
              key={photoId}
              onClick={() => setLightboxIndex(idx)}
              className="group relative cursor-pointer aspect-square rounded-2xl overflow-hidden bg-zinc-950 border border-border/60 hover:border-primary/50 shadow-sm hover:shadow-xl transition-all duration-300"
            >
              <img
                src={photo.url}
                alt={photo.caption || "Showcase work"}
                className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
                loading="lazy"
              />

              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3" />

              {/* Category tag on top left */}
              {photo.category && (
                <div className="absolute top-2.5 left-2.5 z-10">
                  <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-md bg-black/60 backdrop-blur text-white border border-white/10 shadow-sm">
                    {photo.category}
                  </span>
                </div>
              )}

              {/* Like heart button on top right */}
              <button
                type="button"
                onClick={(e) => toggleLike(photoId, e)}
                aria-label="Save style"
                className={`absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur transition-all duration-200 ${
                  isLiked
                    ? "bg-red-500 text-white scale-110 shadow-md shadow-red-500/30"
                    : "bg-black/50 text-white hover:bg-black/80 opacity-0 group-hover:opacity-100"
                }`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? "fill-white" : ""}`} />
              </button>

              {/* Caption & View cue on bottom */}
              <div className="absolute inset-x-0 bottom-0 p-3 z-10 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                {photo.caption ? (
                  <p className="text-white text-xs font-semibold line-clamp-1 drop-shadow">
                    {photo.caption}
                  </p>
                ) : (
                  <p className="text-white/80 text-[11px] font-medium flex items-center gap-1">
                    <Eye className="w-3 h-3 text-primary" /> View Photo
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {currentPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute top-5 right-5 z-50 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition focus:outline-none"
            aria-label="Close viewer"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navigation - Previous */}
          {filteredPhotos.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((prev) => (prev > 0 ? prev - 1 : filteredPhotos.length - 1));
              }}
              className="absolute left-4 sm:left-8 z-50 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition shadow-lg focus:outline-none"
              aria-label="Previous photo"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Navigation - Next */}
          {filteredPhotos.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((prev) => (prev < filteredPhotos.length - 1 ? prev + 1 : 0));
              }}
              className="absolute right-4 sm:right-8 z-50 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition shadow-lg focus:outline-none"
              aria-label="Next photo"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Main Photo & Caption Box */}
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-zinc-950 max-h-[75vh] flex items-center justify-center">
              <img
                src={currentPhoto.url}
                alt={currentPhoto.caption || "Showcase preview"}
                className="max-h-[75vh] max-w-full object-contain select-none"
              />
            </div>

            {/* Bottom info banner */}
            <div className="mt-4 w-full flex flex-col sm:flex-row items-center justify-between gap-4 text-white px-2">
              <div className="flex items-center gap-3">
                {currentPhoto.category && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-primary text-primary-foreground">
                    {currentPhoto.category}
                  </span>
                )}
                {currentPhoto.caption ? (
                  <p className="text-base font-bold tracking-tight">{currentPhoto.caption}</p>
                ) : (
                  <p className="text-sm text-white/70 italic">Showcase work by {shopName}</p>
                )}
                <span className="text-xs text-white/50 font-mono">
                  {lightboxIndex + 1} / {filteredPhotos.length}
                </span>
              </div>

              {/* Engagement & Booking Action */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleLike(currentPhoto.id || `p_${lightboxIndex}`)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                    likedPhotos[currentPhoto.id || `p_${lightboxIndex}`]
                      ? "bg-red-500 text-white"
                      : "bg-white/10 hover:bg-white/20 text-white"
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${likedPhotos[currentPhoto.id || `p_${lightboxIndex}`] ? "fill-white" : ""}`} />
                  <span>{likedPhotos[currentPhoto.id || `p_${lightboxIndex}`] ? "Liked" : "Like Style"}</span>
                </button>

                {onBookClick && (
                  <Button
                    size="sm"
                    className="gap-1.5 rounded-full text-xs"
                    onClick={() => {
                      setLightboxIndex(null);
                      onBookClick();
                    }}
                  >
                    <CalendarCheck className="w-3.5 h-3.5" /> Book This Style
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
