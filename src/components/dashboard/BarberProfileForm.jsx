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
import { useState } from "react";
import { useRouter } from "next/navigation";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function BarberProfileForm({ initialData }) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
    },
  });

  const closedDays = form.watch("closedDays") || [];
  function toggleDay(day) {
    form.setValue("closedDays", closedDays.includes(day) ? closedDays.filter((item) => item !== day) : [...closedDays, day], { shouldDirty: true, shouldValidate: true });
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
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Failed to save profile");
      toast({ title: "Saved", description: initialData ? "Shop profile updated." : "Shop profile created and sent for verification." });
      router.refresh();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setLoading(false); }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Shop Profile</CardTitle><CardDescription>Keep public details and booking rules accurate.</CardDescription></CardHeader>
      <CardContent><Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField control={form.control} name="shopName" render={({ field }) => <FormItem><FormLabel>Shop Name</FormLabel><FormControl><Input placeholder="Trimlly Cuts" {...field} /></FormControl><FormMessage /></FormItem>} />
        <FormField control={form.control} name="address" render={({ field }) => <FormItem><FormLabel>Address</FormLabel><FormControl><Input placeholder="Full shop address" {...field} /></FormControl><FormMessage /></FormItem>} />
        <FormField control={form.control} name="description" render={({ field }) => <FormItem><FormLabel>About the Shop</FormLabel><FormControl><Textarea placeholder="Describe your shop, specialties and customer experience." maxLength={1000} {...field} /></FormControl><FormMessage /></FormItem>} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="workingHours.open" render={({ field }) => <FormItem><FormLabel>Opening Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="workingHours.close" render={({ field }) => <FormItem><FormLabel>Closing Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>} />
        </div>
        <div className="space-y-2"><FormLabel>Closed Days</FormLabel><div className="flex flex-wrap gap-2">{DAYS.map((day) => <Button key={day} type="button" size="sm" variant={closedDays.includes(day) ? "default" : "outline"} onClick={() => toggleDay(day)} className="capitalize">{day.slice(0, 3)}</Button>)}</div></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField control={form.control} name="leadTimeMinutes" render={({ field }) => <FormItem><FormLabel>Minimum Notice (min)</FormLabel><FormControl><Input type="number" min="0" max="1440" {...field} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="bookingHorizonDays" render={({ field }) => <FormItem><FormLabel>Booking Horizon (days)</FormLabel><FormControl><Input type="number" min="1" max="365" {...field} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="slotIntervalMinutes" render={({ field }) => <FormItem><FormLabel>Slot Interval (min)</FormLabel><FormControl><Input type="number" min="5" max="120" step="5" {...field} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem>} />
        </div>
        <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Profile"}</Button>
      </form></Form></CardContent>
    </Card>
  );
}
