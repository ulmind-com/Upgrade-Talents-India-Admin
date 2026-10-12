import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw, Send, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { idOf } from "@/shared/api";
import { str } from "@/shared/format";
import { adminApi } from "../api";
import { Empty, PageHeader, Panel, Pill, fieldCls } from "../components/ui";

export type OpsResource = { key: string; label: string; path: string; create?: boolean; publish?: boolean; remove?: boolean };

export function OperationsPage({ title, sub, resources }: { title: string; sub: string; resources: OpsResource[] }) {
  const [activeKey, setActiveKey] = useState(resources[0]?.key ?? "");
  const active = resources.find((resource) => resource.key === activeKey);
  const [adding, setAdding] = useState(false);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["ops", active?.path], queryFn: () => adminApi.list(active?.path ?? ""), enabled: !!active, retry: false });
  const refresh = () => qc.invalidateQueries({ queryKey: ["ops", active?.path] });
  const create = useMutation({ mutationFn: (body: Record<string, unknown>) => adminApi.raw(active?.path ?? "", { method: "POST", body }), onSuccess: () => { toast.success("Created"); setAdding(false); refresh(); }, onError: (e: Error) => toast.error(e.message) });
  const action = useMutation({ mutationFn: ({ path, method = "POST" }: { path: string; method?: string }) => adminApi.raw(path, { method }), onSuccess: () => { toast.success("Updated"); refresh(); }, onError: (e: Error) => toast.error(e.message) });
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = Object.fromEntries(Array.from(f.entries()).map(([k, v]) => [k, v]));
    create.mutate(body);
  }
  const base = active?.path.replace(/\/$/, "") ?? "";
  return <div><PageHeader title={title} sub={sub} action={<Button variant="outline" onClick={() => refresh()}><RefreshCw/>Refresh</Button>}/><div className="mb-6 flex flex-wrap gap-2">{resources.map((r) => <Button key={r.key} variant={active?.key === r.key ? "default" : "secondary"} onClick={() => { setActiveKey(r.key); setAdding(false); }}>{r.label}</Button>)}</div>{active?.create && <div className="mb-5">{adding ? <Panel><form onSubmit={submit} className="grid gap-3 sm:grid-cols-2"><input name="title" required placeholder="Title or name" className={fieldCls}/><input name="description" placeholder="Description or email" className={fieldCls}/><div className="flex gap-2 sm:col-span-2"><Button disabled={create.isPending}>Save</Button><Button type="button" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button></div></form></Panel> : <Button onClick={() => setAdding(true)}><Plus/>Add {active.label.toLowerCase()}</Button>}</div>}<Panel className="overflow-x-auto p-0">{q.isLoading ? <Empty text="Loading…"/> : q.isError ? <Empty text={q.error.message}/> : !q.data?.length ? <Empty text="Nothing here yet"/> : <table className="w-full min-w-[44rem] text-sm"><thead><tr className="text-left text-xs uppercase text-muted-foreground"><th className="px-5 py-4">Name</th><th>Details</th><th>Status</th><th className="px-5 text-right">Actions</th></tr></thead><tbody>{q.data.map((row, i) => { const id=idOf(row); const published=!!row.is_published; return <tr key={id || i} className="border-t border-border"><td className="px-5 py-4 font-semibold">{str(row.title ?? row.name ?? row.email ?? row.order_number, id)}</td><td className="max-w-sm truncate text-muted-foreground">{str(row.description ?? row.status ?? row.total_amount ?? row.created_at, "—")}</td><td><Pill ok={published || /active|publish|paid|success/i.test(str(row.status))}>{published ? "Published" : str(row.status, "Draft")}</Pill></td><td className="px-5 text-right"><div className="flex justify-end gap-1">{active?.publish && <Button size="icon" variant="ghost" title={published ? "Published" : "Publish"} onClick={() => action.mutate({ path: `${base}/${id}/publish`, method: "PATCH" })}><Send/></Button>}{active?.remove && <Button size="icon" variant="ghost" title="Delete" onClick={() => confirm("Delete this item?") && action.mutate({ path: `${base}/${id}`, method: "DELETE" })}><Trash2/></Button>}</div></td></tr>; })}</tbody></table>}</Panel></div>;
}