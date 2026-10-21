"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  Ticket,
  Users,
  Crown,
  Search,
  Download,
  CheckCircle2,
  TrendingUp,
  Calendar,
  MapPin,
  RefreshCw,
  X,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { CrudPage } from "@/components/Crud";
import {
  Button,
  StatusBadge,
  Modal,
  Panel,
  DataTable,
  Select,
  Badge,
  Loading,
} from "@/components/Kit";
import { useToast } from "@/components/Providers";
import { cmsApi, safe, toRows } from "@/lib/api";
import { formatDate, formatINR, formatNumber, rowId } from "@/lib/utils";

export default function EventsPage() {
  const { push } = useToast();
  const [activeTab, setActiveTab] = useState<"directory" | "bookings">("directory");
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [bookingStatsMap, setBookingStatsMap] = useState<
    Record<string, { bookings: number; tickets: number; revenue: number }>
  >({});

  // Modal for quick attendee inspection from table
  const [modalEvent, setModalEvent] = useState<any | null>(null);

  // Load all bookings to provide live booking counts in the directory table
  const loadGlobalBookingStats = useCallback(async () => {
    try {
      const res = await safe(cmsApi.listAllBookings({ limit: 1000 }), { bookings: [] });
      const list = res?.bookings || toRows(res) || [];
      const map: Record<string, { bookings: number; tickets: number; revenue: number }> = {};
      list.forEach((b: any) => {
        const eid = String(b.event_id || "");
        if (!eid) return;
        if (!map[eid]) map[eid] = { bookings: 0, tickets: 0, revenue: 0 };
        map[eid].bookings += 1;
        map[eid].tickets += Number(b.quantity || 1);
        if (b.booking_status === "CONFIRMED" || b.payment_status === "PAID") {
          map[eid].revenue += Number(b.total_amount || 0);
        }
      });
      setBookingStatsMap(map);
    } catch {
      // Non-critical background enhancement
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    const evs = await cmsApi.listEvents({ limit: 200 });
    const rows = toRows(evs);
    setEventsList(rows);
    if (!selectedEventId && rows.length > 0) {
      setSelectedEventId(String(rowId(rows[0])));
    }
    return evs;
  }, [selectedEventId]);

  useEffect(() => {
    loadGlobalBookingStats();
  }, [loadGlobalBookingStats]);

  const togglePublish = async (row: any, reload: () => void) => {
    try {
      await cmsApi.publishEvent(rowId(row), { publish: !row.is_published });
      push("success", row.is_published ? "Event unpublished." : "Event published to the website.");
      reload();
      fetchEvents();
    } catch (e: any) {
      push("error", e?.message || "Could not change publish state.");
    }
  };

  const openEventBookingsModal = (eventRow: any) => {
    setModalEvent(eventRow);
  };

  const openEventBookingsTab = (eventRow: any) => {
    setSelectedEventId(String(rowId(eventRow)));
    setActiveTab("bookings");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── View Switcher Tabs ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Events Management</h1>
          <p className="mt-0.5 text-xs text-[var(--fg-muted)]">
            Create events, manage ticketing, and monitor attendee registrations and ticket sales.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("directory")}
            aria-pressed={activeTab === "directory"}
            className={`min-h-[38px] cursor-pointer rounded-xl px-4 text-xs font-semibold transition-all ${
              activeTab === "directory"
                ? "bg-[var(--brand)] text-[var(--on-brand)] shadow-sm"
                : "border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] hover:text-[var(--fg)]"
            }`}
          >
            All Events Directory
          </button>
          <button
            onClick={() => setActiveTab("bookings")}
            aria-pressed={activeTab === "bookings"}
            className={`min-h-[38px] cursor-pointer rounded-xl px-4 text-xs font-semibold transition-all ${
              activeTab === "bookings"
                ? "bg-[var(--brand)] text-[var(--on-brand)] shadow-sm"
                : "border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] hover:text-[var(--fg)]"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5" />
              Event Bookings & Attendees
            </span>
          </button>
        </div>
      </div>

      {activeTab === "directory" ? (
        <CrudPage
          config={{
            title: "Events",
            singular: "Event",
            subtitle: "Everything published here appears on the public website immediately.",
            emptyBody: "Create your first event to start selling tickets.",
            load: fetchEvents,
            create: (b) => cmsApi.createEvent(b),
            update: (id, b) => cmsApi.updateEvent(id, b),
            remove: (id) => cmsApi.deleteEvent(id),
            searchKeys: ["title", "venue"],
            columns: [
              {
                key: "title",
                header: "Event",
                render: (r) => (
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{r.title}</p>
                    <p className="truncate text-[11.5px] text-[var(--fg-muted)]">
                      {r.venue || "Venue TBA"}
                    </p>
                  </div>
                ),
              },
              {
                key: "date",
                header: "Date",
                render: (r) => (
                  <span className="whitespace-nowrap text-xs">
                    {formatDate(r.date)}
                    {r.time ? ` · ${r.time}` : ""}
                  </span>
                ),
              },
              {
                key: "price",
                header: "Base Price",
                render: (r) => <span className="text-xs font-mono">{formatINR(r.price)}</span>,
              },
              {
                key: "capacity",
                header: "Capacity",
                render: (r) => <span className="text-xs">{r.capacity ?? "—"}</span>,
              },
              {
                key: "bookings",
                header: "Tickets Booked",
                render: (r) => {
                  const stats = bookingStatsMap[rowId(r)];
                  const count = stats?.bookings || 0;
                  const tickets = stats?.tickets || 0;
                  return (
                    <button
                      type="button"
                      onClick={() => openEventBookingsModal(r)}
                      className="group inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-left text-[12px] font-semibold text-[var(--fg)] transition-all hover:border-[var(--brand)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]"
                      title="Click to view attendee bookings for this event"
                    >
                      <Users className="size-3 text-[var(--brand)]" />
                      <span>{count} booked</span>
                      {tickets > 0 && (
                        <span className="text-[11px] font-normal text-[var(--fg-muted)] group-hover:text-[var(--brand)]">
                          ({tickets} tix)
                        </span>
                      )}
                    </button>
                  );
                },
              },
              {
                key: "event_status",
                header: "Status",
                render: (r) => <StatusBadge value={r.event_status} />,
              },
              {
                key: "is_published",
                header: "Live",
                render: (r) => (
                  <StatusBadge value={r.is_published ? "published" : "draft"} />
                ),
              },
            ],
            rowActions: (row, { reload }) => (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => openEventBookingsModal(row)}
                  title="View attendee bookings and ticket passes"
                >
                  <Users className="size-3.5 text-[var(--brand)]" aria-hidden /> Bookings
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  href={`/vip?eventId=${rowId(row)}`}
                  title="View VIP Passes & Bookings"
                >
                  <Crown className="size-3.5 text-amber-400" aria-hidden /> VIP
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  href={`/tickets?eventId=${rowId(row)}&tab=tiers`}
                  title="Configure Ticket Tiers"
                >
                  <Ticket className="size-3.5" aria-hidden /> Tiers
                </Button>
                <Button
                  size="sm"
                  variant={row.is_published ? "secondary" : "success"}
                  onClick={() => togglePublish(row, reload)}
                >
                  {row.is_published ? (
                    <>
                      <EyeOff className="size-3.5" aria-hidden /> Unpublish
                    </>
                  ) : (
                    <>
                      <Eye className="size-3.5" aria-hidden /> Publish
                    </>
                  )}
                </Button>
              </div>
            ),
            fields: [
              { name: "title", label: "Title", required: true, placeholder: "Neon Nights Battle" },
              { name: "description", label: "Description", type: "textarea", required: true },
              {
                name: "image_url",
                label: "Cover image URL",
                type: "url",
                half: true,
                hint: "Shown on the website hero and cards.",
              },
              { name: "venue", label: "Venue", required: true, half: true },
              { name: "date", label: "Date", type: "date", required: true, half: true },
              { name: "time", label: "Time", half: true, placeholder: "7:30 PM" },
              {
                name: "price",
                label: "Base price (₹)",
                type: "number",
                half: true,
                defaultValue: 0,
              },
              {
                name: "capacity",
                label: "Capacity",
                type: "number",
                half: true,
                defaultValue: 100,
              },
              {
                name: "registration_deadline",
                label: "Registration deadline",
                type: "date",
                half: true,
              },
              {
                name: "display_order",
                label: "Display order",
                type: "number",
                half: true,
                defaultValue: 0,
              },
              {
                name: "event_status",
                label: "Status",
                type: "select",
                half: true,
                defaultValue: "upcoming",
                options: ["upcoming", "live", "completed", "cancelled"].map((v) => ({
                  value: v,
                  label: v[0].toUpperCase() + v.slice(1),
                })),
              },
              {
                name: "registration_enabled",
                label: "Registration enabled",
                type: "toggle",
                half: true,
                defaultValue: true,
              },
              {
                name: "ticket_enabled",
                label: "Ticketing enabled",
                type: "toggle",
                half: true,
                defaultValue: true,
              },
              {
                name: "is_visible",
                label: "Visible on website",
                type: "toggle",
                half: true,
                defaultValue: true,
              },
              {
                name: "is_published",
                label: "Published",
                type: "toggle",
                half: true,
                defaultValue: false,
              },
            ],
            toBody: (v) => ({
              title: v.title,
              description: v.description,
              image_url: v.image_url || null,
              date: v.date,
              time: v.time || null,
              venue: v.venue,
              capacity: Number(v.capacity) || 0,
              price: Number(v.price) || 0,
              registration_deadline: v.registration_deadline || null,
              event_status: v.event_status,
              is_published: !!v.is_published,
              is_visible: !!v.is_visible,
              registration_enabled: !!v.registration_enabled,
              ticket_enabled: !!v.ticket_enabled,
              display_order: Number(v.display_order) || 0,
            }),
          }}
        />
      ) : (
        <EventBookingsInspector
          events={eventsList}
          selectedEventId={selectedEventId}
          onSelectEvent={setSelectedEventId}
        />
      )}

      {/* ── Quick Event Bookings Modal ── */}
      {modalEvent && (
        <EventBookingsModal
          event={modalEvent}
          onClose={() => setModalEvent(null)}
          onOpenFullTab={() => {
            openEventBookingsTab(modalEvent);
            setModalEvent(null);
          }}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   2. EVENT BOOKINGS INSPECTOR (Embedded inside Events Page)
   ═══════════════════════════════════════════════════════════════════ */

function EventBookingsInspector({
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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  const loadBookings = useCallback(async () => {
    if (!selectedEventId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await cmsApi.listEventBookings(selectedEventId, { limit: 500 });
      setData(res);
    } catch (e: any) {
      setError(e?.message || "Failed to load bookings for the selected event.");
    } finally {
      setLoading(false);
    }
  }, [selectedEventId]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const currentEvent = useMemo(() => {
    return events.find((e) => String(rowId(e)) === selectedEventId) || null;
  }, [events, selectedEventId]);

  const rawBookings: any[] = data?.bookings || toRows(data) || [];
  const totalCount = data?.total ?? rawBookings.length;
  const totalTickets =
    data?.total_tickets ??
    rawBookings.reduce((s: number, b: any) => s + Number(b.quantity || 1), 0);
  const totalRevenue =
    data?.total_revenue ??
    rawBookings.reduce(
      (s: number, b: any) =>
        s +
        (b.booking_status === "CONFIRMED" || b.payment_status === "PAID"
          ? Number(b.total_amount || 0)
          : 0),
      0
    );
  const checkedInCount =
    data?.checked_in_count ??
    rawBookings.reduce((s: number, b: any) => {
      const tix = b.tickets || [];
      return s + tix.filter((t: any) => t.is_checked_in).length;
    }, 0);

  const capacity = Number(currentEvent?.capacity || 0);
  const percentFilled = capacity > 0 ? Math.min(100, Math.round((totalTickets / capacity) * 100)) : 0;

  const filteredBookings = useMemo(() => {
    return rawBookings.filter((b: any) => {
      const matchStatus =
        statusFilter === "ALL" || (b.booking_status || "").toUpperCase() === statusFilter;
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
    { value: "", label: "— Select an Event —" },
    ...events.map((e) => ({
      value: String(rowId(e)),
      label: `${e.title} · ${formatDate(e.date)}`,
    })),
  ];

  const handleExportCsv = () => {
    exportAttendeesToCsv(currentEvent?.title || "event", filteredBookings);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Event Selector & Header ── */}
      <Panel
        className="border-[var(--brand)]/30 bg-[var(--surface)]"
        title={
          <div className="flex items-center gap-2">
            <Users className="size-4 text-[var(--brand)]" />
            <span>Select Event to Inspect Headcount & Attendee Details</span>
          </div>
        }
        subtitle="Choose any event to view live ticket sales, buyer contact details, and gate check-in status."
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-[280px] max-w-md flex-1">
            <label htmlFor="event-inspect-select" className="mb-1.5 block text-xs font-semibold text-[var(--fg-muted)]">
              Choose Event
            </label>
            <Select
              id="event-inspect-select"
              value={selectedEventId}
              onChange={(e) => onSelectEvent(e.target.value)}
              options={eventOptions}
              className="h-10 text-xs font-medium"
            />
          </div>

          {currentEvent && (
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-xs">
              <div>
                <p className="text-[11px] text-[var(--fg-muted)]">Event Date</p>
                <p className="font-semibold">{formatDate(currentEvent.date)}{currentEvent.time ? ` · ${currentEvent.time}` : ""}</p>
              </div>
              <div className="h-6 w-px bg-[var(--border)]" />
              <div>
                <p className="text-[11px] text-[var(--fg-muted)]">Venue</p>
                <p className="font-semibold">{currentEvent.venue || "TBA"}</p>
              </div>
              <div className="h-6 w-px bg-[var(--border)]" />
              <div>
                <p className="text-[11px] text-[var(--fg-muted)]">Capacity</p>
                <p className="font-semibold font-mono">{capacity > 0 ? `${totalTickets} / ${capacity} (${percentFilled}%)` : "Unlimited"}</p>
              </div>
              <div className="h-6 w-px bg-[var(--border)]" />
              <div>
                <p className="text-[11px] text-[var(--fg-muted)]">Status</p>
                <StatusBadge value={currentEvent.event_status} />
              </div>
            </div>
          )}
        </div>
      </Panel>

      {!selectedEventId ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center">
          <Users className="mx-auto size-10 text-[var(--fg-subtle)]" />
          <h3 className="mt-3 text-sm font-semibold">Please select an event above</h3>
          <p className="mt-1 text-xs text-[var(--fg-muted)]">
            Pick an event from the dropdown to see who booked tickets, user contact info, and digital check-in passes.
          </p>
        </div>
      ) : (
        <>
          {/* ── Metric Stat Cards ── */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Bookings"
              value={formatNumber(totalCount)}
              hint="Individual orders placed"
              Icon={Users}
              accent
              index={0}
            />
            <StatCard
              label="Tickets Sold"
              value={formatNumber(totalTickets)}
              hint={capacity > 0 ? `${percentFilled}% of capacity filled (${capacity} total)` : "Passes issued"}
              Icon={Ticket}
              index={1}
            />
            <StatCard
              label="Ticket Revenue"
              value={formatINR(totalRevenue)}
              hint="Paid & confirmed bookings"
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
            title={
              <div className="flex items-center gap-2">
                <span>Attendee Ticket Bookings</span>
                <Badge tone="neutral">{filteredBookings.length}</Badge>
              </div>
            }
            subtitle={`Showing registered attendees and buyers for "${currentEvent?.title || "Selected Event"}"`}
            action={
              <div className="flex flex-wrap items-center gap-2.5">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { value: "ALL", label: "All Statuses" },
                    { value: "CONFIRMED", label: "Confirmed" },
                    { value: "PENDING", label: "Pending Payment" },
                    { value: "CANCELLED", label: "Cancelled" },
                  ]}
                  className="h-9 w-[140px] text-xs"
                />
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--fg-subtle)]" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, phone, email, ref..."
                    className="h-9 w-[220px] rounded-xl border border-[var(--border)] bg-[var(--surface-2)] pl-8 pr-3 text-xs outline-none focus:border-[var(--brand)]"
                  />
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleExportCsv}
                  disabled={filteredBookings.length === 0}
                  title="Export attendee list to CSV"
                >
                  <Download className="size-3.5" /> CSV
                </Button>
                <Button size="sm" variant="secondary" onClick={loadBookings} title="Refresh live data">
                  <RefreshCw className="size-3.5" />
                </Button>
              </div>
            }
          >
            <DataTable
              rows={filteredBookings}
              loading={loading}
              error={error}
              onRetry={loadBookings}
              empty={{
                title: "No bookings found for this event",
                body: search
                  ? "No attendees match your current search query."
                  : "No tickets have been booked for this event yet.",
              }}
              columns={[
                {
                  key: "booking_reference",
                  header: "Booking Ref",
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
                      <p className="font-semibold text-white">{r.user_name || "Attendee"}</p>
                      <p className="font-mono text-[11px] text-[var(--fg-muted)] truncate max-w-[200px]">
                        {r.user_email}
                      </p>
                      {r.user_phone ? (
                        <p className="text-[11px] text-[var(--fg-subtle)] font-mono">{r.user_phone}</p>
                      ) : (
                        <span className="text-[10px] text-[var(--fg-subtle)]">Phone not provided</span>
                      )}
                    </div>
                  ),
                },
                {
                  key: "ticket_type",
                  header: "Tier / Pass",
                  render: (r: any) => (
                    <div className="text-xs">
                      <span className="inline-block rounded bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-medium capitalize text-[var(--brand)]">
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
                      <span className="font-bold text-white">
                        {r.quantity} ticket{r.quantity > 1 ? "s" : ""}
                      </span>
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
                      <span
                        className={`text-[10px] font-bold uppercase ${
                          r.payment_status === "PAID" || r.payment_status === "NOT_REQUIRED"
                            ? "text-green-400"
                            : "text-amber-400"
                        }`}
                      >
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
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            isAll
                              ? "text-green-400"
                              : checkedIn > 0
                              ? "text-amber-400"
                              : "text-[var(--fg-subtle)]"
                          }`}
                        >
                          <CheckCircle2 className="size-3" /> {checkedIn} / {total} Checked in
                        </span>
                      </div>
                    );
                  },
                },
                {
                  key: "__actions",
                  header: "Passes",
                  className: "text-right",
                  render: (r: any) => (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setSelectedBooking(r);
                        setDetailModalOpen(true);
                      }}
                      title="Inspect holder names & digital tickets"
                    >
                      <Eye className="size-3.5" /> View
                    </Button>
                  ),
                },
              ]}
            />
          </Panel>
        </>
      )}

      {/* ── Booking Detail Modal ── */}
      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          open={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   3. EVENT BOOKINGS MODAL (Direct Pop-up from Table Row Action)
   ═══════════════════════════════════════════════════════════════════ */

function EventBookingsModal({
  event,
  onClose,
  onOpenFullTab,
}: {
  event: any;
  onClose: () => void;
  onOpenFullTab: () => void;
}) {
  const eventId = String(rowId(event));
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await cmsApi.listEventBookings(eventId, { limit: 500 });
      setData(res);
    } catch (e: any) {
      setError(e?.message || "Failed to load bookings for this event.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const rawBookings: any[] = data?.bookings || toRows(data) || [];
  const totalCount = data?.total ?? rawBookings.length;
  const totalTickets =
    data?.total_tickets ??
    rawBookings.reduce((s: number, b: any) => s + Number(b.quantity || 1), 0);
  const totalRevenue =
    data?.total_revenue ??
    rawBookings.reduce(
      (s: number, b: any) =>
        s +
        (b.booking_status === "CONFIRMED" || b.payment_status === "PAID"
          ? Number(b.total_amount || 0)
          : 0),
      0
    );
  const checkedInCount =
    data?.checked_in_count ??
    rawBookings.reduce((s: number, b: any) => {
      const tix = b.tickets || [];
      return s + tix.filter((t: any) => t.is_checked_in).length;
    }, 0);

  const capacity = Number(event?.capacity || 0);
  const percentFilled = capacity > 0 ? Math.min(100, Math.round((totalTickets / capacity) * 100)) : 0;

  const filteredBookings = useMemo(() => {
    return rawBookings.filter((b: any) => {
      const matchStatus =
        statusFilter === "ALL" || (b.booking_status || "").toUpperCase() === statusFilter;
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

  return (
    <Modal
      open={true}
      onClose={onClose}
      wide
      title={`Event Attendee Bookings · ${event.title}`}
      subtitle={`${formatDate(event.date)}${event.venue ? ` · ${event.venue}` : ""} · Capacity: ${capacity || "—"}`}
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={onOpenFullTab}
            title="Open in dedicated full-page inspector"
          >
            <ArrowUpRight className="size-3.5" /> Open Full Page View
          </Button>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => exportAttendeesToCsv(event.title, filteredBookings)}
              disabled={filteredBookings.length === 0}
            >
              <Download className="size-3.5" /> Export CSV
            </Button>
            <Button size="sm" variant="primary" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* ── Quick Stats Grid ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <p className="text-[11px] font-medium uppercase text-[var(--fg-muted)]">Bookings</p>
            <p className="mt-1 text-xl font-bold text-white">{formatNumber(totalCount)}</p>
            <p className="text-[10.5px] text-[var(--fg-subtle)]">Orders</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <p className="text-[11px] font-medium uppercase text-[var(--fg-muted)]">Tickets Sold</p>
            <p className="mt-1 text-xl font-bold text-[var(--brand)]">{formatNumber(totalTickets)}</p>
            <p className="text-[10.5px] text-[var(--fg-subtle)]">
              {capacity > 0 ? `${percentFilled}% capacity` : "Passes issued"}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <p className="text-[11px] font-medium uppercase text-[var(--fg-muted)]">Revenue</p>
            <p className="mt-1 text-xl font-bold text-emerald-400">{formatINR(totalRevenue)}</p>
            <p className="text-[10.5px] text-[var(--fg-subtle)]">Collected</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <p className="text-[11px] font-medium uppercase text-[var(--fg-muted)]">Checked-In</p>
            <p className="mt-1 text-xl font-bold text-amber-400">{formatNumber(checkedInCount)}</p>
            <p className="text-[10.5px] text-[var(--fg-subtle)]">At gate</p>
          </div>
        </div>

        {/* ── Search Bar & Filter ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--fg-subtle)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search attendee, phone, email, booking ID..."
              className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] pl-8 pr-3 text-xs outline-none focus:border-[var(--brand)]"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: "ALL", label: "All Statuses" },
              { value: "CONFIRMED", label: "Confirmed" },
              { value: "PENDING", label: "Pending" },
              { value: "CANCELLED", label: "Cancelled" },
            ]}
            className="h-9 w-[130px] text-xs"
          />
        </div>

        {/* ── Table of Attendee Bookings ── */}
        <DataTable
          rows={filteredBookings}
          loading={loading}
          error={error}
          onRetry={loadData}
          empty={{
            title: "No bookings found",
            body: search
              ? "No attendees match your search."
              : "No users have booked tickets for this event yet.",
          }}
          columns={[
            {
              key: "user",
              header: "Attendee",
              render: (r: any) => (
                <div className="text-xs">
                  <p className="font-semibold text-white">{r.user_name || "Guest"}</p>
                  <p className="font-mono text-[11px] text-[var(--fg-muted)] truncate max-w-[170px]">
                    {r.user_email}
                  </p>
                  {r.user_phone && (
                    <p className="font-mono text-[10.5px] text-[var(--fg-subtle)]">{r.user_phone}</p>
                  )}
                </div>
              ),
            },
            {
              key: "tier",
              header: "Tier / Quantity",
              render: (r: any) => (
                <div className="text-xs">
                  <span className="font-semibold text-white capitalize">
                    {String(r.ticket_type || "General").replace(/_/g, " ")}
                  </span>
                  <span className="block font-mono text-[11px] text-[var(--fg-muted)]">
                    {r.quantity} ticket{r.quantity > 1 ? "s" : ""} · {formatINR(r.total_amount)}
                  </span>
                </div>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (r: any) => (
                <div className="flex flex-col gap-1">
                  <StatusBadge value={r.booking_status} />
                  <span
                    className={`text-[9.5px] font-bold uppercase ${
                      r.payment_status === "PAID" || r.payment_status === "NOT_REQUIRED"
                        ? "text-green-400"
                        : "text-amber-400"
                    }`}
                  >
                    {r.payment_status}
                  </span>
                </div>
              ),
            },
            {
              key: "ref",
              header: "Ref / Date",
              render: (r: any) => (
                <div className="text-xs font-mono">
                  <p className="font-bold text-[var(--brand)]">{r.booking_reference}</p>
                  <p className="text-[10px] text-[var(--fg-subtle)]">
                    {formatDate(r.booked_at || r.created_at, true)}
                  </p>
                </div>
              ),
            },
            {
              key: "action",
              header: "Pass",
              className: "text-right",
              render: (r: any) => (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setSelectedBooking(r)}
                  title="View digital pass details"
                >
                  <Eye className="size-3.5" />
                </Button>
              ),
            },
          ]}
        />
      </div>

      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          open={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )}
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   4. STAT CARD COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

function StatCard({
  label,
  value,
  hint,
  Icon,
  accent,
  index = 0,
}: {
  label: string;
  value: string | number;
  hint?: string;
  Icon: any;
  accent?: boolean;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`card relative overflow-hidden p-5 ${
        accent ? "border-[var(--brand)]/40 bg-[var(--brand-soft)]/20" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11.5px] font-medium uppercase tracking-wider text-[var(--fg-muted)]">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-white">{value}</p>
          {hint && <p className="mt-1 text-[11.5px] text-[var(--fg-subtle)]">{hint}</p>}
        </div>
        <div
          className={`grid size-10 shrink-0 place-items-center rounded-xl ${
            accent
              ? "bg-[var(--brand)] text-[var(--on-brand)]"
              : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-muted)]"
          }`}
        >
          <Icon className="size-5" />
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   5. BOOKING DETAIL MODAL
   ═══════════════════════════════════════════════════════════════════ */

function BookingDetailModal({
  booking,
  open,
  onClose,
}: {
  booking: any;
  open: boolean;
  onClose: () => void;
}) {
  if (!booking) return null;

  const tickets: any[] = booking.tickets || [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={`Ticket Pass: ${booking.booking_reference || "Booking"}`}
      subtitle={`Booked on ${formatDate(booking.booked_at || booking.created_at, true)}`}
      footer={
        <Button size="sm" variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="flex flex-col gap-6 text-xs">
        {/* Summary grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
              Buyer / Contact
            </h4>
            <p className="mt-2 text-sm font-bold text-white">{booking.user_name || "Attendee"}</p>
            <p className="font-mono text-xs text-[var(--fg-muted)]">{booking.user_email}</p>
            {booking.user_phone && (
              <p className="mt-0.5 font-mono text-xs text-[var(--fg-subtle)]">{booking.user_phone}</p>
            )}
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
              Event & Tier
            </h4>
            <p className="mt-2 text-sm font-bold text-white">{booking.event_title || "Event"}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded bg-[var(--brand-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--brand)]">
                {String(booking.ticket_type || "General").replace(/_/g, " ")}
              </span>
              <span className="font-mono text-[var(--fg-muted)]">
                {booking.quantity} ticket{booking.quantity > 1 ? "s" : ""}
              </span>
            </div>
            <p className="mt-1 font-mono text-xs font-bold text-emerald-400">
              Total: {formatINR(booking.total_amount)}
            </p>
          </div>
        </div>

        {/* Issued Digital Tickets List */}
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
            Individual Digital Tickets ({tickets.length})
          </h4>
          <div className="mt-3 flex flex-col gap-2.5">
            {tickets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border)] p-4 text-center text-[var(--fg-subtle)]">
                No issued ticket objects generated yet.
              </div>
            ) : (
              tickets.map((t: any, idx: number) => (
                <div
                  key={t.ticket_ref || idx}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid size-8 place-items-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)] font-mono text-xs font-bold">
                      #{idx + 1}
                    </div>
                    <div>
                      <p className="font-mono font-bold text-white">{t.ticket_ref}</p>
                      <p className="text-[11px] text-[var(--fg-muted)]">
                        Holder: <span className="text-white">{t.holder_name || booking.user_name || "Guest"}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {t.is_checked_in ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
                        <CheckCircle2 className="size-3" /> Checked-In
                        {t.check_in_time ? ` (${formatDate(t.check_in_time, true)})` : ""}
                      </span>
                    ) : (
                      <span className="rounded-full bg-[var(--surface)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--fg-subtle)]">
                        Not Checked-In
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   6. CSV EXPORT UTILITY
   ═══════════════════════════════════════════════════════════════════ */

function exportAttendeesToCsv(eventTitle: string, bookings: any[]) {
  const headers = [
    "Booking Reference",
    "Attendee Name",
    "Email",
    "Phone",
    "Ticket Tier",
    "Quantity",
    "Total Amount (INR)",
    "Payment Status",
    "Booking Status",
    "Booked Date",
    "Digital Passes",
  ];

  const rows = bookings.map((b) => [
    `"${b.booking_reference || rowId(b) || ""}"`,
    `"${(b.user_name || "Attendee").replace(/"/g, '""')}"`,
    `"${(b.user_email || "").replace(/"/g, '""')}"`,
    `"${(b.user_phone || "").replace(/"/g, '""')}"`,
    `"${(b.ticket_type || "General").replace(/"/g, '""')}"`,
    b.quantity || 1,
    b.total_amount || 0,
    `"${b.payment_status || ""}"`,
    `"${b.booking_status || ""}"`,
    `"${b.booked_at ? new Date(b.booked_at).toLocaleString() : ""}"`,
    `"${(b.tickets || [])
      .map((t: any) => `${t.ticket_ref} (${t.is_checked_in ? "Checked-In" : "Pending"})`)
      .join("; ")}"`,
  ]);

  const csvContent =
    "data:text/csv;charset=utf-8," +
    [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute(
    "download",
    `${(eventTitle || "event").toLowerCase().replace(/[^a-z0-9]/g, "_")}_attendees.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

