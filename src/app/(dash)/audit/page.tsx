"use client";

import { DataTable, Panel, StatusBadge, useResource } from "@/components/Kit";
import { cmsApi, toRows } from "@/lib/api";
import { formatDate, titleCase } from "@/lib/utils";

export default function AuditPage() {
  const { data, loading, error, reload } = useResource(() => cmsApi.auditLogs({ limit: 300 }), []);
  const rows = toRows(data);

  return (
    <Panel title="Audit log" subtitle="Every admin action is recorded here for accountability">
      <DataTable
        rows={rows} loading={loading} error={error} onRetry={reload}
        searchKeys={["admin_email", "action", "resource_type", "outcome"]}
        pageSize={15}
        empty={{ title: "No activity recorded yet" }}
        columns={[
          { key: "timestamp", header: "When", render: (r: any) => formatDate(r.timestamp || r.created_at, true) },
          { key: "admin_email", header: "Admin", render: (r: any) => r.admin_email || r.actor || "—" },
          { key: "action", header: "Action", render: (r: any) => <span className="font-semibold">{titleCase(r.action)}</span> },
          { key: "resource_type", header: "Resource", render: (r: any) => (
            <div className="min-w-0">
              <p className="truncate">{titleCase(r.resource_type)}</p>
              {r.resource_id && <p className="truncate font-mono text-[11px] text-[var(--fg-muted)]">{r.resource_id}</p>}
            </div>
          ) },
          { key: "outcome", header: "Outcome", render: (r: any) => <StatusBadge value={r.outcome} /> },
        ]}
      />
    </Panel>
  );
}
