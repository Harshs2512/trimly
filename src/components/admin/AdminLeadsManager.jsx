"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Filter,
  Search,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ArrowRight,
  ExternalLink,
  Trash2,
  UserCheck,
  Store,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function formatRelativeTime(dateInput) {
  if (!dateInput) return "Unknown";
  const date = new Date(dateInput);
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function isNewOver15Min(lead) {
  if (lead.status !== "new") return false;
  const created = new Date(lead.createdAt).getTime();
  return Date.now() - created > 15 * 60 * 1000;
}

export default function AdminLeadsManager({ adminUser }) {
  const [leads, setLeads] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });

  // Detail Modal state
  const [selectedLead, setSelectedLead] = useState(null);
  const [newNote, setNewNote] = useState("");
  const [updating, setUpdating] = useState(false);
  const [deleteConfirmLead, setDeleteConfirmLead] = useState(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/leads/stats");
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
      }
    } catch {}
  }, []);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "25",
        status: statusFilter,
        type: typeFilter,
        source: sourceFilter,
      });
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/admin/leads?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
        setPagination(data.pagination || { page: 1, limit: 25, total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error("Failed to fetch leads:", err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, typeFilter, sourceFilter, search]);

  useEffect(() => {
    fetchLeads();
    fetchMetrics();
  }, [fetchLeads, fetchMetrics]);

  const handleUpdateStatus = async (leadId, newStatus) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedLead((prev) => (prev && prev._id === leadId ? data.lead : prev));
        fetchLeads();
        fetchMetrics();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedLead) return;

    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/leads/${selectedLead._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: newNote.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedLead(data.lead);
        setNewNote("");
        fetchLeads();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteLead = async () => {
    if (!deleteConfirmLead) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/leads/${deleteConfirmLead._id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeleteConfirmLead(null);
        if (selectedLead?._id === deleteConfirmLead._id) setSelectedLead(null);
        fetchLeads();
        fetchMetrics();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const getWhatsAppUrl = (lead) => {
    const phoneDigits = (lead.phone || "").replace(/[^\d]/g, "");
    const template =
      lead.type === "owner"
        ? `Hi ${lead.name || ""}, this is ${adminUser?.name || "Trimlly Team"} regarding listing your salon on Trimlly. Is now a good time to connect?`
        : `Hi ${lead.name || ""}, this is ${adminUser?.name || "Trimlly Team"} regarding your enquiry for ${lead.interest || "barber services"} in ${lead.city || ""}. How can we assist you today?`;
    return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(template)}`;
  };

  return (
    <div className="space-y-6">
      {/* 1. Metrics Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-4 rounded-2xl bg-card border">
          <p className="text-xs text-muted-foreground font-semibold">Total Leads</p>
          <p className="text-2xl font-bold text-foreground mt-1">{metrics?.total ?? 0}</p>
        </Card>
        <Card className="p-4 rounded-2xl bg-card border">
          <p className="text-xs text-muted-foreground font-semibold">Today</p>
          <p className="text-2xl font-bold text-primary mt-1">{metrics?.today ?? 0}</p>
        </Card>
        <Card className="p-4 rounded-2xl bg-card border">
          <p className="text-xs text-muted-foreground font-semibold">Last 7 Days</p>
          <p className="text-2xl font-bold text-foreground mt-1">{metrics?.week ?? 0}</p>
        </Card>
        <Card className={`p-4 rounded-2xl border ${metrics?.uncontactedOver15m > 0 ? "bg-amber-500/10 border-amber-500/30" : "bg-card"}`}>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-semibold">New &gt;15 Mins</p>
            {metrics?.uncontactedOver15m > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />}
          </div>
          <p className={`text-2xl font-bold mt-1 ${metrics?.uncontactedOver15m > 0 ? "text-amber-500" : "text-foreground"}`}>
            {metrics?.uncontactedOver15m ?? 0}
          </p>
        </Card>
        <Card className="p-4 rounded-2xl bg-card border">
          <p className="text-xs text-muted-foreground font-semibold">WhatsApp Clicks</p>
          <p className="text-2xl font-bold text-emerald-500 mt-1">{metrics?.whatsappClicks ?? 0}</p>
        </Card>
        <Card className="p-4 rounded-2xl bg-card border">
          <p className="text-xs text-muted-foreground font-semibold">Call Clicks</p>
          <p className="text-2xl font-bold text-blue-500 mt-1">{metrics?.callClicks ?? 0}</p>
        </Card>
      </div>

      {/* 2. Controls & Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 bg-card rounded-2xl border">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="Search leads by name, phone, city, or interest..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 shadow-none focus-visible:ring-0 text-sm h-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs font-semibold px-3 py-2 rounded-xl bg-background border border-border"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="converted">Converted</option>
            <option value="lost">Lost</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs font-semibold px-3 py-2 rounded-xl bg-background border border-border"
          >
            <option value="all">All Types</option>
            <option value="customer">Customers</option>
            <option value="owner">Salon Owners</option>
          </select>

          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs font-semibold px-3 py-2 rounded-xl bg-background border border-border"
          >
            <option value="all">All Sources</option>
            <option value="chatbot">Chatbot</option>
            <option value="exit_intent">Exit Intent</option>
            <option value="contact_form">Contact Form</option>
          </select>

          {/* Export CSV Button */}
          <a
            href={`/api/admin/leads?export=csv&status=${statusFilter}&type=${typeFilter}&source=${sourceFilter}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
            download
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted transition"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </a>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              fetchLeads();
              fetchMetrics();
            }}
            className="rounded-xl h-9 px-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* 3. Leads Table */}
      <div className="overflow-x-auto rounded-2xl border bg-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 border-b text-xs font-bold text-muted-foreground uppercase">
            <tr>
              <th className="p-4">Contact</th>
              <th className="p-4">Quick Actions</th>
              <th className="p-4">Type & City</th>
              <th className="p-4">Interest / Need</th>
              <th className="p-4">Source</th>
              <th className="p-4">Status</th>
              <th className="p-4">Received</th>
              <th className="p-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground text-sm">
                  {loading ? "Loading leads..." : "No leads found matching current filters."}
                </td>
              </tr>
            ) : (
              leads.map((lead) => {
                const urgent = isNewOver15Min(lead);
                return (
                  <tr key={lead._id} className={`hover:bg-muted/20 transition ${urgent ? "bg-amber-500/[0.03]" : ""}`}>
                    {/* Contact */}
                    <td className="p-4">
                      <div className="font-bold text-foreground flex items-center gap-1.5">
                        {lead.name}
                        {urgent && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            &gt;15m
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span>{lead.phone}</span>
                        {lead.email && <span className="truncate max-w-[140px]">{lead.email}</span>}
                      </div>
                    </td>

                    {/* Quick WhatsApp / Call */}
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <a
                          href={getWhatsAppUrl(lead)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-[#25d366]/10 text-[#25d366] hover:bg-[#25d366] hover:text-white transition"
                          title="Quick reply on WhatsApp"
                        >
                          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                        </a>
                        <a
                          href={`tel:${lead.phone}`}
                          className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition"
                          title="Call phone number"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      </div>
                    </td>

                    {/* Type & City */}
                    <td className="p-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${lead.type === "owner" ? "bg-purple-500/10 text-purple-600 dark:text-purple-400" : "bg-primary/10 text-primary"}`}>
                        {lead.type || "customer"}
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5">{lead.city || "India"}</p>
                    </td>

                    {/* Interest / Need */}
                    <td className="p-4 max-w-[200px]">
                      <p className="text-xs text-foreground truncate">{lead.interest || "General inquiry"}</p>
                      {lead.message && (
                        <p className="text-[11px] text-muted-foreground truncate">{lead.message}</p>
                      )}
                    </td>

                    {/* Source */}
                    <td className="p-4 text-xs text-muted-foreground">
                      <span className="capitalize">{lead.source?.replace("_", " ") || "website"}</span>
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                        lead.status === "new"
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          : lead.status === "contacted"
                          ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                          : lead.status === "qualified"
                          ? "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                          : lead.status === "converted"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {lead.status || "new"}
                      </span>
                    </td>

                    {/* Received */}
                    <td className="p-4 text-xs text-muted-foreground whitespace-nowrap">
                      {formatRelativeTime(lead.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedLead(lead)}
                        className="rounded-xl text-xs h-8"
                      >
                        View &amp; Notes
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} leads)
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 rounded-lg"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-8 rounded-lg"
              >
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Lead Detail Drawer / Modal */}
      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl p-6 sm:p-8">
          {selectedLead && (
            <div className="space-y-6">
              <DialogHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    {selectedLead.name}
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold uppercase">
                      {selectedLead.type}
                    </span>
                  </DialogTitle>
                </div>
                <DialogDescription>
                  Captured via {selectedLead.source} on {new Date(selectedLead.createdAt).toLocaleString("en-IN")}
                </DialogDescription>
              </DialogHeader>

              {/* Status Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-muted/30 border">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground block mb-1">Update Status</span>
                  <div className="flex flex-wrap gap-1.5">
                    {["new", "contacted", "qualified", "converted", "lost"].map((s) => (
                      <button
                        key={s}
                        disabled={updating}
                        onClick={() => handleUpdateStatus(selectedLead._id, s)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-xl capitalize transition ${
                          selectedLead.status === s
                            ? "bg-primary text-primary-foreground shadow"
                            : "bg-background border hover:bg-muted text-foreground"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={getWhatsAppUrl(selectedLead)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-[#25d366] text-white text-xs font-semibold hover:bg-[#1ebe5d] transition flex items-center gap-1.5"
                  >
                    Open WhatsApp
                  </a>
                  <a
                    href={`tel:${selectedLead.phone}`}
                    className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition flex items-center gap-1"
                  >
                    Call Lead
                  </a>
                </div>
              </div>

              {/* Enquiry Details Grid */}
              <div className="grid sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1 p-3 rounded-xl bg-card border">
                  <span className="text-muted-foreground font-semibold">Phone:</span>
                  <p className="font-bold text-foreground text-sm">{selectedLead.phone}</p>
                </div>
                <div className="space-y-1 p-3 rounded-xl bg-card border">
                  <span className="text-muted-foreground font-semibold">City:</span>
                  <p className="font-bold text-foreground text-sm">{selectedLead.city || "Not specified"}</p>
                </div>
                <div className="space-y-1 p-3 rounded-xl bg-card border">
                  <span className="text-muted-foreground font-semibold">Email:</span>
                  <p className="font-bold text-foreground text-sm">{selectedLead.email || "None"}</p>
                </div>
                <div className="space-y-1 p-3 rounded-xl bg-card border">
                  <span className="text-muted-foreground font-semibold">Page Captured:</span>
                  <p className="font-bold text-foreground text-sm truncate">{selectedLead.page || "/"}</p>
                </div>
              </div>

              {selectedLead.interest && (
                <div className="p-3 rounded-xl bg-card border text-xs space-y-1">
                  <span className="text-muted-foreground font-semibold">Specific Need / Interest:</span>
                  <p className="font-medium text-foreground">{selectedLead.interest}</p>
                </div>
              )}

              {selectedLead.message && (
                <div className="p-3 rounded-xl bg-card border text-xs space-y-1">
                  <span className="text-muted-foreground font-semibold">Message History:</span>
                  <p className="font-normal text-muted-foreground whitespace-pre-wrap">{selectedLead.message}</p>
                </div>
              )}

              {/* Notes Timeline */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-primary" /> Follow-Up Notes Timeline
                </h4>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(!selectedLead.notes || selectedLead.notes.length === 0) ? (
                    <p className="text-xs text-muted-foreground italic">No follow-up notes logged yet.</p>
                  ) : (
                    selectedLead.notes.map((n, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-muted/40 border text-xs space-y-1">
                        <div className="flex items-center justify-between text-muted-foreground text-[10px]">
                          <span>{n.authorName || "Staff"}</span>
                          <span>{new Date(n.at).toLocaleString("en-IN")}</span>
                        </div>
                        <p className="text-foreground">{n.text}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Note Form */}
                <form onSubmit={handleAddNote} className="flex gap-2">
                  <Input
                    placeholder="Log a call outcome or follow-up note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="text-xs h-9"
                  />
                  <Button type="submit" size="sm" disabled={updating || !newNote.trim()} className="rounded-xl h-9 text-xs shrink-0">
                    Add Note
                  </Button>
                </form>
              </div>

              {/* DPDP Soft-delete */}
              <div className="pt-4 border-t flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  DPDP Act Erasure: Soft-deletes contact record and keeps audit trace.
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteConfirmLead(selectedLead)}
                  className="rounded-xl text-xs h-8"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Erase Lead
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 5. Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirmLead} onOpenChange={(open) => !open && setDeleteConfirmLead(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" /> Confirm DPDP Lead Erasure
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently soft-delete lead <strong>{deleteConfirmLead?.name}</strong> ({deleteConfirmLead?.phone})? This action will be recorded in the security audit log.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmLead(null)} className="rounded-xl">
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteLead} disabled={updating} className="rounded-xl">
              {updating ? "Erasing..." : "Confirm Erasure"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

