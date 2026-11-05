"use client";

import { useEffect, useState } from "react";
import { Save, Vote, Monitor, Smartphone, Coins, KeyRound, Mail, Fingerprint, ShieldCheck, Trash2 } from "lucide-react";
import { Button, Field, Input, Panel, useResource } from "@/components/Kit";
import { KeyValues } from "@/components/Dash";
import { useAdmin, useToast } from "@/components/Providers";
import { cmsApi, authApi, adminToken, safe, API_BASE } from "@/lib/api";
import * as passkey from "@/lib/passkey";

export default function SettingsPage() {
  const { push } = useToast();
  const { admin, refresh } = useAdmin();
  const { data, loading, reload } = useResource(() => safe(cmsApi.getVotingSettings(), {} as any), []);
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);

  // Credentials — change password
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwBusy, setPwBusy] = useState(false);
  const changePassword = async () => {
    if (pw.next.length < 8) return push("error", "New password must be at least 8 characters.");
    if (pw.next !== pw.confirm) return push("error", "New password and confirmation do not match.");
    setPwBusy(true);
    try {
      await authApi.changePassword(pw.current, pw.next);
      push("success", "Password changed.");
      setPw({ current: "", next: "", confirm: "" });
    } catch (e: any) { push("error", e?.message || "Could not change password."); }
    finally { setPwBusy(false); }
  };

  // Credentials — change email
  const [em, setEm] = useState({ current: "", next: "" });
  const [emBusy, setEmBusy] = useState(false);
  const changeEmail = async () => {
    if (!em.next.trim()) return push("error", "Enter a new email.");
    setEmBusy(true);
    try {
      const res = await authApi.changeEmail(em.current, em.next.trim());
      if (res?.access_token) adminToken.set(res.access_token); // email is the token subject
      await refresh();
      push("success", "Login email updated.");
      setEm({ current: "", next: "" });
    } catch (e: any) { push("error", e?.message || "Could not change email."); }
    finally { setEmBusy(false); }
  };

  // Credentials — fingerprint / passkey (server-backed, cross-device)
  type PkCred = { id: string; label: string; created_at: string; last_used_at: string };
  const [pkCreds, setPkCreds] = useState<PkCred[]>([]);
  const [platformOk, setPlatformOk] = useState(false);
  const [pkBusy, setPkBusy] = useState(false);
  const [pkLoading, setPkLoading] = useState(true);
  const loadCreds = async () => {
    try {
      const res = await passkey.listCredentials();
      setPkCreds(res.credentials || []);
    } catch { setPkCreds([]); }
    finally { setPkLoading(false); }
  };
  useEffect(() => {
    passkey.isPlatformAvailable().then(setPlatformOk).catch(() => setPlatformOk(false));
    loadCreds();
  }, []);
  const setupFingerprint = async () => {
    setPkBusy(true);
    try {
      await passkey.register();
      await loadCreds();
      push("success", "Passkey added. You can now sign in with your fingerprint.");
    } catch (e: any) { push("error", e?.message || "Could not set up fingerprint."); }
    finally { setPkBusy(false); }
  };
  const removeFingerprint = async (id: string) => {
    try {
      await passkey.removeCredential(id);
      await loadCreds();
      push("success", "Passkey removed.");
    } catch (e: any) { push("error", e?.message || "Could not remove passkey."); }
  };

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

      <Panel
        title="Admin credentials"
        subtitle="Change your login password and email. Your current password is required for both."
        className="lg:col-span-2"
      >
        <div className="grid gap-8 md:grid-cols-2">
          {/* Change password */}
          <form
            onSubmit={(e) => { e.preventDefault(); changePassword(); }}
            className="flex flex-col gap-4"
          >
            <p className="flex items-center gap-2 text-[13px] font-semibold"><KeyRound className="size-4 text-[var(--brand)]" aria-hidden /> Change password</p>
            <Field label="Current password">
              {({ id, describedBy }) => (
                <Input id={id} aria-describedby={describedBy} type="password" autoComplete="current-password"
                  value={pw.current} onChange={(e) => setPw((s) => ({ ...s, current: e.target.value }))} />
              )}
            </Field>
            <Field label="New password" hint="At least 8 characters.">
              {({ id, describedBy }) => (
                <Input id={id} aria-describedby={describedBy} type="password" autoComplete="new-password"
                  value={pw.next} onChange={(e) => setPw((s) => ({ ...s, next: e.target.value }))} />
              )}
            </Field>
            <Field label="Confirm new password">
              {({ id, describedBy }) => (
                <Input id={id} aria-describedby={describedBy} type="password" autoComplete="new-password"
                  value={pw.confirm} onChange={(e) => setPw((s) => ({ ...s, confirm: e.target.value }))} />
              )}
            </Field>
            <Button type="submit" size="sm" loading={pwBusy}
              disabled={!pw.current || !pw.next || !pw.confirm}>
              <KeyRound className="size-3.5" aria-hidden /> Update password
            </Button>
          </form>

          {/* Change email */}
          <form
            onSubmit={(e) => { e.preventDefault(); changeEmail(); }}
            className="flex flex-col gap-4 md:border-l md:border-[var(--border)] md:pl-8"
          >
            <p className="flex items-center gap-2 text-[13px] font-semibold"><Mail className="size-4 text-[var(--brand)]" aria-hidden /> Change login email</p>
            <Field label="Current email">
              {({ id }) => (
                <Input id={id} type="email" value={admin?.email || ""} readOnly disabled />
              )}
            </Field>
            <Field label="New email">
              {({ id, describedBy }) => (
                <Input id={id} aria-describedby={describedBy} type="email" autoComplete="email" placeholder="you@yourdomain.com"
                  value={em.next} onChange={(e) => setEm((s) => ({ ...s, next: e.target.value }))} />
              )}
            </Field>
            <Field label="Current password" hint="Required to confirm this change.">
              {({ id, describedBy }) => (
                <Input id={id} aria-describedby={describedBy} type="password" autoComplete="current-password"
                  value={em.current} onChange={(e) => setEm((s) => ({ ...s, current: e.target.value }))} />
              )}
            </Field>
            <Button type="submit" size="sm" loading={emBusy}
              disabled={!em.current || !em.next}>
              <Mail className="size-3.5" aria-hidden /> Update email
            </Button>
          </form>
        </div>
      </Panel>

      <Panel
        title="Fingerprint sign-in"
        subtitle="Add a passkey and sign in with your fingerprint or Face ID — no password. A passkey your device syncs (same Google / Apple account) works on your other devices too."
        className="lg:col-span-2"
        action={
          platformOk ? (
            <Button size="sm" onClick={setupFingerprint} loading={pkBusy}>
              <Fingerprint className="size-3.5" aria-hidden /> Add this device
            </Button>
          ) : undefined
        }
      >
        {pkLoading ? (
          <div className="skeleton h-16 w-full" />
        ) : (
          <div className="flex flex-col gap-4">
            {!platformOk && (
              <p className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-[12.5px] text-[var(--fg-muted)]">
                This device has no fingerprint / Face ID sensor, so you cannot add one here.
                Passkeys you already added still work; open this page on a device with a
                biometric sensor to add it.
              </p>
            )}

            {pkCreds.length === 0 ? (
              <div className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--brand-soft,rgba(250,163,77,0.15))] text-[var(--brand)]">
                  <Fingerprint className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="text-[13px] font-semibold">No passkey yet</p>
                  <p className="mt-0.5 text-[12px] text-[var(--fg-muted)]">
                    {platformOk
                      ? 'Tap "Add this device" above, confirm with your fingerprint, and you are set.'
                      : "Add one from a device that has a fingerprint or Face ID sensor."}
                  </p>
                </div>
              </div>
            ) : (
              <ul className="flex flex-col divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
                {pkCreds.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--success-soft)] text-[var(--success)]">
                        <ShieldCheck className="size-5" aria-hidden />
                      </span>
                      <div>
                        <p className="text-[13px] font-semibold">{c.label}</p>
                        <p className="mt-0.5 text-[12px] text-[var(--fg-muted)]">
                          Added {c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="danger" onClick={() => removeFingerprint(c.id)}>
                      <Trash2 className="size-3.5" aria-hidden /> Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}
