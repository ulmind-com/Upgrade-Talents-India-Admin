"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  Ticket, Users, TrendingUp, CheckCircle2, Clock, Search,
  Eye, QrCode, Phone, Mail, Calendar, AlertCircle
} from "lucide-react";
import { CrudPage } from "@/components/Crud";
import {
  Panel, Select, useResource, Loading, ErrorState, EmptyState,
  DataTable, StatusBadge, Button, Modal, Field, Input
} from "@/components/Kit";
import { StatCard } from "@/components/Dash";
import { cmsApi, toRows } from "@/lib/api";
import { formatDate, formatINR, formatNumber, rowId } from "@/lib/utils";

function TicketsContent() {
  const searchParams = useSearchParams();
  const paramEventId = searchParams?.get("eventId") || "";
  const paramTab = searchParams?.get("tab") || "bookings";

  const [activeTab, setActiveTab] = useState<"bookings" | "tiers">(
    paramTab === "tiers" ? "tiers" : "bookings"
  );

  const { data: events, loading: loadingEvents, error: errorEvents, reload: reloadEvents } =
    useResource(() => cmsApi.listEvents({ limit: 200 }), []);

  const eventList = toRows(events);
  const [selectedEventId, setSelectedEventId] = useState(paramEventId);

  useEffect(() => {
    if (paramEventId && eventList.some((e) => String(e._id) === paramEventId)) {
      setSelectedEventId(paramEventId);
    }
  }, [paramEventId, eventList]);

  if (loadingEvents) return <Loading rows={5} />;
  if (errorEvents) return <ErrorState message={errorEvents} onRetry={reloadEvents} />;
  if (!eventList.length) {
    return <EmptyState title="No events yet" body="Create an event first to configure tickets and accept bookings." />;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Navigation Tabs ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab("bookings")}
            aria-pressed={activeTab === "bookings"}
            className={`min-h-[40px] cursor-pointer rounded-xl px-4 text-[13px] font-semibold transition-colors ${
              activeTab === "bookings"
                ? "bg-[var(--brand)] text-[var(--on-brand)]"
                : "border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] hover:text-[var(--fg)]"
            }`}
          >
            Attendee Bookings & Tickets
          </button>
          <button
            onClick={() => setActiveTab("tiers")}
            aria-pressed={activeTab === "tiers"}
            className={`min-h-[40px] cursor-pointer rounded-xl px-4 text-[13px] font-semibold transition-colors ${
              activeTab === "tiers"
                ? "bg-[var(--brand)] text-[var(--on-brand)]"
                : "border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] hover:text-[var(--fg)]"
            }`}
          >
            Ticket Tiers & Pricing
          </button>
        </div>
      </div>

      {activeTab === "bookings" ? (
        <AttendeeBookingsManager
          events={eventList}
          selectedEventId={selectedEventId}
          onSelectEvent={setSelectedEventId}
        />
      ) : (
        <TicketTiersManager
          events={eventList}
          selectedEventId={selectedEventId || String(eventList[0]._id)}
          onSelectEvent={setSelectedEventId}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   1. ATTENDEE BOOKINGS MANAGER
   ═══════════════════════════════════════════════════════════════════ */

function AttendeeBookingsManager({
  events,
  selectedEventId,
  onSelectEvent,
}: {
  events: any[];
  selectedEventId: string;
  onSelectEvent: (id: string) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  // Fetch bookings based on selected event or all
  const { data, loading, error, reload } = useResource(
    () =>
      selectedEventId
        ? cmsApi.listEventBookings(selectedEventId, { limit: 200 })
        : cmsApi.listAllBookings({ limit: 200 }),
    [selectedEventId]
  );

  const rawBookings: any[] = data?.bookings || toRows(data);
  const totalCount = data?.total ?? rawBookings.length;
  const totalTickets = data?.total_tickets ?? rawBookings.reduce((s: number, b: any) => s + Number(b.quantity || 1), 0);
  const totalRevenue = data?.total_revenue ?? rawBookings.reduce((s: number, b: any) => s + (b.booking_status === "CONFIRMED" || b.payment_status === "PAID" ? Number(b.total_amount || 0) : 0), 0);
  const checkedInCount = data?.checked_in_count ?? rawBookings.reduce((s: number, b: any) => {
    const tix = b.tickets || [];
    return s + tix.filter((t: any) => t.is_checked_in).length;
  }, 0);

  const filteredBookings = useMemo(() => {
    return rawBookings.filter((b: any) => {
      const matchStatus = statusFilter === "ALL" || (b.booking_status || "").toUpperCase() === statusFilter;
      const s = search.toLowerCase().trim();
      const matchSearch =
        !s ||
        (b.booking_reference || "").toLowerCase().includes(s) ||
        (b.user_email || "").toLowerCase().includes(s) ||
        (b.user_name || "").toLowerCase().includes(s) ||
        (b.user_phone || "").toLowerCase().includes(s) ||
        (b.holder_names || []).some((h: string) => h.toLowerCase().includes(s));
      return matchStatus && matchSearch;
    });
  }, [rawBookings, statusFilter, search]);

  const eventOptions = [
    { value: "", label: "All Events (Platform-wide)" },
    ...events.map((e) => ({
      value: String(e._id),
      label: `${e.title} — ${formatDate(e.date)}`,
    })),
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* ── Metric Stat Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Bookings"
          value={formatNumber(totalCount)}
          hint={selectedEventId ? "For selected event" : "Across all events"}
          Icon={Users}
          accent
          index={0}
        />
        <StatCard
          label="Tickets Issued"
          value={formatNumber(totalTickets)}
          hint="Passes generated"
          Icon={Ticket}
          index={1}
        />
        <StatCard
          label="Ticket Revenue"
          value={formatINR(totalRevenue)}
          hint="Verified paid / free bookings"
          Icon={TrendingUp}
          index={2}
        />
        <StatCard
          label="Gate Check-ins"
          value={formatNumber(checkedInCount)}
          hint={`${totalTickets ? Math.round((checkedInCount / totalTickets) * 100) : 0}% check-in rate`}
          Icon={CheckCircle2}
          index={3}
        />
      </div>

      {/* ── Main Bookings Panel ── */}
      <Panel
        title="Event Ticket Bookings & Attendees"
        subtitle="Live attendee details, issued digital tickets, and gate check-in status"
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="min-w-[200px] max-w-xs">
              <label htmlFor="booking-event-picker" className="sr-only">Event Filter</label>
              <Select
                id="booking-event-picker"
                value={selectedEventId}
                onChange={(e) => onSelectEvent(e.target.value)}
                options={eventOptions}
                className="h-9 text-xs"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: "ALL", label: "All Statuses" },
                { value: "CONFIRMED", label: "Confirmed" },
                { value: "PENDING", label: "Pending Payment" },
                { value: "CANCELLED", label: "Cancelled" },
              ]}
              className="h-9 w-[150px] text-xs"
            />
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--fg-subtle)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search reference, buyer or attendee..."
                className="h-9 w-[220px] rounded-xl border border-[var(--border)] bg-[var(--surface-2)] pl-8 pr-3 text-xs outline-none focus:border-[var(--brand)]"
              />
            </div>
            <Button size="sm" variant="secondary" onClick={reload}>
              Refresh
            </Button>
          </div>
        }
      >
        <DataTable
          rows={filteredBookings}
          loading={loading}
          error={error}
          onRetry={reload}
          empty={{
            title: "No bookings found",
            body: selectedEventId
              ? "No attendees have booked tickets for this event yet."
              : "No ticket bookings recorded across any events yet.",
          }}
          columns={[
            {
              key: "booking_reference",
              header: "Booking Reference",
              render: (r: any) => (
                <div>
                  <span className="font-mono text-xs font-bold text-[var(--brand)]">
                    {r.booking_reference || rowId(r)}
                  </span>
                  <span className="block text-[11px] text-[var(--fg-subtle)]">
                    {formatDate(r.booked_at || r.created_at, true)}
                  </span>
                </div>
              ),
            },
            {
              key: "user",
              header: "Buyer / Contact",
              render: (r: any) => (
                <div className="text-xs">
                  <p className="font-semibold text-white">{r.user_name || "Guest"}</p>
                  <p className="font-mono text-[11px] text-[var(--fg-muted)] truncate max-w-[200px]">
                    {r.user_email}
                  </p>
                  {r.user_phone && (
                    <p className="text-[11px] text-[var(--fg-subtle)] font-mono">{r.user_phone}</p>
                  )}
                </div>
              ),
            },
            {
              key: "event_title",
              header: "Event & Tier",
              render: (r: any) => (
                <div className="text-xs max-w-[200px]">
                  <p className="font-semibold text-white truncate">{r.event_title || "Event"}</p>
                  <span className="inline-block rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[10.5px] font-medium capitalize text-[var(--brand)]">
                    {String(r.ticket_type || "general").replace(/_/g, " ")}
                  </span>
                </div>
              ),
            },
            {
              key: "quantity",
              header: "Tickets / Amount",
              render: (r: any) => (
                <div className="text-xs">
                  <span className="font-bold text-white">{r.quantity} ticket{r.quantity > 1 ? "s" : ""}</span>
                  <span className="block font-mono text-[11px] text-[var(--fg-muted)]">
                    {formatINR(r.total_amount)}
                  </span>
                </div>
              ),
            },
            {
              key: "booking_status",
              header: "Status",
              render: (r: any) => (
                <div className="flex flex-col gap-1">
                  <StatusBadge value={r.booking_status} />
                  <span className={`text-[10px] font-bold uppercase ${r.payment_status === "PAID" || r.payment_status === "NOT_REQUIRED" ? "text-green-400" : "text-amber-400"}`}>
                    {r.payment_status}
                  </span>
                </div>
              ),
            },
            {
              key: "check_in",
              header: "Gate Check-in",
              render: (r: any) => {
                const tix: any[] = r.tickets || [];
                const checkedIn = tix.filter((t) => t.is_checked_in).length;
                const total = tix.length || r.quantity || 1;
                const isAll = checkedIn === total && total > 0;
                return (
                  <div className="text-xs">
                    <span className={`inline-flex items-center gap-1 font-semibold ${isAll ? "text-green-400" : checkedIn > 0 ? "text-amber-400" : "text-[var(--fg-subtle)]"}`}>
                      <CheckCircle2 className="size-3" /> {checkedIn} / {total} Checked in
                    </span>
                  </div>
                );
              },
            },
            {
              key: "__actions",
              header: "Details",
              className: "text-right",
              render: (r: any) => (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setSelectedBooking(r);
                    setDetailModalOpen(true);
                  }}
                >
                  <Eye className="size-3.5" /> View
                </Button>
              ),
            },
          ]}
        />
      </Panel>

      {/* ── Booking Details & Digital Tickets Modal ── */}
      <BookingDetailModal
        open={detailModalOpen}
        booking={selectedBooking}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedBooking(null);
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   2. BOOKING DETAIL MODAL (Tickets & Attendee breakdown)
   ═══════════════════════════════════════════════════════════════════ */

function BookingDetailModal({
  open,
  booking,
  onClose,
}: {
  open: boolean;
  booking: any;
  onClose: () => void;
}) {
  if (!booking) return null;

  const tickets: any[] = booking.tickets || [];
  const holderNames: string[] = booking.holder_names || [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={`Booking: ${booking.booking_reference}`}
      subtitle={`Event: ${booking.event_title || "Event"}`}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="flex flex-col gap-6 text-xs">
        {/* Buyer & Payment Overview */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-4">
            <span className="flex items-center gap-1.5 font-bold uppercase text-[10.5px] text-[var(--fg-muted)]">
              <Users className="size-3.5 text-[var(--brand)]" /> Customer Info
            </span>
            <p className="mt-2 text-sm font-semibold text-white">{booking.user_name || "Guest"}</p>
            <p className="mt-0.5 font-mono text-[11.5px] text-[var(--brand)]">{booking.user_email}</p>
            {booking.user_phone && (
              <p className="mt-0.5 font-mono text-[11px] text-[var(--fg-muted)]">{booking.user_phone}</p>
            )}
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-4">
            <span className="flex items-center gap-1.5 font-bold uppercase text-[10.5px] text-[var(--fg-muted)]">
              <Calendar className="size-3.5 text-[var(--brand)]" /> Booking & Event
            </span>
            <p className="mt-2 text-sm font-semibold text-white">{booking.event_title}</p>
            <p className="mt-0.5 text-[11px] text-[var(--fg-muted)]">
              Booked on: {formatDate(booking.booked_at || booking.created_at, true)}
            </p>
            <p className="mt-1 inline-block rounded bg-[var(--surface)] px-1.5 py-0.5 text-[10.5px] capitalize font-medium text-[var(--brand)]">
              Tier: {String(booking.ticket_type || "General").replace(/_/g, " ")}
            </p>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-4">
            <span className="flex items-center gap-1.5 font-bold uppercase text-[10.5px] text-[var(--fg-muted)]">
              <TrendingUp className="size-3.5 text-[var(--brand)]" /> Financials & Status
            </span>
            <p className="mt-2 text-sm font-bold text-white">{formatINR(booking.total_amount)}</p>
            <p className="mt-0.5 text-[11px] text-[var(--fg-muted)]">
              Quantity: {booking.quantity} ticket{booking.quantity > 1 ? "s" : ""}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <StatusBadge value={booking.booking_status} />
              <span className={`text-[10px] font-bold uppercase ${booking.payment_status === "PAID" || booking.payment_status === "NOT_REQUIRED" ? "text-green-400" : "text-amber-400"}`}>
                {booking.payment_status}
              </span>
            </div>
            {booking.payment_reference && (
              <p className="mt-1 font-mono text-[10px] text-[var(--fg-subtle)] truncate">
                Ref: {booking.payment_reference}
              </p>
            )}
          </div>
        </div>

        {/* Issued Digital Tickets List */}
        <div>
          <h3 className="mb-2.5 font-semibold text-sm text-white">
            Digital Tickets & Gate Status ({tickets.length ? tickets.length : booking.quantity})
          </h3>
          {tickets.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {tickets.map((t, idx) => (
                <div
                  key={t.ticket_ref || idx}
                  className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[var(--brand)]">
                        {t.ticket_ref}
                      </span>
                      <span className="text-[11px] font-medium text-white truncate">
                        {t.holder_name || holderNames[idx] || `Attendee ${idx + 1}`}
                      </span>
                    </div>
                    <span className="mt-1 block text-[11px] text-[var(--fg-muted)] truncate">
                      {t.holder_email || booking.user_email}
                    </span>
                  </div>
                  <div>
                    {t.is_checked_in ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2.5 py-1 text-[11px] font-semibold text-green-400">
                        <CheckCircle2 className="size-3" /> Checked In
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-3)] px-2.5 py-1 text-[11px] font-semibold text-[var(--fg-subtle)]">
                        <Clock className="size-3" /> Unchecked
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-4 text-center text-[var(--fg-muted)]">
              {holderNames.length > 0 ? (
                <div>
                  <p className="font-medium text-white mb-2">Registered Attendees:</p>
                  <ul className="space-y-1">
                    {holderNames.map((name, i) => (
                      <li key={i} className="font-mono text-xs text-[var(--brand)]">
                        Ticket {i + 1}: {name}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p>Digital tickets generated for {booking.quantity} attendee(s).</p>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   3. TICKET TIERS & PRICING MANAGER (Existing Tier Crud)
   ═══════════════════════════════════════════════════════════════════ */

function TicketTiersManager({
  events,
  selectedEventId,
  onSelectEvent,
}: {
  events: any[];
  selectedEventId: string;
  onSelectEvent: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Panel title="Choose an event" subtitle="Ticket tiers are configured per event">
        <div className="max-w-md">
          <label htmlFor="event-picker-tiers" className="sr-only">Event</label>
          <Select
            id="event-picker-tiers"
            value={selectedEventId}
            onChange={(e) => onSelectEvent(e.target.value)}
            options={events.map((e) => ({
              value: String(e._id),
              label: `${e.title} — ${formatDate(e.date)}`,
            }))}
          />
        </div>
      </Panel>

      {selectedEventId && (
        <CrudPage
          key={selectedEventId}
          config={{
            title: "Ticket tiers",
            singular: "Ticket tier",
            subtitle: "Price, stock and sale window for each category",
            emptyBody: "Add a tier so people can buy tickets for this event.",
            load: () => cmsApi.listTickets({ event_id: selectedEventId, limit: 100 }),
            create: (b) => cmsApi.createTicket(b),
            update: (id, b) => cmsApi.updateTicket(id, b),
            remove: (id) => cmsApi.deleteTicket(id),
            searchKeys: ["type"],
            columns: [
              {
                key: "type",
                header: "Tier",
                render: (r) => (
                  <span className="font-semibold capitalize">
                    {String(r.type || "general").replace(/_/g, " ")}
                  </span>
                ),
              },
              { key: "price", header: "Price", render: (r) => formatINR(r.price) },
              { key: "total_quantity", header: "Total", render: (r) => r.total_quantity ?? "—" },
              {
                key: "available",
                header: "Available",
                render: (r) => (
                  <span className={Number(r.available) <= 10 ? "font-semibold text-[var(--danger)]" : ""}>
                    {r.available ?? "—"}
                  </span>
                ),
              },
              {
                key: "sold",
                header: "Sold",
                render: (r) => Number(r.total_quantity ?? 0) - Number(r.available ?? 0),
              },
            ],
            fields: [
              { name: "type", label: "Tier name", required: true, half: true, placeholder: "early_bird / general / vip" },
              { name: "price", label: "Price (₹)", type: "number", required: true, half: true, defaultValue: 0 },
              { name: "total_quantity", label: "Total quantity", type: "number", required: true, half: true, defaultValue: 100 },
              { name: "available", label: "Available now", type: "number", half: true, hint: "Leave blank to match total." },
              { name: "sale_start", label: "Sale starts", type: "datetime", half: true },
              { name: "sale_end", label: "Sale ends", type: "datetime", half: true },
              { name: "display_order", label: "Display order", type: "number", half: true, defaultValue: 0 },
              { name: "is_visible", label: "Visible on booking page", type: "toggle", half: true, defaultValue: true },
            ],
            toBody: (v, editing) => {
              const body: any = {
                type: v.type,
                price: Number(v.price) || 0,
                total_quantity: Number(v.total_quantity) || 0,
                available: v.available === "" ? Number(v.total_quantity) || 0 : Number(v.available),
                sale_start: v.sale_start || null,
                sale_end: v.sale_end || null,
                is_visible: !!v.is_visible,
                display_order: Number(v.display_order) || 0,
              };
              if (!editing) body.event_id = selectedEventId;
              return body;
            },
          }}
        />
      )}
    </div>
  );
}

export default function TicketsPage() {
  return (
    <Suspense fallback={<Loading rows={5} />}>
      <TicketsContent />
    </Suspense>
  );
}
