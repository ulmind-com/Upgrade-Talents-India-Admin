"use client";

import { useState } from "react";
import { Gift, Users, Coins, Timer, Save } from "lucide-react";
import { Button, DataTable, Field, Input, Panel, StatusBadge, useResource } from "@/components/Kit";
import { StatCard } from "@/components/Dash";
import { useToast } from "@/components/Providers";
import { rewardsApi, safe, toRows } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/utils";

export default function RewardsPage() {
  const { push } = useToast();
  const [tab, setTab] = useState<"referrals" | "transactions" | "config">("referrals");

  const { data, loading, error, reload } = useResource(async () => ({
    analytics: await safe(rewardsApi.analytics(), null),
    referrals: await safe(rewardsApi.referrals({ limit: 200 }), []),
    transactions: await safe(rewardsApi.transactions({ limit: 200 }), []),
  }), []);

  const a = data?.analytics || {};
  const referrals = toRows(data?.referrals);
  const transactions = toRows(data?.transactions);

  const runExpiry = async () => {
    try { await rewardsApi.triggerExpiry(); push("success", "Coin expiry job triggered."); reload(); }
    catch (e: any) { push("error", e?.message || "Could not run the expiry job."); }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total referrals" value={formatNumber(a.total_referrals ?? referrals.length)} Icon={Users} accent index={0} />
        <StatCard label="Successful" value={formatNumber(a.successful_referrals ?? 0)} Icon={Gift} index={1} />
        <StatCard label="Coins issued" value={formatNumber(a.total_coins_issued ?? 0)} Icon={Coins} index={2} />
        <StatCard label="Coins expired" value={formatNumber(a.total_coins_expired ?? 0)} Icon={Timer} index={3} />
      </div>

      <div className="flex flex-wrap gap-2">
        {([["referrals", "Referrals"], ["transactions", "Coin ledger"], ["config", "Rules"]] as const).map(([k, label]) => (
          <button
            key={k} onClick={() => setTab(k)} aria-pressed={tab === k}
            className={`min-h-[40px] cursor-pointer rounded-xl px-4 text-[13px] font-semibold transition-colors ${
              tab === k ? "bg-[var(--brand)] text-[var(--on-brand)]" : "border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] hover:text-[var(--fg)]"
            }`}
          >{label}</button>
        ))}
      </div>

      {tab === "referrals" && (
        <Panel title="Referrals" subtitle="Who invited whom, and whether the reward was granted">
          <DataTable
            rows={referrals} loading={loading} error={error} onRetry={reload}
            searchKeys={["referrer_email", "referee_email", "referral_code"]}
            empty={{ title: "No referrals yet" }}
            columns={[
              { key: "referrer_email", header: "Referrer", render: (r: any) => r.referrer_email || r.referrer || "—" },
              { key: "referee_email", header: "Joined user", render: (r: any) => r.referee_email || r.referee || "—" },
              { key: "referral_code", header: "Code", render: (r: any) => <span className="font-mono text-[12px]">{r.referral_code || "—"}</span> },
              { key: "coins_awarded", header: "Coins", render: (r: any) => formatNumber(r.coins_awarded ?? r.reward_amount ?? 0) },
              { key: "status", header: "Status", render: (r: any) => <StatusBadge value={r.status} /> },
              { key: "created_at", header: "Date", render: (r: any) => formatDate(r.created_at) },
            ]}
          />
        </Panel>
      )}

      {tab === "transactions" && (
        <Panel
          title="Coin ledger"
          subtitle="Every coin credit, debit and expiry"
          action={<Button size="sm" variant="secondary" onClick={runExpiry}><Timer className="size-3.5" aria-hidden /> Run expiry job</Button>}
        >
          <DataTable
            rows={transactions} loading={loading} error={error} onRetry={reload}
            searchKeys={["user_email", "transaction_type", "reason"]}
            empty={{ title: "No coin activity yet" }}
            columns={[
              { key: "user_email", header: "User", render: (r: any) => r.user_email || r.user_id || "—" },
              { key: "transaction_type", header: "Type", render: (r: any) => <StatusBadge value={r.transaction_type || r.type} /> },
              { key: "amount", header: "Amount", render: (r: any) => (
                <span className={Number(r.amount) < 0 ? "font-semibold text-[var(--danger)]" : "font-semibold text-[var(--success)]"}>
                  {Number(r.amount) > 0 ? "+" : ""}{formatNumber(r.amount)}
                </span>
              ) },
              { key: "reason", header: "Reason", render: (r: any) => r.reason || r.description || "—" },
              { key: "created_at", header: "When", render: (r: any) => formatDate(r.created_at, true) },
            ]}
          />
        </Panel>
      )}

      {tab === "config" && <RewardConfig />}
    </div>
  );
}

function RewardConfig() {
  const { push } = useToast();
  const { data, loading, reload } = useResource(async () => ({
    referral: await safe(rewardsApi.referralConfig(), {} as any),
    rewards: await safe(rewardsApi.rewardsConfig(), {} as any),
    expiry: await safe(rewardsApi.expiryConfig(), {} as any),
  }), []);

  const [draft, setDraft] = useState<Record<string, any>>({});
  const val = (group: string, key: string, fallback: any = "") =>
    draft[`${group}.${key}`] ?? (data as any)?.[group]?.[key] ?? fallback;

  const save = async (group: "referral" | "rewards" | "expiry") => {
    const payload: Record<string, any> = { ...((data as any)?.[group] || {}) };
    Object.entries(draft).forEach(([k, v]) => {
      const [g, key] = k.split(".");
      if (g === group) payload[key] = isNaN(Number(v)) || v === "" ? v : Number(v);
    });
    try {
      if (group === "referral") await rewardsApi.updateReferralConfig(payload);
      if (group === "rewards") await rewardsApi.updateRewardsConfig(payload);
      if (group === "expiry") await rewardsApi.updateExpiryConfig(payload);
      push("success", "Rules saved.");
      reload();
    } catch (e: any) { push("error", e?.message || "Could not save the rules."); }
  };

  if (loading) return <Panel title="Rules"><div className="skeleton h-48 w-full" /></Panel>;

  const groups: { key: "referral" | "rewards" | "expiry"; title: string; subtitle: string; fields: { k: string; label: string; hint?: string }[] }[] = [
    {
      key: "referral", title: "Referral rules", subtitle: "What a successful invite is worth",
      fields: [
        { k: "referrer_reward", label: "Coins for the referrer" },
        { k: "referee_reward", label: "Coins for the new user" },
        { k: "max_referrals_per_user", label: "Max referrals per user" },
      ],
    },
    {
      key: "rewards", title: "Coin rules", subtitle: "How coins convert into value",
      fields: [
        { k: "coin_to_currency_ratio", label: "Coins per ₹1", hint: "Used when redeeming coupons." },
        { k: "min_redemption", label: "Minimum redemption" },
        { k: "signup_bonus", label: "Signup bonus coins" },
      ],
    },
    {
      key: "expiry", title: "Expiry rules", subtitle: "When unused coins lapse",
      fields: [
        { k: "expiry_days", label: "Coins expire after (days)" },
        { k: "warning_days", label: "Warn user this many days before" },
      ],
    },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {groups.map((g) => (
        <Panel
          key={g.key}
          title={g.title}
          subtitle={g.subtitle}
          action={<Button size="sm" onClick={() => save(g.key)}><Save className="size-3.5" aria-hidden /> Save</Button>}
        >
          <div className="flex flex-col gap-4">
            {g.fields.map((f) => (
              <Field key={f.k} label={f.label} hint={f.hint}>
                {({ id, describedBy }) => (
                  <Input
                    id={id} aria-describedby={describedBy} type="number"
                    value={val(g.key, f.k)}
                    onChange={(e) => setDraft((p) => ({ ...p, [`${g.key}.${f.k}`]: e.target.value }))}
                  />
                )}
              </Field>
            ))}
          </div>
        </Panel>
      ))}
    </div>
  );
}
