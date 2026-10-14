"use client";

import Link from "next/link";
import {
  CalendarDays, Users, Ticket, Trophy, GraduationCap, ShoppingBag,
  Crown, Bell, TrendingUp, Globe, Plus, Download, ArrowUpRight, Clock, Radio,
} from "lucide-react";
import {
  cmsApi, usersApi, competitionsApi, coursesApi, merchApi, notificationsApi,
  safe, toRows, totalOf,
} from "@/lib/api";
import { Panel, useResource, Loading, ErrorState, StatusBadge, Button, Badge } from "@/components/Kit";
import { StatCard, HatchBars, Gauge } from "@/components/Dash";
import { formatDate, formatNumber } from "@/lib/utils";

export default function Dashboard() {
  const { data, loading, error, reload } = useResource(async () => {
    const [events, users, tickets, comps, courses, orders, announcements] = await Promise.all([
      safe(cmsApi.listEvents({ limit: 200 }), [] as any),
      safe(usersApi.list({ limit: 200 }), {} as any),
      safe(cmsApi.listTickets({ limit: 300 }), [] as any),
      safe(competitionsApi.list({ limit: 100 }), {} as any),
      safe(coursesApi.list({ limit: 100 }), {} as any),
      safe(merchApi.listOrders({ limit: 100 }), {} as any),
      safe(notificationsApi.list({ limit: 10 }), {} as any),
    ]);
    return { events, users, tickets, comps, courses, orders, announcements };
  }, []);

  if (loading) return <Loading rows={6} />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const events = toRows(data?.events);
  const users = toRows(data?.users);
  const tickets = toRows(data?.tickets);
  const comps = toRows(data?.comps);
  const courses = toRows(data?.courses);
  const orders = toRows(data?.orders);
  const announcements = toRows(data?.announcements);

  const published = events.filter((e) => e.is_published).length;
  const live = events.filter((e) => e.event_status === "live").length;
  const sold = tickets.reduce((s, t) => s + (Number(t.total_quantity ?? 0) - Number(t.available ?? 0)), 0);
  const stock = tickets.reduce((s, t) => s + Number(t.available ?? 0), 0);
  const revenue = tickets.reduce(
    (s, t) => s + (Number(t.total_quantity ?? 0) - Number(t.available ?? 0)) * Number(t.price ?? 0), 0
  );
  const capacity = sold + stock;
  const sellThrough = capacity ? (sold / capacity) * 100 : 0;

  /* Ticket sales per event — the busiest seven, real numbers only. */
  const chart = events
    .map((e) => {
      const ts = tickets.filter((t) => String(t.event_id) === String(e._id));
      return {
        label: String(e.title || "Untitled").slice(0, 10),
        full: String(e.title || "Untitled"),
        value: ts.reduce((s, t) => s + (Number(t.total_quantity ?? 0) - Number(t.available ?? 0)), 0),
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);

  const hasSales = chart.some((c) => c.value > 0);

  const stats = [
    { label: "Total events", value: formatNumber(events.length), hint: `${published} published · ${live} live`, Icon: CalendarDays, href: "/events", accent: true },
    { label: "Registered users", value: formatNumber(totalOf(data?.users, users)), hint: "Across website and app", Icon: Users, href: "/users" },
    { label: "Tickets sold", value: formatNumber(sold), hint: `${formatNumber(stock)} still available`, Icon: Ticket, href: "/tickets" },
    { label: "Ticket revenue", value: `₹${formatNumber(Math.round(revenue))}`, hint: "From issued tiers", Icon: TrendingUp, href: "/tickets" },
  ];

  const secondary = [
    { label: "Competitions", value: formatNumber(totalOf(data?.comps, comps)), Icon: Trophy, href: "/competitions" },
    { label: "Courses & workshops", value: formatNumber(totalOf(data?.courses, courses)), Icon: GraduationCap, href: "/courses" },
    { label: "Merch orders", value: formatNumber(totalOf(data?.orders, orders)), Icon: ShoppingBag, href: "/merchandise" },
    { label: "Announcements", value: formatNumber(totalOf(data?.announcements, announcements)), Icon: Bell, href: "/notifications" },
  ];

  const nextEvent = events.find((e) => e.is_published) || events[0];

  return (
    <div className="flex flex-col gap-5">
      {/* Page actions */}
      <div className="-mt-14 mb-3 flex justify-end gap-2.5">
        <Button href="/events" size="sm" className="rounded-full px-5">
          <Plus className="size-4" aria-hidden /> Add event
        </Button>
        <Button href="/website" variant="secondary" size="sm" className="rounded-full px-5">
          <Download className="size-4" aria-hidden /> Site content
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s, i) => <StatCard key={s.label} {...s} index={i} />)}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_0.85fr_0.8fr]">
        <Panel
          title="Ticket sales by event"
          subtitle="Issued tickets across published tiers"
          action={<Button variant="secondary" size="sm" onClick={reload}>Refresh</Button>}
        >
          {hasSales ? (
            <>
              <HatchBars data={chart} peakLabel={`${Math.round(sellThrough)}%`} />
              <table className="sr-only">
                <caption>Tickets sold per event</caption>
                <thead><tr><th scope="col">Event</th><th scope="col">Tickets sold</th></tr></thead>
                <tbody>{chart.map((r, i) => <tr key={`${r.full}-${i}`}><td>{r.full}</td><td>{r.value}</td></tr>)}</tbody>
              </table>
            </>
          ) : (
            <p className="py-16 text-center text-[13px] text-[var(--fg-muted)]">
              No tickets sold yet. Sales appear here as bookings come in.
            </p>
          )}
        </Panel>

        {/* Next event — the reference's reminder card */}
        <Panel title="Next up">
          {nextEvent ? (
            <div className="flex h-full flex-col">
              <p className="text-[19px] font-bold leading-snug">{nextEvent.title}</p>
              <p className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] text-[var(--fg-muted)]">
                <Clock className="size-3.5 shrink-0" aria-hidden />
                {formatDate(nextEvent.date)}{nextEvent.time ? ` · ${nextEvent.time}` : ""}
              </p>
              {nextEvent.venue && (
                <p className="mt-1 truncate text-[12.5px] text-[var(--fg-muted)]">{nextEvent.venue}</p>
              )}
              <div className="mt-3"><StatusBadge value={nextEvent.is_published ? "published" : "draft"} /></div>
              <Button href="/tickets" className="mt-auto w-full rounded-xl">
                <Ticket className="size-4" aria-hidden /> Manage tickets
              </Button>
            </div>
          ) : (
            <p className="py-10 text-center text-[13px] text-[var(--fg-muted)]">No events created yet.</p>
          )}
        </Panel>

        <Panel title="Events" action={<Link href="/events" className="text-[12.5px] font-semibold text-[var(--brand)]">Manage</Link>}>
          {events.length ? (
            <ul className="flex flex-col divide-y divide-[var(--border)]">
              {events.slice(0, 5).map((e) => (
                <li key={e._id} className="flex items-center gap-3 py-2.5 first:pt-0">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--brand-soft)]">
                    <CalendarDays className="size-4 text-[var(--brand)]" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold">{e.title}</span>
                    <span className="block truncate text-[11px] text-[var(--fg-muted)]">{formatDate(e.date)}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-10 text-center text-[13px] text-[var(--fg-muted)]">Nothing scheduled.</p>
          )}
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_0.85fr_0.85fr]">
        <Panel title="Latest announcements" action={<Link href="/notifications" className="text-[12.5px] font-semibold text-[var(--brand)]">Open</Link>}>
          {announcements.length ? (
            <ul className="flex flex-col divide-y divide-[var(--border)]">
              {announcements.slice(0, 4).map((a, i) => (
                <li key={a._id ?? i} className="flex items-center justify-between gap-3 py-3 first:pt-0">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-semibold">{a.title || a.subject || "Announcement"}</p>
                    <p className="mt-0.5 truncate text-[11.5px] text-[var(--fg-muted)]">{a.message || a.body || "—"}</p>
                  </div>
                  <StatusBadge value={a.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-10 text-center text-[13px] text-[var(--fg-muted)]">No announcements sent yet.</p>
          )}
        </Panel>

        <Panel title="Sell-through" subtitle="Issued vs total capacity">
          <Gauge percent={sellThrough} caption="Tickets claimed" />
          <ul className="mt-4 flex items-center justify-center gap-5 text-[11.5px] text-[var(--fg-muted)]">
            <li className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[var(--brand)]" aria-hidden /> Sold {formatNumber(sold)}
            </li>
            <li className="inline-flex items-center gap-1.5">
              <span className="hatch size-2 rounded-full border border-[var(--border-strong)]" aria-hidden /> Left {formatNumber(stock)}
            </li>
          </ul>
        </Panel>

        {/* Live status — the reference's time-tracker slot */}
        <div className="brand-surface relative flex flex-col justify-between overflow-hidden rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13.5px] font-semibold text-white/90">Live right now</span>
            <span className="grid size-8 place-items-center rounded-full bg-white/15">
              <Radio className="size-4 text-white" aria-hidden />
            </span>
          </div>
          <div>
            <p className="text-[40px] font-bold leading-none tabular-nums text-white">{formatNumber(live)}</p>
            <p className="mt-2 text-[12px] text-white/75">
              {live ? "Events are live on the public site" : "No event is live at the moment"}
            </p>
          </div>
          <Link
            href="/check-in"
            className="mt-5 inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-white/15 text-[12.5px] font-semibold text-white transition-colors hover:bg-white/25"
          >
            Open gate console <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {secondary.map((s, i) => <StatCard key={s.label} {...s} index={i} />)}
      </div>

      <Panel title="Quick actions" subtitle="Jump straight into the common jobs">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "Create an event", href: "/events", Icon: CalendarDays },
            { label: "Add ticket tiers", href: "/tickets", Icon: Ticket },
            { label: "Edit website content", href: "/website", Icon: Globe },
            { label: "Issue VIP passes", href: "/vip", Icon: Crown },
            { label: "Send an announcement", href: "/notifications", Icon: Bell },
            { label: "Review competitions", href: "/competitions", Icon: Trophy },
          ].map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className="group flex min-h-[54px] items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 text-[13px] font-semibold transition-colors hover:border-[var(--brand)] hover:text-[var(--brand)]"
            >
              <a.Icon className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{a.label}</span>
              <ArrowUpRight className="ml-auto size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  );
}
