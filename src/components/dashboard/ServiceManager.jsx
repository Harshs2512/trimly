"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { Trash2, Plus } from "lucide-react";

export default function ServiceManager({ userId, services = [] }) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [newService, setNewService] = useState({ name: "", price: "", duration: "" });

  const handleAddService = async () => {
    if (!newService.name || !newService.price || !newService.duration) {
      toast({ title: "Error", description: "All fields are required", variant: "destructive" });
      return;
    }

    const updatedServices = [
      ...services,
      {
        name: newService.name,
        price: parseFloat(newService.price),
        duration: parseInt(newService.duration),
      },
    ];

    await updateServices(updatedServices);
    setNewService({ name: "", price: "", duration: "" });
  };

  const handleRemoveService = async (index) => {
    const updatedServices = services.filter((_, i) => i !== index);
    await updateServices(updatedServices);
  };

  const updateServices = async (updatedServices) => {
    setLoading(true);
    try {
      const res = await fetch("/api/barbers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, services: updatedServices }),
      });

      if (!res.ok) throw new Error("Failed to update services");

      toast({ title: "Success", description: "Services updated" });
      router.refresh();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Services</CardTitle>
        <CardDescription>Manage the services you offer.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <Input
            placeholder="Service Name (e.g. Haircut)"
            value={newService.name}
            onChange={(e) => setNewService({ ...newService, name: e.target.value })}
          />
          <Input
            type="number"
            placeholder="Price ($)"
            value={newService.price}
            onChange={(e) => setNewService({ ...newService, price: e.target.value })}
          />
          <Input
            type="number"
            placeholder="Duration (min)"
            value={newService.duration}
            onChange={(e) => setNewService({ ...newService, duration: e.target.value })}
          />
          <Button onClick={handleAddService} disabled={loading}>
            <Plus className="mr-2 h-4 w-4" /> Add
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    No services added yet.
                  </TableCell>
                </TableRow>
              ) : (
                services.map((service, index) => (
                  <TableRow key={index}>
                    <TableCell>{service.name}</TableCell>
                    <TableCell>${service.price}</TableCell>
                    <TableCell>{service.duration} min</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveService(index)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
