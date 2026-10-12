import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { idOf } from "@/shared/api";
import { fmtDate, str } from "@/shared/format";
import { adminApi } from "../api";
import { PageHeader, Panel, Pill } from "../components/ui";

export function DashboardPage() {
  const events = useQuery({ queryKey: ["admin-events"], queryFn: adminApi.events });
  const users = useQuery({ queryKey: ["admin-users"], queryFn: adminApi.users, retry: false });
  const ev = (events.data ?? []).filter((e) => e.title);
  const published = ev.filter((e) => e.is_published).length;
  const regs = ev.reduce((s, e) => s + Number(e.registered_count ?? 0), 0);
  const cap = ev.reduce((s, e) => s + Number(e.capacity ?? 0), 0);
  const chart = ev.slice(0, 10).map((e) => ({ name: str(e.title).slice(0, 12), registered: Number(e.registered_count ?? 0), capacity: Number(e.capacity ?? 0) }));
  const kpis = [
    { l: "Total events", v: ev.length },
    { l: "Published", v: published },
    { l: "Registrations", v: regs },
    { l: "Users", v: users.data?.length ?? "—" },
  ];
  return (
    <div>
      <PageHeader title="Overview" sub="Live snapshot of your event operations" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => <Panel key={k.l}><p className="text-sm text-muted-foreground">{k.l}</p><p className="mt-2 font-display text-4xl font-bold">{events.isLoading ? "…" : k.v}</p></Panel>)}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Panel>
          <p className="mb-4 font-semibold">Registrations vs capacity</p>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={chart}>
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="capacity" fill="var(--chart-2)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="registered" fill="var(--chart-1)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel>
          <p className="mb-1 font-semibold">Fill rate</p>
          <p className="font-display text-5xl font-bold text-primary">{cap ? Math.round((regs / cap) * 100) : 0}%</p>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${cap ? (regs / cap) * 100 : 0}%` }} /></div>
          <p className="mb-3 mt-8 font-semibold">Recent events</p>
          <ul className="space-y-3">
            {ev.slice(0, 5).map((e) => (
              <li key={idOf(e)} className="flex items-center justify-between text-sm">
                <span className="truncate">{str(e.title)}<span className="block text-xs text-muted-foreground">{fmtDate(e.date)}</span></span>
                <Pill ok={!!e.is_published}>{e.is_published ? "Live" : "Draft"}</Pill>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
