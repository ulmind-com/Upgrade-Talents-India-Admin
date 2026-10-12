import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Crown, Ticket, XCircle } from "lucide-react";
import { useState } from "react";
import { str } from "@/shared/format";
import { adminApi } from "../api";
import { EventPicker } from "../components/EventPicker";
import { btnCls, fieldCls, PageHeader, Panel } from "../components/ui";

type Result = { ok: boolean; msg: string; data?: Record<string, unknown> };

export function GatePage() {
  const [mode, setMode] = useState<"vip" | "ticket">("vip");
  const [eventId, setEventId] = useState("");
  const [gate, setGate] = useState("GATE_01");
  const [area, setArea] = useState("MAIN_GATE");
  const [code, setCode] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const scan = useMutation({
    mutationFn: () =>
      mode === "vip"
        ? adminApi.verifyVip({ verification_token: code.trim(), event_id: eventId, gate_id: gate, access_area_id: area })
        : adminApi.checkInTicket(code.trim()),
    onSuccess: (d) => { setResult({ ok: d?.success !== false && d?.allowed !== false, msg: str(d?.message ?? d?.outcome, "Entry granted"), data: d }); setCode(""); },
    onError: (e: Error) => setResult({ ok: false, msg: e.message }),
  });

  return (
    <div>
      <PageHeader title="Gate check-in" sub="Scan or paste a QR token to verify entry" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1">
            {([["vip", "VIP pass", Crown], ["ticket", "Ticket", Ticket]] as const).map(([m, l, I]) => (
              <button key={m} onClick={() => { setMode(m); setResult(null); }} className={`flex items-center justify-center gap-2 rounded-xl py-2 text-sm ${mode === m ? "bg-card font-semibold shadow-glow" : "text-muted-foreground"}`}><I className="h-4 w-4" />{l}</button>
            ))}
          </div>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); scan.mutate(); }}>
            {mode === "vip" && (
              <>
                <EventPicker value={eventId} onChange={setEventId} />
                <div className="grid grid-cols-2 gap-3">
                  <input value={gate} onChange={(e) => setGate(e.target.value)} placeholder="Gate ID" className={fieldCls} />
                  <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Access area" className={fieldCls} />
                </div>
              </>
            )}
            <input autoFocus value={code} onChange={(e) => setCode(e.target.value)} placeholder="Scan QR or paste token" className={`${fieldCls} py-4 font-mono`} />
            <button disabled={!code || (mode === "vip" && !eventId) || scan.isPending} className={`${btnCls} w-full justify-center py-3`}>{scan.isPending ? "Verifying…" : "Verify entry"}</button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">Tip: USB/Bluetooth QR scanners type into the box automatically.</p>
        </Panel>
        <Panel className={`flex min-h-72 flex-col items-center justify-center text-center ${result ? (result.ok ? "border-success" : "border-destructive") : ""}`}>
          {!result ? <p className="text-muted-foreground">Waiting for scan…</p> : (
            <>
              {result.ok ? <CheckCircle2 className="h-20 w-20 text-success" /> : <XCircle className="h-20 w-20 text-destructive" />}
              <p className="mt-4 font-display text-3xl font-bold">{result.ok ? "Allowed" : "Denied"}</p>
              <p className="mt-2 text-muted-foreground">{result.msg}</p>
              {result.data && <pre className="mt-4 max-h-40 w-full overflow-auto rounded-xl bg-muted p-3 text-left text-xs">{JSON.stringify(result.data, null, 2)}</pre>}
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
