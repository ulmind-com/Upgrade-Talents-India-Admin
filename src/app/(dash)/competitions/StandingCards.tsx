"use client";

import { Sparkles, MessageSquare } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import { UserAvatar } from "./UserAvatar";
import { cn, formatNumber } from "@/lib/utils";

export function RoundStandingCard({
  p,
  isChecked,
  isAdvancingZone,
  displayRank,
  onToggle,
}: {
  p: any;
  isChecked: boolean;
  isAdvancingZone: boolean;
  displayRank: number;
  onToggle: () => void;
}) {
  return (
    <article
            className={cn(
        "rounded-2xl border p-3 transition-colors",
        isChecked
          ? "border-amber-500/50 bg-amber-500/10"
          : isAdvancingZone
          ? "border-emerald-500/30 bg-emerald-500/[0.06] hover:border-emerald-500/50"
          : "border-[var(--border)] bg-[var(--surface-2)]/50 hover:border-[var(--brand)]/40"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-[230px] flex-1 items-center gap-2.5">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={onToggle}
            aria-label={`Select ${p.name || p.user_name || "contestant"}`}
            className="rounded accent-amber-500"
          />
          {displayRank === 1 ? (
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-amber-400 font-black text-[11px] text-slate-950">1</span>
          ) : displayRank === 2 ? (
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-slate-300 font-bold text-[11px] text-slate-900">2</span>
          ) : displayRank === 3 ? (
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-amber-700 font-bold text-[11px] text-amber-50">3</span>
          ) : (
            <span className="grid size-6 shrink-0 place-items-center text-[11px] font-bold text-[var(--fg-muted)]">{displayRank}</span>
          )}
          <UserAvatar user={p} className="size-8" rounded="rounded-lg" />
          <div className="min-w-0">
            <p className="flex items-center gap-1 font-semibold text-[var(--fg)]">
              <span className="truncate">{p.name || p.user_name || "Contestant"}</span>
              {p.is_verified && <VerifiedBadge size="xs" />}
            </p>
            <p className="truncate text-[10.5px] text-[var(--fg-muted)]">{p.email || p.user_email}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10.5px] font-bold text-violet-300">
            {p.category || "General"}
          </span>
          {p.round_status === "ELIMINATED" ? (
            <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-bold text-rose-400">
              Eliminated
            </span>
          ) : p.is_advancing || isAdvancingZone ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-400">
              <Sparkles className="size-2.5" /> Advancing
            </span>
          ) : (
            <span className="rounded-full border border-slate-500/30 bg-slate-500/10 px-2.5 py-0.5 text-[10px] font-bold text-slate-300">
              Qualified
            </span>
          )}
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-[var(--border)] pt-2.5 text-[11px]">
        <span className="flex items-center gap-1.5">
          <span className="text-[var(--fg-subtle)]">Judge score</span>
          <span className="font-medium tabular-nums text-[var(--fg)]">{p.judge_score != null ? p.judge_score : "—"}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-[var(--fg-subtle)]">Audience votes</span>
          <span className="font-medium tabular-nums text-[var(--fg)]">{p.audience_votes != null ? formatNumber(p.audience_votes) : "—"}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-[var(--fg-subtle)]">Points</span>
          <span className="font-display text-sm font-bold tabular-nums text-amber-400">{p.points ?? p.final_score ?? p.audience_votes ?? "—"}</span>
        </span>
      </div>
    </article>
  );
}

export function ResultStandingCard({
  p,
  rank,
  onInspect,
}: {
  p: any;
  rank: number;
  onInspect: () => void;
}) {
  const r = rank;
  const is1 = r === 1;
  const is2 = r === 2;
  const is3 = r === 3;
  const hasJudgeDetails = Array.isArray(p.judge_details) && p.judge_details.length > 0;

  return (
    <article
            className={cn(
        "rounded-2xl border p-3 transition-colors",
        is1
          ? "border-amber-500/40 bg-amber-500/[0.07] hover:border-amber-500/60"
          : is2
          ? "border-slate-400/30 bg-slate-500/[0.05] hover:border-slate-400/50"
          : is3
          ? "border-amber-700/40 bg-amber-700/[0.05] hover:border-amber-700/60"
          : "border-[var(--border)] bg-[var(--surface-2)]/50 hover:border-[var(--brand)]/40"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-[240px] flex-1 items-center gap-2.5">
          {is1 ? (
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-amber-400 font-black text-[11px] text-slate-950 shadow-sm">1</span>
          ) : is2 ? (
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-slate-300 font-bold text-[11px] text-slate-900 shadow-sm">2</span>
          ) : is3 ? (
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-amber-700 font-bold text-[11px] text-amber-50 shadow-sm">3</span>
          ) : (
            <span className="grid size-6 shrink-0 place-items-center text-[11px] font-bold text-[var(--fg-muted)]">{r}</span>
          )}
          <UserAvatar user={p} className="size-8" rounded="rounded-full" />
          <div className="min-w-0">
            <p className="flex items-center gap-1 font-semibold text-white">
              <span className="truncate">{p.name || p.user_name || "Contestant"}</span>
              {p.is_verified && <VerifiedBadge size="xs" />}
            </p>
            <p className="truncate text-[10.5px] text-[var(--fg-muted)]">
              {p.email || p.user_email} • {p.registration_reference || "Reg"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10.5px] font-bold text-violet-300">
            {p.category || "General"}
          </span>
          {is1 ? (
            <span className="rounded-full border border-amber-500/40 bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-black text-amber-300">
              1st Champion
            </span>
          ) : is2 ? (
            <span className="rounded-full border border-slate-400/40 bg-slate-400/20 px-2.5 py-0.5 text-[10px] font-bold text-slate-300">
              2nd Place
            </span>
          ) : is3 ? (
            <span className="rounded-full border border-amber-700/40 bg-amber-700/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
              3rd Place
            </span>
          ) : p.round_status === "ELIMINATED" ? (
            <span className="rounded-full border border-rose-500/30 bg-rose-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-rose-400">
              Eliminated
            </span>
          ) : (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
              Qualified
            </span>
          )}
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-[var(--border)] pt-2.5 text-[11px]">
        <span className="flex items-center gap-1.5">
          <span className="text-[var(--fg-subtle)]">Judge score</span>
          <span className="font-medium tabular-nums text-white">{p.judge_score != null ? p.judge_score : "—"}</span>
          {p.judge_score_count ? (
            <span className="text-[10px] text-[var(--fg-muted)]">
              ({p.judge_score_count} {p.judge_score_count === 1 ? "judge" : "judges"})
            </span>
          ) : null}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-[var(--fg-subtle)]">Audience votes</span>
          <span className="font-medium tabular-nums text-[var(--fg)]">{p.audience_votes != null ? formatNumber(p.audience_votes) : "—"}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-[var(--fg-subtle)]">Points / score</span>
          <span className="font-display text-sm font-bold tabular-nums text-amber-400">{p.effectiveScore}</span>
        </span>

        {(hasJudgeDetails || (p.comments && p.comments.length > 0)) && (
          <button
            type="button"
            onClick={onInspect}
            className="ml-auto cursor-pointer inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-[11px] font-semibold text-amber-300 transition-colors hover:border-amber-400 hover:bg-amber-500/20"
          >
            <MessageSquare className="size-3" /> View Feedback
          </button>
        )}
      </div>
    </article>
  );
}
