"use client";

import { BadgeCheck, RefreshCw, Ban } from "lucide-react";
import { Button, DataTable, Panel, StatusBadge, useConfirm, useResource } from "@/components/Kit";
import { StatCard } from "@/components/Dash";
import { useToast } from "@/components/Providers";
import { badgesApi, safe, toRows } from "@/lib/api";
import { formatDate, formatNumber, rowId } from "@/lib/utils";

export default function BadgesPage() {
  const { push } = useToast();
  const { confirm, dialog } = useConfirm();

  const { data, loading, error, reload } = useResource(async () => ({
    list: await safe(badgesApi.list({ limit: 200 }), []),
    analytics: await safe(badgesApi.analytics(), null),
  }), []);

  const rows = toRows(data?.list);
  const a = data?.analytics || {};

  const reconcile = async () => {
    try { await badgesApi.reconcile(); push("success", "Badge awards reconciled."); reload(); }
    catch (e: any) { push("error", e?.message || "Reconcile failed."); }
  };

  const revoke = async (row: any) => {
    const ok = await confirm("Revoke this badge?", "It will be removed from the user's profile.");
    if (!ok) return;
    try { await badgesApi.revoke(rowId(row), { reason: "Revoked from admin panel" }); push("success", "Badge revoked."); reload(); }
    catch (e: any) { push("error", e?.message || "Could not revoke."); }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Badges awarded" value={formatNumber(a.total_awarded ?? rows.length)} Icon={BadgeCheck} accent index={0} />
        <StatCard label="Unique holders" value={formatNumber(a.unique_users ?? 0)} Icon={BadgeCheck} index={1} />
        <StatCard label="Badge types" value={formatNumber(a.badge_types ?? 0)} Icon={BadgeCheck} index={2} />
        <StatCard label="Revoked" value={formatNumber(a.revoked ?? 0)} Icon={Ban} index={3} />
      </div>

      <Panel
        title="Awarded badges"
        subtitle="Automatic achievements earned across events and competitions"
        action={<Button size="sm" variant="secondary" onClick={reconcile}><RefreshCw className="size-3.5" aria-hidden /> Reconcile</Button>}
      >
        <DataTable
          rows={rows} loading={loading} error={error} onRetry={reload}
          searchKeys={["badge_name", "user_email", "badge_code"]}
          empty={{ title: "No badges awarded yet" }}
          columns={[
            { key: "badge_name", header: "Badge", render: (r: any) => (
              <div className="min-w-0">
                <p className="truncate font-semibold">{r.badge_name || r.name || "—"}</p>
                <p className="truncate font-mono text-[11px] text-[var(--fg-muted)]">{r.badge_code || "—"}</p>
              </div>
            ) },
            { key: "user_email", header: "Awarded to", render: (r: any) => r.user_email || r.user_id || "—" },
            { key: "awarded_at", header: "Awarded", render: (r: any) => formatDate(r.awarded_at || r.created_at, true) },
            { key: "status", header: "Status", render: (r: any) => <StatusBadge value={r.status || "active"} /> },
            { key: "__a", header: "Actions", className: "text-right", render: (r: any) => (
              r.status !== "revoked"
                ? <Button size="sm" variant="secondary" onClick={() => revoke(r)}><Ban className="size-3.5" aria-hidden /> Revoke</Button>
                : null
            ) },
          ]}
        />
      </Panel>
      {dialog}
    </div>
  );
}
