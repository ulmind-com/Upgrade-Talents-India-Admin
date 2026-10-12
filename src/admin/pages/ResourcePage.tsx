import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { idOf } from "@/shared/api";
import { str } from "@/shared/format";
import { adminApi } from "../api";
import { Empty, PageHeader, Panel, Pill } from "../components/ui";

export type Resource = { key: string; label: string; path: string; publish?: boolean; del?: boolean; delKey?: "email" };

/** Generic list for backend collections: title, status, publish toggle, delete. */
export function ResourcePage({ title, sub, resources }: { title: string; sub: string; resources: Resource[] }) {
  const qc = useQueryClient();
  const [active, setActive] = useState<Resource>(resources[0]!);
  const q = useQuery({ queryKey: ["res", active.path], queryFn: () => adminApi.list(active.path), retry: false });
  const refresh = () => qc.invalidateQueries({ queryKey: ["res", active.path] });
  const base = active.path.replace(/\/$/, "");
  const pub = useMutation({ mutationFn: (id: string) => adminApi.raw(`${base}/${id}/publish`, { method: "PATCH" }), onSuccess: refresh, onError: (e: Error) => toast.error(e.message) });
  const del = useMutation({ mutationFn: (id: string) => adminApi.raw(`${base}/${encodeURIComponent(id)}`, { method: "DELETE" }), onSuccess: () => { toast.success("Removed"); refresh(); }, onError: (e: Error) => toast.error(e.message) });

  return (
    <div>
      <PageHeader title={title} sub={sub} />
      {resources.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {resources.map((r) => <button key={r.key} onClick={() => setActive(r)} className={`rounded-full px-4 py-1.5 text-sm ${active.key === r.key ? "bg-primary font-semibold text-primary-foreground" : "bg-card text-muted-foreground"}`}>{r.label}</button>)}
        </div>
      )}
      <Panel className="overflow-x-auto p-0">
        {q.isLoading ? <Empty text="Loading…" /> : q.isError ? <Empty text={(q.error as Error).message} /> : !q.data?.length ? <Empty text="Nothing here yet" /> : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground"><tr>{["Name", "Details", "Status", ""].map((h) => <th key={h} className="px-5 py-4 font-medium">{h}</th>)}</tr></thead>
            <tbody>{q.data.map((r, i) => {
              const id = active.delKey === "email" ? str(r.email) : idOf(r);
              const status = r.is_published ?? r.is_active ?? r.status ?? r.action;
              return (
                <tr key={idOf(r) || i} className="border-t border-border">
                  <td className="px-5 py-3 font-semibold">{str(r.title ?? r.name ?? r.email ?? r.action ?? r.order_number, idOf(r))}</td>
                  <td className="max-w-md truncate px-5 py-3 text-muted-foreground">{str(r.description ?? r.subtitle ?? r.content ?? r.url ?? r.email ?? r.admin_email ?? r.total_amount ?? r.created_at, "—")}</td>
                  <td className="px-5 py-3">
                    {active.publish ? <button onClick={() => pub.mutate(id)}><Pill ok={!!r.is_published}>{r.is_published ? "Published" : "Hidden"}</Pill></button>
                      : <Pill ok={status === true || /active|deliver|paid|success/i.test(str(status))}>{typeof status === "boolean" ? (status ? "Active" : "Inactive") : str(status, "—")}</Pill>}
                  </td>
                  <td className="px-5 py-3 text-right">{active.del && <button aria-label="Delete" onClick={() => confirm("Delete?") && del.mutate(id)} className="p-2 text-destructive"><Trash2 className="h-4 w-4" /></button>}</td>
                </tr>
              );
            })}</tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
