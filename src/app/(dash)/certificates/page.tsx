"use client";

import { Download, Ban, Award } from "lucide-react";
import { Button, DataTable, Panel, StatusBadge, useConfirm, useResource } from "@/components/Kit";
import { StatCard } from "@/components/Dash";
import { useToast } from "@/components/Providers";
import { certificatesApi, safe, toRows } from "@/lib/api";
import { download, formatDate, formatNumber, rowId } from "@/lib/utils";

export default function CertificatesPage() {
  const { push } = useToast();
  const { confirm, dialog } = useConfirm();

  const { data, loading, error, reload } = useResource(async () => ({
    list: await safe(certificatesApi.list({ limit: 200 }), []),
    analytics: await safe(certificatesApi.analytics(), null),
  }), []);

  const rows = toRows(data?.list);
  const a = data?.analytics || {};

  const grab = async (row: any) => {
    try {
      const blob = await certificatesApi.download(rowId(row));
      download(blob, `certificate-${row.certificate_number || rowId(row)}.pdf`);
      push("success", "Certificate downloaded.");
    } catch (e: any) { push("error", e?.message || "Download failed."); }
  };

  const revoke = async (row: any) => {
    const ok = await confirm("Revoke this certificate?", "Its public verification link will stop working.");
    if (!ok) return;
    try { await certificatesApi.revoke(rowId(row), { reason: "Revoked from admin panel" }); push("success", "Certificate revoked."); reload(); }
    catch (e: any) { push("error", e?.message || "Could not revoke."); }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Certificates issued" value={formatNumber(a.total_issued ?? rows.length)} Icon={Award} accent index={0} />
        <StatCard label="Active" value={formatNumber(a.active ?? rows.filter((r) => r.status !== "revoked").length)} Icon={Award} index={1} />
        <StatCard label="Revoked" value={formatNumber(a.revoked ?? rows.filter((r) => r.status === "revoked").length)} Icon={Ban} index={2} />
        <StatCard label="Downloads" value={formatNumber(a.total_downloads ?? 0)} Icon={Download} index={3} />
      </div>

      <Panel title="Issued certificates" subtitle="Every certificate carries a unique public verification link">
        <DataTable
          rows={rows} loading={loading} error={error} onRetry={reload}
          searchKeys={["recipient_name", "certificate_number", "user_email"]}
          empty={{ title: "No certificates issued", body: "Certificates are generated once a competition is finalised." }}
          columns={[
            { key: "recipient_name", header: "Recipient", render: (r: any) => (
              <div className="min-w-0">
                <p className="truncate font-semibold">{r.recipient_name || r.user_name || "—"}</p>
                <p className="truncate text-[11.5px] text-[var(--fg-muted)]">{r.user_email || "—"}</p>
              </div>
            ) },
            { key: "certificate_number", header: "Number", render: (r: any) => <span className="font-mono text-[12px]">{r.certificate_number || rowId(r)}</span> },
            { key: "title", header: "For", render: (r: any) => r.title || r.competition_title || "—" },
            { key: "issued_at", header: "Issued", render: (r: any) => formatDate(r.issued_at || r.created_at) },
            { key: "status", header: "Status", render: (r: any) => <StatusBadge value={r.status || "active"} /> },
            { key: "__a", header: "Actions", className: "text-right", render: (r: any) => (
              <div className="flex items-center justify-end gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => grab(r)}><Download className="size-3.5" aria-hidden /> PDF</Button>
                {r.status !== "revoked" && <Button size="sm" variant="secondary" onClick={() => revoke(r)}><Ban className="size-3.5" aria-hidden /></Button>}
              </div>
            ) },
          ]}
        />
      </Panel>
      {dialog}
    </div>
  );
}
