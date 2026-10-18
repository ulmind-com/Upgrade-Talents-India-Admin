"use client";

import { useEffect, useState } from "react";
import { Ban, Crown, Ticket } from "lucide-react";
import {
  Button, DataTable, EmptyState, ErrorState, Loading, Modal, Panel, Select,
  StatusBadge, useConfirm, useResource, Field, Input,
} from "@/components/Kit";
import { StatCard } from "@/components/Dash";
import { useToast } from "@/components/Providers";
import { cmsApi, vipApi, safe, toRows } from "@/lib/api";
import { formatDate, formatNumber, rowId } from "@/lib/utils";

export default function VipPage() {
  const { push } = useToast();
  const { confirm, dialog } = useConfirm();
  const [eventId, setEventId] = useState("");
  const [tab, setTab] = useState<"passes" | "bookings" | "checkins">("passes");
  const [issueOpen, setIssueOpen] = useState(false);

  const { data: events, loading: le, error: ee, reload: re } = useResource(() => cmsApi.listEvents({ limit: 200 }), []);
  const eventList = toRows(events);
  useEffect(() => { if (!eventId && eventList.length) setEventId(String(eventList[0]._id)); }, [eventList, eventId]);

  const { data, loading, error, reload } = useResource(
    async () => (!eventId ? null : {
      capacity: await safe(vipApi.capacity(eventId), null),
      analytics: await safe(vipApi.analytics(eventId), null),
      passes: await safe(vipApi.listPasses(eventId, { limit: 100 }), []),
      bookings: await safe(vipApi.listBookings(eventId, { limit: 100 }), []),
      checkins: await safe(vipApi.checkins(eventId, { limit: 100 }), []),
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
    try { await vipApi.revokePass(rowId(row), { reason: "Revoked from admin panel" }); push("success", "Pass revoked."); reload(); }
    catch (e: any) { push("error", e?.message || "Could not revoke the pass."); }
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
            id="vip-event" value={eventId} onChange={(e) => setEventId(e.target.value)}
            options={eventList.map((e) => ({ value: String(e._id), label: `${e.title} — ${formatDate(e.date)}` }))}
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
        title={tab === "passes" ? "VIP passes" : tab === "bookings" ? "VIP bookings" : "Gate check-in log"}
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
            searchKeys={["user_email", "booking_reference"]}
            empty={{ title: "No VIP bookings" }}
            columns={[
              { key: "booking_reference", header: "Reference", render: (r: any) => <span className="font-mono text-[12px]">{r.booking_reference || rowId(r)}</span> },
              { key: "user_email", header: "User", render: (r: any) => r.user_email || "—" },
              { key: "pass_name", header: "Pass", render: (r: any) => r.pass_name || r.category || "—" },
              { key: "quantity", header: "Qty", render: (r: any) => r.quantity ?? 1 },
              { key: "total_amount", header: "Amount", render: (r: any) => r.total_amount != null ? `₹${Number(r.total_amount).toLocaleString("en-IN")}` : "—" },
              { key: "status", header: "Booking", render: (r: any) => <StatusBadge value={r.status || r.booking_status} /> },
              { key: "payment_status", header: "Payment", render: (r: any) => <StatusBadge value={r.payment_status} /> },
              { key: "created_at", header: "Booked", render: (r: any) => formatDate(r.created_at || r.booked_at, true) },
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
      {dialog}
    </div>
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
