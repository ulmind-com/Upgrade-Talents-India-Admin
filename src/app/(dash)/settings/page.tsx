"use client";

import { useState } from "react";
import { Save, Vote, Monitor, Smartphone, Coins } from "lucide-react";
import { Button, Field, Input, Panel, useResource } from "@/components/Kit";
import { KeyValues } from "@/components/Dash";
import { useAdmin, useToast } from "@/components/Providers";
import { cmsApi, safe, API_BASE } from "@/lib/api";

export default function SettingsPage() {
  const { push } = useToast();
  const { admin } = useAdmin();
  const { data, loading, reload } = useResource(() => safe(cmsApi.getVotingSettings(), {} as any), []);
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);

  const v = (k: string, fb = 0) => draft[k] ?? (data as any)?.[k] ?? fb;

  const save = async () => {
    setBusy(true);
    try {
      await cmsApi.updateVotingSettings({
        voting_power_website: Number(v("voting_power_website", 1)),
        voting_power_mobile: Number(v("voting_power_mobile", 5)),
        voting_power_paid: Number(v("voting_power_paid", 10)),
      });
      push("success", "Voting rules saved.");
      reload();
    } catch (e: any) { push("error", e?.message || "Could not save."); }
    finally { setBusy(false); }
  };

  const powers = [
    { k: "voting_power_website", label: "Website vote", hint: "Votes cast from the public website.", Icon: Monitor, fb: 1 },
    { k: "voting_power_mobile", label: "Mobile app vote", hint: "Higher weight encourages app installs.", Icon: Smartphone, fb: 5 },
    { k: "voting_power_paid", label: "Paid vote pack", hint: "Votes bought in a pack.", Icon: Coins, fb: 10 },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel
        title="Voting power"
        subtitle="How much a single vote counts, per channel. Changeable any time — never hard-coded."
        action={<Button size="sm" onClick={save} loading={busy}><Save className="size-3.5" aria-hidden /> Save</Button>}
      >
        {loading ? (
          <div className="skeleton h-48 w-full" />
        ) : (
          <div className="flex flex-col gap-4">
            {powers.map((p) => (
              <Field key={p.k} label={p.label} hint={p.hint}>
                {({ id, describedBy }) => (
                  <div className="relative">
                    <p.Icon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--fg-subtle)]" aria-hidden />
                    <Input
                      id={id} aria-describedby={describedBy} type="number" min={0}
                      value={v(p.k, p.fb)}
                      onChange={(e) => setDraft((d) => ({ ...d, [p.k]: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                )}
              </Field>
            ))}

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <p className="flex items-center gap-2 text-[12.5px] font-semibold"><Vote className="size-4 shrink-0 text-[var(--brand)]" aria-hidden /> Current weighting</p>
              <p className="mt-2 text-[12.5px] text-[var(--fg-muted)]">
                1 app vote = {Number(v("voting_power_mobile", 5)) / Math.max(1, Number(v("voting_power_website", 1)))}× a website vote.
              </p>
            </div>
          </div>
        )}
      </Panel>

      <Panel title="Session & environment" subtitle="Read-only details about this admin session">
        <KeyValues
          items={[
            { k: "Signed in as", v: admin?.email || "—" },
            { k: "Role", v: admin?.role || "super_admin" },
            { k: "API base URL", v: <span className="font-mono text-[12px]">{API_BASE}</span> },
            { k: "Public site", v: <span className="font-mono text-[12px]">{process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}</span> },
          ]}
        />
        <p className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-[12.5px] leading-relaxed text-[var(--fg-muted)]">
          Every change you make here is written to the audit log with your email, the action and the
          affected resource.
        </p>
      </Panel>
    </div>
  );
}
