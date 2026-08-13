"use client";

import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Scissors, CalendarCheck, ShieldCheck, UserCheck, UserX } from "lucide-react";

export default function AdminClient({ adminUser, initialUsers, initialBarbers, totalBookings }) {
  const [users, setUsers] = useState(initialUsers);
  const [barbers] = useState(initialBarbers);
  const [actionLoading, setActionLoading] = useState(null);

  const toggleUserRole = async (userId, currentRole) => {
    const newRole = currentRole === "admin" ? "user" : currentRole === "barber" ? "admin" : "barber";
    setActionLoading(userId);
    try {
      await axios.put(`/api/admin/users/${userId}`, { role: newRole });
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update user role");
    } finally {
      setActionLoading(null);
    }
  };

  const toggleUserStatus = async (userId, currentActive) => {
    const nextActive = currentActive === false ? true : false;
    setActionLoading(userId);
    try {
      await axios.put(`/api/admin/users/${userId}`, { active: nextActive });
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, active: nextActive } : u));
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update user status");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-[30%] right-[-10%] w-[30%] h-[30%] rounded-full bg-accent/10 blur-[100px] pointer-events-none -z-10" />

      <div className="container mx-auto px-6 pt-24 max-w-6xl">
        {/* Header */}
        <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-4 border border-primary/20">
            <ShieldCheck className="w-4 h-4" /> Admin Console
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-2">
            System <span className="text-primary">Overview</span>
          </h1>
          <p className="text-lg text-muted-foreground font-medium">
            Manage users, barbershop registrations, and platform activity.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="bg-card/50 backdrop-blur-md border border-border/60 rounded-3xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Users</p>
              <h3 className="text-3xl font-extrabold text-foreground">{users.length}</h3>
            </div>
          </div>

          <div className="bg-card/50 backdrop-blur-md border border-border/60 rounded-3xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Scissors className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Registered Barbers</p>
              <h3 className="text-3xl font-extrabold text-foreground">{barbers.length}</h3>
            </div>
          </div>

          <div className="bg-card/50 backdrop-blur-md border border-border/60 rounded-3xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-green-500/10 text-green-500 flex items-center justify-center">
              <CalendarCheck className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Bookings</p>
              <h3 className="text-3xl font-extrabold text-foreground">{totalBookings}</h3>
            </div>
          </div>
        </div>

        {/* Management Tabs */}
        <Tabs defaultValue="users" className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <TabsList className="bg-card/50 backdrop-blur-md border border-border/80 p-1.5 rounded-2xl h-auto flex flex-wrap justify-start gap-2 shadow-sm">
            <TabsTrigger value="users" className="rounded-xl px-6 py-3 font-semibold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              <Users className="w-4 h-4" /> Users ({users.length})
            </TabsTrigger>
            <TabsTrigger value="barbers" className="rounded-xl px-6 py-3 font-semibold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              <Scissors className="w-4 h-4" /> Barbers ({barbers.length})
            </TabsTrigger>
          </TabsList>

          {/* Users Table */}
          <TabsContent value="users" className="m-0 outline-none">
            <div className="bg-card/30 backdrop-blur-md border border-border/50 rounded-3xl p-6 shadow-sm overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground uppercase tracking-wider font-semibold">
                    <th className="pb-4">Name</th>
                    <th className="pb-4">Email</th>
                    <th className="pb-4">Role</th>
                    <th className="pb-4">Status</th>
                    <th className="pb-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {users.map(u => (
                    <tr key={u._id} className="group hover:bg-card/40 transition-colors">
                      <td className="py-4 font-bold text-foreground">{u.name}</td>
                      <td className="py-4 text-muted-foreground">{u.email}</td>
                      <td className="py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${u.role === 'admin' ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20' : u.role === 'barber' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'}`}>
                          {u.role || 'user'}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${u.active === false ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
                          {u.active === false ? 'Deactivated' : 'Active'}
                        </span>
                      </td>
                      <td className="py-4 text-right space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="rounded-lg text-xs font-semibold"
                          onClick={() => toggleUserRole(u._id, u.role || 'user')}
                          disabled={actionLoading === u._id}
                        >
                          Cycle Role
                        </Button>
                        <Button 
                          variant={u.active === false ? "default" : "destructive"} 
                          size="sm"
                          className="rounded-lg text-xs font-semibold"
                          onClick={() => toggleUserStatus(u._id, u.active)}
                          disabled={actionLoading === u._id}
                        >
                          {u.active === false ? <UserCheck className="w-3.5 h-3.5 mr-1" /> : <UserX className="w-3.5 h-3.5 mr-1" />}
                          {u.active === false ? "Activate" : "Deactivate"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Barbers List */}
          <TabsContent value="barbers" className="m-0 outline-none">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {barbers.map(b => (
                <div key={b._id} className="bg-card/40 border border-border/50 rounded-2xl p-5 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-foreground">{b.shopName}</h3>
                    <p className="text-sm text-muted-foreground">{b.address}</p>
                    <p className="text-xs text-primary mt-1 font-semibold">{b.services?.length || 0} services configured</p>
                  </div>
                  <span className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full text-xs font-bold uppercase">
                    Verified
                  </span>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}
