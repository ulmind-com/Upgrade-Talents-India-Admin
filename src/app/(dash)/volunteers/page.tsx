"use client";

import { useState, useMemo } from "react";
import {
  Users, UserCheck, Banknote, CreditCard, Plus, Search,
  Receipt, Trash2, Mail, Phone, ShieldCheck, Clock, RefreshCw,
  AlertTriangle, X, CheckCircle2, Ticket
} from "lucide-react";
import {
  Button, Badge, StatusBadge, Panel, Loading, ErrorState, EmptyState,
  DataTable, Modal, Field, Input, useConfirm, useResource
} from "@/components/Kit";
import { StatCard } from "@/components/Dash";
import { useToast } from "@/components/Providers";
import { volunteersApi, toRows } from "@/lib/api";
import { formatDate, formatINR, formatNumber } from "@/lib/utils";

interface Volunteer {
  _id: string;
  name?: string;
  full_name?: string;
  email: string;
  phone?: string;
  phone_number?: string;
  role?: string;
  is_active?: boolean;
  status?: string;
  total_checkins?: number;
  cash_collected_count?: number;
  online_checkins_count?: number;
  total_cash_collected?: number;
  last_active?: string;
  created_at?: string;
}

export default function VolunteersPage() {
  const { push } = useToast();
  const { confirm, dialog } = useConfirm();

  const { data: rawVolunteers, loading, error, reload } = useResource(
    () => volunteersApi.list({ limit: 200 }),
    []
  );

  const volunteers: Volunteer[] = useMemo(() => {
    return toRows(rawVolunteers);
  }, [rawVolunteers]);

  // Modals state
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  // Audit modal state
  const [auditVolunteer, setAuditVolunteer] = useState<Volunteer | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditData, setAuditData] = useState<any | null>(null);
  const [auditSearch, setAuditSearch] = useState("");

  // Aggregate Top KPIs
  const stats = useMemo(() => {
    let totalAdmitted = 0;
    let totalCash = 0;
    let totalCashCount = 0;
    let totalOnlineCount = 0;

    volunteers.forEach((v) => {
      totalAdmitted += v.total_checkins || 0;
      totalCash += v.total_cash_collected || 0;
      totalCashCount += v.cash_collected_count || 0;
      totalOnlineCount += v.online_checkins_count || 0;
    });

    return {
      totalVolunteers: volunteers.length,
      totalAdmitted,
      totalCash,
      totalCashCount,
      totalOnlineCount,
    };
  }, [volunteers]);

  // Open Audit Modal for a specific volunteer
  const handleOpenAudit = async (vol: Volunteer) => {
    setAuditVolunteer(vol);
    setAuditSearch("");
    setAuditLoading(true);
    setAuditData(null);

    try {
      const res = await volunteersApi.getCheckins(vol.email);
      setAuditData(res);
    } catch (e: any) {
      push("error", e?.message || "Failed to load volunteer check-in records.");
    } finally {
      setAuditLoading(false);
    }
  };

  // Create Volunteer
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.name.trim()) {
      push("error", "Name and email are required.");
      return;
    }
    setCreating(true);
    try {
      await volunteersApi.create({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || undefined,
        phone_number: formData.phone.trim() || undefined,
        password: formData.password.trim() || undefined,
      });
      push("success", `Volunteer ${formData.name} added successfully!`);
      setCreateOpen(false);
      setFormData({ name: "", email: "", phone: "", password: "" });
      reload();
    } catch (e: any) {
      push("error", e?.message || "Failed to add volunteer.");
    } finally {
      setCreating(false);
    }
  };

  // Delete Volunteer
  const handleDelete = async (vol: Volunteer) => {
    const ok = await confirm(
      `Remove ${vol.name || vol.email}?`,
      "This will remove volunteer access. Past check-in audit logs will remain intact.",
      true
    );
    if (!ok) return;

    try {
      await volunteersApi.remove(vol.email);
      push("success", `Removed ${vol.name || vol.email}`);
      reload();
    } catch (e: any) {
      push("error", e?.message || "Failed to remove volunteer.");
    }
  };

  // Filtered checkins for audit modal
  const filteredCheckins = useMemo(() => {
    if (!auditData?.checkins) return [];
    if (!auditSearch.trim()) return auditData.checkins;
    const q = auditSearch.toLowerCase();
    return auditData.checkins.filter((c: any) =>
      c.holder_name?.toLowerCase().includes(q) ||
      c.holder_email?.toLowerCase().includes(q) ||
      c.booking_reference?.toLowerCase().includes(q) ||
      c.ticket_ref?.toLowerCase().includes(q) ||
      c.event_title?.toLowerCase().includes(q) ||
      (c.seats && c.seats.some((s: string) => s.toLowerCase().includes(q)))
    );
  }, [auditData, auditSearch]);

  if (loading) return <Loading rows={5} />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="flex flex-col gap-6">
      {/* ── HEADER ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Volunteers & Gate Audit
          </h1>
          <p className="text-xs text-[var(--fg-muted)] mt-1">
            Track gate staff check-in activity, audit physical cash collections, and inspect attendee ledgers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={reload} title="Refresh records">
            <RefreshCw className="size-3.5" />
            <span>Refresh</span>
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            <span>Add Volunteer</span>
          </Button>
        </div>
      </div>

      {/* ── TOP KPI METRIC CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Registered Gate Staff"
          value={formatNumber(stats.totalVolunteers)}
          hint="Volunteers & scanners active"
          Icon={Users}
          index={0}
        />
        <StatCard
          label="Total Attendees Admitted"
          value={formatNumber(stats.totalAdmitted)}
          hint="Scanned across all gates"
          Icon={UserCheck}
          index={1}
        />
        <StatCard
          label="Total Cash Collected"
          value={`₹${stats.totalCash.toLocaleString("en-IN")}`}
          hint={`${formatNumber(stats.totalCashCount)} cash spot passes admitted`}
          Icon={Banknote}
          accent
          index={2}
        />
        <StatCard
          label="Online Paid Admissions"
          value={formatNumber(stats.totalOnlineCount)}
          hint="Prepaid digital tickets"
          Icon={CreditCard}
          index={3}
        />
      </div>

      {/* ── MAIN VOLUNTEERS TABLE ── */}
      <Panel
        title="Volunteer Roster & Live Metrics"
        subtitle={`${volunteers.length} registered staff member(s)`}
      >
        <DataTable<Volunteer>
          rows={volunteers}
          searchKeys={["name", "full_name", "email", "phone"]}
          empty={{
            title: "No volunteers found",
            body: "Add volunteers so they can scan passes at venue gates.",
          }}
          pageSize={20}
          columns={[
            {
              key: "name",
              header: "Volunteer",
              render: (r) => (
                <div className="flex items-center gap-3 min-w-[200px]">
                  <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 font-bold text-xs text-emerald-400">
                    {(r.name || r.full_name || r.email).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">
                      {r.name || r.full_name || "Unnamed"}
                    </p>
                    <p className="truncate text-[11px] font-mono text-[var(--fg-muted)]">
                      {r.email}
                    </p>
                  </div>
                </div>
              ),
            },
            {
              key: "phone",
              header: "Phone",
              render: (r) => (
                <span className="font-mono text-xs text-[var(--fg-muted)]">
                  {r.phone || r.phone_number || "—"}
                </span>
              ),
            },
            {
              key: "total_checkins",
              header: "Admitted",
              render: (r) => (
                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-xs font-bold text-emerald-400">
                  <UserCheck className="size-3.5" />
                  {r.total_checkins ?? 0}
                </span>
              ),
            },
            {
              key: "total_cash_collected",
              header: "Cash Collected",
              render: (r) => {
                const cash = r.total_cash_collected || 0;
                const count = r.cash_collected_count || 0;
                return (
                  <div className="min-w-[130px]">
                    <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 font-mono text-xs font-black text-amber-300">
                      <Banknote className="size-3.5" />
                      ₹{cash.toLocaleString("en-IN")}
                    </span>
                    {count > 0 && (
                      <p className="text-[10px] text-amber-400/80 mt-0.5 font-medium">
                        {count} cash pass{count === 1 ? "" : "es"}
                      </p>
                    )}
                  </div>
                );
              },
            },
            {
              key: "online_checkins_count",
              header: "Online Passes",
              render: (r) => (
                <span className="inline-flex items-center gap-1 rounded-md border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 font-mono text-xs font-semibold text-sky-400">
                  <CreditCard className="size-3.5" />
                  {r.online_checkins_count ?? 0}
                </span>
              ),
            },
            {
              key: "last_active",
              header: "Last Scan",
              render: (r) =>
                r.last_active ? (
                  <span className="text-xs text-[var(--fg-muted)] flex items-center gap-1">
                    <Clock className="size-3" />
                    {formatDate(r.last_active)}
                  </span>
                ) : (
                  <span className="text-xs text-[var(--fg-subtle)]">Not yet active</span>
                ),
            },
            {
              key: "actions",
              header: "Audit & Actions",
              render: (r) => (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleOpenAudit(r)}
                    className="text-xs font-semibold border-emerald-500/30 hover:border-emerald-500/60"
                    title="Audit all attendees scanned and cash collected by this volunteer"
                  >
                    <Receipt className="size-3.5 text-emerald-400" />
                    <span>Audit Scans</span>
                  </Button>

                  <button
                    onClick={() => handleDelete(r)}
                    className="grid size-8 place-items-center rounded-lg text-[var(--fg-muted)] transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                    title="Remove volunteer"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </Panel>

      {/* ── CREATE VOLUNTEER MODAL ── */}
      <Modal
        open={createOpen}
        title="Add New Volunteer"
        subtitle="Register gate personnel and configure access password for ticket scanning"
        onClose={() => setCreateOpen(false)}
      >
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <Field label="Full Name" required>
              {({ id, invalid }) => (
                <Input
                  id={id}
                  invalid={invalid}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ramesh Ghosh"
                  required
                />
              )}
            </Field>

            <Field label="Email Address" required hint="Used to log in to the Volunteer Scanner terminal">
              {({ id, invalid }) => (
                <Input
                  id={id}
                  invalid={invalid}
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="volunteer@upgradetalentsindia.in"
                  required
                />
              )}
            </Field>

            <Field label="Phone Number">
              {({ id, invalid }) => (
                <Input
                  id={id}
                  invalid={invalid}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                />
              )}
            </Field>

            <Field label="Access Password" required hint="Password used to sign in at /volunteer/login">
              {({ id, invalid }) => (
                <Input
                  id={id}
                  invalid={invalid}
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Set password (e.g. Pass123!)"
                  required
                />
              )}
            </Field>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Adding..." : "Add Volunteer"}
              </Button>
            </div>
          </form>
        </Modal>

      {/* ── AUDIT CHECK-INS MODAL ── */}
      {auditVolunteer && (
        <Modal
          open={Boolean(auditVolunteer)}
          title={`Gate Audit Ledger: ${auditVolunteer.name || auditVolunteer.email}`}
          subtitle={`Scanned attendee ledger & cash reconciliation for ${auditVolunteer.email}`}
          onClose={() => setAuditVolunteer(null)}
          size="3xl"
        >
          <div className="flex flex-col gap-5">
            {/* Summary Metrics Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-[var(--surface-2)]/80 border border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-lg bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
                  <UserCheck className="size-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-[var(--fg-muted)]">
                    Total Admitted
                  </div>
                  <div className="text-lg font-black text-white">
                    {auditData?.total_checkins ?? auditVolunteer.total_checkins ?? 0} Attendees
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-lg bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30">
                  <Banknote className="size-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-amber-300">
                    Cash Collected
                  </div>
                  <div className="text-lg font-black text-amber-300 font-mono">
                    ₹{(auditData?.total_cash_collected ?? auditVolunteer.total_cash_collected ?? 0).toLocaleString("en-IN")}
                  </div>
                  <div className="text-[10px] text-amber-400/80">
                    {auditData?.cash_collected_count ?? auditVolunteer.cash_collected_count ?? 0} Cash Passes
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-lg bg-sky-500/15 text-sky-400 font-bold border border-sky-500/30">
                  <CreditCard className="size-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-[var(--fg-muted)]">
                    Online Passes
                  </div>
                  <div className="text-lg font-black text-white">
                    {auditData?.online_checkins_count ?? auditVolunteer.online_checkins_count ?? 0} Passes
                  </div>
                </div>
              </div>
            </div>

            {/* Search Filter in Modal */}
            <div className="relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Search attendee name, booking ref, seat number, or event..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-white placeholder-[var(--fg-muted)] focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Check-ins Table */}
            {auditLoading ? (
              <Loading rows={4} />
            ) : filteredCheckins.length === 0 ? (
              <div className="py-12 text-center text-[var(--fg-muted)] text-xs border border-dashed border-[var(--border)] rounded-xl">
                {auditSearch ? "No attendees match your search." : "No check-ins recorded yet by this volunteer."}
              </div>
            ) : (
              <div className="max-h-[380px] overflow-y-auto border border-[var(--border)] rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-[var(--surface)] text-[var(--fg-muted)] uppercase text-[10px] tracking-wider border-b border-[var(--border)]">
                    <tr>
                      <th className="p-3">Attendee</th>
                      <th className="p-3">Event & Seats</th>
                      <th className="p-3">Payment Mode</th>
                      <th className="p-3">Cash Status</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3 text-right">Admitted At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] bg-[var(--surface-2)]/40 font-medium">
                    {filteredCheckins.map((item: any, idx: number) => {
                      const isCash = String(item.payment_method).toUpperCase() === "CASH";
                      const seats = Array.isArray(item.seats) ? item.seats.join(", ") : (item.seats || item.seat || "—");

                      return (
                        <tr key={item.ticket_ref || idx} className="hover:bg-[var(--surface-2)]/80">
                          <td className="p-3">
                            <div className="font-bold text-white truncate max-w-[160px]">
                              {item.holder_name || "Guest"}
                            </div>
                            <div className="text-[11px] text-[var(--fg-muted)] font-mono truncate max-w-[160px]">
                              {item.booking_reference ? `#${item.booking_reference}` : item.ticket_ref}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="text-slate-200 truncate max-w-[180px]">
                              {item.event_title || "Event"}
                            </div>
                            <div className="text-[11px] text-emerald-400 font-mono">
                              Seat: {seats}
                            </div>
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                              isCash
                                ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                                : "bg-sky-500/15 text-sky-400 border-sky-500/30"
                            }`}>
                              {isCash ? "CASH SPOT PASS" : "ONLINE"}
                            </span>
                          </td>
                          <td className="p-3">
                            {item.cash_collect_done ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                                <CheckCircle2 className="size-3" />
                                <span>Collected</span>
                              </span>
                            ) : isCash ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400">
                                <AlertTriangle className="size-3" />
                                <span>Cash Pending</span>
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">Online Paid</span>
                            )}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-white">
                            {item.cash_amount > 0 ? `₹${item.cash_amount.toLocaleString("en-IN")}` : "—"}
                          </td>
                          <td className="p-3 text-right text-[11px] text-[var(--fg-muted)] font-mono whitespace-nowrap">
                            {formatDate(item.checked_in_at || item.check_in_time)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Reconciliation Box */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
              <div className="flex items-center gap-2">
                <Banknote className="size-4 shrink-0" />
                <span>
                  <strong>Physical Cash Handover:</strong> Volunteer <strong>{auditVolunteer.name || auditVolunteer.email}</strong> is accountable for <strong>₹{(auditData?.total_cash_collected ?? auditVolunteer.total_cash_collected ?? 0).toLocaleString("en-IN")}</strong> in collected gate cash.
                </span>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setAuditVolunteer(null)}>
                Done / Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {dialog}
    </div>
  );
}
