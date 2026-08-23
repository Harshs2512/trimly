"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { Trash2, Plus } from "lucide-react";

export default function ServiceManager({ barberId, services = [] }) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [newService, setNewService] = useState({ name: "", price: "", duration: "" });

  async function handleAddService() {
    const name = newService.name.trim();
    const price = Number(newService.price);
    const duration = Number(newService.duration);
    if (name.length < 2 || !Number.isFinite(price) || price <= 0 || !Number.isInteger(duration) || duration < 5 || duration > 480) {
      toast({ title: "Invalid service", description: "Enter a name, price above ₹0, and duration between 5 and 480 minutes.", variant: "destructive" });
      return;
    }
    if (services.some((service) => service.name.trim().toLowerCase() === name.toLowerCase())) {
      toast({ title: "Duplicate service", description: "A service with this name already exists.", variant: "destructive" });
      return;
    }
    await updateServices([...services, { name, price, duration }]);
    setNewService({ name: "", price: "", duration: "" });
  }

  async function updateServices(updatedServices) {
    setLoading(true);
    try {
      const response = await fetch(`/api/barbers/${barberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ services: updatedServices }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Failed to update services");
      toast({ title: "Saved", description: "Services updated successfully." });
      router.refresh();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setLoading(false); }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Services</CardTitle><CardDescription>Manage your service menu. Prices are stored in INR.</CardDescription></CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <Input placeholder="Service name" value={newService.name} onChange={(e) => setNewService({ ...newService, name: e.target.value })} maxLength={80} />
          <Input type="number" min="1" max="1000000" step="0.01" placeholder="Price (₹)" value={newService.price} onChange={(e) => setNewService({ ...newService, price: e.target.value })} />
          <Input type="number" min="5" max="480" step="5" placeholder="Duration (min)" value={newService.duration} onChange={(e) => setNewService({ ...newService, duration: e.target.value })} />
          <Button onClick={handleAddService} disabled={loading}><Plus className="mr-2 h-4 w-4" /> Add</Button>
        </div>
        <div className="rounded-md border overflow-x-auto">
          <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Price</TableHead><TableHead>Duration</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>
            {services.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center">No services added yet.</TableCell></TableRow> : services.map((service, index) => <TableRow key={service.id || `${service.name}-${index}`}><TableCell>{service.name}</TableCell><TableCell>₹{service.price}</TableCell><TableCell>{service.duration} min</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" aria-label={`Remove ${service.name}`} onClick={() => updateServices(services.filter((_, i) => i !== index))} disabled={loading}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell></TableRow>)}
          </TableBody></Table>
        </div>
      </CardContent>
    </Card>
  );
}
