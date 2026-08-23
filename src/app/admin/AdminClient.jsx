"use client";

import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Scissors, CalendarCheck, ShieldCheck, UserCheck, UserX } from "lucide-react";

export default function AdminClient({ adminUser, initialUsers, initialBarbers, totals, pageSize }) {
  const [users, setUsers] = useState(initialUsers);
  const [barbers, setBarbers] = useState(initialBarbers);
  const [userPage, setUserPage] = useState(1);
  const [barberPage, setBarberPage] = useState(1);
  const [actionLoading, setActionLoading] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
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
        <div className="mb-10"><div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-4 border"><ShieldCheck className="w-4 h-4" /> Admin Console</div><h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">System <span className="text-primary">Overview</span></h1><p className="mt-2 text-lg text-muted-foreground">Manage accounts and verify barber registrations.</p></div>
        {error && <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-600">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Stat icon={Users} label="Total Users" value={totals.users} />
          <Stat icon={Scissors} label="Registered Barbers" value={totals.barbers} />
          <Stat icon={CalendarCheck} label="Total Bookings" value={totals.bookings} />
        </div>

        <Tabs defaultValue="users" className="space-y-8">
          <TabsList className="bg-card border p-1.5 rounded-2xl h-auto"><TabsTrigger value="users" className="rounded-xl px-6 py-3 gap-2"><Users className="w-4 h-4" /> Users</TabsTrigger><TabsTrigger value="barbers" className="rounded-xl px-6 py-3 gap-2"><Scissors className="w-4 h-4" /> Barbers</TabsTrigger></TabsList>
          <TabsContent value="users" className="m-0">
            <div className="bg-card/40 border rounded-3xl p-6 overflow-x-auto">
              <table className="w-full text-left text-sm"><thead><tr className="border-b text-muted-foreground uppercase text-xs"><th className="pb-4">Name</th><th className="pb-4">Email</th><th className="pb-4">Role</th><th className="pb-4">Status</th><th className="pb-4 text-right">Actions</th></tr></thead><tbody className="divide-y">
                {users.map((u) => <tr key={u._id}><td className="py-4 font-bold">{u.name}</td><td className="py-4 text-muted-foreground">{u.email}</td><td className="py-4"><select value={u.role || "user"} disabled={u._id === adminUser.id || actionLoading === u._id} onChange={(e) => setConfirmAction({ type: "user", id: u._id, title: "Change user role?", description: `Change ${u.name} from ${u.role || "user"} to ${e.target.value}? Their existing session will be invalidated.`, payload: { role: e.target.value } })} className="rounded-lg border bg-background px-2 py-1.5"><option value="user">User</option><option value="barber">Barber</option><option value="admin">Admin</option></select></td><td className="py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${u.active === false ? "bg-red-500/10 text-red-600" : "bg-green-500/10 text-green-600"}`}>{u.active === false ? "Deactivated" : "Active"}</span></td><td className="py-4 text-right"><Button variant={u.active === false ? "default" : "destructive"} size="sm" disabled={u._id === adminUser.id || actionLoading === u._id} onClick={() => setConfirmAction({ type: "user", id: u._id, title: u.active === false ? "Activate user?" : "Deactivate user?", description: `${u.name}'s existing session will be invalidated.`, payload: { active: u.active === false } })}>{u.active === false ? <UserCheck className="w-4 h-4 mr-1" /> : <UserX className="w-4 h-4 mr-1" />}{u.active === false ? "Activate" : "Deactivate"}</Button></td></tr>)}
              </tbody></table>
              <Pager page={userPage} totalPages={totalUserPages} loading={actionLoading === "users-page"} onPage={loadUsers} />
            </div>
          </TabsContent>

          <TabsContent value="barbers" className="m-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {barbers.map((b) => <div key={b._id} className="bg-card/50 border rounded-2xl p-5 space-y-4"><div><h3 className="font-bold text-lg">{b.shopName}</h3><p className="text-sm text-muted-foreground">{b.address}</p><p className="text-xs mt-1">{b.services?.length || 0} services</p></div><div className="flex items-center justify-between gap-3"><span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${b.verificationStatus === "verified" ? "bg-green-500/10 text-green-600" : b.verificationStatus === "rejected" ? "bg-red-500/10 text-red-600" : "bg-yellow-500/10 text-yellow-600"}`}>{b.verificationStatus || "pending"}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={actionLoading === b._id} onClick={() => confirmBarberStatus(b, "rejected")}>Reject</Button><Button size="sm" disabled={actionLoading === b._id} onClick={() => confirmBarberStatus(b, "verified")}>Approve</Button></div></div></div>)}
            </div>
            <Pager page={barberPage} totalPages={totalBarberPages} loading={actionLoading === "barbers-page"} onPage={loadBarbers} />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}><DialogContent><DialogHeader><DialogTitle>{confirmAction?.title}</DialogTitle><DialogDescription>{confirmAction?.description}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button><Button onClick={applyConfirmedAction} disabled={actionLoading === confirmAction?.id}>{actionLoading === confirmAction?.id ? "Saving..." : "Confirm"}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

function Stat({ icon: Icon, label, value }) { return <div className="bg-card/50 border rounded-3xl p-6 flex items-center gap-4"><div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center"><Icon className="w-7 h-7" /></div><div><p className="text-sm font-semibold text-muted-foreground uppercase">{label}</p><h3 className="text-3xl font-extrabold">{value}</h3></div></div>; }
function Pager({ page, totalPages, loading, onPage }) { return <div className="mt-6 flex items-center justify-end gap-3"><Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => onPage(page - 1)}>Previous</Button><span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span><Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => onPage(page + 1)}>Next</Button></div>; }
