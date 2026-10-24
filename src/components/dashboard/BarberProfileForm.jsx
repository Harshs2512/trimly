"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { barberSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Store,
  MapPin,
  Clock,
  Calendar,
  Users,
  Armchair,
  Sparkles,
  ShieldCheck,
  Upload,
  X,
  Plus,
  Check,
  FileText,
  Camera,
} from "lucide-react";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const PRESET_SPECIALTIES = [
  "Fade Cuts",
  "Beard Sculpting",
  "Hot Towel Shave",
  "Hair Coloring",
  "Kids Haircut",
  "Head Massage",
  "Skin Fade",
  "Hair Spa",
  "Groom Styling",
  "Facial & Cleanup",
  "Mustache Trim",
  "Keratin Treatment",
];

const ID_TYPES = [
  { value: "aadhaar", label: "Aadhaar Card" },
  { value: "pan", label: "PAN Card" },
  { value: "driving_license", label: "Driving License" },
  { value: "voter_id", label: "Voter ID Card" },
  { value: "trade_license", label: "Trade / Shop License" },
];

function compressImage(file, maxWidth = 1280, maxHeight = 1280, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please select a valid image file (PNG, JPG, WebP)"));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = (e) => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("Failed to load image file"));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function ImageUploadField({ label, description, icon: Icon, value, onChange, error }) {
  const fileInputRef = useRef(null);
  const [fileError, setFileError] = useState("");
  const [compressing, setCompressing] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFileError("Please select a valid image file (PNG, JPG, WebP)");
      return;
    }

    setFileError("");
    setCompressing(true);
    try {
      const compressed = await compressImage(file, 1280, 1280, 0.82);
      onChange(compressed);
    } catch (err) {
      setFileError(err.message || "Failed to process photo");
    } finally {
      setCompressing(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 font-medium text-sm">
        {Icon && <Icon className="w-4 h-4 text-primary" />}
        <span>{label}</span>
      </div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}

      {value ? (
        <div className="relative group w-full h-44 rounded-2xl overflow-hidden border border-border bg-zinc-950 flex items-center justify-center">
          <img src={value} alt={label} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="rounded-full shadow-lg"
              onClick={() => {
                onChange("");
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            >
              <X className="w-4 h-4 mr-1" /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer border-2 border-dashed border-border/80 hover:border-primary/60 hover:bg-primary/5 transition rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-2 bg-card/30"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <Upload className="w-5 h-5" />
          </div>
          <div className="text-xs font-semibold">{compressing ? "Optimizing photo..." : "Click to upload photo"}</div>
          <div className="text-[11px] text-muted-foreground">{compressing ? "Resizing & preparing..." : "PNG, JPG, WebP (auto-optimized)"}</div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      {(fileError || error) && (
        <p className="text-xs font-medium text-destructive">{fileError || error}</p>
      )}
    </div>
  );
}

export default function BarberProfileForm({ initialData }) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customTag, setCustomTag] = useState("");

  const form = useForm({
    resolver: zodResolver(barberSchema),
    defaultValues: {
      shopName: initialData?.shopName || "",
      address: initialData?.address || "",
      description: initialData?.description || "",
      services: initialData?.services || [],
      workingHours: initialData?.workingHours || { open: "09:00", close: "17:00" },
      closedDays: initialData?.closedDays || [],
      timezone: initialData?.timezone || "Asia/Kolkata",
      leadTimeMinutes: initialData?.leadTimeMinutes ?? 30,
      bookingHorizonDays: initialData?.bookingHorizonDays ?? 90,
      slotIntervalMinutes: initialData?.slotIntervalMinutes ?? 30,
      staffCount: initialData?.staffCount ?? 1,
      chairsCount: initialData?.chairsCount ?? 1,
      specialties: initialData?.specialties || [],
      idType: initialData?.idType || "aadhaar",
      idNumber: initialData?.idNumber || "",
      idDocumentImage: initialData?.idDocumentImage || "",
      shopExteriorImage: initialData?.shopExteriorImage || "",
      shopInteriorImage: initialData?.shopInteriorImage || "",
      workPhotos: initialData?.workPhotos || [],
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        shopName: initialData.shopName || "",
        address: initialData.address || "",
        description: initialData.description || "",
        services: initialData.services || [],
        workingHours: initialData.workingHours || { open: "09:00", close: "17:00" },
        closedDays: initialData.closedDays || [],
        timezone: initialData.timezone || "Asia/Kolkata",
        leadTimeMinutes: initialData.leadTimeMinutes ?? 30,
        bookingHorizonDays: initialData.bookingHorizonDays ?? 90,
        slotIntervalMinutes: initialData.slotIntervalMinutes ?? 30,
        staffCount: initialData.staffCount ?? 1,
        chairsCount: initialData.chairsCount ?? 1,
        specialties: initialData.specialties || [],
        idType: initialData.idType || "aadhaar",
        idNumber: initialData.idNumber || "",
        idDocumentImage: initialData.idDocumentImage || "",
        shopExteriorImage: initialData.shopExteriorImage || "",
        shopInteriorImage: initialData.shopInteriorImage || "",
        workPhotos: initialData.workPhotos || [],
      });
    }
  }, [initialData, form]);

  const closedDays = form.watch("closedDays") || [];
  const selectedSpecialties = form.watch("specialties") || [];
  const workPhotos = form.watch("workPhotos") || [];
  const [showcaseError, setShowcaseError] = useState("");
  const showcaseInputRef = useRef(null);

  const handleAddShowcasePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setShowcaseError("Please select an image file (PNG, JPG, WebP)");
      return;
    }
    if (workPhotos.length >= 12) {
      setShowcaseError("Maximum 12 showcase photos reached");
      return;
    }

    setShowcaseError("");
    try {
      const compressedDataUrl = await compressImage(file, 1280, 1280, 0.82);
      const newPhoto = {
        id: `wp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        url: compressedDataUrl,
        caption: "",
        category: "Haircut",
        createdAt: new Date().toISOString(),
      };
      form.setValue("workPhotos", [...workPhotos, newPhoto], { shouldDirty: true, shouldValidate: true });
      if (showcaseInputRef.current) showcaseInputRef.current.value = "";
    } catch (err) {
      setShowcaseError(err.message || "Failed to process photo");
    }
  };

  const handleUpdateShowcasePhoto = (index, updates) => {
    const updated = [...workPhotos];
    updated[index] = { ...updated[index], ...updates };
    form.setValue("workPhotos", updated, { shouldDirty: true, shouldValidate: true });
  };

  const handleRemoveShowcasePhoto = (index) => {
    const updated = workPhotos.filter((_, i) => i !== index);
    form.setValue("workPhotos", updated, { shouldDirty: true, shouldValidate: true });
  };

  function toggleDay(day) {
    form.setValue(
      "closedDays",
      closedDays.includes(day) ? closedDays.filter((item) => item !== day) : [...closedDays, day],
      { shouldDirty: true, shouldValidate: true }
    );
  }

  function toggleSpecialty(tag) {
    const exists = selectedSpecialties.includes(tag);
    form.setValue(
      "specialties",
      exists ? selectedSpecialties.filter((t) => t !== tag) : [...selectedSpecialties, tag],
      { shouldDirty: true, shouldValidate: true }
    );
  }

  function addCustomSpecialty() {
    const trimmed = customTag.trim();
    if (!trimmed) return;
    if (!selectedSpecialties.includes(trimmed)) {
      form.setValue("specialties", [...selectedSpecialties, trimmed], {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    setCustomTag("");
  }

  async function onSubmit(data) {
    setLoading(true);
    try {
      const response = await fetch(initialData ? `/api/barbers/${initialData._id}` : "/api/barbers", {
        method: initialData ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(typeof result.error === "string" ? result.error : "Failed to save profile");
      }
      toast({
        title: "Saved Successfully",
        description: initialData
          ? "Shop profile and onboarding details updated."
          : "Shop profile submitted for verification.",
      });
      router.refresh();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-border/60 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          <Store className="w-6 h-6 text-primary" /> Shop Profile & Verification
        </CardTitle>
        <CardDescription>
          Configure your shop details, team capacity, specialties, and verification documents.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Section 1: Shop Basic Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                <Store className="w-5 h-5 text-primary" /> Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="shopName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shop / Business Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Royal Crown Barbershop" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Shop No., Street, Landmark, City" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>About Your Shop & Experience</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell customers about your shop ambiance, grooming standards, and experience..."
                        maxLength={1000}
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Section 2: Shop Photos & Work Showcase */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                  <Camera className="w-5 h-5 text-primary" /> Shop Photos & Work Showcase
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload storefront photos and showcase your best haircuts, grooming, and styling to attract customers.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="shopExteriorImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <ImageUploadField
                          label="Shop Exterior / Storefront Photo"
                          description="Outside view of your shop entrance or signboard."
                          icon={Store}
                          value={field.value}
                          onChange={field.onChange}
                          error={form.formState.errors.shopExteriorImage?.message}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shopInteriorImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <ImageUploadField
                          label="Shop Interior / Chairs Setup Photo"
                          description="Inside view showcasing your styling stations & seating."
                          icon={Armchair}
                          value={field.value}
                          onChange={field.onChange}
                          error={form.formState.errors.shopInteriorImage?.message}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Work Showcase & Portfolio Multi-Upload */}
              <div className="bg-secondary/30 rounded-2xl border p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" /> Work Showcase & Haircut Portfolio
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Show off your haircuts, fades, beard styling, and shop vibe ({workPhotos.length}/12 photos).
                    </p>
                  </div>
                  <div>
                    <input
                      type="file"
                      ref={showcaseInputRef}
                      accept="image/png, image/jpeg, image/webp"
                      className="hidden"
                      onChange={handleAddShowcasePhoto}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={workPhotos.length >= 12}
                      onClick={() => showcaseInputRef.current?.click()}
                      className="gap-1.5 text-xs rounded-xl"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Showcase Photo
                    </Button>
                  </div>
                </div>

                {showcaseError && (
                  <p className="text-xs text-red-600 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                    {showcaseError}
                  </p>
                )}

                {workPhotos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {workPhotos.map((photo, index) => (
                      <div
                        key={photo.id || index}
                        className="bg-card border rounded-2xl p-3 space-y-3 relative group shadow-sm"
                      >
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-950 border">
                          <img
                            src={photo.url}
                            alt={photo.caption || `Work ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveShowcasePhoto(index)}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center shadow hover:bg-red-700 transition"
                            title="Remove photo"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="space-y-2">
                          <Input
                            placeholder="Caption (e.g. Skin Fade & Beard)"
                            value={photo.caption || ""}
                            maxLength={80}
                            onChange={(e) => handleUpdateShowcasePhoto(index, { caption: e.target.value })}
                            className="h-8 text-xs rounded-lg"
                          />
                          <div className="flex items-center gap-1">
                            {["Haircut", "Beard", "Styling", "Shop"].map((cat) => {
                              const active = (photo.category || "Haircut").toLowerCase() === cat.toLowerCase();
                              return (
                                <button
                                  key={cat}
                                  type="button"
                                  onClick={() => handleUpdateShowcasePhoto(index, { category: cat })}
                                  className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition ${
                                    active
                                      ? "bg-primary text-primary-foreground font-semibold"
                                      : "bg-secondary text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  {cat}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    onClick={() => showcaseInputRef.current?.click()}
                    className="cursor-pointer border-2 border-dashed rounded-2xl p-6 text-center text-muted-foreground hover:border-primary/50 hover:bg-primary/5 transition space-y-2"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-medium">Click to upload photos of your haircuts & grooming work</p>
                    <p className="text-[11px] text-muted-foreground">PNG, JPG, WebP up to 2 MB each (up to 12 photos)</p>
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Capacity & Team */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                <Users className="w-5 h-5 text-primary" /> Capacity & Styling Chairs
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="staffCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-muted-foreground" /> Staff / Working Barbers
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Total active barbers working in your shop.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="chairsCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Armchair className="w-4 h-4 text-muted-foreground" /> Styling Chairs / Stations
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="50"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Number of operating barber chairs available.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Section 4: Specialties & Services Provided */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                <Sparkles className="w-5 h-5 text-primary" /> Specialties & Features
              </h3>
              <p className="text-xs text-muted-foreground">
                Select the signature grooming services and perks your shop provides.
              </p>
              <div className="flex flex-wrap gap-2">
                {PRESET_SPECIALTIES.map((tag) => {
                  const isSelected = selectedSpecialties.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleSpecialty(tag)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-secondary/40 text-muted-foreground border-border hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                      {tag}
                    </button>
                  );
                })}
              </div>

              {/* Custom Tag Input */}
              <div className="flex gap-2 max-w-sm pt-2">
                <Input
                  placeholder="Add custom specialty tag..."
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomSpecialty();
                    }
                  }}
                  className="text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCustomSpecialty}
                  disabled={!customTag.trim()}
                >
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
            </div>

            {/* Section 5: Government ID & Verification */}
            <div className="space-y-4 p-5 rounded-2xl bg-secondary/20 border border-primary/20">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Government Identity Verification</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    For platform safety, provide a valid identity or business document. Your ID details are kept strictly private and only verified by administrators.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <FormField
                  control={form.control}
                  name="idType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID Document Type</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          {ID_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="idNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document / ID Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 1234-5678-9012" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-2">
                <FormField
                  control={form.control}
                  name="idDocumentImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <ImageUploadField
                          label="ID Proof Document Image"
                          description="Clear photo or scan of your selected Government ID or Shop License."
                          icon={FileText}
                          value={field.value}
                          onChange={field.onChange}
                          error={form.formState.errors.idDocumentImage?.message}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Section 6: Working Hours & Booking Rules */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                <Clock className="w-5 h-5 text-primary" /> Hours & Booking Rules
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="workingHours.open"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opening Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="workingHours.close"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Closing Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-2">
                <FormLabel>Closed Days</FormLabel>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((day) => (
                    <Button
                      key={day}
                      type="button"
                      size="sm"
                      variant={closedDays.includes(day) ? "default" : "outline"}
                      onClick={() => toggleDay(day)}
                      className="capitalize"
                    >
                      {day.slice(0, 3)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <FormField
                  control={form.control}
                  name="leadTimeMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Notice (min)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="1440"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Advance notice needed before an appointment starts (e.g. 30 min).
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bookingHorizonDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Booking Horizon (days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="365"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        How far in advance customers can book (e.g. up to 90 days ahead).
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="slotIntervalMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slot Interval (min)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="5"
                          max="120"
                          step="5"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Frequency of slots (e.g. 30 min = 9:00, 9:30, 10:00 AM).
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full sm:w-auto px-8" disabled={loading}>
              {loading ? "Saving..." : initialData ? "Update Shop Profile" : "Submit Shop for Verification"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
