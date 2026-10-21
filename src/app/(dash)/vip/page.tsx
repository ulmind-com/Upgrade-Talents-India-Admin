"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Ban, Crown, Ticket, Users, Eye, CheckCircle2, Phone, Mail, Calendar } from "lucide-react";
import {
  Button, DataTable, EmptyState, ErrorState, Loading, Modal, Panel, Select,
  StatusBadge, useConfirm, useResource, Field, Input,
} from "@/components/Kit";
import { StatCard } from "@/components/Dash";
import { useToast } from "@/components/Providers";
import { cmsApi, vipApi, safe, toRows } from "@/lib/api";
import { formatDate, formatINR, formatNumber, rowId } from "@/lib/utils";

function VipContent() {
  const { push } = useToast();
  const { confirm, dialog } = useConfirm();
  const searchParams = useSearchParams();
  const paramEventId = searchParams?.get("eventId") || "";
  const paramTab = searchParams?.get("tab") || "";

  const [eventId, setEventId] = useState(paramEventId);
  const [tab, setTab] = useState<"passes" | "bookings" | "checkins">(
    paramTab === "bookings" ? "bookings" : paramTab === "checkins" ? "checkins" : "passes"
  );
  const [issueOpen, setIssueOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  const { data: events, loading: le, error: ee, reload: re } = useResource(() => cmsApi.listEvents({ limit: 200 }), []);
  const eventList = toRows(events);

  useEffect(() => {
    if (paramEventId && eventList.some((e) => String(e._id) === paramEventId)) {
      setEventId(paramEventId);
    } else if (!eventId && eventList.length) {
      setEventId(String(eventList[0]._id));
    }
  }, [eventList, eventId, paramEventId]);

  const { data, loading, error, reload } = useResource(
    async () => (!eventId ? null : {
      capacity: await safe(vipApi.capacity(eventId), null),
      analytics: await safe(vipApi.analytics(eventId), null),
      passes: await safe(vipApi.listPasses(eventId, { limit: 150 }), []),
      bookings: await safe(vipApi.listBookings(eventId, { limit: 150 }), []),
      checkins: await safe(vipApi.checkins(eventId, { limit: 150 }), []),
    }),
    [eventId]
  );

  if (le) return <Loading rows={5} />;
  if (ee) return <ErrorState message={ee} onRetry={re} />;
  if (!eventList.length) return <EmptyState title="No events yet" body="VIP passes belong to an event — create one first." />;

  const passes = toRows(data?.passes);
  const bookings = toRows(data?.bookings);
  const checkins = toRows(data?.checkins);
  const rawCap = data?.capacity || {};
  const cap = rawCap.overall_capacity || rawCap;

  const revoke = async (row: any) => {
    const ok = await confirm("Revoke this VIP pass?", "The holder will be refused at the gate from now on.");
    if (!ok) return;
    try {
      await vipApi.revokePass(rowId(row), { reason: "Revoked from admin panel" });
      push("success", "Pass revoked.");
      reload();
    } catch (e: any) {
      push("error", e?.message || "Could not revoke the pass.");
    }
  };

  const tabs = [
    { key: "passes", label: `Passes (${passes.length})` },
    { key: "bookings", label: `Bookings (${bookings.length})` },
    { key: "checkins", label: `Check-in log (${checkins.length})` },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <Panel title="Choose an event">
        <div className="max-w-md">
          <label htmlFor="vip-event" className="sr-only">Event</label>
          <Select
            id="vip-event"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            options={eventList.map((e) => ({
              value: String(e._id),
              label: `${e.title} — ${formatDate(e.date)}`,
            }))}
          />
        </div>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total VIP capacity" value={formatNumber(cap.total_capacity ?? cap.capacity ?? 0)} Icon={Crown} accent index={0} />
        <StatCard label="Passes issued" value={formatNumber(cap.confirmed_count ?? cap.booked_count ?? cap.issued ?? passes.length)} Icon={Ticket} index={1} />
        <StatCard label="Remaining" value={formatNumber(cap.available_count ?? cap.remaining ?? cap.available ?? 0)} Icon={Crown} index={2} />
        <StatCard label="Checked in" value={formatNumber(checkins.filter((c) => c.outcome === "ALLOWED" || c.allowed).length)} Icon={Ticket} index={3} />
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className={`min-h-[40px] cursor-pointer rounded-xl px-4 text-[13px] font-semibold transition-colors ${
              tab === t.key ? "bg-[var(--brand)] text-[var(--on-brand)]" : "border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] hover:text-[var(--fg)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Panel
        title={tab === "passes" ? "VIP passes" : tab === "bookings" ? "VIP bookings & purchasers" : "Gate check-in log"}
        subtitle={tab === "bookings" ? "List of customers who booked VIP access, payment status, and individual passes" : undefined}
        action={tab === "passes" ? <Button size="sm" onClick={() => setIssueOpen(true)}><Crown className="size-4" aria-hidden /> Issue pass</Button> : undefined}
      >
        {tab === "passes" && (
          <DataTable
            rows={passes} loading={loading} error={error} onRetry={reload}
            searchKeys={["holder_name", "pass_reference", "category"]}
            empty={{ title: "No VIP passes issued" }}
            columns={[
              { key: "holder_name", header: "Holder", render: (r: any) => (
                <div className="min-w-0">
                  <p className="truncate font-semibold">{r.holder_name || "—"}</p>
                  <p className="truncate font-mono text-[11px] text-[var(--fg-muted)]">{r.pass_reference || rowId(r)}</p>
                </div>
              ) },
              { key: "category", header: "Category", render: (r: any) => r.category || "—" },
              { key: "status", header: "Status", render: (r: any) => <StatusBadge value={r.status} /> },
              { key: "entry_count", header: "Entries", render: (r: any) => r.entry_count ?? 0 },
              { key: "__a", header: "Actions", className: "text-right", render: (r: any) => (
                <Button size="sm" variant="secondary" onClick={() => revoke(r)}><Ban className="size-3.5" aria-hidden /> Revoke</Button>
              ) },
            ]}
          />
        )}

        {tab === "bookings" && (
          <DataTable
            rows={bookings} loading={loading} error={error} onRetry={reload}
            searchKeys={["user_email", "booking_reference", "user_name"]}
            empty={{ title: "No VIP bookings found for this event" }}
            columns={[
              {
                key: "booking_reference",
                header: "Booking Ref",
                render: (r: any) => (
                  <div>
                    <span className="font-mono text-xs font-bold text-[var(--brand)]">
                      {r.booking_reference || rowId(r)}
                    </span>
                    <span className="block text-[11px] text-[var(--fg-subtle)]">
                      {formatDate(r.booked_at || r.created_at, true)}
                    </span>
                  </div>
                ),
              },
              {
                key: "user",
                header: "Buyer / Contact",
                render: (r: any) => (
                  <div className="text-xs">
                    <p className="font-semibold text-white">{r.user_name || "VIP Customer"}</p>
                    <p className="font-mono text-[11px] text-[var(--fg-muted)]">{r.user_email || "—"}</p>
                    {r.user_phone && <p className="font-mono text-[10.5px] text-[var(--fg-subtle)]">{r.user_phone}</p>}
                  </div>
                ),
              },
              {
                key: "pass_name",
                header: "Tier / Category",
                render: (r: any) => (
                  <div className="text-xs">
                    <span className="font-medium text-white">{r.pass_name || r.category || "VIP Pass"}</span>
                  </div>
                ),
              },
              {
                key: "quantity",
                header: "Qty / Amount",
                render: (r: any) => (
                  <div className="text-xs">
                    <span className="font-bold text-white">{r.quantity ?? 1} pass{(r.quantity ?? 1) > 1 ? "es" : ""}</span>
                    <span className="block font-mono text-[11px] text-[var(--fg-muted)]">
                      {r.total_amount != null ? formatINR(r.total_amount) : "—"}
                    </span>
                  </div>
                ),
              },
              {
                key: "status",
                header: "Status",
                render: (r: any) => (
                  <div className="flex flex-col gap-1">
                    <StatusBadge value={r.status || r.booking_status} />
                    <span className={`text-[10px] font-bold uppercase ${r.payment_status === "PAID" ? "text-green-400" : "text-amber-400"}`}>
                      {r.payment_status || "PENDING"}
                    </span>
                  </div>
                ),
              },
              {
                key: "__actions",
                header: "Details",
                className: "text-right",
                render: (r: any) => (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setSelectedBooking(r);
                      setDetailModalOpen(true);
                    }}
                  >
                    <Eye className="size-3.5" /> View
                  </Button>
                ),
              },
            ]}
          />
        )}

        {tab === "checkins" && (
          <DataTable
            rows={checkins} loading={loading} error={error} onRetry={reload}
            searchKeys={["holder_name", "gate_id", "outcome"]}
            empty={{ title: "No scans recorded", body: "Entries appear here as volunteers scan passes at the gate." }}
            columns={[
              { key: "timestamp", header: "Time", render: (r: any) => formatDate(r.timestamp, true) },
              { key: "holder_name", header: "Holder", render: (r: any) => r.holder_name || "—" },
              { key: "gate_id", header: "Gate", render: (r: any) => r.gate_id || "—" },
              { key: "outcome", header: "Outcome", render: (r: any) => <StatusBadge value={r.outcome || (r.allowed ? "approved" : "failed")} /> },
            ]}
          />
        )}
      </Panel>

      <IssuePassModal open={issueOpen} onClose={() => setIssueOpen(false)} eventId={eventId} onDone={reload} />
      <VipBookingDetailModal
        open={detailModalOpen}
        booking={selectedBooking}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedBooking(null);
        }}
      />
      {dialog}
    </div>
  );
}

function VipBookingDetailModal({
  open,
  booking,
  onClose,
}: {
  open: boolean;
  booking: any;
  onClose: () => void;
}) {
  if (!booking) return null;
  const holders: string[] = booking.holder_names || [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={`VIP Booking: ${booking.booking_reference}`}
      subtitle={`Tier: ${booking.pass_name || booking.category || "VIP Pass"}`}
      footer={<Button variant="secondary" onClick={onClose}>Close</Button>}
    >
      <div className="flex flex-col gap-5 text-xs">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-4">
            <span className="flex items-center gap-1.5 font-bold uppercase text-[10.5px] text-[var(--fg-muted)]">
              <Users className="size-3.5 text-[var(--brand)]" /> Customer Info
            </span>
            <p className="mt-2 text-sm font-semibold text-white">{booking.user_name || "VIP Customer"}</p>
            <p className="mt-0.5 font-mono text-[11.5px] text-[var(--brand)]">{booking.user_email}</p>
            {booking.user_phone && (
              <p className="mt-0.5 font-mono text-[11px] text-[var(--fg-muted)]">{booking.user_phone}</p>
            )}
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-4">
            <span className="flex items-center gap-1.5 font-bold uppercase text-[10.5px] text-[var(--fg-muted)]">
              <Ticket className="size-3.5 text-[var(--brand)]" /> Pass Configuration
            </span>
            <p className="mt-2 text-sm font-semibold text-white">{booking.pass_name || "VIP Pass"}</p>
            <p className="mt-0.5 text-[11px] text-[var(--fg-muted)]">Category: {booking.category || "VIP"}</p>
            <p className="mt-1 text-[11px] text-[var(--fg-subtle)]">Quantity: {booking.quantity} pass(es)</p>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-4">
            <span className="flex items-center gap-1.5 font-bold uppercase text-[10.5px] text-[var(--fg-muted)]">
              <Calendar className="size-3.5 text-[var(--brand)]" /> Payment & Validity
            </span>
            <p className="mt-2 text-sm font-bold text-white">{formatINR(booking.total_amount)}</p>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge value={booking.status || booking.booking_status} />
              <span className={`text-[10px] font-bold uppercase ${booking.payment_status === "PAID" ? "text-green-400" : "text-amber-400"}`}>
                {booking.payment_status || "PENDING"}
              </span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-2.5 font-semibold text-sm text-white">
            VIP Pass Holders ({holders.length ? holders.length : booking.quantity})
          </h3>
          {holders.length > 0 ? (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {holders.map((name, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                  <div className="flex items-center gap-2">
                    <span className="grid size-6 place-items-center rounded-full bg-[var(--brand-soft)] text-xs font-bold text-[var(--brand)]">
                      {i + 1}
                    </span>
                    <span className="font-semibold text-white">{name}</span>
                  </div>
                  <span className="rounded bg-[var(--surface-2)] px-2 py-0.5 text-[10.5px] font-mono text-[var(--brand)]">
                    VIP Pass
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-4 text-center text-[var(--fg-muted)]">
              {booking.quantity} VIP pass(es) issued to {booking.user_name || booking.user_email}.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}

function IssuePassModal({ open, onClose, eventId, onDone }: { open: boolean; onClose: () => void; eventId: string; onDone: () => void }) {
  const { push } = useToast();
  const [form, setForm] = useState({ holder_name: "", holder_email: "", category: "VIP", quantity: "1" });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!form.holder_name.trim()) { push("error", "Enter the holder's name."); return; }
    setBusy(true);
    try {
      await vipApi.issuePass(eventId, {
        holder_name: form.holder_name.trim(),
        holder_email: form.holder_email.trim() || null,
        category: form.category,
        quantity: Number(form.quantity) || 1,
      });
      push("success", "VIP pass issued.");
      onClose();
      onDone();
    } catch (e: any) { push("error", e?.message || "Could not issue the pass."); }
    finally { setBusy(false); }
  };

  return (
    <Modal
      open={open} onClose={onClose} title="Issue a VIP pass"
      subtitle="The holder receives a scannable pass for gate entry."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={busy}>Issue pass</Button></>}
    >
      <div className="grid gap-4">
        <Field label="Holder name" required>
          {({ id, invalid }) => <Input id={id} value={form.holder_name} invalid={invalid} onChange={(e) => setForm((f) => ({ ...f, holder_name: e.target.value }))} placeholder="Full name" />}
        </Field>
        <Field label="Holder email" hint="Optional — used to deliver the pass.">
          {({ id }) => <Input id={id} type="email" value={form.holder_email} onChange={(e) => setForm((f) => ({ ...f, holder_email: e.target.value }))} />}
        </Field>
        <Field label="Category">
          {({ id }) => <Input id={id} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="VIP / Backstage / Artist" />}
        </Field>
        <Field label="Quantity">
          {({ id }) => <Input id={id} type="number" min={1} value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />}
        </Field>
      </div>
    </Modal>
  );
}

export default function VipPage() {
  return (
    <Suspense fallback={<Loading rows={5} />}>
      <VipContent />
    </Suspense>
  );
}
