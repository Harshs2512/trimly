"use client";

import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Users,
  Scissors,
  CalendarCheck,
  ShieldCheck,
  UserCheck,
  UserX,
  FileText,
  Store,
  Armchair,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  RotateCcw,
} from "lucide-react";

export default function AdminClient({ adminUser, initialUsers, initialBarbers, totals, pageSize }) {
  const [users, setUsers] = useState(initialUsers);
  const [barbers, setBarbers] = useState(initialBarbers);
  const [userPage, setUserPage] = useState(1);
  const [barberPage, setBarberPage] = useState(1);
  const [actionLoading, setActionLoading] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [inspectedBarber, setInspectedBarber] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [error, setError] = useState("");

  const totalUserPages = Math.max(1, Math.ceil(totals.users / pageSize));
  const totalBarberPages = Math.max(1, Math.ceil(totals.barbers / pageSize));

  async function loadUsers(page) {
    setActionLoading("users-page"); setError("");
    try {
      const response = await axios.get(`/api/users?page=${page}&limit=${pageSize}`);
      setUsers(response.data.users); setUserPage(page);
    } catch (err) { setError(err.response?.data?.error || "Failed to load users."); } finally { setActionLoading(null); }
  }

  async function loadBarbers(page) {
    setActionLoading("barbers-page"); setError("");
    try {
      const response = await axios.get(`/api/admin/barbers?page=${page}&limit=${pageSize}`);
      setBarbers(response.data.barbers); setBarberPage(page);
    } catch (err) { setError(err.response?.data?.error || "Failed to load barbers."); } finally { setActionLoading(null); }
  }

  async function inspectBarberDocs(b) {
    setInspectedBarber(b);
    try {
      const res = await axios.get(`/api/barbers/${b._id}`);
      if (res.data) {
        setInspectedBarber((prev) => (prev && prev._id === b._id ? { ...prev, ...res.data } : prev));
      }
    } catch {
      // keep existing b
    }
  }

  async function applyUserChange() {
    const action = confirmAction;
    if (!action || action.type !== "user") return;
    setActionLoading(action.id); setError("");
    try {
      await axios.put(`/api/admin/users/${action.id}`, action.payload);
      setUsers((prev) => prev.map((u) => u._id === action.id ? { ...u, ...action.payload } : u));
      setConfirmAction(null);
    } catch (err) { setError(err.response?.data?.error || "Failed to update user."); } finally { setActionLoading(null); }
  }

  async function updateBarberVerification(id, verificationStatus) {
    setActionLoading(id); setError("");
    try {
      await axios.put(`/api/admin/barbers/${id}`, { verificationStatus });
      setBarbers((prev) => prev.map((b) => b._id === id ? { ...b, verificationStatus } : b));
      if (inspectedBarber && inspectedBarber._id === id) {
        setInspectedBarber((prev) => ({ ...prev, verificationStatus }));
      }
      setConfirmAction(null);
    } catch (err) { setError(err.response?.data?.error || "Failed to update barber verification."); } finally { setActionLoading(null); }
  }

  async function applyConfirmedAction() {
    if (!confirmAction) return;
    if (confirmAction.type === "user") {
      await applyUserChange();
      return;
    }
    if (confirmAction.type === "barber") {
      await updateBarberVerification(confirmAction.id, confirmAction.payload.verificationStatus);
    }
  }

  function confirmBarberStatus(barber, verificationStatus) {
    const rejectingApproved = barber.verificationStatus === "verified" && verificationStatus !== "verified";
    setConfirmAction({
      type: "barber",
      id: barber._id,
      title: verificationStatus === "verified" ? "Approve barber profile?" : "Reject barber profile?",
      description: rejectingApproved
        ? `${barber.shopName} is currently approved. Rejecting it will remove it from public booking and cancel its active appointments.`
        : verificationStatus === "verified"
          ? `Approve ${barber.shopName} for public discovery and booking?`
          : `Reject ${barber.shopName}? It will not be publicly bookable.`,
      payload: { verificationStatus },
    });
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-6 pt-12 max-w-6xl">
        <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-4 border">
              <ShieldCheck className="w-4 h-4" /> Admin Console
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              System <span className="text-primary">Overview</span>
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Manage accounts, review ID & shop documents, and verify barber registrations.
            </p>
          </div>
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { loadBarbers(barberPage); loadUsers(userPage); }}
              className="rounded-xl gap-2 shadow-sm"
              disabled={actionLoading !== null}
            >
              <RotateCcw className="w-4 h-4 text-primary" /> Refresh Data
            </Button>
          </div>
        </div>

        {error && <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-600">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Stat icon={Users} label="Total Users" value={totals.users} />
          <Stat icon={Scissors} label="Registered Barbers" value={totals.barbers} />
          <Stat icon={CalendarCheck} label="Total Bookings" value={totals.bookings} />
        </div>

        <Tabs defaultValue="barbers" className="space-y-8">
          <TabsList className="bg-card border p-1.5 rounded-2xl h-auto">
            <TabsTrigger value="barbers" className="rounded-xl px-6 py-3 gap-2">
              <Scissors className="w-4 h-4" /> Barbers & Verification
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-xl px-6 py-3 gap-2">
              <Users className="w-4 h-4" /> User Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="barbers" className="m-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {barbers.map((b) => (
                <div key={b._id} className="bg-card/60 backdrop-blur border border-border/80 rounded-2xl p-5 space-y-4 flex flex-col justify-between shadow-sm hover:border-primary/40 transition">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-lg leading-snug">{b.shopName}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="w-3.5 h-3.5 shrink-0" /> {b.address}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        b.verificationStatus === "verified"
                          ? "bg-green-500/10 text-green-600 border border-green-500/20"
                          : b.verificationStatus === "rejected"
                          ? "bg-red-500/10 text-red-600 border border-red-500/20"
                          : "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20"
                      }`}>
                        {b.verificationStatus || "pending"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground pt-1 border-t">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-primary" /> {b.staffCount ?? 1} staff
                      </span>
                      <span className="flex items-center gap-1">
                        <Armchair className="w-3.5 h-3.5 text-primary" /> {b.chairsCount ?? 1} chairs
                      </span>
                      <span className="flex items-center gap-1">
                        <Scissors className="w-3.5 h-3.5 text-primary" /> {b.services?.length || 0} services
                      </span>
                      {b.idDocumentImage && (
                        <span className="flex items-center gap-1 text-primary font-medium">
                          <FileText className="w-3.5 h-3.5" /> ID Attached
                        </span>
                      )}
                    </div>

                    {!!b.specialties?.length && (
                      <div className="flex flex-wrap gap-1.5">
                        {b.specialties.slice(0, 3).map((spec) => (
                          <span key={spec} className="px-2 py-0.5 rounded-md bg-secondary/60 text-[11px] font-medium text-foreground">
                            {spec}
                          </span>
                        ))}
                        {b.specialties.length > 3 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-secondary/30 text-[10px] text-muted-foreground">
                            +{b.specialties.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs rounded-xl"
                      onClick={() => inspectBarberDocs(b)}
                    >
                      <Eye className="w-3.5 h-3.5 text-primary" /> Review Docs
                    </Button>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-500/10 rounded-xl"
                        disabled={actionLoading === b._id || b.verificationStatus === "rejected"}
                        onClick={() => confirmBarberStatus(b, "rejected")}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs rounded-xl"
                        disabled={actionLoading === b._id || b.verificationStatus === "verified"}
                        onClick={() => confirmBarberStatus(b, "verified")}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Pager page={barberPage} totalPages={totalBarberPages} loading={actionLoading === "barbers-page"} onPage={loadBarbers} />
          </TabsContent>

          <TabsContent value="users" className="m-0">
            <div className="bg-card/40 border rounded-3xl p-6 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground uppercase text-xs">
                    <th className="pb-4">Name</th>
                    <th className="pb-4">Email</th>
                    <th className="pb-4">Role</th>
                    <th className="pb-4">Status</th>
                    <th className="pb-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((u) => (
                    <tr key={u._id}>
                      <td className="py-4 font-bold">{u.name}</td>
                      <td className="py-4 text-muted-foreground">{u.email}</td>
                      <td className="py-4">
                        <select
                          value={u.role || "user"}
                          disabled={u._id === adminUser.id || actionLoading === u._id}
                          onChange={(e) =>
                            setConfirmAction({
                              type: "user",
                              id: u._id,
                              title: "Change user role?",
                              description: `Change ${u.name} from ${u.role || "user"} to ${e.target.value}? Their existing session will be invalidated.`,
                              payload: { role: e.target.value },
                            })
                          }
                          className="rounded-lg border bg-background px-2 py-1.5"
                        >
                          <option value="user">User</option>
                          <option value="barber">Barber</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${u.active === false ? "bg-red-500/10 text-red-600" : "bg-green-500/10 text-green-600"}`}>
                          {u.active === false ? "Deactivated" : "Active"}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <Button
                          variant={u.active === false ? "default" : "destructive"}
                          size="sm"
                          disabled={u._id === adminUser.id || actionLoading === u._id}
                          onClick={() =>
                            setConfirmAction({
                              type: "user",
                              id: u._id,
                              title: u.active === false ? "Activate user?" : "Deactivate user?",
                              description: `${u.name}'s existing session will be invalidated.`,
                              payload: { active: u.active === false },
                            })
                          }
                        >
                          {u.active === false ? <UserCheck className="w-4 h-4 mr-1" /> : <UserX className="w-4 h-4 mr-1" />}
                          {u.active === false ? "Activate" : "Deactivate"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pager page={userPage} totalPages={totalUserPages} loading={actionLoading === "users-page"} onPage={loadUsers} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmAction?.title}</DialogTitle>
            <DialogDescription>{confirmAction?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button onClick={applyConfirmedAction} disabled={actionLoading === confirmAction?.id}>
              {actionLoading === confirmAction?.id ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inspection Modal for Verification Documents */}
      <Dialog open={!!inspectedBarber} onOpenChange={(open) => !open && setInspectedBarber(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {inspectedBarber && (
            <div className="space-y-6">
              <DialogHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <DialogTitle className="text-2xl font-bold">{inspectedBarber.shopName}</DialogTitle>
                    <DialogDescription className="mt-1 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" /> {inspectedBarber.address}
                    </DialogDescription>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    inspectedBarber.verificationStatus === "verified"
                      ? "bg-green-500/10 text-green-600 border border-green-500/20"
                      : inspectedBarber.verificationStatus === "rejected"
                      ? "bg-red-500/10 text-red-600 border border-red-500/20"
                      : "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20"
                  }`}>
                    {inspectedBarber.verificationStatus || "pending"}
                  </span>
                </div>
              </DialogHeader>

              {/* Capacity & Specs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-secondary/30 p-4 rounded-2xl border">
                <div>
                  <div className="text-xs text-muted-foreground">Staff Barbers</div>
                  <div className="text-lg font-bold flex items-center gap-1.5 mt-0.5">
                    <Users className="w-4 h-4 text-primary" /> {inspectedBarber.staffCount ?? 1}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Styling Chairs</div>
                  <div className="text-lg font-bold flex items-center gap-1.5 mt-0.5">
                    <Armchair className="w-4 h-4 text-primary" /> {inspectedBarber.chairsCount ?? 1}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Working Hours</div>
                  <div className="text-sm font-semibold mt-1">
                    {inspectedBarber.workingHours?.open || "09:00"} - {inspectedBarber.workingHours?.close || "17:00"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Timezone</div>
                  <div className="text-sm font-semibold mt-1 truncate">
                    {inspectedBarber.timezone || "Asia/Kolkata"}
                  </div>
                </div>
              </div>

              {/* Description */}
              {inspectedBarber.description && (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">About Description</div>
                  <p className="text-sm bg-card p-3 rounded-xl border text-muted-foreground leading-relaxed">
                    {inspectedBarber.description}
                  </p>
                </div>
              )}

              {/* Specialties */}
              {!!inspectedBarber.specialties?.length && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Scissors className="w-3.5 h-3.5 text-primary" /> Signature Specialties
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {inspectedBarber.specialties.map((tag) => (
                      <span key={tag} className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Government ID Inspection */}
              <div className="space-y-3 p-4 rounded-2xl bg-secondary/40 border border-primary/20">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheck className="w-4 h-4 text-primary" /> Government ID Document
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block">ID Type:</span>
                    <span className="font-semibold capitalize">
                      {inspectedBarber.idType?.replace(/_/g, " ") || "Aadhaar Card"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Document Number:</span>
                    <span className="font-mono font-bold">
                      {inspectedBarber.idNumber || "Not specified"}
                    </span>
                  </div>
                </div>

                {inspectedBarber.idDocumentImage ? (
                  <div className="mt-3">
                    <span className="text-xs text-muted-foreground block mb-1.5">Uploaded ID Photo / Document:</span>
                    <div
                      onClick={() => setPreviewImage(inspectedBarber.idDocumentImage)}
                      className="cursor-pointer group relative w-full h-52 rounded-xl overflow-hidden border bg-zinc-950 flex items-center justify-center hover:ring-2 hover:ring-primary transition"
                    >
                      <img src={inspectedBarber.idDocumentImage} alt="ID Document" className="w-full h-full object-contain" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold gap-1.5">
                        <Eye className="w-4 h-4" /> Click to zoom
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-yellow-600 bg-yellow-500/10 p-3 rounded-xl border border-yellow-500/20">
                    No government ID proof image was uploaded.
                  </div>
                )}
              </div>

              {/* Shop Photos */}
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-primary" /> Storefront & Interior Photos
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Exterior / Storefront:</span>
                    {inspectedBarber.shopExteriorImage ? (
                      <div
                        onClick={() => setPreviewImage(inspectedBarber.shopExteriorImage)}
                        className="cursor-pointer group relative w-full h-44 rounded-xl overflow-hidden border bg-zinc-950 flex items-center justify-center hover:ring-2 hover:ring-primary transition"
                      >
                        <img src={inspectedBarber.shopExteriorImage} alt="Exterior" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold gap-1.5">
                          <Eye className="w-4 h-4" /> Click to zoom
                        </div>
                      </div>
                    ) : (
                      <div className="h-44 rounded-xl border border-dashed flex items-center justify-center text-xs text-muted-foreground">
                        No exterior photo
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Interior / Chairs Setup:</span>
                    {inspectedBarber.shopInteriorImage ? (
                      <div
                        onClick={() => setPreviewImage(inspectedBarber.shopInteriorImage)}
                        className="cursor-pointer group relative w-full h-44 rounded-xl overflow-hidden border bg-zinc-950 flex items-center justify-center hover:ring-2 hover:ring-primary transition"
                      >
                        <img src={inspectedBarber.shopInteriorImage} alt="Interior" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold gap-1.5">
                          <Eye className="w-4 h-4" /> Click to zoom
                        </div>
                      </div>
                    ) : (
                      <div className="h-44 rounded-xl border border-dashed flex items-center justify-center text-xs text-muted-foreground">
                        No interior photo
                      </div>
                    )}
                  </div>
                </div>

                {/* Work Showcase Photos preview */}
                {!!inspectedBarber.workPhotos?.length && (
                  <div className="space-y-2 pt-2">
                    <span className="text-xs text-muted-foreground block">
                      Work Showcase Photos ({inspectedBarber.workPhotos.length}):
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {inspectedBarber.workPhotos.map((wp, i) => (
                        <div
                          key={wp.id || i}
                          onClick={() => setPreviewImage(wp.url)}
                          className="group relative cursor-pointer aspect-square rounded-xl overflow-hidden border bg-zinc-950 hover:ring-2 hover:ring-primary transition"
                        >
                          <img src={wp.url} alt={wp.caption || "Work"} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[10px] font-medium p-1 text-center">
                            {wp.caption || wp.category || "Zoom"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => setInspectedBarber(null)}>
                  Close
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    disabled={actionLoading === inspectedBarber._id || inspectedBarber.verificationStatus === "rejected"}
                    onClick={() => confirmBarberStatus(inspectedBarber, "rejected")}
                  >
                    <XCircle className="w-4 h-4 mr-1.5" /> Reject Shop
                  </Button>
                  <Button
                    disabled={actionLoading === inspectedBarber._id || inspectedBarber.verificationStatus === "verified"}
                    onClick={() => confirmBarberStatus(inspectedBarber, "verified")}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve Shop
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Fullscreen Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-2 bg-black/95 border-border/40">
          {previewImage && (
            <div className="relative w-full max-h-[80vh] flex items-center justify-center">
              <img src={previewImage} alt="Full preview" className="max-w-full max-h-[78vh] object-contain rounded-lg" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="bg-card/50 border rounded-3xl p-6 flex items-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="w-7 h-7" />
      </div>
      <div>
        <p className="text-sm font-semibold text-muted-foreground uppercase">{label}</p>
        <h3 className="text-3xl font-extrabold">{value}</h3>
      </div>
    </div>
  );
}

function Pager({ page, totalPages, loading, onPage }) {
  return (
    <div className="mt-6 flex items-center justify-end gap-3">
      <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => onPage(page - 1)}>
        Previous
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => onPage(page + 1)}>
        Next
      </Button>
    </div>
  );
}
