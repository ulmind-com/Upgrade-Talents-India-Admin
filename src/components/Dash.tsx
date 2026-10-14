"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, TrendingUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Headline metric tile. The first tile in a row is `featured`, filled with the
 * brand surface, exactly as in the approved dashboard layout.
 */
export function StatCard({
  label, value, hint, Icon, href, accent, index = 0,
}: {
  label: string;
  value: string | number;
  hint?: string;
  Icon: LucideIcon;
  href?: string;
  accent?: boolean;
  index?: number;
}) {
  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "group relative flex h-full flex-col justify-between gap-6 rounded-2xl border p-5 transition-shadow",
        accent
          ? "brand-surface border-transparent"
          : "border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]",
        href && "hover:shadow-[var(--shadow-pop)]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={cn("text-[13.5px] font-semibold", accent ? "text-white/90" : "text-[var(--fg)]")}>
          {label}
        </span>
        <span
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-full border transition-transform duration-300 group-hover:rotate-45",
            accent ? "border-white/30 bg-white/15 text-white" : "border-[var(--border)] text-[var(--fg-muted)]"
          )}
        >
          <ArrowUpRight className="size-4" aria-hidden />
        </span>
      </div>

      <div>
        <p className={cn("text-[40px] font-bold leading-none tabular-nums", accent ? "text-white" : "text-[var(--fg)]")}>
          {value}
        </p>

        {hint && (
          <p
            className={cn(
              "mt-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium",
              accent ? "bg-white/15 text-white/90" : "bg-[var(--surface-3)] text-[var(--fg-muted)]"
            )}
          >
            <Icon className="size-3 shrink-0" aria-hidden /> {hint}
          </p>
        )}
      </div>
    </motion.div>
  );

  return href ? <Link href={href} className="block h-full">{inner}</Link> : inner;
}

/** Vertical bar chart with hatched remainder — the reference's analytics card. */
export function HatchBars({
  data, peakLabel,
}: {
  data: { label: string; value: number; full?: string }[];
  peakLabel?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const peak = data.reduce((a, b) => (b.value > a.value ? b : a), data[0]);

  return (
    <div className="flex h-[230px] items-end justify-between gap-2.5 sm:gap-4">
      {data.map((d, i) => {
        const pct = Math.round((d.value / max) * 100);
        const isPeak = d.label === peak?.label && d.value > 0;
        return (
          <div key={`${d.label}-${i}`} className="group relative flex h-full min-w-0 flex-1 flex-col items-center gap-2.5">
            {isPeak && peakLabel && (
              <span className="absolute -top-1 z-10 rounded-md bg-[var(--brand)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                {peakLabel}
              </span>
            )}

            <div className="hatch relative flex w-full max-w-[52px] flex-1 items-end overflow-hidden rounded-full rounded-b-xl">
              <motion.span
                initial={{ height: 0 }}
                whileInView={{ height: `${Math.max(pct, d.value > 0 ? 8 : 0)}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  "w-full rounded-full rounded-b-xl",
                  isPeak ? "bg-[var(--brand)]" : "bg-[var(--brand-bright)]"
                )}
                style={{ opacity: d.value > 0 ? 1 : 0 }}
              />
            </div>

            <span className="truncate text-[11px] font-medium text-[var(--fg-muted)]" title={d.full || d.label}>
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Semi-circular progress gauge with a hatched remainder. */
export function Gauge({ percent, caption }: { percent: number; caption: string }) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  const R = 70;
  const C = Math.PI * R; // half circumference

  return (
    <div className="relative mx-auto w-full max-w-[240px]">
      <svg viewBox="0 0 180 104" className="w-full" role="img" aria-label={`${caption}: ${p} percent`}>
        <defs>
          <pattern id="gaugeHatch" width="6" height="6" patternTransform="rotate(-45)" patternUnits="userSpaceOnUse">
            <rect width="2" height="6" fill="var(--hatch)" />
          </pattern>
        </defs>
        <path d="M20 94 A70 70 0 0 1 160 94" fill="none" stroke="url(#gaugeHatch)" strokeWidth="24" strokeLinecap="round" />
        <motion.path
          d="M20 94 A70 70 0 0 1 160 94"
          fill="none"
          stroke="var(--brand)"
          strokeWidth="24"
          strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          whileInView={{ strokeDashoffset: C - (C * p) / 100 }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 text-center">
        <p className="text-[34px] font-bold leading-none tabular-nums">{p}%</p>
        <p className="mt-1 text-[12px] text-[var(--fg-muted)]">{caption}</p>
      </div>
    </div>
  );
}

/** Compact two-column key/value list used across detail panels. */
export function KeyValues({ items }: { items: { k: string; v: React.ReactNode }[] }) {
  return (
    <dl className="divide-y divide-[var(--border)]">
      {items.map((it) => (
        <div key={it.k} className="flex items-start justify-between gap-6 py-3 first:pt-0 last:pb-0">
          <dt className="shrink-0 text-[12px] font-semibold uppercase tracking-wide text-[var(--fg-subtle)]">{it.k}</dt>
          <dd className="text-right text-[13px] font-medium [overflow-wrap:anywhere]">{it.v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export { TrendingUp };
