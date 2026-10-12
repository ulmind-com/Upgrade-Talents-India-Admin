import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Play, Search, Settings2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, API_BASE, asList, tokenStore } from "@/shared/api";
import { str } from "@/shared/format";
import operations from "../api/operations.json";
import { SchemaFields, parseSchemaForm, type FieldSchema } from "../components/SchemaForm";
import { PageHeader, fieldCls } from "../components/ui";

type Operation = { path: string; method: string; label: string; parameters: { name: string; in: string; required: boolean; schema: FieldSchema }[]; contentType: string; body: FieldSchema | null };
const catalog = operations as Operation[];
const groups = {
  content: ["website-settings", "events", "live-events", "banners", "testimonials", "tickets", "contest-promotions", "app-promotion", "contact-info", "important-links", "courses", "workshops", "voting-settings"],
  competitions: ["advanced-competitions", "competitions"],
  team: ["judges", "volunteers"],
  rewards: ["rewards", "referral", "referrals", "certificates", "badges", "competitions"],
  notifications: ["notifications"],
  merch: ["merchandise"],
  users: ["users"],
  vip: ["vip-configurations", "vip-passes", "vip-bookings", "events"],
} as const;
type Module = keyof typeof groups;

export function ControlCenterPage({ module, title }: { module: Module; title: string }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Operation | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState("");
  const qc = useQueryClient();
  const filtered = useMemo(() => catalog.filter((op) => {
    const area = op.path.split("/")[3] ?? "";
    const allowed = (groups[module] as readonly string[]).includes(area);
    const vip = module !== "vip" || /vip-/.test(op.path);
    return allowed && vip && `${op.label} ${area}`.toLowerCase().includes(search.toLowerCase());
  }), [module, search]);
  const action = useMutation({ mutationFn: async ({ op, form }: { op: Operation; form: FormData }) => {
    let path = op.path;
    const query: Record<string, unknown> = {};
    for (const parameter of op.parameters) {
      const raw = String(form.get(`param.${parameter.name}`) ?? "");
      if (parameter.in === "path") { if (!raw) throw new Error(`${parameter.name.replaceAll("_", " ")} is required`); path = path.replace(`{${parameter.name}}`, encodeURIComponent(raw)); }
      if (parameter.in === "query" && raw) query[parameter.name] = raw;
    }
    if (/export|download/.test(path) && op.method === "GET") {
      const token = tokenStore.get("admin");
      if (!token) throw new Error("Sign in again to download");
      const response = await fetch(API_BASE + path, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("Download failed");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = url; link.download = "upgrade-talents-india-export.pdf"; link.click(); URL.revokeObjectURL(url);
      return { message: "Download complete" };
    }
    if (op.contentType.includes("multipart")) {
      const upload = new FormData();
      for (const key of Object.keys(op.body?.properties ?? {})) { const entry = form.get(key); if (entry !== null) upload.set(key, entry); }
      return api(path, { method: op.method, side: "admin", query, form: upload });
    }
    const body = op.body ? parseSchemaForm(op.body, form) : undefined;
    return api(path, { method: op.method, side: "admin", query, body });
  }, onSuccess: (data) => { setResult(data); setError(""); qc.invalidateQueries(); if (selected?.method !== "GET") toast.success("Changes saved"); }, onError: (e: Error) => { setError(e.message); toast.error(e.message); } });
  function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); if (!selected) return; if (selected.method === "DELETE" || /revoke|cancel|force|close|lock|finaliz|trigger-expiry/.test(selected.path)) { if (!confirm("Confirm this operation? It may affect live users or published results.")) return; } action.mutate({ op: selected, form: new FormData(e.currentTarget) }); }
  const rows = asList(result);
  return <div><PageHeader title={title} sub="Live Upgrade Talents India management"/><div className="grid gap-7 lg:grid-cols-[18rem_minmax(0,1fr)]"><aside className="min-w-0"><div className="mb-4 flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2"><Search className="h-4 w-4 shrink-0 text-muted-foreground"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find an action" className="min-w-0 w-full bg-transparent text-sm outline-none"/></div><div className="max-h-[70vh] space-y-1 overflow-y-auto">{filtered.map((op) => <Button key={op.method+op.path} variant={selected === op ? "secondary" : "ghost"} className="h-auto w-full justify-start whitespace-normal px-3 py-2.5 text-left text-xs" onClick={() => { setSelected(op); setResult(null); setError(""); }}><Settings2 className="shrink-0"/><span>{op.label}</span></Button>)}</div></aside><section className="min-w-0">{selected ? <><h2 className="font-display text-2xl font-bold">{selected.label}</h2><form key={selected.method+selected.path} onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">{selected.parameters.map((p) => <label key={p.name} className="text-sm"><span className="mb-1.5 block font-medium capitalize">{p.name.replaceAll("_", " ")}{p.required && " *"}</span><input name={`param.${p.name}`} required={p.required} defaultValue={str(p.schema.default)} type={p.schema.type === "integer" ? "number" : "text"} className={fieldCls}/></label>)}{selected.body && <SchemaFields schema={selected.body}/>}<div className="mt-2 sm:col-span-2"><Button disabled={action.isPending}>{/download|export/.test(selected.path) ? <Download/> : <Play/>}{action.isPending ? "Working…" : selected.method === "GET" ? "Load" : "Save changes"}</Button></div></form>{error && <p className="mt-6 text-sm text-destructive">{error}</p>}{result !== null && <div className="mt-8 overflow-x-auto rounded-lg border border-border bg-card">{rows.length > 0 ? <table className="w-full text-sm"><thead><tr className="bg-muted text-left">{Object.keys(rows[0] ?? {}).filter(k => !/token|secret|password/.test(k)).slice(0,6).map(k => <th key={k} className="px-4 py-3 capitalize">{k.replaceAll("_"," ")}</th>)}</tr></thead><tbody>{rows.map((row,i) => <tr key={i} className="border-t border-border">{Object.keys(rows[0] ?? {}).filter(k => !/token|secret|password/.test(k)).slice(0,6).map(k => <td key={k} className="max-w-xs px-4 py-3">{typeof row[k] === "object" ? JSON.stringify(row[k]) : String(row[k] ?? "—")}</td>)}</tr>)}</tbody></table> : <div className="grid gap-3 p-5">{result && typeof result === "object" ? Object.entries(result).filter(([k]) => !/token|secret|password/.test(k)).map(([k,v]) => <div key={k} className="grid gap-1"><strong className="text-xs uppercase text-muted-foreground">{k.replaceAll("_"," ")}</strong><div className="break-words text-sm">{typeof v === "object" ? JSON.stringify(v) : String(v ?? "—")}</div></div>) : <p>{String(result ?? "Saved")}</p>}</div>}</div>}</> : <div className="py-12 text-muted-foreground"><Settings2 className="mb-5 h-8 w-8"/><h2 className="font-display text-2xl font-bold text-foreground">{title}</h2><p className="mt-2 text-sm">Select an operation.</p></div>}</section></div></div>;
}