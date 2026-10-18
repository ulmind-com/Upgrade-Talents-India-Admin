"use client";

import { useState } from "react";
import { ShieldCheck, ShieldX, Copy, Fingerprint, UserCheck, Clock, Ban, FileWarning } from "lucide-react";
import {
  Button, DataTable, Field, Loading, Modal, Panel, StatusBadge, Textarea, useResource,
} from "@/components/Kit";
import { KeyValues, StatCard } from "@/components/Dash";
import { useToast } from "@/components/Providers";
import { kycApi, safe } from "@/lib/api";
import { formatDate } from "@/lib/utils";

const FILTERS = [
  { value: "", label: "All" },
  { value: "VERIFIED", label: "Verified" },
  { value: "PENDING", label: "Pending" },
  { value: "DUPLICATE", label: "Duplicate" },
  { value: "REJECTED", label: "Rejected" },
  { value: "EXTRACTION_FAILED", label: "Failed" },
];

export default function KycPage() {
  const [status, setStatus] = useState("");
  const [review, setReview] = useState<any | null>(null);

  const { data, loading, error, reload } = useResource<{ stats: any; records: any } | null>(
    async () => ({
      stats: await safe(kycApi.analytics(), null),
      records: await safe(kycApi.records({ status_filter: status || undefined, page_size: 100 }), null),
    }),
    [status]
  );

  const stats = data?.stats;
  const rows: any[] = Array.isArray(data?.records?.items) ? data!.records.items : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">Identity Verification</h1>
        <p className="mt-1 text-[13.5px] text-[var(--fg-muted)]">
          Aadhaar KYC pulled from DigiLocker. Duplicates are blocked automatically.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Verified"
          value={stats?.verified ?? "—"}
          hint={stats?.verification_rate != null ? `${stats.verification_rate}% of all attempts` : undefined}
          Icon={UserCheck}
          accent
          index={0}
        />
        <StatCard label="Awaiting review" value={stats?.pending ?? "—"} Icon={Clock} index={1} />
        <StatCard
          label="Duplicates blocked"
          value={stats?.duplicate_blocked ?? "—"}
          hint="Aadhaar already on another account"
          Icon={Copy}
          index={2}
        />
        <StatCard
          label="Rejected"
          value={stats?.rejected ?? "—"}
          hint={stats?.extraction_failed ? `${stats.extraction_failed} extraction failures` : undefined}
          Icon={Ban}
          index={3}
        />
      </div>

      <Panel title="KYC records" subtitle={`${stats?.total_kyc_attempts ?? rows.length} verification attempts in total`}>
        <DataTable
          rows={rows}
          loading={loading}
          error={error}
          onRetry={reload}
          pageSize={12}
          searchKeys={["user_email", "aadhaar_masked", "digilocker_verified_name"]}
          rowKey={(r: any) => r.user_email || r.aadhaar_masked}
          empty={{
            title: status ? "No records with this status" : "No verification attempts yet",
            body: "Records appear here as soon as people start verifying their government ID.",
          }}
          toolbar={
            <div className="flex flex-wrap items-center gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f.label}
                  type="button"
                  onClick={() => setStatus(f.value)}
                  className={`cursor-pointer rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                    status === f.value
                      ? "border-[var(--brand)] bg-[var(--brand)] text-[var(--on-brand)]"
                      : "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--fg-muted)] hover:bg-[var(--surface-2)]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          }
          columns={[
            {
              key: "user_email",
              header: "Person",
              render: (r: any) => (
                <div className="min-w-0">
                  <p className="truncate font-semibold">{r.digilocker_verified_name || r.user_email}</p>
                  <p className="truncate text-[11.5px] text-[var(--fg-muted)]">{r.user_email}</p>
                </div>
              ),
            },
            {
              key: "aadhaar_masked",
              header: "Aadhaar",
              render: (r: any) => (
                <span className="font-mono text-[12px] tracking-[0.1em]">{r.aadhaar_masked || "—"}</span>
              ),
            },
            {
              key: "verification_source",
              header: "Source",
              render: (r: any) => (
                <span className="text-[12.5px]">
                  {r.verification_source || "—"}
                  {r.admin_override ? <span className="ml-1.5 text-[11px] text-[var(--fg-muted)]">(override)</span> : null}
                </span>
              ),
            },
            { key: "status", header: "Status", render: (r: any) => <StatusBadge value={r.status} /> },
            {
              key: "verified_at",
              header: "Verified",
              render: (r: any) => formatDate(r.verified_at || r.created_at),
            },
            {
              key: "actions",
              header: "",
              render: (r: any) => (
                <div className="flex justify-end">
                  <Button size="sm" variant="secondary" onClick={() => setReview(r)}>
                    <Fingerprint className="size-3.5" aria-hidden /> Review
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </Panel>

      <ReviewModal record={review} onClose={() => setReview(null)} onDone={() => { setReview(null); reload(); }} />
    </div>
  );
}

/** Full record plus the manual override, which always needs a reason for the audit trail. */
function ReviewModal({
  record, onClose, onDone,
}: {
  record: any | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { push } = useToast();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<"VERIFIED" | "REJECTED" | null>(null);

  const email: string = record?.user_email || "";

  const override = async (status: "VERIFIED" | "REJECTED") => {
    if (!reason.trim()) {
      push("error", "Add a reason — it goes into the audit trail.");
      return;
    }
    setBusy(status);
    try {
      await kycApi.override(email, { status, reason: reason.trim() });
      push("success", `KYC marked ${status.toLowerCase()} for ${email}.`);
      setReason("");
      onDone();
    } catch (e: any) {
      push("error", e?.message || "Could not update this record.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal
      open={!!record}
      onClose={onClose}
      title={record?.digilocker_verified_name || email || "KYC record"}
      subtitle="Verified identity details and manual override"
      wide
    >
      {!record ? (
        <Loading rows={3} />
      ) : (
        <div className="flex flex-col gap-6">
          <KeyValues
            items={[
              { k: "Status", v: <StatusBadge value={record.status} /> },
              { k: "Email", v: email },
              { k: "Aadhaar", v: <span className="font-mono tracking-[0.1em]">{record.aadhaar_masked || "—"}</span> },
              { k: "Source", v: record.verification_source || "—" },
              { k: "Checksum valid", v: record.verhoeff_valid ? "Yes" : "No" },
              { k: "Admin override", v: record.admin_override ? "Yes" : "No" },
              { k: "Verified name", v: record.digilocker_verified_name || "—" },
              { k: "Date of birth", v: record.digilocker_verified_dob || "—" },
              { k: "Address", v: record.digilocker_verified_address || "—" },
              { k: "Verified on", v: formatDate(record.verified_at || record.created_at, true) },
            ]}
          />

          {record.override_reason && (
            <p className="flex items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-[12.5px] text-[var(--fg-muted)]">
              <FileWarning className="mt-0.5 size-4 shrink-0 text-[var(--warning)]" aria-hidden />
              Last override reason: {record.override_reason}
            </p>
          )}

          <Panel title="Manual override" className="shadow-none" bodyClassName="p-4">
            <Field label="Reason" hint="Recorded in the audit log against your admin account." required>
              {(p) => (
                <Textarea
                  {...p}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="e.g. Verified against a physical document at the venue desk."
                />
              )}
            </Field>

            <div className="mt-4 flex flex-wrap gap-2.5">
              <Button
                variant="success"
                size="sm"
                loading={busy === "VERIFIED"}
                disabled={!!busy}
                onClick={() => override("VERIFIED")}
              >
                <ShieldCheck className="size-3.5" aria-hidden /> Mark verified
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={busy === "REJECTED"}
                disabled={!!busy}
                onClick={() => override("REJECTED")}
              >
                <ShieldX className="size-3.5" aria-hidden /> Reject
              </Button>
            </div>
          </Panel>
        </div>
      )}
    </Modal>
  );
}
