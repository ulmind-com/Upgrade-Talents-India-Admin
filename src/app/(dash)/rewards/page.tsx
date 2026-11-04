"use client";

import { useState } from "react";
import {
  Gift,
  Users,
  Coins,
  Timer,
  Save,
  Sparkles,
  ShoppingBag,
  GraduationCap,
  Percent,
  IndianRupee,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Layers,
} from "lucide-react";
import {
  Button,
  DataTable,
  Field,
  Input,
  Panel,
  StatusBadge,
  Toggle,
  useResource,
  Badge,
} from "@/components/Kit";
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
    try {
      await rewardsApi.triggerExpiry();
      push("success", "Coin expiry job triggered.");
      reload();
    } catch (e: any) {
      push("error", e?.message || "Could not run the expiry job.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total referrals"
          value={formatNumber(a.total_referrals ?? referrals.length)}
          Icon={Users}
          accent
          index={0}
        />
        <StatCard
          label="Successful"
          value={formatNumber(a.successful_referrals ?? 0)}
          Icon={Gift}
          index={1}
        />
        <StatCard
          label="Coins issued"
          value={formatNumber(a.total_coins_issued ?? 0)}
          Icon={Coins}
          index={2}
        />
        <StatCard
          label="Coins expired"
          value={formatNumber(a.total_coins_expired ?? 0)}
          Icon={Timer}
          index={3}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          ["referrals", "Referrals"],
          ["transactions", "Coin ledger"],
          ["config", "Rules & Coin Pricing"],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            aria-pressed={tab === k}
            className={`min-h-[40px] cursor-pointer rounded-xl px-4 text-[13px] font-semibold transition-colors ${
              tab === k
                ? "bg-[var(--brand)] text-[var(--on-brand)]"
                : "border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] hover:text-[var(--fg)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "referrals" && (
        <Panel title="Referrals" subtitle="Who invited whom, and whether the reward was granted">
          <DataTable
            rows={referrals}
            loading={loading}
            error={error}
            onRetry={reload}
            searchKeys={["referrer_email", "referee_email", "referral_code"]}
            empty={{ title: "No referrals yet" }}
            columns={[
              {
                key: "referrer_email",
                header: "Referrer",
                render: (r: any) => r.referrer_email || r.referrer || "—",
              },
              {
                key: "referee_email",
                header: "Joined user",
                render: (r: any) => r.referee_email || r.referee || "—",
              },
              {
                key: "referral_code",
                header: "Code",
                render: (r: any) => (
                  <span className="font-mono text-[12px]">{r.referral_code || "—"}</span>
                ),
              },
              {
                key: "coins_awarded",
                header: "Coins",
                render: (r: any) =>
                  formatNumber(r.coins_awarded ?? r.reward_amount ?? 0),
              },
              {
                key: "status",
                header: "Status",
                render: (r: any) => <StatusBadge value={r.status} />,
              },
              {
                key: "created_at",
                header: "Date",
                render: (r: any) => formatDate(r.created_at),
              },
            ]}
          />
        </Panel>
      )}

      {tab === "transactions" && (
        <Panel
          title="Coin ledger"
          subtitle="Every coin credit, debit and expiry"
          action={
            <Button size="sm" variant="secondary" onClick={runExpiry}>
              <Timer className="size-3.5" aria-hidden /> Run expiry job
            </Button>
          }
        >
          <DataTable
            rows={transactions}
            loading={loading}
            error={error}
            onRetry={reload}
            searchKeys={["user_email", "transaction_type", "reason"]}
            empty={{ title: "No coin activity yet" }}
            columns={[
              {
                key: "user_email",
                header: "User",
                render: (r: any) => r.user_email || r.user_id || "—",
              },
              {
                key: "transaction_type",
                header: "Type",
                render: (r: any) => (
                  <StatusBadge value={r.transaction_type || r.type} />
                ),
              },
              {
                key: "amount",
                header: "Amount",
                render: (r: any) => (
                  <span
                    className={
                      Number(r.amount) < 0
                        ? "font-semibold text-[var(--danger)]"
                        : "font-semibold text-[var(--success)]"
                    }
                  >
                    {Number(r.amount) > 0 ? "+" : ""}
                    {formatNumber(r.amount)}
                  </span>
                ),
              },
              {
                key: "reason",
                header: "Reason",
                render: (r: any) => r.reason || r.description || "—",
              },
              {
                key: "created_at",
                header: "When",
                render: (r: any) => formatDate(r.created_at, true),
              },
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
  const [saving, setSaving] = useState(false);

  const { data, loading, reload } = useResource(async () => {
    const raw = await safe(rewardsApi.referralConfig(), {} as any);
    return raw || {};
  }, []);

  const [form, setForm] = useState<Record<string, any>>({});

  // Helper to read nested value from form draft or backend data
  const getVal = (path: string, fallback: any = "") => {
    if (form[path] !== undefined) return form[path];
    const parts = path.split(".");
    let cur = data;
    for (const p of parts) {
      if (cur == null || typeof cur !== "object") return fallback;
      cur = cur[p];
    }
    return cur !== undefined ? cur : fallback;
  };

  const setVal = (path: string, value: any) => {
    setForm((prev) => ({ ...prev, [path]: value }));
  };

  // Values for live calculations
  const programEnabled = Boolean(getVal("program_enabled", true));
  const referrerCoins = Number(getVal("referrer_reward.coins", 120));
  const referrerEnabled = Boolean(getVal("referrer_reward.enabled", true));
  const welcomeCoins = Number(getVal("welcome_reward.coins", 60));
  const welcomeEnabled = Boolean(getVal("welcome_reward.enabled", true));
  const valuePerCoin = Number(getVal("coin_valuation.value_per_coin", 0.5));
  const currency = String(getVal("coin_valuation.currency", "INR"));

  const referrerInr = (referrerCoins * valuePerCoin).toFixed(2);
  const welcomeInr = (welcomeCoins * valuePerCoin).toFixed(2);

  const saveAll = async () => {
    setSaving(true);
    try {
      // Build deep patch payload from form updates
      const payload: Record<string, any> = {
        program_enabled: Boolean(getVal("program_enabled", true)),
        attribution_expiry_days: Number(getVal("attribution_expiry_days", 30)),
        referrer_reward: {
          enabled: Boolean(getVal("referrer_reward.enabled", true)),
          coins: Number(getVal("referrer_reward.coins", 120)),
          activation_delay_hours: Number(getVal("referrer_reward.activation_delay_hours", 0)),
          require_admin_approval: Boolean(getVal("referrer_reward.require_admin_approval", false)),
        },
        welcome_reward: {
          enabled: Boolean(getVal("welcome_reward.enabled", true)),
          coins: Number(getVal("welcome_reward.coins", 60)),
          activation_delay_hours: Number(getVal("welcome_reward.activation_delay_hours", 0)),
          require_admin_approval: Boolean(getVal("welcome_reward.require_admin_approval", false)),
        },
        coin_valuation: {
          currency: String(getVal("coin_valuation.currency", "INR")),
          value_per_coin: Number(getVal("coin_valuation.value_per_coin", 0.5)),
        },
        redemption_rules: {
          course_redemption_enabled: Boolean(getVal("redemption_rules.course_redemption_enabled", true)),
          workshop_redemption_enabled: Boolean(getVal("redemption_rules.workshop_redemption_enabled", true)),
          min_coins_required: Number(getVal("redemption_rules.min_coins_required", 10)),
          max_coins_per_order: Number(getVal("redemption_rules.max_coins_per_order", 500)),
          min_purchase_amount: Number(getVal("redemption_rules.min_purchase_amount", 100)),
          max_discount_percentage: Number(getVal("redemption_rules.max_discount_percentage", 50)),
          max_discount_amount: Number(getVal("redemption_rules.max_discount_amount", 1000)),
          allow_with_coupons: Boolean(getVal("redemption_rules.allow_with_coupons", false)),
        },
        coin_expiry: {
          enabled: Boolean(getVal("coin_expiry.enabled", true)),
          duration_value: Number(getVal("coin_expiry.duration_value", 90)),
          duration_unit: String(getVal("coin_expiry.duration_unit", "DAYS")),
          warning_days: Number(getVal("coin_expiry.warning_days", 7)),
          notify_user: Boolean(getVal("coin_expiry.notify_user", true)),
        },
      };

      await rewardsApi.updateReferralConfig(payload);
      push("success", "Referral & Reward rules saved successfully!");
      setForm({});
      reload();
    } catch (e: any) {
      push("error", e?.message || "Failed to update configuration.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Panel title="Rules & Valuation">
        <div className="skeleton h-64 w-full rounded-2xl" />
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Top Summary & Live Economics Banner ── */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-[var(--surface)] to-[var(--surface)] p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl border border-amber-500/40 bg-amber-500/20 text-amber-400">
              <Sparkles className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-[var(--fg)]">
                  Live Referral & Coin Economics
                </h3>
                <Badge tone={programEnabled ? "success" : "warning"}>
                  {programEnabled ? "Program Active" : "Program Paused"}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-[var(--fg-muted)]">
                Changes saved here reflect in real time on the website, register welcome banners, and checkout discounts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={reload}
              title="Reload from server"
            >
              <RefreshCw className="size-3.5" /> Reload
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={saving}
              onClick={saveAll}
              className="bg-amber-500 text-black hover:bg-amber-400 font-bold"
            >
              <Save className="size-3.5" /> Save All Rules
            </Button>
          </div>
        </div>

        {/* Live Formula Pills */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <span className="text-[11px] font-semibold text-[var(--fg-subtle)] uppercase tracking-wider">
              1 Coin Value
            </span>
            <span className="mt-1 text-lg font-bold text-amber-400">
              ₹{valuePerCoin.toFixed(2)}{" "}
              <span className="text-xs font-normal text-[var(--fg-muted)]">
                (₹1 = {(1 / (valuePerCoin || 0.5)).toFixed(0)} Coins)
              </span>
            </span>
          </div>

          <div className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <span className="text-[11px] font-semibold text-[var(--fg-subtle)] uppercase tracking-wider">
              Referrer Reward (Inviter)
            </span>
            <span className="mt-1 text-lg font-bold text-emerald-400">
              +{referrerCoins} Coins{" "}
              <span className="text-xs font-semibold text-emerald-300/80">
                (≈ ₹{referrerInr})
              </span>
            </span>
          </div>

          <div className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <span className="text-[11px] font-semibold text-[var(--fg-subtle)] uppercase tracking-wider">
              Welcome Bonus (New Joinee)
            </span>
            <span className="mt-1 text-lg font-bold text-cyan-400">
              +{welcomeCoins} Coins{" "}
              <span className="text-xs font-semibold text-cyan-300/80">
                (≈ ₹{welcomeInr})
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* ── Settings Grid ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Panel 1: Referral & Sharing Rewards */}
        <Panel
          title="Referral & Sharing Rewards"
          subtitle="Configure how many coins are granted to the inviter and the new registrant"
          action={
            <Button size="sm" loading={saving} onClick={saveAll}>
              <Save className="size-3.5" /> Save
            </Button>
          }
        >
          <div className="flex flex-col gap-4">
            <Toggle
              label="Global Referral Program Status"
              hint="When disabled, users cannot claim referral codes or get bonuses."
              checked={programEnabled}
              onChange={(v) => setVal("program_enabled", v)}
            />

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--fg)]">
                  Referrer Reward (Person who shares)
                </span>
                <Toggle
                  label=""
                  checked={referrerEnabled}
                  onChange={(v) => setVal("referrer_reward.enabled", v)}
                />
              </div>
              <Field
                label="Coins given to Referrer"
                hint={`Currently equals approx ₹${(Number(getVal("referrer_reward.coins", 120)) * valuePerCoin).toFixed(2)}`}
              >
                {({ id, describedBy }) => (
                  <Input
                    id={id}
                    type="number"
                    min={0}
                    value={getVal("referrer_reward.coins", 120)}
                    onChange={(e) => setVal("referrer_reward.coins", e.target.value)}
                    aria-describedby={describedBy}
                  />
                )}
              </Field>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--fg)]">
                  Welcome Reward (New user joining with link)
                </span>
                <Toggle
                  label=""
                  checked={welcomeEnabled}
                  onChange={(v) => setVal("welcome_reward.enabled", v)}
                />
              </div>
              <Field
                label="Coins given to New Joinee"
                hint={`Currently equals approx ₹${(Number(getVal("welcome_reward.coins", 60)) * valuePerCoin).toFixed(2)}`}
              >
                {({ id, describedBy }) => (
                  <Input
                    id={id}
                    type="number"
                    min={0}
                    value={getVal("welcome_reward.coins", 60)}
                    onChange={(e) => setVal("welcome_reward.coins", e.target.value)}
                    aria-describedby={describedBy}
                  />
                )}
              </Field>
            </div>

            <Field
              label="Attribution Validity Window (Days)"
              hint="How long an invite cookie/session remains valid before user registration."
            >
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  type="number"
                  min={1}
                  value={getVal("attribution_expiry_days", 30)}
                  onChange={(e) => setVal("attribution_expiry_days", e.target.value)}
                  aria-describedby={describedBy}
                />
              )}
            </Field>
          </div>
        </Panel>

        {/* Panel 2: Coin Valuation & Pricing */}
        <Panel
          title="Coin Price & Currency Valuation"
          subtitle="Set how much 1 UTI Coin is worth in real Indian Rupees"
          action={
            <Button size="sm" loading={saving} onClick={saveAll}>
              <Save className="size-3.5" /> Save
            </Button>
          }
        >
          <div className="flex flex-col gap-4">
            <Field
              label="Price of 1 UTI Coin (in ₹ INR)"
              hint="Example: 0.50 means 1 coin = 50 paise (100 coins = ₹50 discount). 1.0 means 1 coin = ₹1."
            >
              {({ id, describedBy }) => (
                <div className="relative">
                  <Input
                    id={id}
                    type="number"
                    step="0.05"
                    min={0.01}
                    value={getVal("coin_valuation.value_per_coin", 0.5)}
                    onChange={(e) => setVal("coin_valuation.value_per_coin", e.target.value)}
                    aria-describedby={describedBy}
                    className="pl-8 text-base font-bold text-amber-400"
                  />
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--fg-subtle)]">
                    ₹
                  </span>
                </div>
              )}
            </Field>

            <Field label="Valuation Currency" hint="Default is INR (₹)">
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  type="text"
                  value={getVal("coin_valuation.currency", "INR")}
                  onChange={(e) => setVal("coin_valuation.currency", e.target.value)}
                  aria-describedby={describedBy}
                  disabled
                  className="opacity-70"
                />
              )}
            </Field>

            {/* Quick Conversion Card */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4 text-xs">
              <span className="font-semibold text-amber-300 block mb-2">
                Conversion Quick Reference:
              </span>
              <ul className="grid grid-cols-2 gap-2 text-[var(--fg-muted)]">
                <li>• 50 Coins = <strong className="text-[var(--fg)]">₹{(50 * valuePerCoin).toFixed(2)}</strong></li>
                <li>• 100 Coins = <strong className="text-[var(--fg)]">₹{(100 * valuePerCoin).toFixed(2)}</strong></li>
                <li>• 200 Coins = <strong className="text-[var(--fg)]">₹{(200 * valuePerCoin).toFixed(2)}</strong></li>
                <li>• 500 Coins = <strong className="text-[var(--fg)]">₹{(500 * valuePerCoin).toFixed(2)}</strong></li>
              </ul>
            </div>
          </div>
        </Panel>

        {/* Panel 3: Coin Usage & Redemption Rules */}
        <Panel
          title="Coin Usage & Redemption Rules"
          subtitle="Define exactly what users can do with their referral coins"
          action={
            <Button size="sm" loading={saving} onClick={saveAll}>
              <Save className="size-3.5" /> Save
            </Button>
          }
        >
          <div className="flex flex-col gap-4">
            <Toggle
              label="Allow Coins on Course Checkouts"
              hint="Users can apply their coin balance to discount course purchases."
              checked={Boolean(getVal("redemption_rules.course_redemption_enabled", true))}
              onChange={(v) => setVal("redemption_rules.course_redemption_enabled", v)}
            />

            <Toggle
              label="Allow Coins on Workshop Bookings"
              hint="Users can apply their coin balance to discount masterclass / workshop bookings."
              checked={Boolean(getVal("redemption_rules.workshop_redemption_enabled", true))}
              onChange={(v) => setVal("redemption_rules.workshop_redemption_enabled", v)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field
                label="Max Discount Percentage (%)"
                hint="Max % of order total payable with coins."
              >
                {({ id, describedBy }) => (
                  <Input
                    id={id}
                    type="number"
                    min={1}
                    max={100}
                    value={getVal("redemption_rules.max_discount_percentage", 50)}
                    onChange={(e) => setVal("redemption_rules.max_discount_percentage", e.target.value)}
                    aria-describedby={describedBy}
                  />
                )}
              </Field>

              <Field
                label="Max Discount Cap (₹)"
                hint="Maximum rupee discount on a single order."
              >
                {({ id, describedBy }) => (
                  <Input
                    id={id}
                    type="number"
                    min={0}
                    value={getVal("redemption_rules.max_discount_amount", 1000)}
                    onChange={(e) => setVal("redemption_rules.max_discount_amount", e.target.value)}
                    aria-describedby={describedBy}
                  />
                )}
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field
                label="Max Coins Per Order"
                hint="Maximum number of coins usable per purchase."
              >
                {({ id, describedBy }) => (
                  <Input
                    id={id}
                    type="number"
                    min={0}
                    value={getVal("redemption_rules.max_coins_per_order", 500)}
                    onChange={(e) => setVal("redemption_rules.max_coins_per_order", e.target.value)}
                    aria-describedby={describedBy}
                  />
                )}
              </Field>

              <Field
                label="Minimum Order Value (₹)"
                hint="Order must be at least this much to use coins."
              >
                {({ id, describedBy }) => (
                  <Input
                    id={id}
                    type="number"
                    min={0}
                    value={getVal("redemption_rules.min_purchase_amount", 100)}
                    onChange={(e) => setVal("redemption_rules.min_purchase_amount", e.target.value)}
                    aria-describedby={describedBy}
                  />
                )}
              </Field>
            </div>

            <Field
              label="Minimum Coin Balance to Redeem"
              hint="User must possess at least this many coins to unlock redemption at checkout."
            >
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  type="number"
                  min={0}
                  value={getVal("redemption_rules.min_coins_required", 10)}
                  onChange={(e) => setVal("redemption_rules.min_coins_required", e.target.value)}
                  aria-describedby={describedBy}
                />
              )}
            </Field>
          </div>
        </Panel>

        {/* Panel 4: Expiry & Notification Policy */}
        <Panel
          title="Coin Expiry Policy"
          subtitle="Configure when unused coins lapse and warning notifications"
          action={
            <Button size="sm" loading={saving} onClick={saveAll}>
              <Save className="size-3.5" /> Save
            </Button>
          }
        >
          <div className="flex flex-col gap-4">
            <Toggle
              label="Enable Coin Expiry"
              hint="When disabled, earned coins remain valid indefinitely."
              checked={Boolean(getVal("coin_expiry.enabled", true))}
              onChange={(v) => setVal("coin_expiry.enabled", v)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field
                label="Expiry Duration (Days)"
                hint="Days after which awarded coins expire."
              >
                {({ id, describedBy }) => (
                  <Input
                    id={id}
                    type="number"
                    min={1}
                    value={getVal("coin_expiry.duration_value", 90)}
                    onChange={(e) => setVal("coin_expiry.duration_value", e.target.value)}
                    aria-describedby={describedBy}
                  />
                )}
              </Field>

              <Field
                label="Warning Notice (Days Before)"
                hint="Warn user this many days before coins expire."
              >
                {({ id, describedBy }) => (
                  <Input
                    id={id}
                    type="number"
                    min={1}
                    value={getVal("coin_expiry.warning_days", 7)}
                    onChange={(e) => setVal("coin_expiry.warning_days", e.target.value)}
                    aria-describedby={describedBy}
                  />
                )}
              </Field>
            </div>

            <Toggle
              label="Notify User on Impending Expiry"
              hint="Sends in-app or push alerts when coins are within the warning window."
              checked={Boolean(getVal("coin_expiry.notify_user", true))}
              onChange={(v) => setVal("coin_expiry.notify_user", v)}
            />
          </div>
        </Panel>
      </div>
    </div>
  );
}
