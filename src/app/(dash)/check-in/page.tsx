"use client";

import { useState } from "react";
import { ScanLine, CheckCircle2, XCircle } from "lucide-react";
import { Button, Field, Input, Panel, Select, useResource } from "@/components/Kit";
import { KeyValues } from "@/components/Dash";
import { useToast } from "@/components/Providers";
import { checkinApi, cmsApi, vipApi, toRows } from "@/lib/api";
import { formatDate } from "@/lib/utils";

/** Gate console — verify a ticket QR, then admit the holder. */
export default function CheckInPage() {
  const { push } = useToast();
  const { data: events } = useResource(() => cmsApi.listEvents({ limit: 200 }), []);
  const eventList = toRows(events);

  const [mode, setMode] = useState<"ticket" | "vip">("ticket");
  const [token, setToken] = useState("");
  const [eventId, setEventId] = useState("");
  const [gate, setGate] = useState("GATE_01");
  const [area, setArea] = useState("MAIN_GATE");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const verify = async () => {
    if (!token.trim()) { push("error", "Scan or paste a pass token first."); return; }
    setBusy(true);
    setResult(null);
    try {
      const res = mode === "ticket"
        ? await checkinApi.verify({ qr_token: token.trim() })
        : await vipApi.verifyPass({
            verification_token: token.trim(),
            event_id: eventId || undefined,
            access_area_id: area,
            gate_id: gate,
          });
      setResult(res);
      const allowed = res?.allowed ?? res?.valid ?? res?.success;
      push(allowed ? "success" : "error", res?.message || (allowed ? "Pass is valid." : "Pass rejected."));
    } catch (e: any) {
      setResult({ allowed: false, message: e?.message || "Verification failed." });
      push("error", e?.message || "Verification failed.");
    } finally { setBusy(false); }
  };

  const admit = async () => {
    setBusy(true);
    try {
      const res = await checkinApi.checkIn({ qr_token: token.trim() });
      setResult(res);
      push("success", res?.message || "Holder checked in.");
      setToken("");
    } catch (e: any) { push("error", e?.message || "Check-in failed."); }
    finally { setBusy(false); }
  };

  const allowed = result ? (result.allowed ?? result.valid ?? result.success) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <Panel title="Gate console" subtitle="Scan a ticket QR or a VIP verification token">
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            {([["ticket", "Event ticket"], ["vip", "VIP pass"]] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => { setMode(k); setResult(null); }}
                aria-pressed={mode === k}
                className={`min-h-[40px] flex-1 cursor-pointer rounded-xl px-4 text-[13px] font-semibold transition-colors ${
                  mode === k ? "bg-[var(--brand)] text-[var(--on-brand)]" : "border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <Field label="Pass token" hint="Paste the scanned QR value, or type the reference.">
            {({ id, describedBy }) => (
              <Input
                id={id} value={token} aria-describedby={describedBy}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") verify(); }}
                placeholder="TKT-XXXXXXXX or verification token"
                className="font-mono"
                autoFocus
              />
            )}
          </Field>

          {mode === "vip" && (
            <>
              <Field label="Event">
                {({ id }) => (
                  <Select
                    id={id} value={eventId} onChange={(e) => setEventId(e.target.value)}
                    options={[{ value: "", label: "Any event" }, ...eventList.map((e) => ({ value: String(e._id), label: e.title }))]}
                  />
                )}
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Gate ID">{({ id }) => <Input id={id} value={gate} onChange={(e) => setGate(e.target.value)} />}</Field>
                <Field label="Access area">{({ id }) => <Input id={id} value={area} onChange={(e) => setArea(e.target.value)} />}</Field>
              </div>
            </>
          )}

          <div className="flex flex-wrap gap-2.5">
            <Button onClick={verify} loading={busy} className="flex-1">
              <ScanLine className="size-4" aria-hidden /> Verify
            </Button>
            {mode === "ticket" && allowed && (
              <Button variant="success" onClick={admit} loading={busy} className="flex-1">
                <CheckCircle2 className="size-4" aria-hidden /> Admit
              </Button>
            )}
          </div>
        </div>
      </Panel>

      <Panel title="Result" subtitle="Outcome of the last scan">
        {!result ? (
          <p className="py-14 text-center text-[13px] text-[var(--fg-muted)]">
            Scan a pass to see the verification result here.
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            <div
              role="status"
              className={`flex items-center gap-3 rounded-xl border px-4 py-4 ${
                allowed
                  ? "border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]"
                  : "border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)]"
              }`}
            >
              {allowed ? <CheckCircle2 className="size-6 shrink-0" aria-hidden /> : <XCircle className="size-6 shrink-0" aria-hidden />}
              <div className="min-w-0">
                <p className="text-[15px] font-bold">{allowed ? "Entry allowed" : "Entry refused"}</p>
                <p className="text-[12.5px] opacity-90">{result.message || result.outcome || "—"}</p>
              </div>
            </div>

            <KeyValues
              items={[
                { k: "Holder", v: result.holder_name || result.ticket?.holder_name || "—" },
                { k: "Reference", v: <span className="font-mono text-[12px]">{result.pass_reference || result.ticket_ref || result.ticket?.ticket_ref || "—"}</span> },
                { k: "Category", v: result.category || result.ticket?.ticket_type || "—" },
                { k: "Gate", v: result.gate_id || "—" },
                { k: "Entries so far", v: result.entry_count ?? "—" },
                { k: "Scanned at", v: formatDate(result.timestamp || new Date().toISOString(), true) },
              ]}
            />
          </div>
        )}
      </Panel>
    </div>
  );
}
