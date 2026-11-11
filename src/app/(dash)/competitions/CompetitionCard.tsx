"use client";

import { Users, Radio, Trophy, Layers, Gavel, Share2, Pencil, Trash2 } from "lucide-react";
import { Button, StatusBadge } from "@/components/Kit";
import { formatDate } from "@/lib/utils";

type CompetitionCardProps = {
  row: any;
  onOpen: (tab: "participants" | "workflow" | "stage" | "rounds" | "results") => void;
  onShare: () => void;
  onTogglePublish: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function CompetitionCard({ row, onOpen, onShare, onTogglePublish, onEdit, onDelete }: CompetitionCardProps) {
  const published = !!row.is_published;
  const fmts = row.submission_formats || [];
  const fields = row.dynamic_submission_fields || [];
  const hasLink = fmts.includes("VIDEO_LINK") || fields.some((f: any) => f.type === "URL" || f.type === "VIDEO" || /link|url|drive|youtube/i.test(f.name));
  const hasAudio = fmts.includes("AUDIO") || fields.some((f: any) => f.type === "AUDIO" || /audio|mp3/i.test(f.name));
  const hasFile = fmts.includes("FILE") || fields.some((f: any) => f.type === "DOCUMENT" || f.type === "IMAGE" || /file|document|photo/i.test(f.name));
  const entrants = row.participants_count ?? row.total_registered ?? row.registrations_count ?? row.total_participants;

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-4 shadow-sm transition-colors hover:border-[var(--brand)]/40 hover:bg-[var(--surface-2)]">
      {/* ── Identity + primary entry point ── */}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-[240px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold leading-tight text-white">
              {row.title || row.name || "Untitled"}
            </h3>
            <span className="rounded-md border border-[var(--border)] bg-[var(--surface-3)] px-1.5 py-0.5 text-[10.5px] font-semibold text-[var(--fg-muted)]">
              {row.category || row.type || "General"}
            </span>
            <Button
              size="sm"
              variant="primary"
              onClick={() => onOpen("participants")}
              title="View registered participants, payments and submissions"
              className="font-bold text-[11px]"
            >
              <Users className="size-3.5" aria-hidden /> Participants
              {typeof entrants === "number" && (
                <span className="ml-1 rounded bg-black/25 px-1.5 py-0.5 font-mono text-[10px] tabular-nums">
                  {entrants}
                </span>
              )}
            </Button>
          </div>

          {Array.isArray(row.categories) && row.categories.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1">
              {row.categories.map((c: any, i: number) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400"
                >
                  {c.name}
                  {c.age_limit
                    ? ` (${c.age_limit})`
                    : c.min_age != null || c.max_age != null
                    ? ` (${c.min_age ?? 0}-${c.max_age ?? "+"}y)`
                    : ""}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge value={row.status || row.state} />
          <span
            className={
              published
                ? "inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-400"
                : "inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-3)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--fg-muted)]"
            }
          >
            <span className={published ? "size-1.5 rounded-full bg-emerald-400" : "size-1.5 rounded-full bg-[var(--fg-subtle)]"} />
            {published ? "Published" : "Not published"}
          </span>
        </div>
      </div>

      {/* ── Schedule and submission formats ── */}
      <dl className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[var(--border)] pt-3 text-[11.5px]">
        <div className="flex items-center gap-1.5">
          <dt className="text-[var(--fg-subtle)]">Starts</dt>
          <dd className="font-medium text-[var(--fg)]">{formatDate(row.start_date || row.starts_at, true)}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <dt className="text-[var(--fg-subtle)]">Registration</dt>
          <dd>
            {row.registration_deadline ? (
              <span className="font-medium text-[var(--fg)]">{formatDate(row.registration_deadline, true)}</span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-400">
                Open / No deadline
              </span>
            )}
          </dd>
        </div>
        {(hasLink || hasAudio || hasFile) && (
          <div className="flex items-center gap-1.5">
            <dt className="text-[var(--fg-subtle)]">Formats</dt>
            <dd className="flex items-center gap-1">
              {hasLink && <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[10.5px] font-medium text-sky-400">Link</span>}
              {hasAudio && <span className="rounded bg-violet-500/10 px-1.5 py-0.5 text-[10.5px] font-medium text-violet-400">MP3</span>}
              {hasFile && <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10.5px] font-medium text-amber-400">File</span>}
            </dd>
          </div>
        )}
      </dl>

      {/* ── Run-the-event controls ── */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[var(--border)] pt-3">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onOpen("stage")}
          className="border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 hover:text-white text-[11px] font-semibold"
          title="Manage live stage performance and lineup queue"
        >
          <Radio className="size-3.5 text-rose-500" aria-hidden /> Live Stage
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onOpen("results")}
          className="border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-white text-[11px] font-semibold"
          title="Official results, category winners and judge scores"
        >
          <Trophy className="size-3.5 text-amber-400" aria-hidden /> Results
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onOpen("rounds")}
          className="text-[11px] font-semibold"
          title="Stages and knockout rounds"
        >
          <Layers className="size-3.5" aria-hidden /> Rounds
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onOpen("workflow")}
          className="text-[11px] font-semibold"
          title="Judging and session controls"
        >
          <Gavel className="size-3.5" aria-hidden /> Judging
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onShare}
          className="border-sky-500/20 text-sky-400 hover:bg-sky-500/10 hover:text-sky-300 text-[11px] font-semibold"
          title="Share and promote this competition"
        >
          <Share2 className="size-3.5" aria-hidden /> Share
        </Button>

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            size="sm"
            variant={published ? "secondary" : "success"}
            className="text-[11px] font-semibold"
            onClick={onTogglePublish}
          >
            {published ? "Unpublish" : "Publish"}
          </Button>
          <button
            onClick={onEdit}
            aria-label="Edit competition"
            title="Edit competition"
            className="grid size-8 cursor-pointer place-items-center rounded-lg text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--brand)]"
          >
            <Pencil className="size-4" aria-hidden />
          </button>
          <button
            onClick={onDelete}
            aria-label="Delete competition"
            title="Delete competition"
            className="grid size-8 cursor-pointer place-items-center rounded-lg text-[var(--fg-muted)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </article>
  );
}
