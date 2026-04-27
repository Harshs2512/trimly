"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { barberSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Only pick necessary fields from schema that are editable in this form
// We need to refine the schema slightly for the form if services are handled heavily elsewhere, 
// but for profile we need shopName, address, workingHours.
// The full schema includes userId and services. 
// We'll manage userId in the submit handler.

export default function BarberProfileForm({ user, initialData }) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const defaultValues = {
    shopName: initialData?.shopName || "",
    address: initialData?.address || "",
    workingHours: {
      open: initialData?.workingHours?.open || "09:00",
      close: initialData?.workingHours?.close || "17:00",
    },
    userId: user.id, // Hidden field
    services: initialData?.services || [], // Hidden or handled separately? We'll keep it to satisfy schema
    waitingTime: initialData?.waitingTime || 0
  };

  const form = useForm({
    resolver: zodResolver(barberSchema),
    defaultValues,
  });

  async function onSubmit(data) {
    setLoading(true);
    try {
      // Determine if we are creating or updating
      const method = initialData ? "PUT" : "POST";
      const res = await fetch("/api/barbers", {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to save profile");
      }

      toast({
        title: "Success",
        description: "Profile updated successfully.",
      });
      
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shop Profile</CardTitle>
        <CardDescription>Update your shop details and working hours.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="shopName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shop Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Trimlly Cuts" {...field} />
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
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main St" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="workingHours.open"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opening Time (HH:MM)</FormLabel>
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
                    <FormLabel>Closing Time (HH:MM)</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Profile"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
