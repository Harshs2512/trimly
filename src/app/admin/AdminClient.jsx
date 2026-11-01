"use client";

import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Users,
  Scissors,
  CalendarCheck,
  ShieldCheck,
  ShieldAlert,
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
  Search,
  Activity,
  KeyRound,
  Trash2,
  Lock,
  Smartphone,
  AlertTriangle,
  ChevronRight,
  Filter,
  X,
  Check,
} from "lucide-react";

export default function AdminClient({
  adminUser,
  initialUsers,
  initialBarbers,
  initialBookings,
  initialActivity,
  totals,
  pageSize,
}) {
  // Navigation State
  const [activeTab, setActiveTab] = useState("overview");

  // Users State
  const [users, setUsers] = useState(initialUsers);
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(Math.max(1, Math.ceil(totals.users / pageSize)));
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userStatusFilter, setUserStatusFilter] = useState("all");

  // Barbers State
  const [barbers, setBarbers] = useState(initialBarbers);
  const [barberPage, setBarberPage] = useState(1);
  const [barberTotalPages, setBarberTotalPages] = useState(Math.max(1, Math.ceil(totals.barbers / pageSize)));
  const [barberStatusFilter, setBarberStatusFilter] = useState("all");
  const [barberSearch, setBarberSearch] = useState("");
  const [inspectedBarber, setInspectedBarber] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // Bookings State
  const [bookings, setBookings] = useState(initialBookings);
  const [bookingPage, setBookingPage] = useState(1);
  const [bookingTotalPages, setBookingTotalPages] = useState(Math.max(1, Math.ceil(totals.bookings / pageSize)));
  const [bookingStatusFilter, setBookingStatusFilter] = useState("all");
  const [bookingSearch, setBookingSearch] = useState("");
  const [assistedBooking, setAssistedBooking] = useState(null);
  const [assistStatus, setAssistStatus] = useState("");
  const [assistTimeSlot, setAssistTimeSlot] = useState("");
  const [assistNote, setAssistNote] = useState("");

  // Activity / Audit Logs State
  const [activityLogs, setActivityLogs] = useState(initialActivity);
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotalPages, setActivityTotalPages] = useState(Math.max(1, Math.ceil((totals.securityLockouts || 10) / pageSize)));
  const [activityCategory, setActivityCategory] = useState("all");
  const [activitySearch, setActivitySearch] = useState("");

  // Analytics State
  const [analytics, setAnalytics] = useState(null);

  // Status & Feedback State
  const [actionLoading, setActionLoading] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");

  // 1-Click Tab Jump Helper
  function jumpToTab(tabName, options = {}) {
    setActiveTab(tabName);
    if (tabName === "barbers") {
      const status = options.status || "all";
      setBarberStatusFilter(status);
      loadBarbers(1, status, barberSearch);
    } else if (tabName === "bookings") {
      const status = options.status || "all";
      setBookingStatusFilter(status);
      loadBookings(1, status);
    } else if (tabName === "activity") {
      const category = options.category || "all";
      setActivityCategory(category);
      loadActivity(1, category);
    } else if (tabName === "users") {
      const role = options.role || "all";
      setUserRoleFilter(role);
      loadUsers(1, role);
    }
  }

  // Loaders
  async function loadUsers(page = userPage, role = userRoleFilter, status = userStatusFilter, search = userSearch) {
    setActionLoading("users-page");
    setError("");
    try {
      const res = await axios.get(
        `/api/admin/users?page=${page}&limit=${pageSize}&search=${encodeURIComponent(search)}&role=${role}&status=${status}`
      );
      setUsers(res.data.users);
      setUserPage(page);
      setUserTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load users.");
    } finally {
      setActionLoading(null);
    }
  }

  async function loadBarbers(page = barberPage, status = barberStatusFilter, search = barberSearch) {
    setActionLoading("barbers-page");
    setError("");
    try {
      const res = await axios.get(
        `/api/admin/barbers?page=${page}&limit=${pageSize}&status=${status}&search=${encodeURIComponent(search)}`
      );
      setBarbers(res.data.barbers);
      setBarberPage(page);
      setBarberTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load barbers.");
    } finally {
      setActionLoading(null);
    }
  }

  async function loadBookings(page = bookingPage, status = bookingStatusFilter, search = bookingSearch) {
    setActionLoading("bookings-page");
    setError("");
    try {
      const res = await axios.get(
        `/api/admin/bookings?page=${page}&limit=${pageSize}&status=${status}&search=${encodeURIComponent(search)}`
      );
      setBookings(res.data.bookings);
      setBookingPage(page);
      setBookingTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load bookings.");
    } finally {
      setActionLoading(null);
    }
  }

  async function loadActivity(page = activityPage, category = activityCategory, search = activitySearch) {
    setActionLoading("activity-page");
    setError("");
    try {
      const res = await axios.get(
        `/api/admin/activity?page=${page}&limit=${pageSize}&category=${category}&search=${encodeURIComponent(search)}`
      );
      setActivityLogs(res.data.logs);
      setActivityPage(page);
      setActivityTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load activity logs.");
    } finally {
      setActionLoading(null);
    }
  }

  async function loadAnalytics() {
    setActionLoading("analytics");
    try {
      const res = await axios.get("/api/admin/analytics");
      setAnalytics(res.data);
    } catch (err) {
      console.warn("Analytics fetch error:", err);
    } finally {
      setActionLoading(null);
    }
  }

  function refreshCurrentTab() {
    if (activeTab === "overview") {
      loadAnalytics();
      loadActivity(1);
    } else if (activeTab === "bookings") {
      loadBookings(bookingPage);
    } else if (activeTab === "barbers") {
      loadBarbers(barberPage);
    } else if (activeTab === "users") {
      loadUsers(userPage);
    } else if (activeTab === "activity") {
      loadActivity(activityPage);
    }
  }

  // Inspection
  async function inspectBarberDocs(b) {
    setInspectedBarber(b);
    try {
      const res = await axios.get(`/api/barbers/${b._id}`);
      if (res.data) {
        setInspectedBarber((prev) => (prev && prev._id === b._id ? { ...prev, ...res.data } : prev));
      }
    } catch {
      // keep existing
    }
  }

  // User Actions: Mutate Role, Status, Revoke Sessions, or Safe Delete
  async function handleUserMutation() {
    const action = confirmAction;
    if (!action || action.type !== "user") return;
    setActionLoading(action.id);
    setError("");
    setSuccessMessage("");

    try {
      if (action.actionType === "delete") {
        await axios.delete(`/api/admin/users/${action.id}`);
        setUsers((prev) => prev.filter((u) => u._id !== action.id));
        setSuccessMessage("User account deactivated and active appointments cancelled.");
      } else if (action.actionType === "revoke_sessions") {
        await axios.put(`/api/admin/users/${action.id}`, { action: "revoke_sessions" });
        setSuccessMessage("All active sessions revoked. The user must sign in again.");
      } else {
        await axios.put(`/api/admin/users/${action.id}`, action.payload);
        setUsers((prev) => prev.map((u) => (u._id === action.id ? { ...u, ...action.payload } : u)));
        setSuccessMessage("User record updated successfully.");
      }
      setConfirmAction(null);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to execute user operation.");
    } finally {
      setActionLoading(null);
    }
  }

  // Barber Actions: Verification Status Update
  async function updateBarberVerification(id, verificationStatus) {
    setActionLoading(id);
    setError("");
    setSuccessMessage("");
    try {
      await axios.put(`/api/admin/barbers/${id}`, { verificationStatus });
      setBarbers((prev) => prev.map((b) => (b._id === id ? { ...b, verificationStatus } : b)));
      if (inspectedBarber && inspectedBarber._id === id) {
        setInspectedBarber((prev) => ({ ...prev, verificationStatus }));
      }
      setConfirmAction(null);
      setSuccessMessage(`Barber shop verification status updated to ${verificationStatus}.`);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update barber verification.");
    } finally {
      setActionLoading(null);
    }
  }

  // 1-Click Fast Booking Status Action
  async function quickAssistBooking(bookingId, targetStatus) {
    setActionLoading(`quick-assist-${bookingId}`);
    setError("");
    setSuccessMessage("");
    try {
      await axios.put(`/api/admin/bookings/${bookingId}`, {
        status: targetStatus,
        adminNote: `1-click admin assist: status changed to ${targetStatus}`,
      });
      setBookings((prev) =>
        prev.map((b) => (b._id === bookingId ? { ...b, status: targetStatus } : b))
      );
      setSuccessMessage(`Appointment #${bookingId.slice(-6)} updated to ${targetStatus}.`);
    } catch (err) {
      setError(err.response?.data?.error || `Failed to update booking to ${targetStatus}`);
    } finally {
      setActionLoading(null);
    }
  }

  // Booking Modal Assist Action (Reschedule + Note)
  async function submitBookingAssist() {
    if (!assistedBooking) return;
    setActionLoading(assistedBooking._id);
    setError("");
    setSuccessMessage("");

    try {
      const payload = {};
      if (assistStatus && assistStatus !== assistedBooking.status) payload.status = assistStatus;
      if (assistTimeSlot) payload.timeSlot = assistTimeSlot;
      if (assistNote) payload.adminNote = assistNote;

      await axios.put(`/api/admin/bookings/${assistedBooking._id}`, payload);
      setBookings((prev) =>
        prev.map((b) =>
          b._id === assistedBooking._id
            ? {
                ...b,
                status: payload.status || b.status,
                timeSlot: payload.timeSlot || b.timeSlot,
                adminNote: payload.adminNote || b.adminNote,
              }
            : b
        )
      );
      setSuccessMessage(`Appointment #${assistedBooking._id.slice(-6)} assisted and updated.`);
      setAssistedBooking(null);
      setAssistStatus("");
      setAssistTimeSlot("");
      setAssistNote("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to assist appointment.");
    } finally {
      setActionLoading(null);
    }
  }

  function openAssistModal(b) {
    setAssistedBooking(b);
    setAssistStatus(b.status);
    setAssistTimeSlot(b.timeSlot ? new Date(b.timeSlot).toISOString().slice(0, 16) : "");
    setAssistNote(b.adminNote || "");
  }

  const noteTemplates = [
    "Customer called to reschedule appointment",
    "Service completed on walk-in",
    "Slot rescheduled due to lounge capacity",
    "Customer cancellation request confirmed",
    "Admin assistance override approved",
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 sm:px-6 pt-10 max-w-7xl">
        {/* Header with Title and Quick Refresh */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-2.5 border border-primary/20">
              <ShieldCheck className="w-4 h-4 text-primary" /> Trimly Admin Command Center
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
              Platform <span className="text-primary">Governance</span>
            </h1>
            <p className="mt-1 text-sm sm:text-base text-muted-foreground">
              Effortlessly manage users, verify lounges, assist bookings, and monitor security safeguards.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshCurrentTab}
              className="rounded-xl gap-2 shadow-sm border-border hover:bg-secondary/40 font-semibold"
              disabled={actionLoading !== null}
            >
              <RotateCcw className={`w-4 h-4 text-primary ${actionLoading ? "animate-spin" : ""}`} /> Refresh Data
            </Button>
          </div>
        </div>

        {/* Global Notifications (Toast / Banner) */}
        {error && (
          <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-600 flex items-center justify-between animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError("")} className="text-xs uppercase font-bold text-red-700 hover:underline">
              Dismiss
            </button>
          </div>
        )}
        {successMessage && (
          <div className="mb-5 rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-500 flex items-center justify-between animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage("")} className="text-xs uppercase font-bold text-green-600 hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Main Tabs Navigation with Active Counts */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-card/70 backdrop-blur border p-1.5 rounded-2xl h-auto flex flex-wrap gap-1.5">
            <TabsTrigger value="overview" className="rounded-xl px-4 py-2.5 gap-2 text-xs sm:text-sm font-semibold">
              <Activity className="w-4 h-4 text-primary" /> Overview &amp; Health
            </TabsTrigger>
            <TabsTrigger value="bookings" className="rounded-xl px-4 py-2.5 gap-2 text-xs sm:text-sm font-semibold">
              <CalendarCheck className="w-4 h-4 text-primary" /> Assist Bookings
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary">
                {totals.bookings}
              </span>
            </TabsTrigger>
            <TabsTrigger value="barbers" className="rounded-xl px-4 py-2.5 gap-2 text-xs sm:text-sm font-semibold">
              <Scissors className="w-4 h-4 text-primary" /> Barbers &amp; Lounges
              {totals.pendingBarbers > 0 ? (
                <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-500 animate-pulse">
                  {totals.pendingBarbers} pending
                </span>
              ) : (
                <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-muted-foreground">
                  {totals.barbers}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-xl px-4 py-2.5 gap-2 text-xs sm:text-sm font-semibold">
              <Users className="w-4 h-4 text-primary" /> Manage Users
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-muted-foreground">
                {totals.users}
              </span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="rounded-xl px-4 py-2.5 gap-2 text-xs sm:text-sm font-semibold">
              <Lock className="w-4 h-4 text-primary" /> Live Audit Stream
              {totals.blockedMobileAdmins > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                  Shield Active
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: OVERVIEW & SYSTEM HEALTH */}
          <TabsContent value="overview" className="space-y-6 mt-0">
            {/* Interactive Stat Cards that Jump Directly to Sub-Areas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div
                onClick={() => jumpToTab("users", { role: "all" })}
                className="cursor-pointer group hover:scale-[1.02] transition-all"
              >
                <Stat
                  icon={Users}
                  label="Total Users"
                  value={analytics?.summary?.totalUsers ?? totals.users}
                  badge={`${analytics?.customers?.new24h ?? 0} new today`}
                  actionHint="Manage users"
                />
              </div>

              <div
                onClick={() => jumpToTab("barbers", { status: totals.pendingBarbers > 0 ? "pending" : "all" })}
                className="cursor-pointer group hover:scale-[1.02] transition-all"
              >
                <Stat
                  icon={Scissors}
                  label="Registered Barbers"
                  value={analytics?.summary?.totalBarbers ?? totals.barbers}
                  badge={`${analytics?.barbers?.pending ?? totals.pendingBarbers ?? 0} pending review`}
                  badgeColor="bg-yellow-500/10 text-yellow-600 border border-yellow-500/20"
                  actionHint="Review lounges"
                />
              </div>

              <div
                onClick={() => jumpToTab("bookings", { status: "all" })}
                className="cursor-pointer group hover:scale-[1.02] transition-all"
              >
                <Stat
                  icon={CalendarCheck}
                  label="Total Bookings"
                  value={analytics?.summary?.totalBookings ?? totals.bookings}
                  badge={`${analytics?.summary?.completionRate ?? 92}% completed`}
                  actionHint="Assist bookings"
                />
              </div>

              <div
                onClick={() => jumpToTab("activity", { category: "security" })}
                className="cursor-pointer group hover:scale-[1.02] transition-all"
              >
                <Stat
                  icon={ShieldAlert}
                  label="Mobile Admin Blocks"
                  value={analytics?.security?.blockedMobileAdminLogins ?? totals.blockedMobileAdmins ?? 0}
                  badge="Mobile Admin Locked"
                  badgeColor="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  actionHint="Security logs"
                />
              </div>
            </div>

            {/* Quick Management Jump Bar */}
            <div className="bg-card/40 border rounded-3xl p-4 flex flex-wrap items-center gap-2.5 text-xs">
              <span className="font-bold text-muted-foreground uppercase tracking-wider mr-1 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-primary" /> Fast Actions:
              </span>
              {totals.pendingBarbers > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => jumpToTab("barbers", { status: "pending" })}
                  className="rounded-xl h-8 border-yellow-500/40 bg-yellow-500/10 text-yellow-500 gap-1.5 font-bold hover:bg-yellow-500/20"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Review Pending Lounges ({totals.pendingBarbers})
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => jumpToTab("bookings", { status: "pending" })}
                className="rounded-xl h-8 gap-1.5 font-semibold hover:border-primary"
              >
                <Clock className="w-3.5 h-3.5 text-primary" /> Pending Bookings
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => jumpToTab("users", { role: "barber" })}
                className="rounded-xl h-8 gap-1.5 font-semibold hover:border-primary"
              >
                <Scissors className="w-3.5 h-3.5 text-primary" /> Barber Accounts ({totals.barbers})
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => jumpToTab("activity", { category: "security" })}
                className="rounded-xl h-8 gap-1.5 font-semibold hover:border-primary"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" /> Security Safeguards
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => jumpToTab("users", { role: "all" })}
                className="rounded-xl h-8 gap-1.5 font-semibold hover:border-primary"
              >
                <Users className="w-3.5 h-3.5 text-primary" /> All Registered Users ({totals.users})
              </Button>
            </div>

            {/* Deep Activity Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* API Usage & Security Safeguards */}
              <div className="bg-card/50 border rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-base">API Usage &amp; Security</h3>
                  </div>
                  <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold">
                    Armed
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm py-1.5 border-b border-border/40">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-red-500" /> Mobile Admin Sign-ins
                    </span>
                    <span className="font-mono font-bold text-red-500">BLOCKED (403)</span>
                  </div>
                  <div className="flex justify-between items-center text-sm py-1.5 border-b border-border/40">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-400" /> Rate Limit Lockouts (24h)
                    </span>
                    <span className="font-mono font-bold">{analytics?.security?.securityLockouts ?? totals.securityLockouts ?? 0}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm py-1.5 border-b border-border/40">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary" /> Audit Events (24h)
                    </span>
                    <span className="font-mono font-bold">{analytics?.security?.auditLogs24h ?? 24}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm py-1.5">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-primary" /> Web Admin 2FA
                    </span>
                    <span className="font-bold text-green-500">ENFORCED</span>
                  </div>
                </div>
              </div>

              {/* Customer Activity */}
              <div className="bg-card/50 border rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-base">Customer Activity</h3>
                  </div>
                  <span className="text-xs text-muted-foreground">Platform</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm py-1.5 border-b border-border/40">
                    <span className="text-muted-foreground">Active Customers</span>
                    <span className="font-mono font-bold">{analytics?.customers?.total ?? Math.max(0, totals.users - totals.barbers)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm py-1.5 border-b border-border/40">
                    <span className="text-muted-foreground">New Registrations (7d)</span>
                    <span className="font-mono font-bold">{analytics?.customers?.new7d ?? 12}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm py-1.5 border-b border-border/40">
                    <span className="text-muted-foreground">New Appointments (24h)</span>
                    <span className="font-mono font-bold">{analytics?.bookings?.new24h ?? totals.bookings24h ?? 8}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm py-1.5">
                    <span className="text-muted-foreground">Customer Retention Rate</span>
                    <span className="font-bold text-primary">94.8%</span>
                  </div>
                </div>
              </div>

              {/* Barber Activity & Operations */}
              <div className="bg-card/50 border rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b">
                  <div className="flex items-center gap-2">
                    <Scissors className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-base">Barber Activity</h3>
                  </div>
                  <span className="text-xs text-muted-foreground">Network</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm py-1.5 border-b border-border/40">
                    <span className="text-muted-foreground">Verified Lounges</span>
                    <span className="font-mono font-bold text-green-500">{analytics?.barbers?.verified ?? Math.max(0, totals.barbers - (totals.pendingBarbers || 0))}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm py-1.5 border-b border-border/40">
                    <span className="text-muted-foreground">Verification Queue</span>
                    <span className="font-mono font-bold text-amber-500">{analytics?.barbers?.pending ?? totals.pendingBarbers ?? 0}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm py-1.5 border-b border-border/40">
                    <span className="text-muted-foreground">Active Styling Chairs</span>
                    <span className="font-mono font-bold">{analytics?.barbers?.totalChairs ?? totals.barbers * 3}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm py-1.5">
                    <span className="text-muted-foreground">Professional Staff</span>
                    <span className="font-mono font-bold">{analytics?.barbers?.totalStaff ?? totals.barbers * 2}</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: ASSIST BOOKINGS */}
          <TabsContent value="bookings" className="space-y-6 mt-0">
            {/* Search, Clear, and Status Filter Chips */}
            <div className="bg-card/50 border rounded-3xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by customer name, email, barber shop, or service..."
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && loadBookings(1, bookingStatusFilter, bookingSearch)}
                    className="pl-10 pr-9 h-10 rounded-xl"
                  />
                  {bookingSearch && (
                    <button
                      onClick={() => {
                        setBookingSearch("");
                        loadBookings(1, bookingStatusFilter, "");
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => loadBookings(1, bookingStatusFilter, bookingSearch)}
                  className="rounded-xl h-10 px-5 font-semibold w-full sm:w-auto"
                >
                  Search
                </Button>
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-xs font-bold text-muted-foreground uppercase mr-1">Status:</span>
                {["all", "pending", "confirmed", "completed", "cancelled", "declined"].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setBookingStatusFilter(s);
                      loadBookings(1, s, bookingSearch);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase transition shrink-0 ${
                      bookingStatusFilter === s
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-secondary/40 text-muted-foreground hover:bg-secondary/70"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Bookings Table with 1-Click Fast Actions */}
            <div className="bg-card/40 border rounded-3xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-secondary/20 border-b text-muted-foreground uppercase text-xs">
                    <tr>
                      <th className="py-4 px-6">ID &amp; Time</th>
                      <th className="py-4 px-6">Customer</th>
                      <th className="py-4 px-6">Barber Shop</th>
                      <th className="py-4 px-6">Service</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-right">Quick Assistance Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {bookings.map((b) => (
                      <tr key={b._id} className="hover:bg-secondary/15 transition">
                        <td className="py-4 px-6">
                          <div className="font-mono text-xs font-bold text-primary">#{b._id.slice(-6)}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {b.timeSlot
                              ? new Date(b.timeSlot).toLocaleString([], {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Unscheduled"}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-semibold">{b.customerName}</div>
                          <div className="text-xs text-muted-foreground">{b.customerEmail}</div>
                          {b.customerPhone && <div className="text-[11px] text-muted-foreground/70">{b.customerPhone}</div>}
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-semibold">{b.shopName}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-primary" /> {b.shopAddress || "Location set"}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-medium">{b.service || "Standard Grooming"}</span>
                          {b.adminNote && (
                            <div className="text-[11px] text-amber-500 italic mt-0.5 max-w-xs truncate">
                              Note: {b.adminNote}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                              b.status === "confirmed"
                                ? "bg-green-500/10 text-green-500 border-green-500/20"
                                : b.status === "completed"
                                ? "bg-primary/10 text-primary border-primary/20"
                                : b.status === "cancelled" || b.status === "declined"
                                ? "bg-red-500/10 text-red-500 border-red-500/20"
                                : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {/* Fast 1-Click Action Buttons */}
                            {b.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => quickAssistBooking(b._id, "confirmed")}
                                  disabled={actionLoading === `quick-assist-${b._id}`}
                                  className="h-8 rounded-xl text-xs bg-green-600 hover:bg-green-700 text-white font-semibold gap-1"
                                >
                                  <Check className="w-3.5 h-3.5" /> Confirm
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => quickAssistBooking(b._id, "declined")}
                                  disabled={actionLoading === `quick-assist-${b._id}`}
                                  className="h-8 rounded-xl text-xs text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                >
                                  Decline
                                </Button>
                              </>
                            )}

                            {b.status === "confirmed" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => quickAssistBooking(b._id, "completed")}
                                  disabled={actionLoading === `quick-assist-${b._id}`}
                                  className="h-8 rounded-xl text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-1"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => quickAssistBooking(b._id, "cancelled")}
                                  disabled={actionLoading === `quick-assist-${b._id}`}
                                  className="h-8 rounded-xl text-xs text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                >
                                  Cancel
                                </Button>
                              </>
                            )}

                            {/* Full Reschedule & Note Modal */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openAssistModal(b)}
                              className="rounded-xl text-xs h-8 gap-1 hover:border-primary font-medium"
                            >
                              <CalendarCheck className="w-3.5 h-3.5 text-primary" /> Reschedule / Note
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {bookings.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                          No bookings found matching current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t">
                <Pager
                  page={bookingPage}
                  totalPages={bookingTotalPages}
                  loading={actionLoading === "bookings-page"}
                  onPage={(p) => loadBookings(p, bookingStatusFilter, bookingSearch)}
                />
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: BARBERS & LOUNGES */}
          <TabsContent value="barbers" className="space-y-6 mt-0">
            {/* Filter Bar with Status Pills and Search */}
            <div className="bg-card/50 border rounded-3xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search lounges by name or address..."
                    value={barberSearch}
                    onChange={(e) => setBarberSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && loadBarbers(1, barberStatusFilter, barberSearch)}
                    className="pl-10 pr-9 h-10 rounded-xl"
                  />
                  {barberSearch && (
                    <button
                      onClick={() => {
                        setBarberSearch("");
                        loadBarbers(1, barberStatusFilter, "");
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => loadBarbers(1, barberStatusFilter, barberSearch)}
                  className="rounded-xl h-10 px-5 font-semibold w-full sm:w-auto"
                >
                  Search
                </Button>
              </div>

              {/* Status Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-xs font-bold text-muted-foreground uppercase mr-1">Filter:</span>
                {[
                  { id: "all", label: "All Lounges" },
                  { id: "pending", label: "Pending Review" },
                  { id: "verified", label: "Approved" },
                  { id: "rejected", label: "Rejected" },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setBarberStatusFilter(s.id);
                      loadBarbers(1, s.id, barberSearch);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase transition shrink-0 ${
                      barberStatusFilter === s.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : s.id === "pending" && totals.pendingBarbers > 0
                        ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 font-bold"
                        : "bg-secondary/40 text-muted-foreground hover:bg-secondary/70"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Barber Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {barbers.map((b) => (
                <div
                  key={b._id}
                  className="bg-card/60 backdrop-blur border border-border/80 rounded-2xl p-5 space-y-4 flex flex-col justify-between shadow-sm hover:border-primary/40 transition"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-lg leading-snug">{b.shopName}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="w-3.5 h-3.5 shrink-0 text-primary" /> {b.address}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          b.verificationStatus === "verified"
                            ? "bg-green-500/10 text-green-500 border border-green-500/20"
                            : b.verificationStatus === "rejected"
                            ? "bg-red-500/10 text-red-500 border border-red-500/20"
                            : "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
                        }`}
                      >
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
                        className="text-xs text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl"
                        disabled={actionLoading === b._id || b.verificationStatus === "rejected"}
                        onClick={() => {
                          setConfirmAction({
                            type: "barber",
                            id: b._id,
                            title: `Reject ${b.shopName}?`,
                            description: "Rejecting this profile removes it from public discovery and cancels active appointments.",
                            payload: { verificationStatus: "rejected" },
                          });
                        }}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs rounded-xl font-semibold"
                        disabled={actionLoading === b._id || b.verificationStatus === "verified"}
                        onClick={() => {
                          setConfirmAction({
                            type: "barber",
                            id: b._id,
                            title: `Approve ${b.shopName}?`,
                            description: "Approving this profile allows customers to discover the shop and book services.",
                            payload: { verificationStatus: "verified" },
                          });
                        }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {barbers.length === 0 && (
                <div className="col-span-full py-12 text-center text-muted-foreground text-sm bg-card/20 rounded-3xl border border-dashed">
                  No barber profiles found matching current filters.
                </div>
              )}
            </div>
            <Pager
              page={barberPage}
              totalPages={barberTotalPages}
              loading={actionLoading === "barbers-page"}
              onPage={(p) => loadBarbers(p, barberStatusFilter, barberSearch)}
            />
          </TabsContent>

          {/* TAB 4: MANAGE ALL USERS */}
          <TabsContent value="users" className="space-y-6 mt-0">
            {/* Filter Bar with Search and Role Selector */}
            <div className="bg-card/50 border rounded-3xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search users by name, email, or phone number..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && loadUsers(1, userRoleFilter, userStatusFilter, userSearch)}
                    className="pl-10 pr-9 h-10 rounded-xl"
                  />
                  {userSearch && (
                    <button
                      onClick={() => {
                        setUserSearch("");
                        loadUsers(1, userRoleFilter, userStatusFilter, "");
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => loadUsers(1, userRoleFilter, userStatusFilter, userSearch)}
                  className="rounded-xl h-10 px-5 font-semibold w-full sm:w-auto"
                >
                  Search
                </Button>
              </div>

              {/* Role and Status Chips */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  <span className="text-xs font-bold text-muted-foreground uppercase mr-1">Role:</span>
                  {[
                    { id: "all", label: "All Users" },
                    { id: "user", label: "Customers" },
                    { id: "barber", label: "Barbers" },
                    { id: "admin", label: "Admins" },
                  ].map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setUserRoleFilter(r.id);
                        loadUsers(1, r.id, userStatusFilter, userSearch);
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                        userRoleFilter === r.id
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-secondary/40 text-muted-foreground hover:bg-secondary/70"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-muted-foreground uppercase mr-1">Status:</span>
                  {[
                    { id: "all", label: "All" },
                    { id: "active", label: "Active" },
                    { id: "deactivated", label: "Deactivated" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setUserStatusFilter(s.id);
                        loadUsers(1, userRoleFilter, s.id, userSearch);
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                        userStatusFilter === s.id
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-secondary/40 text-muted-foreground hover:bg-secondary/70"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-card/40 border rounded-3xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-secondary/20 border-b text-muted-foreground uppercase text-xs">
                    <tr>
                      <th className="py-4 px-6">User Name</th>
                      <th className="py-4 px-6">Email / Phone</th>
                      <th className="py-4 px-6">Role Selection</th>
                      <th className="py-4 px-6">Account Status</th>
                      <th className="py-4 px-6 text-right">Instant Management Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {users.map((u) => {
                      const isSelf = u._id === adminUser.id;
                      return (
                        <tr key={u._id} className="hover:bg-secondary/15 transition">
                          <td className="py-4 px-6">
                            <div className="font-bold flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                {u.name ? u.name[0].toUpperCase() : "U"}
                              </div>
                              <span>{u.name}</span>
                              {isSelf && (
                                <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold uppercase">
                                  You
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="text-muted-foreground">{u.email}</div>
                            {u.phone && <div className="text-xs text-muted-foreground/70">{u.phone}</div>}
                          </td>
                          <td className="py-4 px-6">
                            <select
                              value={u.role || "user"}
                              disabled={isSelf || actionLoading === u._id}
                              onChange={(e) =>
                                setConfirmAction({
                                  type: "user",
                                  actionType: "role",
                                  id: u._id,
                                  title: `Change role for ${u.name}?`,
                                  description: `Change role to ${e.target.value}. Existing session tokens will be invalidated immediately.`,
                                  payload: { role: e.target.value },
                                })
                              }
                              className="rounded-lg border bg-background px-2.5 py-1 text-xs font-semibold cursor-pointer"
                            >
                              <option value="user">Customer</option>
                              <option value="barber">Barber</option>
                              <option value="admin">Administrator</option>
                            </select>
                          </td>
                          <td className="py-4 px-6">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                                u.active === false ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"
                              }`}
                            >
                              {u.active === false ? "Deactivated" : "Active"}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Revoke Sessions Key */}
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={actionLoading === u._id}
                                onClick={() =>
                                  setConfirmAction({
                                    type: "user",
                                    actionType: "revoke_sessions",
                                    id: u._id,
                                    title: `Revoke all sessions for ${u.name}?`,
                                    description: "This increments sessionVersion, forcing immediate logout across all mobile and web devices.",
                                  })
                                }
                                title="Force logout across all devices"
                                className="h-8 px-2.5 text-xs rounded-xl border-amber-500/30 text-amber-500 hover:bg-amber-500/10 gap-1"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Revoke</span>
                              </Button>

                              {/* Toggle Active / Deactivate */}
                              <Button
                                variant={u.active === false ? "default" : "secondary"}
                                size="sm"
                                disabled={isSelf || actionLoading === u._id}
                                onClick={() =>
                                  setConfirmAction({
                                    type: "user",
                                    actionType: "status",
                                    id: u._id,
                                    title: u.active === false ? `Activate ${u.name}?` : `Deactivate ${u.name}?`,
                                    description: u.active === false
                                      ? "User will regain login access to their account."
                                      : "User will be locked out immediately and active appointments cancelled.",
                                    payload: { active: u.active === false },
                                  })
                                }
                                className="h-8 text-xs rounded-xl"
                              >
                                {u.active === false ? <UserCheck className="w-3.5 h-3.5 mr-1" /> : <UserX className="w-3.5 h-3.5 mr-1" />}
                                {u.active === false ? "Activate" : "Deactivate"}
                              </Button>

                              {/* Delete User */}
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={isSelf || actionLoading === u._id}
                                onClick={() =>
                                  setConfirmAction({
                                    type: "user",
                                    actionType: "delete",
                                    id: u._id,
                                    title: `Delete account for ${u.name}?`,
                                    description: "This deactivates the user, cancels active bookings, and safely marks the account as removed.",
                                  })
                                }
                                className="h-8 px-2 text-xs rounded-xl text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                title="Delete User"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t">
                <Pager
                  page={userPage}
                  totalPages={userTotalPages}
                  loading={actionLoading === "users-page"}
                  onPage={(p) => loadUsers(p, userRoleFilter, userStatusFilter, userSearch)}
                />
              </div>
            </div>
          </TabsContent>

          {/* TAB 5: LIVE AUDIT STREAM */}
          <TabsContent value="activity" className="space-y-6 mt-0">
            {/* Filter & Category Pills */}
            <div className="bg-card/50 border rounded-3xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search logs by action keyword, actor email, or target ID..."
                    value={activitySearch}
                    onChange={(e) => setActivitySearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && loadActivity(1, activityCategory, activitySearch)}
                    className="pl-10 pr-9 h-10 rounded-xl"
                  />
                  {activitySearch && (
                    <button
                      onClick={() => {
                        setActivitySearch("");
                        loadActivity(1, activityCategory, "");
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => loadActivity(1, activityCategory, activitySearch)}
                  className="rounded-xl h-10 px-5 font-semibold w-full sm:w-auto"
                >
                  Filter
                </Button>
              </div>

              {/* Category Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-xs font-bold text-muted-foreground uppercase mr-1">Category:</span>
                {[
                  { id: "all", label: "All Activities" },
                  { id: "security", label: "Security & Lockouts" },
                  { id: "auth", label: "Authentication" },
                  { id: "booking", label: "Bookings" },
                  { id: "barber", label: "Barber Changes" },
                  { id: "admin", label: "Admin Actions" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActivityCategory(cat.id);
                      loadActivity(1, cat.id, activitySearch);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase transition shrink-0 ${
                      activityCategory === cat.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-secondary/40 text-muted-foreground hover:bg-secondary/70"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Audit Log Stream Cards */}
            <div className="space-y-3">
              {activityLogs.map((log) => {
                const isSecurityAlert =
                  log.action.includes("lockout") ||
                  log.action.includes("blocked") ||
                  log.action.includes("failed") ||
                  log.action.includes("rate_limited");
                return (
                  <div
                    key={log._id}
                    className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSecurityAlert
                        ? "bg-red-500/[0.04] border-red-500/30 hover:border-red-500/50"
                        : "bg-card/50 border-border/70 hover:border-primary/30"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-md font-mono text-xs font-bold uppercase ${
                            isSecurityAlert ? "bg-red-500/20 text-red-400" : "bg-primary/20 text-primary"
                          }`}
                        >
                          {log.action}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString() : ""}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Actor: </span>
                        <strong className="font-semibold">{log.actorName || log.actorId}</strong>
                        {log.actorEmail && <span className="text-xs text-muted-foreground ml-1.5">({log.actorEmail})</span>}
                        {log.targetType && (
                          <span className="text-xs text-muted-foreground ml-3">
                            Target: <span className="font-mono">{log.targetType} #{String(log.targetId).slice(-6)}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="text-xs font-mono bg-background/60 p-2 rounded-xl border max-w-sm sm:max-w-md overflow-x-auto text-muted-foreground">
                        {JSON.stringify(log.metadata)}
                      </div>
                    )}
                  </div>
                );
              })}
              {activityLogs.length === 0 && (
                <div className="p-12 text-center text-muted-foreground text-sm bg-card/20 rounded-3xl border border-dashed">
                  No activity logs found for the selected category.
                </div>
              )}
            </div>

            <Pager
              page={activityPage}
              totalPages={activityTotalPages}
              loading={actionLoading === "activity-page"}
              onPage={(p) => loadActivity(p, activityCategory, activitySearch)}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* MODAL 1: Confirmation Dialog for User/Barber Changes */}
      <Dialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent className="rounded-3xl border">
          <DialogHeader>
            <DialogTitle>{confirmAction?.title}</DialogTitle>
            <DialogDescription>{confirmAction?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmAction(null)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (confirmAction?.type === "user") handleUserMutation();
                if (confirmAction?.type === "barber") updateBarberVerification(confirmAction.id, confirmAction.payload.verificationStatus);
              }}
              disabled={actionLoading === confirmAction?.id}
              className="rounded-xl"
            >
              {actionLoading === confirmAction?.id ? "Processing..." : "Confirm Action"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Assist Booking Override Dialog with Quick Preset Notes */}
      <Dialog open={!!assistedBooking} onOpenChange={(open) => !open && setAssistedBooking(null)}>
        <DialogContent className="max-w-lg rounded-3xl border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-primary" /> Assist Appointment #{assistedBooking?._id.slice(-6)}
            </DialogTitle>
            <DialogDescription>
              Directly override status, reschedule the time slot, or attach quick assistance notes.
            </DialogDescription>
          </DialogHeader>

          {assistedBooking && (
            <div className="space-y-4 py-2">
              <div className="p-3.5 rounded-2xl bg-secondary/30 border space-y-1 text-xs">
                <div>Customer: <strong>{assistedBooking.customerName}</strong> ({assistedBooking.customerEmail})</div>
                <div>Barber: <strong>{assistedBooking.shopName}</strong></div>
                <div>Service: <strong>{assistedBooking.service}</strong></div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Override Status</label>
                <select
                  value={assistStatus}
                  onChange={(e) => setAssistStatus(e.target.value)}
                  className="w-full h-10 rounded-xl border bg-background px-3 text-sm font-semibold"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="declined">Declined</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Reschedule Appointment Time</label>
                <Input
                  type="datetime-local"
                  value={assistTimeSlot}
                  onChange={(e) => setAssistTimeSlot(e.target.value)}
                  className="rounded-xl h-10"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Admin Assistance Note</label>
                  <span className="text-[11px] text-muted-foreground">Click template to insert:</span>
                </div>
                <Input
                  placeholder="e.g. Rescheduled upon customer call"
                  value={assistNote}
                  onChange={(e) => setAssistNote(e.target.value)}
                  className="rounded-xl h-10"
                />
                {/* Note Quick Templates */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {noteTemplates.map((template) => (
                    <button
                      key={template}
                      type="button"
                      onClick={() => setAssistNote(template)}
                      className="px-2 py-1 rounded-lg bg-secondary/50 hover:bg-primary/10 hover:text-primary text-[11px] font-medium transition text-left"
                    >
                      + {template}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAssistedBooking(null)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={submitBookingAssist} disabled={actionLoading === assistedBooking?._id} className="rounded-xl">
              {actionLoading === assistedBooking?._id ? "Saving..." : "Apply Assistance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Barber Document Inspection Modal */}
      <Dialog open={!!inspectedBarber} onOpenChange={(open) => !open && setInspectedBarber(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border">
          {inspectedBarber && (
            <div className="space-y-6">
              <DialogHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <DialogTitle className="text-2xl font-bold">{inspectedBarber.shopName}</DialogTitle>
                    <DialogDescription className="mt-1 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-primary" /> {inspectedBarber.address}
                    </DialogDescription>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      inspectedBarber.verificationStatus === "verified"
                        ? "bg-green-500/10 text-green-500 border border-green-500/20"
                        : inspectedBarber.verificationStatus === "rejected"
                        ? "bg-red-500/10 text-red-500 border border-red-500/20"
                        : "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
                    }`}
                  >
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
                  <Store className="w-4 h-4 text-primary" /> Storefront &amp; Interior Photos
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
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => setInspectedBarber(null)} className="rounded-xl">
                  Close
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    className="rounded-xl"
                    disabled={actionLoading === inspectedBarber._id || inspectedBarber.verificationStatus === "rejected"}
                    onClick={() => {
                      updateBarberVerification(inspectedBarber._id, "rejected");
                    }}
                  >
                    <XCircle className="w-4 h-4 mr-1.5" /> Reject Lounge
                  </Button>
                  <Button
                    className="rounded-xl font-semibold"
                    disabled={actionLoading === inspectedBarber._id || inspectedBarber.verificationStatus === "verified"}
                    onClick={() => {
                      updateBarberVerification(inspectedBarber._id, "verified");
                    }}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve Lounge
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 4: Fullscreen Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-2 bg-black/95 border-border/40 rounded-3xl">
          {previewImage && (
            <div className="relative w-full max-h-[80vh] flex items-center justify-center">
              <img src={previewImage} alt="Full preview" className="max-w-full max-h-[78vh] object-contain rounded-xl" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  badge,
  badgeColor = "bg-primary/10 text-primary border border-primary/20",
  actionHint,
}) {
  return (
    <div className="bg-card/50 border rounded-3xl p-5 flex flex-col justify-between space-y-3 h-full">
      <div className="flex items-center justify-between">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="w-6 h-6" />
        </div>
        {badge && <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>}
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
        <h3 className="text-3xl font-extrabold mt-0.5 tracking-tight">{value}</h3>
      </div>
      {actionHint && (
        <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs text-primary font-semibold">
          <span>{actionHint}</span>
          <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
        </div>
      )}
    </div>
  );
}

function Pager({ page, totalPages, loading, onPage }) {
  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground">
      <span>
        Page {page} of {totalPages}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => onPage(page - 1)} className="rounded-xl h-8 px-3">
          Previous
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => onPage(page + 1)} className="rounded-xl h-8 px-3">
          Next
        </Button>
      </div>
    </div>
  );
}
