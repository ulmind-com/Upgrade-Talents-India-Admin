"use client";

import { Calendar, Users, ArrowUpRight, Share2, Crown, Ticket, Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { Button, StatusBadge } from "@/components/Kit";
import { formatDate, formatINR, formatNumber, rowId } from "@/lib/utils";

type EventCardProps = {
  row: any;
  stats?: { bookings?: number; tickets?: number };
  onBookings: () => void;
  onShare: () => void;
  onTogglePublish: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function EventCard({
  row,
  stats,
  onBookings,
  onShare,
  onTogglePublish,
  onEdit,
  onDelete,
}: EventCardProps) {
  const id = rowId(row);
  const published = !!row.is_published;
  const booked = stats?.bookings || 0;
  const tickets = stats?.tickets || 0;
  const cats: any[] = Array.isArray(row.categories) ? row.categories : [];

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-4 shadow-sm transition-colors hover:border-[var(--brand)]/40 hover:bg-[var(--surface-2)]">
      {/* ── Identity + primary entry point ── */}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-[260px] flex-1 items-start gap-3">
          {row.image_url || row.card_image_url ? (
            <img
              src={row.image_url || row.card_image_url}
              alt=""
              referrerPolicy="no-referrer"
              className="size-11 shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] object-cover"
            />
          ) : (
            <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-subtle)]">
              <Calendar className="size-5" aria-hidden />
            </div>
          )}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold leading-tight text-white">{row.title}</h3>
              {row.updated_at && (
                <span
                  className="rounded border border-sky-500/20 bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-sky-400"
                  title={`Last updated: ${new Date(row.updated_at).toLocaleString()}`}
                >
                  Updated
                </span>
              )}
              <Button
                size="sm"
                variant="primary"
                onClick={onBookings}
                title="View attendee bookings and live gate attendance"
                className="font-bold text-[11px]"
              >
                <Users className="size-3.5" aria-hidden /> Bookings
                <span className="ml-1 rounded bg-black/25 px-1.5 py-0.5 font-mono text-[10px] tabular-nums">
                  {booked}
                  {tickets > 0 ? ` · ${tickets} tix` : ""}
                </span>
              </Button>
            </div>

            <p className="mt-0.5 text-[11.5px] text-[var(--fg-muted)]">{row.venue || "No venue"}</p>
            <p className="font-mono text-[10px] text-[var(--fg-subtle)]">ID: {id}</p>

            {cats.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1">
                {cats.map((c: any, i: number) => (
                  <span
                    key={i}
                    className="rounded border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[9.5px] text-[var(--brand)]"
                  >
                    {c.name}: {c.price === 0 ? "Free" : `₹${c.price}`}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge value={row.event_status} />
          <span
            className={
              published
                ? "inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-400"
                : "inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-3)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--fg-muted)]"
            }
          >
            <span className={published ? "size-1.5 rounded-full bg-emerald-400" : "size-1.5 rounded-full bg-[var(--fg-subtle)]"} />
            {published ? "Live" : "Draft"}
          </span>
        </div>
      </div>

      {/* ── Schedule, price and capacity ── */}
      <dl className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[var(--border)] pt-3 text-[11.5px]">
        <div className="flex items-center gap-1.5">
          <dt className="text-[var(--fg-subtle)]">Date</dt>
          <dd className="font-medium text-[var(--fg)]">
            {formatDate(row.date)}
            {row.time ? ` · ${row.time}` : ""}
          </dd>
        </div>
        <div className="flex items-center gap-1.5">
          <dt className="text-[var(--fg-subtle)]">Base price</dt>
          <dd className="font-mono font-semibold text-white">{formatINR(row.price)}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <dt className="text-[var(--fg-subtle)]">Capacity</dt>
          <dd className="font-mono text-[var(--fg)]">{formatNumber(row.capacity || 0)}</dd>
        </div>
      </dl>

      {/* ── Run-the-event controls ── */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[var(--border)] pt-3">
        <Button
          size="sm"
          variant="ghost"
          href={`https://upgradetalentsindia.in/events/${id}/book`}
          target="_blank"
          title="Open live ticket booking on website"
          className="text-[11px] font-semibold"
        >
          <ArrowUpRight className="size-3.5 text-sky-400" aria-hidden /> Live
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onShare}
          title="Share booking links (WhatsApp, Telegram, Direct)"
          className="text-[11px] font-semibold"
        >
          <Share2 className="size-3.5 text-sky-400" aria-hidden /> Share
        </Button>
        <Button
          size="sm"
          variant="ghost"
          href={`/vip?eventId=${id}`}
          title="View VIP passes and bookings"
          className="text-[11px] font-semibold"
        >
          <Crown className="size-3.5 text-amber-400" aria-hidden /> VIP
        </Button>
        <Button
          size="sm"
          variant="ghost"
          href={`/tickets?eventId=${id}&tab=tiers`}
          title="Configure ticket tiers"
          className="text-[11px] font-semibold"
        >
          <Ticket className="size-3.5" aria-hidden /> Tiers
        </Button>

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            size="sm"
            variant={published ? "secondary" : "success"}
            onClick={onTogglePublish}
            className="text-[11px] font-semibold"
          >
            {published ? (
              <>
                <EyeOff className="size-3.5" aria-hidden /> Unpublish
              </>
            ) : (
              <>
                <Eye className="size-3.5" aria-hidden /> Publish
              </>
            )}
          </Button>
          <button
            onClick={onEdit}
            aria-label="Edit event"
            title="Edit event"
            className="grid size-8 cursor-pointer place-items-center rounded-lg text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--brand)]"
          >
            <Pencil className="size-4" aria-hidden />
          </button>
          <button
            onClick={onDelete}
            aria-label="Delete event"
            title="Delete event"
            className="grid size-8 cursor-pointer place-items-center rounded-lg text-[var(--fg-muted)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </article>
  );
}
