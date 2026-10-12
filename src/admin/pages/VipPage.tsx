import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { idOf } from "@/shared/api";
import { fmtDate, fmtPrice, str } from "@/shared/format";
import { adminApi } from "../api";
import { EventPicker } from "../components/EventPicker";
import { Empty, PageHeader, Panel, Pill } from "../components/ui";

export function VipPage({ historyOnly = false }: { historyOnly?: boolean }) {
  const qc = useQueryClient();
  const [eventId, setEventId] = useState("");
  const configs = useQuery({ queryKey: ["vip-cfg", eventId], queryFn: () => adminApi.vipConfigs(eventId), enabled: !!eventId && !historyOnly });
  const passes = useQuery({ queryKey: ["vip-passes", eventId], queryFn: () => adminApi.vipPasses(eventId), enabled: !!eventId && !historyOnly });
  const checkins = useQuery({ queryKey: ["vip-checkins", eventId], queryFn: () => adminApi.vipCheckins(eventId), enabled: !!eventId && historyOnly });
  const revoke = useMutation({
    mutationFn: adminApi.revokeVip,
    onSuccess: () => { toast.success("Pass revoked"); qc.invalidateQueries({ queryKey: ["vip-passes", eventId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title={historyOnly ? "Check-in history" : "VIP passes"} sub={historyOnly ? "Every VIP gate scan, per event" : "Tiers and issued passes per event"} />
      <div className="mb-6 max-w-md"><EventPicker value={eventId} onChange={setEventId} /></div>
      {!eventId ? <Panel><Empty text="Pick an event to begin" /></Panel> : historyOnly ? (
        <Panel className="overflow-x-auto p-0">
          {checkins.isLoading ? <Empty text="Loading…" /> : !checkins.data?.length ? <Empty text={checkins.isError ? (checkins.error as Error).message : "No check-ins yet"} /> : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground"><tr>{["Time", "Pass", "Gate", "Area", "Outcome"].map((h) => <th key={h} className="px-5 py-4 font-medium">{h}</th>)}</tr></thead>
              <tbody>{checkins.data.map((c, i) => (
                <tr key={idOf(c) || i} className="border-t border-border">
                  <td className="px-5 py-3">{new Date(str(c.scanned_at ?? c.created_at ?? c.timestamp)).toLocaleString()}</td>
                  <td className="px-5 py-3 font-mono text-xs">{str(c.pass_id ?? c.vip_pass_id, "—")}</td>
                  <td className="px-5 py-3">{str(c.gate_id, "—")}</td>
                  <td className="px-5 py-3">{str(c.access_area_id, "—")}</td>
                  <td className="px-5 py-3"><Pill ok={/allow|success|grant/i.test(str(c.outcome ?? c.result))}>{str(c.outcome ?? c.result, "—")}</Pill></td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </Panel>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
          <Panel>
            <p className="mb-4 font-semibold">Tiers</p>
            {!configs.data?.length ? <Empty text="No VIP tiers configured" /> : configs.data.map((c) => (
              <div key={idOf(c)} className="mb-3 rounded-2xl bg-muted p-4">
                <div className="flex justify-between"><p className="font-semibold">{str(c.name ?? c.tier, "Tier")}</p><Pill ok={c.is_enabled !== false && c.enabled !== false}>{c.is_enabled === false || c.enabled === false ? "Off" : "On"}</Pill></div>
                <p className="text-sm text-muted-foreground">{fmtPrice(c.price)} · {str(c.capacity ?? c.total_capacity, "—")} seats</p>
              </div>
            ))}
          </Panel>
          <Panel className="overflow-x-auto p-0">
            {!passes.data?.length ? <Empty text={passes.isLoading ? "Loading…" : "No passes issued"} /> : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground"><tr>{["Holder", "Tier", "Issued", "Status", ""].map((h) => <th key={h} className="px-5 py-4 font-medium">{h}</th>)}</tr></thead>
                <tbody>{passes.data.map((p) => (
                  <tr key={idOf(p)} className="border-t border-border">
                    <td className="px-5 py-3">{str(p.holder_name ?? p.user_email ?? p.user_id, "—")}</td>
                    <td className="px-5 py-3">{str(p.tier ?? p.configuration_name, "—")}</td>
                    <td className="px-5 py-3">{fmtDate(p.issued_at ?? p.created_at)}</td>
                    <td className="px-5 py-3"><Pill ok={/active|valid/i.test(str(p.status))}>{str(p.status, "—")}</Pill></td>
                    <td className="px-5 py-3 text-right">{!/revoked/i.test(str(p.status)) && <button onClick={() => confirm("Revoke this pass?") && revoke.mutate(idOf(p))} className="text-sm text-destructive">Revoke</button>}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
