"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  ShieldCheck,
  Search,
  Mail,
  KeyRound,
  Check,
  Copy,
  Trash2,
  UserPlus,
  RefreshCw,
  Users,
  CheckCircle2,
  Clock,
  Send,
  Phone,
  Sparkles,
  AlertCircle,
  X,
  CheckSquare,
  Square,
  Banknote,
  Coins,
  Receipt,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Wallet,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Modal, Button, Badge } from "@/components/Kit";
import { useToast } from "@/components/Providers";
import { eventVolunteersApi } from "@/lib/api";
import { useRealtimeSubscription } from "@/lib/realtime";
import { formatDate, formatINR, formatNumber, rowId } from "@/lib/utils";

interface Volunteer {
  user_id?: string;
  email: string;
  name?: string;
  phone?: string;
  role?: string;
  assigned_at?: string;
  total_checkins?: number;
  cash_collected_count?: number;
  online_checkins_count?: number;
  total_cash_collected?: number;
}

interface AvailableVolunteer {
  user_id: string;
  email: string;
  name: string;
  phone: string;
  is_assigned: boolean;
}

interface VolunteerReportData {
  event_id: string;
  event_title: string;
  total_admitted: number;
  total_online_admitted: number;
  total_cash_admitted: number;
  total_cash_collected: number;
  volunteers: {
    volunteer_name: string;
    volunteer_email: string;
    role: string;
    phone: string;
    is_assigned: boolean;
    total_entries: number;
    online_payments: number;
    cash_payments: number;
    cash_collected: number;
    attendees: {
      attendee_name: string;
      attendee_email: string;
      attendee_phone: string;
      booking_reference: string;
      ticket_ref: string;
      seat: string;
      seats: string[];
      category: string;
      payment_method: string;
      cash_status: string;
      cash_collect_done: boolean;
      amount: number;
      checked_in_at: string;
    }[];
  }[];
  reconciliation: {
    volunteer_name: string;
    volunteer_email: string;
    cash_pass_count: number;
    cash_collected: number;
    cash_status: string;
    status: string;
  }[];
}

interface EventVolunteersModalProps {
  event: any;
  initialTab?: "report" | "assigned" | "assign" | "create";
  onClose: () => void;
  onUpdated?: () => void;
}

const COMMON_ROLES = [
  "Entrance Gate Scanner",
  "Main Gate Scanner",
  "North Gate Scanner",
  "VIP Gate Scanner",
  "Lineup & Backstage Manager",
  "Spot Registration & Helpdesk",
];

export function EventVolunteersModal({
  event,
  initialTab = "report",
  onClose,
  onUpdated,
}: EventVolunteersModalProps) {
  const { push } = useToast();
  const eventId = String(rowId(event) || event.id || "");

  const [activeTab, setActiveTab] = useState<"report" | "assigned" | "assign" | "create">(initialTab);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [assignedVolunteers, setAssignedVolunteers] = useState<Volunteer[]>([]);
  const [availableVolunteers, setAvailableVolunteers] = useState<AvailableVolunteer[]>([]);
  const [report, setReport] = useState<VolunteerReportData | null>(null);
  const [expandedVolunteers, setExpandedVolunteers] = useState<Record<string, boolean>>({});
  const [reconciledVolunteers, setReconciledVolunteers] = useState<Record<string, boolean>>({});

  // Search & Multi-selection for Assign tab
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState(COMMON_ROLES[0]);
  const [assigning, setAssigning] = useState(false);

  // Quick Create Form
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState(COMMON_ROLES[0]);
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);

  // Action states for individual rows
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [volRes, repRes] = await Promise.all([
        eventVolunteersApi.getEventVolunteers(eventId).catch(() => null),
        eventVolunteersApi.getEventVolunteerReport(eventId).catch(() => null),
      ]);
      if (volRes) {
        setAssignedVolunteers(volRes.assigned_volunteers || []);
        setAvailableVolunteers(volRes.available_volunteers || []);
      }
      if (repRes) {
        setReport(repRes);
      }
    } catch (err: any) {
      push("error", err?.message || "Failed to load event volunteers and report");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId, push]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time synchronization: automatically updates volunteer assignments and entry reports
  useRealtimeSubscription(
    eventId ? [`event:${eventId}`, "admin:volunteers", "admin:events"] : ["admin:volunteers"],
    () => {
      loadData(true);
    },
    7000
  );

  // Filter unassigned volunteers for search
  const filteredAvailable = useMemo(() => {
    const unassigned = availableVolunteers.filter((v) => !v.is_assigned);
    const q = searchQuery.toLowerCase().trim();
    if (!q) return unassigned;
    return unassigned.filter(
      (v) =>
        v.email.toLowerCase().includes(q) ||
        (v.name && v.name.toLowerCase().includes(q)) ||
        (v.phone && v.phone.includes(q))
    );
  }, [availableVolunteers, searchQuery]);

  const toggleSelectEmail = (email: string) => {
    setSelectedEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  const selectAllFiltered = () => {
    const filteredEmails = filteredAvailable.map((v) => v.email);
    setSelectedEmails((prev) => Array.from(new Set([...prev, ...filteredEmails])));
  };

  const deselectAll = () => {
    setSelectedEmails([]);
  };

  // Submit Multi-Volunteer Assignment
  const handleAssignSelected = async () => {
    if (selectedEmails.length === 0) {
      push("error", "Please select at least one volunteer to assign.");
      return;
    }

    setAssigning(true);
    try {
      await eventVolunteersApi.assignEventVolunteers(eventId, {
        volunteer_emails: selectedEmails,
        default_role: selectedRole,
      });

      push(
        "success",
        `${selectedEmails.length} volunteer(s) assigned. Credentials emailed!`
      );

      setSelectedEmails([]);
      await loadData(true);
      if (onUpdated) onUpdated();
      setActiveTab("assigned");
    } catch (err: any) {
      push("error", err?.message || "Failed to assign volunteers");
    } finally {
      setAssigning(false);
    }
  };

  // Submit Quick Create & Assign
  const handleQuickCreateAndAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      push("error", "Please enter a valid volunteer email address.");
      return;
    }

    setCreating(true);
    try {
      await eventVolunteersApi.assignEventVolunteers(eventId, {
        new_volunteers: [
          {
            name: newName.trim(),
            email: cleanEmail,
            phone: newPhone.trim(),
            role: newRole,
            password: newPassword.trim() || undefined,
          },
        ],
        default_role: newRole,
      });

      push(
        "success",
        `Registered & assigned ${cleanEmail}. Credentials sent to their inbox!`
      );

      setNewName("");
      setNewEmail("");
      setNewPhone("");
      setNewPassword("");
      await loadData(true);
      if (onUpdated) onUpdated();
      setActiveTab("assigned");
    } catch (err: any) {
      push("error", err?.message || "Failed to register and assign volunteer");
    } finally {
      setCreating(false);
    }
  };

  // Resend Credentials
  const handleResendCredentials = async (email: string) => {
    setResendingEmail(email);
    try {
      const res = await eventVolunteersApi.resendCredentials(eventId, email);
      push(
        "success",
        `Credentials resent to ${email} (Password: ${res.temporary_password || "Updated"})`
      );
    } catch (err: any) {
      push("error", err?.message || `Failed to resend credentials to ${email}`);
    } finally {
      setResendingEmail(null);
    }
  };

  // Remove / Unassign
  const handleRemoveVolunteer = async (email: string) => {
    if (!confirm(`Are you sure you want to unassign ${email} from this event?`)) {
      return;
    }

    setRemovingEmail(email);
    try {
      await eventVolunteersApi.removeEventVolunteer(eventId, email);
      push("success", `Unassigned ${email} from event.`);
      await loadData(true);
      if (onUpdated) onUpdated();
    } catch (err: any) {
      push("error", err?.message || `Failed to remove ${email}`);
    } finally {
      setRemovingEmail(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    push("info", `Copied "${text}" to clipboard`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      size="3xl"
      title="Event Volunteers, Entry & Cash Audit"
      subtitle={`${event.title} • ${formatDate(event.date)} ${event.time ? `• ${event.time}` : ""} • ${event.venue || "Venue"}`}
    >
      <div className="flex flex-col gap-5">
        {/* ── Top Bar: Tabs & Quick Refresh ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-1">
            <button
              onClick={() => setActiveTab("report")}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "report"
                  ? "bg-[var(--brand)] text-black shadow-sm"
                  : "text-[var(--fg-muted)] hover:text-white"
              }`}
            >
              <Receipt className="size-3.5" />
              Entry &amp; Cash Audit
              {report && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                    activeTab === "report"
                      ? "bg-black/20 text-black font-bold"
                      : "bg-[var(--surface-3)] text-amber-300 font-bold"
                  }`}
                >
                  ₹{(report.total_cash_collected || 0).toLocaleString("en-IN")}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("assigned")}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "assigned"
                  ? "bg-[var(--brand)] text-black shadow-sm"
                  : "text-[var(--fg-muted)] hover:text-white"
              }`}
            >
              <ShieldCheck className="size-3.5" />
              Assigned Squad
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                  activeTab === "assigned"
                    ? "bg-black/20 text-black font-bold"
                    : "bg-[var(--surface-3)] text-[var(--fg-muted)]"
                }`}
              >
                {assignedVolunteers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("assign")}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "assign"
                  ? "bg-[var(--brand)] text-black shadow-sm"
                  : "text-[var(--fg-muted)] hover:text-white"
              }`}
            >
              <Search className="size-3.5" />
              Assign Existing
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                  activeTab === "assign"
                    ? "bg-black/20 text-black font-bold"
                    : "bg-[var(--surface-3)] text-[var(--fg-muted)]"
                }`}
              >
                {filteredAvailable.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("create")}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "create"
                  ? "bg-[var(--brand)] text-black shadow-sm"
                  : "text-[var(--fg-muted)] hover:text-white"
              }`}
            >
              <UserPlus className="size-3.5" />
              Quick Add &amp; Assign
            </button>
          </div>

          <button
            onClick={() => loadData(true)}
            disabled={refreshing || loading}
            title="Refresh volunteer list and report"
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-xs font-medium text-[var(--fg-muted)] transition-colors hover:text-white"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin text-[var(--brand)]" : ""}`} />
            Refresh
          </button>
        </div>

        {/* ── TAB 0: ENTRY & CASH AUDIT REPORT ── */}
        {activeTab === "report" && (
          <div className="flex flex-col gap-5">
            {/* Top Stat KPI Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5">
                <div className="flex items-center justify-between text-emerald-400">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Total Admitted</span>
                  <CheckCircle2 className="size-4" />
                </div>
                <p className="mt-1.5 font-mono text-2xl font-bold text-white">
                  {report?.total_admitted ?? 0}
                </p>
                <span className="text-[10px] text-emerald-300 font-mono">Verified gate entries</span>
              </div>

              <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3.5">
                <div className="flex items-center justify-between text-sky-400">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Online Paid</span>
                  <Receipt className="size-4" />
                </div>
                <p className="mt-1.5 font-mono text-2xl font-bold text-white">
                  {report?.total_online_admitted ?? 0}
                </p>
                <span className="text-[10px] text-sky-300 font-mono">Pre-paid passes</span>
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5">
                <div className="flex items-center justify-between text-amber-400">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Cash Spot Passes</span>
                  <Coins className="size-4" />
                </div>
                <p className="mt-1.5 font-mono text-2xl font-bold text-white">
                  {report?.total_cash_admitted ?? 0}
                </p>
                <span className="text-[10px] text-amber-300 font-mono">Paid cash at venue</span>
              </div>

              <div className="rounded-xl border border-amber-400/50 bg-amber-400/15 p-3.5 shadow-[0_0_20px_rgba(251,191,36,0.15)]">
                <div className="flex items-center justify-between text-amber-400">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Total Cash Collected</span>
                  <Banknote className="size-4" />
                </div>
                <p className="mt-1.5 font-mono text-2xl font-extrabold text-amber-300">
                  ₹{(report?.total_cash_collected ?? 0).toLocaleString("en-IN")}
                </p>
                <span className="text-[10px] text-amber-200/70 font-mono">Physical cash at gate</span>
              </div>
            </div>

            {/* Volunteer-Wise Entry & Cash Breakdown */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                    Volunteer-Specific Entry &amp; Cash Breakdown
                  </h4>
                  <p className="text-[11px] text-[var(--fg-muted)]">
                    Event-specific admittance and cash collection tracking per assigned volunteer.
                  </p>
                </div>
                <span className="rounded-full bg-[var(--surface-3)] px-2 py-0.5 font-mono text-[10px] text-[var(--fg-muted)]">
                  {report?.volunteers?.length || 0} Gate Staff
                </span>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-10 text-[var(--fg-muted)]">
                  <RefreshCw className="size-6 animate-spin text-[var(--brand)] mb-2" />
                  <span className="text-xs">Compiling event volunteer audit report...</span>
                </div>
              ) : !report?.volunteers || report.volunteers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center text-xs text-[var(--fg-muted)]">
                  <Users className="mx-auto size-8 text-[var(--fg-subtle)] mb-2" />
                  No volunteer admissions recorded for this event yet.
                </div>
              ) : (
                <div className="flex flex-col gap-3 max-h-[460px] overflow-y-auto pr-1">
                  {report.volunteers.map((vol, vIdx) => {
                    const isExpanded = !!expandedVolunteers[vol.volunteer_email];
                    const attendeeList = vol.attendees || [];

                    return (
                      <div
                        key={vol.volunteer_email || vIdx}
                        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/80 p-4 transition-all hover:border-[var(--brand)]/40"
                      >
                        {/* Volunteer Header Info */}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-[200px]">
                            <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs font-bold text-emerald-400">
                              {vol.volunteer_name ? vol.volunteer_name.slice(0, 2).toUpperCase() : "VL"}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white">
                                  {vol.volunteer_name || "Volunteer"}
                                </span>
                                <span className="rounded border border-[var(--border)] bg-[var(--surface-3)] px-1.5 py-0.2 font-mono text-[9px] text-[var(--fg-muted)]">
                                  {vol.role || "Gate Scanner"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-[var(--fg-muted)] font-mono mt-0.5">
                                <span>{vol.volunteer_email}</span>
                                {vol.phone && <span>• {vol.phone}</span>}
                              </div>
                            </div>
                          </div>

                          {/* Metric Badges for this Volunteer */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-xs font-bold text-emerald-400">
                              {vol.total_entries} Admitted
                            </span>
                            <span className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 font-mono text-xs text-sky-300">
                              {vol.online_payments} Online
                            </span>
                            <span className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 font-mono text-xs text-amber-300">
                              {vol.cash_payments} Cash
                            </span>
                            <span className="rounded-lg border border-amber-400/60 bg-amber-400/20 px-3 py-1 font-mono text-xs font-extrabold text-amber-300 shadow-sm">
                              ₹{vol.cash_collected.toLocaleString("en-IN")} Cash
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                setExpandedVolunteers((prev) => ({
                                  ...prev,
                                  [vol.volunteer_email]: !prev[vol.volunteer_email],
                                }))
                              }
                              className="ml-1 flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-3)] px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-white/10 cursor-pointer"
                            >
                              <span>{isExpanded ? "Hide" : "View"} Attendees ({attendeeList.length})</span>
                              {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Collapsible Attendee Ledger */}
                        {isExpanded && (
                          <div className="mt-4 border-t border-[var(--border)] pt-3">
                            <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
                              Attendees Admitted by {vol.volunteer_name || vol.volunteer_email}:
                            </h5>
                            {attendeeList.length === 0 ? (
                              <p className="text-xs text-[var(--fg-subtle)] italic">
                                No check-in records found for this volunteer.
                              </p>
                            ) : (
                              <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-black/40">
                                <table className="w-full text-left font-mono text-xs">
                                  <thead className="border-b border-[var(--border)] bg-[var(--surface-3)]/60 text-[10px] uppercase text-[var(--fg-muted)]">
                                    <tr>
                                      <th className="py-2 px-3">Attendee</th>
                                      <th className="py-2 px-3">Booking / Seats</th>
                                      <th className="py-2 px-3">Tier</th>
                                      <th className="py-2 px-3">Payment Mode</th>
                                      <th className="py-2 px-3">Amount</th>
                                      <th className="py-2 px-3">Admitted At</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[var(--border)]/50 text-[11px]">
                                    {attendeeList.map((att, aIdx) => (
                                      <tr key={aIdx} className="hover:bg-white/5 transition-colors">
                                        <td className="py-2 px-3">
                                          <p className="font-semibold text-white">
                                            {att.attendee_name || "Attendee"}
                                          </p>
                                          {att.attendee_phone && (
                                            <span className="text-[10px] text-[var(--fg-subtle)]">
                                              {att.attendee_phone}
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-2 px-3">
                                          <span className="font-bold text-[var(--brand)]">
                                            {att.booking_reference}
                                          </span>
                                          {(att.seats?.length || att.seat) && (
                                            <span className="block text-[10px] text-white/60">
                                              Seats: {att.seats?.length ? att.seats.join(", ") : att.seat}
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-2 px-3 text-[var(--fg-muted)]">
                                          {att.category || "General"}
                                        </td>
                                        <td className="py-2 px-3">
                                          {att.payment_method === "CASH" ? (
                                            <span className="rounded bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                                              CASH COLLECTED
                                            </span>
                                          ) : (
                                            <span className="rounded bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                                              ONLINE PAID
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-2 px-3 font-bold text-white">
                                          {att.amount ? `₹${att.amount.toLocaleString("en-IN")}` : "Free"}
                                        </td>
                                        <td className="py-2 px-3 text-[10px] text-[var(--fg-subtle)]">
                                          {att.checked_in_at ? formatDate(att.checked_in_at, true) : "Just now"}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* End-of-Event Physical Cash Reconciliation Section */}
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/20 pb-3">
                <div className="flex items-center gap-2">
                  <Wallet className="size-5 text-amber-400" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                      End-of-Event Physical Cash Handover Reconciliation
                    </h4>
                    <p className="text-[11px] text-[var(--fg-muted)]">
                      Reconcile and collect the exact physical cash amount collected by each gate volunteer.
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-1 font-mono text-xs font-bold text-amber-300">
                  Total Cash to Hand Over: ₹{(report?.total_cash_collected ?? 0).toLocaleString("en-IN")}
                </div>
              </div>

              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="border-b border-[var(--border)] text-[10px] uppercase text-[var(--fg-muted)]">
                    <tr>
                      <th className="py-2 px-3">Gate Volunteer</th>
                      <th className="py-2 px-3">Cash Passes Admitted</th>
                      <th className="py-2 px-3">Physical Cash Owed</th>
                      <th className="py-2 px-3">Handover Audit Status</th>
                      <th className="py-2 px-3 text-right">Reconciliation Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]/40 text-[11px]">
                    {(report?.reconciliation || []).map((rec, rIdx) => {
                      const isDone = !!reconciledVolunteers[rec.volunteer_email];
                      return (
                        <tr key={rIdx} className="hover:bg-white/5 transition-colors">
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-white block">{rec.volunteer_name || rec.volunteer_email}</span>
                            <span className="text-[10px] text-[var(--fg-subtle)]">{rec.volunteer_email}</span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-white">
                            {rec.cash_pass_count} cash pass{rec.cash_pass_count !== 1 ? "es" : ""}
                          </td>
                          <td className="py-2.5 px-3 font-extrabold text-amber-300">
                            ₹{rec.cash_collected.toLocaleString("en-IN")}
                          </td>
                          <td className="py-2.5 px-3">
                            {rec.cash_collected === 0 ? (
                              <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--fg-muted)]">
                                No Cash Due
                              </span>
                            ) : isDone ? (
                              <span className="rounded border border-emerald-500/40 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 flex items-center gap-1 w-fit">
                                <Check className="size-3" /> Cash Handed Over
                              </span>
                            ) : (
                              <span className="rounded border border-amber-500/40 bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 flex items-center gap-1 w-fit animate-pulse">
                                <AlertCircle className="size-3" /> Handover Pending
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {rec.cash_collected > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setReconciledVolunteers((prev) => {
                                    const next = { ...prev, [rec.volunteer_email]: !prev[rec.volunteer_email] };
                                    push(
                                      next[rec.volunteer_email] ? "success" : "info",
                                      next[rec.volunteer_email]
                                        ? `Verified cash handover of ₹${rec.cash_collected.toLocaleString("en-IN")} from ${rec.volunteer_name || rec.volunteer_email}`
                                        : `Handover status reset for ${rec.volunteer_name || rec.volunteer_email}`
                                    );
                                    return next;
                                  });
                                }}
                                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                                  isDone
                                    ? "border border-[var(--border)] bg-[var(--surface-3)] text-[var(--fg-muted)] hover:text-white"
                                    : "border border-amber-400 bg-amber-400 text-neutral-950 hover:bg-amber-300 shadow-sm"
                                }`}
                              >
                                {isDone ? "Reset Status" : "Mark Cash Received (✓)"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 1: ASSIGNED VOLUNTEERS ── */}
        {activeTab === "assigned" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs text-[var(--fg-muted)]">
              <span>
                Volunteers currently on duty for this event with QR ticket scanner authorization.
              </span>
              <span className="font-mono text-emerald-400">
                {assignedVolunteers.length} Active
              </span>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-[var(--fg-muted)]">
                <RefreshCw className="size-6 animate-spin text-[var(--brand)] mb-2" />
                <span className="text-xs">Loading assigned squad...</span>
              </div>
            ) : assignedVolunteers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)]/30 p-8 text-center">
                <ShieldCheck className="mx-auto size-10 text-[var(--fg-subtle)]/60 mb-2" />
                <h4 className="text-sm font-semibold text-white">No Volunteers Assigned Yet</h4>
                <p className="mt-1 text-xs text-[var(--fg-muted)] max-w-sm mx-auto">
                  Assign registered volunteers or quick-add new volunteers to grant entrance gate scanner access for this event.
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Button size="sm" variant="primary" onClick={() => setActiveTab("assign")}>
                    <Search className="size-3.5" /> Search &amp; Assign
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setActiveTab("create")}>
                    <UserPlus className="size-3.5" /> Quick Add New
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-[460px] overflow-y-auto pr-1">
                {assignedVolunteers.map((vol, idx) => {
                  const isResending = resendingEmail === vol.email;
                  const isRemoving = removingEmail === vol.email;

                  return (
                    <div
                      key={vol.email || idx}
                      className="group flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/70 p-3.5 transition-colors hover:border-emerald-500/40 hover:bg-[var(--surface-2)]"
                    >
                      <div className="flex items-start gap-3 min-w-[220px]">
                        <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-bold text-xs">
                          {vol.name ? vol.name.slice(0, 2).toUpperCase() : "VL"}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white truncate">
                              {vol.name || "Volunteer"}
                            </span>
                            <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.2 font-mono text-[9px] font-semibold text-emerald-300">
                              {vol.role || "Entrance Gate Scanner"}
                            </span>
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--fg-muted)]">
                            <span className="flex items-center gap-1 font-mono">
                              <Mail className="size-3 text-[var(--fg-subtle)]" />
                              {vol.email}
                            </span>
                            {vol.phone && (
                              <span className="flex items-center gap-1 font-mono">
                                <Phone className="size-3 text-[var(--fg-subtle)]" />
                                {vol.phone}
                              </span>
                            )}
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
                              {vol.total_checkins ?? 0} Admitted
                            </span>
                            {(vol.total_cash_collected ?? 0) > 0 ? (
                              <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                                ₹{vol.total_cash_collected?.toLocaleString("en-IN")} Cash ({vol.cash_collected_count ?? 0})
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-auto">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleResendCredentials(vol.email)}
                          disabled={isResending}
                          title="Generate fresh access code and email credentials"
                          className="text-[11px] font-semibold"
                        >
                          <Send className={`size-3 text-sky-400 ${isResending ? "animate-pulse" : ""}`} />
                          {isResending ? "Sending..." : "Resend Credentials"}
                        </Button>

                        <button
                          onClick={() => handleRemoveVolunteer(vol.email)}
                          disabled={isRemoving}
                          title="Unassign volunteer from this event"
                          className="grid size-8 cursor-pointer place-items-center rounded-lg text-[var(--fg-muted)] transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: SEARCH & ASSIGN EXISTING VOLUNTEERS (MULTI-SELECT) ── */}
        {activeTab === "assign" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-[var(--fg-muted)]">
                Select registered volunteers to assign to this event. An email with login credentials will be dispatched automatically.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  disabled={filteredAvailable.length === 0}
                  className="text-[11px] font-semibold text-[var(--brand)] hover:underline disabled:opacity-50"
                >
                  Select All Filtered ({filteredAvailable.length})
                </button>
                {selectedEmails.length > 0 && (
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="text-[11px] font-semibold text-[var(--fg-muted)] hover:text-white"
                  >
                    Clear ({selectedEmails.length})
                  </button>
                )}
              </div>
            </div>

            {/* Search Input & Role Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="relative sm:col-span-2">
                <Search className="absolute left-3 top-2.5 size-4 text-[var(--fg-subtle)]" />
                <input
                  type="text"
                  placeholder="Search volunteer by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-2 pl-9 pr-3 text-xs text-white placeholder-[var(--fg-subtle)] focus:border-[var(--brand)] focus:outline-none"
                />
              </div>

              <div>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-2 px-3 text-xs text-white focus:border-[var(--brand)] focus:outline-none"
                >
                  {COMMON_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Multi-Select Volunteer List */}
            {filteredAvailable.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)]/30 p-8 text-center">
                <Users className="mx-auto size-8 text-[var(--fg-subtle)]/60 mb-2" />
                <p className="text-xs text-[var(--fg-muted)]">
                  {searchQuery
                    ? `No unassigned volunteers found matching "${searchQuery}".`
                    : "All registered volunteers are already assigned to this event!"}
                </p>
                <div className="mt-3">
                  <Button size="sm" variant="secondary" onClick={() => setActiveTab("create")}>
                    <UserPlus className="size-3.5" /> Add New Volunteer
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-[380px] overflow-y-auto pr-1">
                {filteredAvailable.map((vol) => {
                  const isSelected = selectedEmails.includes(vol.email);
                  return (
                    <div
                      key={vol.email}
                      onClick={() => toggleSelectEmail(vol.email)}
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 transition-all ${
                        isSelected
                          ? "border-[var(--brand)] bg-[var(--brand)]/10 shadow-sm"
                          : "border-[var(--border)] bg-[var(--surface-2)]/50 hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`grid size-5 place-items-center rounded-md border ${
                            isSelected
                              ? "border-[var(--brand)] bg-[var(--brand)] text-black"
                              : "border-[var(--border)] bg-[var(--surface-3)] text-transparent"
                          }`}
                        >
                          <Check className="size-3.5 stroke-[3]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">
                            {vol.name || "Volunteer"}
                          </p>
                          <p className="font-mono text-[11px] text-[var(--fg-muted)] truncate">
                            {vol.email}
                            {vol.phone ? ` • ${vol.phone}` : ""}
                          </p>
                        </div>
                      </div>

                      <Badge tone={isSelected ? "success" : "neutral"}>
                        {isSelected ? "Selected" : "Available"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Assignment Action */}
            <div className="mt-2 flex items-center justify-between border-t border-[var(--border)] pt-3">
              <span className="text-xs text-[var(--fg-muted)]">
                Selected: <strong className="text-white">{selectedEmails.length}</strong> volunteer(s)
              </span>
              <Button
                variant="primary"
                onClick={handleAssignSelected}
                disabled={selectedEmails.length === 0 || assigning}
                className="font-bold text-xs"
              >
                <Sparkles className="size-3.5" />
                {assigning
                  ? "Assigning & Dispatching Emails..."
                  : `Assign Selected (${selectedEmails.length}) & Email Pass`}
              </Button>
            </div>
          </div>
        )}

        {/* ── TAB 3: QUICK REGISTER NEW VOLUNTEER & ASSIGN ── */}
        {activeTab === "create" && (
          <form onSubmit={handleQuickCreateAndAssign} className="flex flex-col gap-4">
            <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 text-xs text-sky-300">
              ⚡ Register a new volunteer and immediately assign them to this event. An email containing their generated access password and event gate scanner link will be sent automatically.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--fg-muted)] mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-2 px-3 text-xs text-white placeholder-[var(--fg-subtle)] focus:border-[var(--brand)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--fg-muted)] mb-1">
                  Email Address <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. rahul@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-2 px-3 text-xs text-white placeholder-[var(--fg-subtle)] focus:border-[var(--brand)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--fg-muted)] mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-2 px-3 text-xs text-white placeholder-[var(--fg-subtle)] focus:border-[var(--brand)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--fg-muted)] mb-1">
                  Assigned Gate / Duty
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-2 px-3 text-xs text-white focus:border-[var(--brand)] focus:outline-none"
                >
                  {COMMON_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[var(--fg-muted)] mb-1">
                  Access Password <span className="font-normal text-[var(--fg-subtle)]">(Optional — leave blank to auto-generate secure UTI-XXXXXX code)</span>
                </label>
                <input
                  type="text"
                  placeholder="Leave empty to auto-generate"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-2 px-3 font-mono text-xs text-white placeholder-[var(--fg-subtle)] focus:border-[var(--brand)] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] pt-3">
              <Button type="button" variant="secondary" onClick={() => setActiveTab("assigned")}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={creating} className="font-bold text-xs">
                <UserPlus className="size-3.5" />
                {creating ? "Registering & Sending..." : "Register, Assign & Send Email"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
