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
  Armchair,
  Plus,
  Trash2,
  Layers,
  Share2,
  Check,
  Copy,
  ExternalLink,
  MessageCircle,
  Send,
  Upload,
  Loader2,
  ImageIcon,
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
  Input,
} from "@/components/Kit";
import { useToast } from "@/components/Providers";
import { cmsApi, safe, toRows } from "@/lib/api";
import { cn, formatDate, formatINR, formatNumber, rowId } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════
   1. MAIN EVENTS MANAGEMENT DASHBOARD
   ═══════════════════════════════════════════════════════════════════ */

export default function EventsPage() {
  const { push } = useToast();
  const [activeTab, setActiveTab] = useState<"directory" | "bookings">("directory");
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [bookingStatsMap, setBookingStatsMap] = useState<
    Record<string, { bookings: number; tickets: number; revenue: number }>
  >({});

  // Modals
  const [modalEvent, setModalEvent] = useState<any | null>(null);
  const [shareEvent, setShareEvent] = useState<any | null>(null);

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
    // Sort so most recently updated or created events are guaranteed at the top
    rows.sort((a: any, b: any) => {
      const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
      const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
      return timeB - timeA;
    });
    setEventsList(rows);
    if (!selectedEventId && rows.length > 0) {
      setSelectedEventId(String(rowId(rows[0])));
    }
    return rows;
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
                : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-muted)] hover:text-white"
            }`}
          >
            All Events Directory
          </button>
          <button
            onClick={() => setActiveTab("bookings")}
            aria-pressed={activeTab === "bookings"}
            className={`min-h-[38px] cursor-pointer rounded-xl px-4 text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "bookings"
                ? "bg-[var(--brand)] text-[var(--on-brand)] shadow-sm"
                : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-muted)] hover:text-white"
            }`}
          >
            <Users className="size-3.5" />
            <span>Event Bookings &amp; Attendees</span>
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
                  <div className="flex items-center gap-3">
                    {r.image_url || r.card_image_url ? (
                      <img
                        src={r.image_url || r.card_image_url}
                        alt=""
                        className="size-11 rounded-xl object-cover border border-[var(--border)] bg-[var(--surface-2)] shrink-0"
                      />
                    ) : (
                      <div className="grid size-11 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-subtle)] shrink-0">
                        <Calendar className="size-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs truncate max-w-[260px]">{r.title}</span>
                        {r.updated_at && (
                          <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-sky-400 border border-sky-500/20" title={`Last updated: ${new Date(r.updated_at).toLocaleString()}`}>
                            Updated
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-[10px] text-[var(--fg-subtle)]">ID: {rowId(r)}</p>
                      <p className="text-[11px] text-[var(--fg-muted)] truncate max-w-[260px]">
                        {r.venue || "No venue"}
                      </p>
                      {/* Seating Categories pill badges */}
                      {Array.isArray(r.categories) && r.categories.length > 0 && (
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          {r.categories.slice(0, 3).map((c: any, i: number) => (
                            <span
                              key={i}
                              className="rounded bg-[var(--surface-2)] px-1.5 py-0.2 text-[9.5px] font-mono text-[var(--brand)] border border-[var(--border)]"
                            >
                              {c.name}: {c.price === 0 ? "Free" : `₹${c.price}`}
                            </span>
                          ))}
                          {r.categories.length > 3 && (
                            <span className="text-[9.5px] font-mono text-[var(--fg-subtle)]">
                              +{r.categories.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ),
              },
              {
                key: "date",
                header: "Date",
                render: (r) => (
                  <span className="text-xs font-medium">
                    {formatDate(r.date)}
                    {r.time ? ` · ${r.time}` : ""}
                  </span>
                ),
              },
              {
                key: "price",
                header: "Base Price",
                render: (r) => (
                  <span className="font-mono text-xs font-semibold text-white">
                    {formatINR(r.price)}
                  </span>
                ),
              },
              {
                key: "capacity",
                header: "Capacity",
                render: (r) => (
                  <span className="font-mono text-xs text-[var(--fg-muted)]">
                    {formatNumber(r.capacity || 0)}
                  </span>
                ),
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
                      onClick={() => openEventBookingsTab(r)}
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
                  variant="ghost"
                  href={`https://upgradetalentsindia.in/events/${rowId(row)}/book`}
                  target="_blank"
                  title="Open live ticket booking on website"
                >
                  <ArrowUpRight className="size-3.5 text-sky-400" aria-hidden /> Live
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShareEvent(row)}
                  title="Share Booking Links (WhatsApp, Telegram, Direct)"
                >
                  <Share2 className="size-3.5 text-sky-400" aria-hidden /> Share
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => openEventBookingsModal(row)}
                  title="View attendee bookings and live gate attendance"
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
              { name: "title", label: "Title", required: true, placeholder: "Grand Gala Festival" },
              { name: "description", label: "Description", type: "textarea", required: true },
              {
                name: "image_url",
                label: "Event Poster / Card Image (Floating)",
                type: "custom",
                half: true,
                hint: "Vertical floating poster card shown on the left of the event page.",
                render: ({ value, onChange }) => (
                  <ImageUploadField
                    label="Poster / Card Image"
                    aspectRatioLabel="Poster Card"
                    aspectClass="aspect-[3/4] w-28"
                    value={value || ""}
                    onChange={onChange}
                    onUpload={(f) => cmsApi.uploadBannerImage(f, "16:9")}
                  />
                ),
              },
              {
                name: "banner_url",
                label: "Hero Backdrop Banner Image (Cinematic)",
                type: "custom",
                half: true,
                hint: "Cinematic full-width background banner shown behind the stage arena.",
                render: ({ value, onChange }) => (
                  <ImageUploadField
                    label="Hero Backdrop Banner"
                    aspectRatioLabel="16:9 Backdrop"
                    aspectClass="aspect-video w-36"
                    value={value || ""}
                    onChange={onChange}
                    onUpload={(f) => cmsApi.uploadBannerImage(f, "16:9")}
                  />
                ),
              },
              { name: "venue", label: "Venue", required: true, half: true },
              { name: "date", label: "Date", type: "date", required: true, half: true },
              { name: "time", label: "Time (IST)", half: true, placeholder: "7:30 PM IST" },
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
              {
                name: "categories",
                label: "Seating Categories & Ticket Tiers (BookMyShow Style)",
                type: "custom",
                hint: "Configure tiered seating (e.g. Platinum Front Row, Gold Center Arena, Silver Balcony). Ticket tiers automatically sync with matching prices and capacities.",
                render: ({ value, onChange }) => (
                  <EventCategoriesEditor value={value} onChange={onChange} />
                ),
              },
            ],
            toForm: (r: any) => ({
              ...r,
              image_url: r.image_url || r.card_image_url || "",
              banner_url: r.banner_url || r.banner_image_url || "",
              categories: Array.isArray(r.categories) ? r.categories : [],
            }),
            toBody: (v) => ({
              title: v.title,
              description: v.description,
              image_url: v.image_url ? String(v.image_url).trim() : null,
              card_image_url: v.image_url ? String(v.image_url).trim() : null,
              banner_url: v.banner_url ? String(v.banner_url).trim() : null,
              banner_image_url: v.banner_url ? String(v.banner_url).trim() : null,
              date: v.date,
              time: v.time || null,
              venue: v.venue,
              capacity: Number(v.capacity) || 0,
              price: Number(v.price) || 0,
              categories: Array.isArray(v.categories)
                ? v.categories
                    .map((c: any) => ({
                      name: String(c.name || "").trim(),
                      price: Number(c.price || 0),
                      capacity: c.capacity ? Number(c.capacity) : null,
                      description: c.description ? String(c.description).trim() : null,
                    }))
                    .filter((c: any) => c.name)
                : [],
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
            const eid = String(rowId(modalEvent));
            setModalEvent(null);
            setSelectedEventId(eid);
            setActiveTab("bookings");
          }}
        />
      )}

      {/* ── Smart Share Links Modal ── */}
      {shareEvent && (
        <EventShareModal
          event={shareEvent}
          onClose={() => setShareEvent(null)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   2. EVENT BOOKINGS & ATTENDANCE INSPECTOR (Option B: Live Dashboard)
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
  const { push } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [attendanceFilter, setAttendanceFilter] = useState<"ALL" | "PRESENT" | "ABSENT">("ALL");
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

  // Present and Absent calculations
  const presentCount = rawBookings.filter(
    (b: any) => Boolean(b.is_present || b.attendance_status === "PRESENT" || (b.tickets || []).some((t: any) => t.is_checked_in))
  ).length;
  const absentCount = Math.max(0, totalCount - presentCount);
  const turnoutPercent = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  const capacity = Number(currentEvent?.capacity || 0);
  const percentFilled = capacity > 0 ? Math.min(100, Math.round((totalTickets / capacity) * 100)) : 0;

  // Single-click manual Tick (✓) attendance handler
  const handleToggleAttendance = async (booking: any) => {
    if (!selectedEventId) return;
    const bid = booking.booking_id || booking.registration_id || rowId(booking);
    const isCurrentlyPresent = Boolean(
      booking.is_present || booking.attendance_status === "PRESENT" || (booking.tickets || []).some((t: any) => t.is_checked_in)
    );
    const newStatus = !isCurrentlyPresent;

    // Optimistic UI update
    setData((prev: any) => {
      if (!prev) return prev;
      const bList = (prev.bookings || []).map((b: any) => {
        const itemBid = b.booking_id || b.registration_id || rowId(b);
        if (itemBid === bid || b.booking_reference === booking.booking_reference) {
          return {
            ...b,
            is_present: newStatus,
            attendance_status: newStatus ? "PRESENT" : "ABSENT",
            attended_at: newStatus ? new Date().toISOString() : null,
            tickets: (b.tickets || []).map((t: any) => ({ ...t, is_checked_in: newStatus })),
          };
        }
        return b;
      });
      return { ...prev, bookings: bList };
    });

    try {
      await cmsApi.updateEventAttendance(selectedEventId, bid, newStatus);
      push("success", `${booking.user_name || "Attendee"} marked ${newStatus ? "PRESENT (✓)" : "ABSENT"}.`);
    } catch (e: any) {
      push("error", e?.message || "Failed to update attendance.");
      loadBookings();
    }
  };

  // Bulk Check-in handler
  const handleBulkAttendance = async () => {
    if (!selectedEventId || filteredBookings.length === 0) return;
    const ids = filteredBookings
      .map((b) => b.booking_id || b.registration_id || rowId(b))
      .filter(Boolean);
    if (!window.confirm(`Mark all ${ids.length} visible attendee(s) as PRESENT at the venue?`)) return;

    try {
      await cmsApi.bulkUpdateEventAttendance(selectedEventId, ids, true);
      push("success", `Marked ${ids.length} attendees PRESENT.`);
      loadBookings();
    } catch (e: any) {
      push("error", e?.message || "Bulk check-in failed.");
    }
  };

  const filteredBookings = useMemo(() => {
    return rawBookings.filter((b: any) => {
      const matchStatus =
        statusFilter === "ALL" || (b.booking_status || "").toUpperCase() === statusFilter;
      
      const isP = Boolean(
        b.is_present || b.attendance_status === "PRESENT" || (b.tickets || []).some((t: any) => t.is_checked_in)
      );
      let matchAtt = true;
      if (attendanceFilter === "PRESENT") matchAtt = isP;
      if (attendanceFilter === "ABSENT") matchAtt = !isP;

      const s = search.toLowerCase().trim();
      const matchSearch =
        !s ||
        (b.booking_reference || "").toLowerCase().includes(s) ||
        (b.user_email || "").toLowerCase().includes(s) ||
        (b.user_name || "").toLowerCase().includes(s) ||
        (b.user_phone || "").toLowerCase().includes(s) ||
        (b.holder_names || []).some((h: string) => h.toLowerCase().includes(s));
      return matchStatus && matchAtt && matchSearch;
    });
  }, [rawBookings, statusFilter, attendanceFilter, search]);

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

  const handleExportFinalPresent = () => {
    exportFinalPresentListToCsv(currentEvent?.title || "event", rawBookings);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Event Selector & Header ── */}
      <Panel
        className="border-[var(--brand)]/30 bg-[var(--surface)]"
        title={
          <div className="flex items-center gap-2">
            <Users className="size-4 text-[var(--brand)]" />
            <span>Select Event for Live Gate Attendance &amp; Headcount</span>
          </div>
        }
        subtitle="Live attendee roster with single-click manual tick (✓) presence verification, overbooking locks, and final export."
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
            Pick an event from the dropdown to see who booked tickets, user contact info, and mark live attendance.
          </p>
        </div>
      ) : (
        <>
          {/* ── Metric Stat Cards ── */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Registered"
              value={formatNumber(totalCount)}
              hint={`${totalTickets} passes issued across tiers`}
              Icon={Users}
              accent
              index={0}
            />
            <StatCard
              label="Present (Checked-In)"
              value={formatNumber(presentCount)}
              hint={`${turnoutPercent}% live turn-out at venue`}
              Icon={CheckCircle2}
              index={1}
            />
            <StatCard
              label="Absent (Pending Gate)"
              value={formatNumber(absentCount)}
              hint="Awaiting arrival at entrance"
              Icon={TrendingUp}
              index={2}
            />
            <StatCard
              label="Ticket Collections"
              value={formatINR(totalRevenue)}
              hint="Paid & confirmed bookings"
              Icon={Ticket}
              index={3}
            />
          </div>

          {/* ── Attendance Filter Tabs ── */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAttendanceFilter("ALL")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  attendanceFilter === "ALL"
                    ? "bg-[var(--brand)] text-[var(--on-brand)]"
                    : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-muted)] hover:text-white"
                }`}
              >
                All Attendees ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setAttendanceFilter("PRESENT")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  attendanceFilter === "PRESENT"
                    ? "bg-emerald-500 text-black font-bold shadow-sm"
                    : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                }`}
              >
                <Check className="size-3" /> Present ({presentCount})
              </button>
              <button
                type="button"
                onClick={() => setAttendanceFilter("ABSENT")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  attendanceFilter === "ABSENT"
                    ? "bg-amber-500 text-black font-bold shadow-sm"
                    : "border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                }`}
              >
                Absent ({absentCount})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleBulkAttendance}
                disabled={filteredBookings.length === 0}
                title="Mark all currently listed attendees as PRESENT"
              >
                <Check className="size-3.5 text-emerald-400" /> Bulk Check-In
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleExportFinalPresent}
                disabled={presentCount === 0}
                title="Export only present attendees for official closing records and certificates"
                className="border-emerald-500/40 text-emerald-400"
              >
                <Download className="size-3.5" /> Final Present List (CSV)
              </Button>
            </div>
          </div>

          {/* ── Main Bookings Panel ── */}
          <Panel
            title={
              <div className="flex items-center gap-2">
                <span>Attendee Ticket Roster &amp; Gate Verification</span>
                <Badge tone="neutral">{filteredBookings.length}</Badge>
              </div>
            }
            subtitle={`Showing registered attendees for "${currentEvent?.title || "Selected Event"}"`}
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
                  className="h-9 w-[130px] text-xs"
                />
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--fg-subtle)]" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, phone, ref..."
                    className="h-9 w-[200px] rounded-xl border border-[var(--border)] bg-[var(--surface-2)] pl-8 pr-3 text-xs outline-none focus:border-[var(--brand)]"
                  />
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleExportCsv}
                  disabled={filteredBookings.length === 0}
                  title="Export all attendee rows to CSV"
                >
                  <Download className="size-3.5" /> All CSV
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
                title: "No attendees found",
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
                      <p className="font-mono text-[11px] text-[var(--fg-muted)] truncate max-w-[180px]">
                        {r.user_email}
                      </p>
                      {r.user_phone ? (
                        <p className="text-[11px] text-[var(--fg-subtle)] font-mono">{r.user_phone}</p>
                      ) : (
                        <span className="text-[10px] text-[var(--fg-subtle)]">No phone</span>
                      )}
                    </div>
                  ),
                },
                {
                  key: "ticket_type",
                  header: "Tier / Pass",
                  render: (r: any) => (
                    <div className="text-xs">
                      <span className="inline-block rounded bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-medium capitalize text-[var(--brand)] border border-[var(--border)]">
                        {String(r.ticket_type || r.category || "general").replace(/_/g, " ")}
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
                            ? "text-emerald-400"
                            : r.payment_method === "CASH"
                            ? "text-amber-400"
                            : "text-amber-400"
                        }`}
                      >
                        {r.payment_method === "CASH" ? "CASH PENDING" : r.payment_status}
                      </span>
                    </div>
                  ),
                },
                {
                  key: "attendance",
                  header: "Gate Attendance (✓)",
                  render: (r: any) => {
                    const isPresent = Boolean(
                      r.is_present || r.attendance_status === "PRESENT" || (r.tickets || []).some((t: any) => t.is_checked_in)
                    );
                    return (
                      <div className="flex items-center gap-2">
                        {isPresent ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                              <Check className="size-3 stroke-[3]" /> PRESENT
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleAttendance(r)}
                              className="text-[10px] text-[var(--fg-subtle)] hover:text-red-400 transition-colors underline"
                              title="Revert check-in to absent"
                            >
                              Untick
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleAttendance(r)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-400 hover:bg-emerald-500 hover:text-black transition-all shadow-sm"
                            title="Mark attendee as PRESENT (✓)"
                          >
                            <Check className="size-3.5 stroke-[2.5]" /> Mark Present
                          </button>
                        )}
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
  const { push } = useToast();
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

  const presentCount = rawBookings.filter(
    (b: any) => Boolean(b.is_present || b.attendance_status === "PRESENT" || (b.tickets || []).some((t: any) => t.is_checked_in))
  ).length;

  const handleToggleAttendance = async (booking: any) => {
    const bid = booking.booking_id || booking.registration_id || rowId(booking);
    const isCurrentlyPresent = Boolean(
      booking.is_present || booking.attendance_status === "PRESENT" || (booking.tickets || []).some((t: any) => t.is_checked_in)
    );
    const newStatus = !isCurrentlyPresent;

    setData((prev: any) => {
      if (!prev) return prev;
      const bList = (prev.bookings || []).map((b: any) => {
        const itemBid = b.booking_id || b.registration_id || rowId(b);
        if (itemBid === bid || b.booking_reference === booking.booking_reference) {
          return {
            ...b,
            is_present: newStatus,
            attendance_status: newStatus ? "PRESENT" : "ABSENT",
            attended_at: newStatus ? new Date().toISOString() : null,
            tickets: (b.tickets || []).map((t: any) => ({ ...t, is_checked_in: newStatus })),
          };
        }
        return b;
      });
      return { ...prev, bookings: bList };
    });

    try {
      await cmsApi.updateEventAttendance(eventId, bid, newStatus);
      push("success", `${booking.user_name || "Attendee"} marked ${newStatus ? "PRESENT (✓)" : "ABSENT"}.`);
    } catch (e: any) {
      push("error", e?.message || "Failed to update attendance.");
      loadData();
    }
  };

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
        (b.user_phone || "").toLowerCase().includes(s);
      return matchStatus && matchSearch;
    });
  }, [rawBookings, statusFilter, search]);

  return (
    <Modal
      open={!!event}
      onClose={onClose}
      wide
      title={`Live Attendance & Bookings: ${event.title}`}
      subtitle={`Scheduled for ${formatDate(event.date)}${event.time ? ` at ${event.time}` : ""} · ${event.venue || "Venue TBA"}`}
      footer={
        <div className="flex w-full items-center justify-between">
          <Button size="sm" variant="secondary" onClick={onOpenFullTab}>
            Open in Full Dedicated Attendance Tab →
          </Button>
          <Button size="sm" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5 text-xs">
        {/* Quick summary stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <span className="text-[11px] text-[var(--fg-muted)] uppercase">Registered</span>
            <p className="mt-1 text-lg font-bold text-white">{totalCount}</p>
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
            <span className="text-[11px] text-emerald-400 uppercase font-semibold">Present (✓)</span>
            <p className="mt-1 text-lg font-bold text-emerald-400">{presentCount}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <span className="text-[11px] text-[var(--fg-muted)] uppercase">Tickets Issued</span>
            <p className="mt-1 text-lg font-bold text-white">{totalTickets}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <span className="text-[11px] text-[var(--fg-muted)] uppercase">Gross Revenue</span>
            <p className="mt-1 text-lg font-bold font-mono text-emerald-400">{formatINR(totalRevenue)}</p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--fg-subtle)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search attendee by name, email, phone, ref..."
              className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] pl-8 pr-3 text-xs outline-none focus:border-[var(--brand)]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => exportFinalPresentListToCsv(event?.title || "event", rawBookings)}
              disabled={presentCount === 0}
              className="text-emerald-400 border-emerald-500/30"
            >
              <Download className="size-3 text-emerald-400" /> Export Present (CSV)
            </Button>
            <Button size="sm" variant="secondary" onClick={loadData}>
              <RefreshCw className="size-3" />
            </Button>
          </div>
        </div>

        {/* Attendance table */}
        <div className="max-h-[380px] overflow-y-auto rounded-xl border border-[var(--border)]">
          <DataTable
            rows={filteredBookings}
            loading={loading}
            error={error}
            onRetry={loadData}
            columns={[
              {
                key: "booking_reference",
                header: "Booking Ref",
                render: (r: any) => (
                  <div>
                    <span className="font-mono text-xs font-bold text-[var(--brand)]">
                      {r.booking_reference || rowId(r)}
                    </span>
                    <span className="block text-[10px] text-[var(--fg-subtle)]">
                      {formatDate(r.booked_at || r.created_at, true)}
                    </span>
                  </div>
                ),
              },
              {
                key: "user",
                header: "Attendee",
                render: (r: any) => (
                  <div className="text-xs">
                    <p className="font-semibold text-white">{r.user_name || "Attendee"}</p>
                    <p className="font-mono text-[10.5px] text-[var(--fg-muted)] truncate max-w-[150px]">
                      {r.user_email}
                    </p>
                  </div>
                ),
              },
              {
                key: "ticket_type",
                header: "Pass Tier",
                render: (r: any) => (
                  <span className="rounded bg-[var(--surface-2)] px-2 py-0.5 text-[10.5px] font-medium capitalize text-[var(--brand)]">
                    {String(r.ticket_type || r.category || "General").replace(/_/g, " ")}
                  </span>
                ),
              },
              {
                key: "quantity",
                header: "Qty / Total",
                render: (r: any) => (
                  <div className="text-xs">
                    <span className="font-bold">{r.quantity} tix</span>
                    <span className="block font-mono text-[10px] text-[var(--fg-muted)]">
                      {formatINR(r.total_amount)}
                    </span>
                  </div>
                ),
              },
              {
                key: "attendance",
                header: "Attendance (✓)",
                render: (r: any) => {
                  const isPresent = Boolean(
                    r.is_present || r.attendance_status === "PRESENT" || (r.tickets || []).some((t: any) => t.is_checked_in)
                  );
                  return isPresent ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10.5px] font-bold text-emerald-400">
                      <Check className="size-3 stroke-[3]" /> PRESENT
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleAttendance(r)}
                      className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-bold text-emerald-400 hover:bg-emerald-500 hover:text-black transition-all"
                    >
                      <Check className="size-3" /> Mark Present
                    </button>
                  );
                },
              },
              {
                key: "__actions",
                header: "",
                render: (r: any) => (
                  <button
                    type="button"
                    onClick={() => setSelectedBooking(r)}
                    className="text-[11px] font-semibold text-[var(--brand)] hover:underline"
                  >
                    Details
                  </button>
                ),
              },
            ]}
          />
        </div>
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
   4. SMART SHARE MODAL (WhatsApp, Telegram, Direct Link)
   ═══════════════════════════════════════════════════════════════════ */

function EventShareModal({
  event,
  onClose,
}: {
  event: any;
  onClose: () => void;
}) {
  const { push } = useToast();
  if (!event) return null;

  const eventId = String(rowId(event));
  const directBookingUrl = `https://upgradetalentsindia.in/events/${eventId}/book`;
  const shareRedirectUrl = `https://event-management-backend-nijj.onrender.com/api/v1/share/event/${eventId}`;
  const shareText = `🎟️ Join '${event.title}' at ${event.venue || "Upgrade Talents"}! Book your tickets directly: ${directBookingUrl}`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    push("success", `${label} copied to clipboard!`);
  };

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(directBookingUrl)}&text=${encodeURIComponent(shareText)}`;

  return (
    <Modal
      open={!!event}
      onClose={onClose}
      title="Share Event & Smart Direct Booking Links"
      subtitle={`Instant booking links for "${event.title}"`}
      footer={
        <Button size="sm" variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="flex flex-col gap-4 text-xs">
        {/* Direct Booking Link */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-white">Direct Ticket Booking URL</span>
            <span className="text-[10px] text-[var(--brand)] font-bold uppercase">Direct Deep Link</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={directBookingUrl}
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 font-mono text-[11px] text-[var(--fg-muted)] outline-none"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => copyToClipboard(directBookingUrl, "Booking Link")}
            >
              <Copy className="size-3.5" /> Copy
            </Button>
            <Button
              size="sm"
              variant="ghost"
              href={directBookingUrl}
              target="_blank"
            >
              <ExternalLink className="size-3.5" />
            </Button>
          </div>
          <p className="mt-1.5 text-[11px] text-[var(--fg-subtle)]">
            Users clicking this link bypass the overview and land directly on the BookMyShow visual seating arena.
          </p>
        </div>

        {/* Social Share Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all text-xs"
          >
            <MessageCircle className="size-4" /> Share on WhatsApp
          </a>

          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2.5 font-bold text-sky-400 hover:bg-sky-500/20 transition-all text-xs"
          >
            <Send className="size-4" /> Share on Telegram
          </a>
        </div>

        {/* Universal Backend Redirect */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-[var(--fg-muted)]">API Universal Redirect</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copyToClipboard(shareRedirectUrl, "API Redirect URL")}
            >
              <Copy className="size-3" /> Copy
            </Button>
          </div>
          <p className="font-mono text-[10.5px] text-[var(--fg-subtle)] truncate">
            {shareRedirectUrl}
          </p>
        </div>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   5. IMAGE UPLOAD FIELD COMPONENT (16:9 & 9:16)
   ═══════════════════════════════════════════════════════════════════ */

function ImageUploadField({
  label,
  aspectRatioLabel,
  aspectClass,
  value,
  onChange,
  onUpload,
}: {
  label: string;
  aspectRatioLabel: string;
  aspectClass: string;
  value: string;
  onChange: (url: string) => void;
  onUpload: (file: File) => Promise<any>;
}) {
  const [uploading, setUploading] = useState(false);
  const { push } = useToast();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await onUpload(file);
      const url = res?.url || res?.card_image_url || res?.banner_image_url || res?.banner_url || res?.image_url;
      if (url) {
        onChange(url);
        push("success", `${label} uploaded successfully.`);
      } else {
        push("error", "No URL returned from upload.");
      }
    } catch (err: any) {
      push("error", err?.message || "Upload failed.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-[var(--fg)]">
          {label} <span className="font-bold text-[var(--brand)]">({aspectRatioLabel})</span>
        </span>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-[11px] font-semibold text-red-400 hover:underline"
          >
            Clear image
          </button>
        )}
      </div>

      <div className="flex items-start gap-3">
        {value ? (
          <div className={cn("relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)] shrink-0 shadow-sm", aspectClass)}>
            <img src={value} alt="" className="size-full object-cover" />
          </div>
        ) : (
          <div className={cn("grid place-items-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] text-[11px] text-[var(--fg-subtle)] shrink-0", aspectClass)}>
            <ImageIcon className="size-5 opacity-40" />
          </div>
        )}

        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--surface-2)] transition-colors shadow-sm">
            {uploading ? (
              <>
                <Loader2 className="size-3.5 animate-spin text-[var(--brand)]" /> Uploading to Cloud…
              </>
            ) : (
              <>
                <Upload className="size-3.5 text-[var(--brand)]" /> Choose &amp; Upload Image
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={handleFile}
            />
          </label>

          <Input
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Or paste direct image URL (https://…)"
            className="text-xs"
          />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   6. STAT CARD COMPONENT
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
   7. BOOKING DETAIL MODAL
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
              Event &amp; Tier
            </h4>
            <p className="mt-2 text-sm font-bold text-white">{booking.event_title || "Event"}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded bg-[var(--brand-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--brand)]">
                {String(booking.ticket_type || booking.category || "General").replace(/_/g, " ")}
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
                No individual ticket tokens generated yet.
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
   8. CSV EXPORT UTILITIES
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
    `"${(b.ticket_type || b.category || "General").replace(/"/g, '""')}"`,
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
    `${(eventTitle || "event").toLowerCase().replace(/[^a-z0-9]/g, "_")}_all_attendees.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportFinalPresentListToCsv(eventTitle: string, attendees: any[]) {
  const presentOnly = attendees.filter((a) =>
    Boolean(a.is_present || a.attendance_status === "PRESENT" || (a.tickets || []).some((t: any) => t.is_checked_in))
  );
  const headers = [
    "Booking Reference",
    "Attendee Name",
    "Email",
    "Phone",
    "Ticket Category / Tier",
    "Quantity",
    "Payment Status",
    "Payment Method",
    "Attendance Status",
    "Attended At (Check-in Time)",
    "Verified By",
  ];

  const rows = presentOnly.map((a) => [
    `"${a.booking_reference || rowId(a) || ""}"`,
    `"${(a.user_name || "Attendee").replace(/"/g, '""')}"`,
    `"${(a.user_email || "").replace(/"/g, '""')}"`,
    `"${(a.user_phone || "").replace(/"/g, '""')}"`,
    `"${(a.ticket_type || a.category || "General").replace(/"/g, '""')}"`,
    a.quantity || 1,
    `"${a.payment_status || ""}"`,
    `"${a.payment_method || "ONLINE"}"`,
    `"PRESENT"`,
    `"${a.attended_at ? new Date(a.attended_at).toLocaleString() : new Date().toLocaleString()}"`,
    `"${(a.attended_by || "admin").replace(/"/g, '""')}"`,
  ]);

  const csvContent =
    "data:text/csv;charset=utf-8," +
    [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute(
    "download",
    `${(eventTitle || "event").toLowerCase().replace(/[^a-z0-9]/g, "_")}_final_present_list.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* ═══════════════════════════════════════════════════════════════════
   9. EVENT CATEGORIES & TICKET TIERS EDITOR (BookMyShow Style)
   ═══════════════════════════════════════════════════════════════════ */

interface CategoryItem {
  name: string;
  price: number;
  capacity?: number;
  description?: string;
}

function EventCategoriesEditor({
  value,
  onChange,
}: {
  value: CategoryItem[] | undefined;
  onChange: (v: CategoryItem[]) => void;
}) {
  const categories: CategoryItem[] = Array.isArray(value) ? value : [];

  const updateItem = (idx: number, patch: Partial<CategoryItem>) => {
    const next = [...categories];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };

  const removeItem = (idx: number) => {
    onChange(categories.filter((_, i) => i !== idx));
  };

  const addItem = (cat: CategoryItem = { name: "", price: 500, capacity: 100, description: "" }) => {
    onChange([...categories, cat]);
  };

  const applyPreset = (preset: CategoryItem[]) => {
    onChange(preset);
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
        <div>
          <div className="flex items-center gap-1.5 font-semibold text-xs text-[var(--fg)]">
            <Armchair className="size-4 text-[var(--brand)]" />
            BookMyShow Seating Categories &amp; Ticket Tiers
          </div>
          <p className="text-[11px] text-[var(--fg-muted)]">
            Configure tiered seating (e.g. Platinum Front Row, Gold Center Arena, Silver Balcony). Ticket tiers auto-sync with these prices.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-mono text-[var(--fg-muted)] uppercase">Presets:</span>
          <button
            type="button"
            onClick={() =>
              applyPreset([
                { name: "Platinum", price: 1500, capacity: 50, description: "Front Row VIP Lounge with refreshments" },
                { name: "Gold", price: 800, capacity: 150, description: "Center Arena Elevated Eye-Level Seating" },
                { name: "Silver", price: 400, capacity: 300, description: "Balcony / Standard General Admission" },
              ])
            }
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] font-medium text-[var(--fg)] hover:border-[var(--brand)] hover:text-[var(--brand)] transition-colors"
          >
            3-Tier (Plat/Gold/Silv)
          </button>
          <button
            type="button"
            onClick={() =>
              applyPreset([
                { name: "VIP Platinum", price: 2500, capacity: 50, description: "VIP Front Stage Recliner Seating" },
                { name: "Gold Field", price: 800, capacity: 150, description: "Center Arena Seating" },
                { name: "General Field", price: 300, capacity: 300, description: "Standard General Admission" },
              ])
            }
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] font-medium text-[var(--fg)] hover:border-[var(--brand)] hover:text-[var(--brand)] transition-colors"
          >
            VIP, Gold &amp; General
          </button>
          <button
            type="button"
            onClick={() => addItem()}
            className="inline-flex items-center gap-1 rounded-lg bg-[var(--brand)] px-2.5 py-1 text-[11px] font-bold text-[var(--on-brand)] shadow-sm hover:opacity-90"
          >
            <Plus className="size-3" /> Add Tier
          </button>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="py-6 text-center text-xs text-[var(--fg-muted)] border border-dashed border-[var(--border)] rounded-xl">
          <p>No custom seating categories configured.</p>
          <p className="mt-1 text-[11px]">
            The event will use the single Base Price and Capacity above, or click a preset above to create BookMyShow seating zones.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {categories.map((c, idx) => (
            <div
              key={idx}
              className="relative flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-xs"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="grid size-6 place-items-center rounded-md bg-[var(--surface-2)] text-[10.5px] font-mono font-bold text-[var(--fg-muted)]">
                  #{idx + 1}
                </span>

                {/* Name */}
                <div className="flex-1 min-w-[120px]">
                  <input
                    type="text"
                    value={c.name}
                    onChange={(e) => updateItem(idx, { name: e.target.value })}
                    placeholder="Category Name (e.g. Platinum, Gold)"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-xs font-semibold text-[var(--fg)] outline-none focus:border-[var(--brand)]"
                  />
                </div>

                {/* Price */}
                <div className="w-32">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-xs text-[var(--fg-muted)] font-mono">₹</span>
                    <input
                      type="number"
                      value={c.price}
                      onChange={(e) => updateItem(idx, { price: Number(e.target.value) || 0 })}
                      placeholder="Price"
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] pl-6 pr-2 py-1.5 text-xs font-mono font-bold text-[var(--fg)] outline-none focus:border-[var(--brand)]"
                    />
                  </div>
                  {c.price === 0 && (
                    <span className="mt-0.5 block text-[9.5px] text-amber-400 font-semibold pl-1">Free Entry Pass</span>
                  )}
                </div>

                {/* Capacity */}
                <div className="w-24">
                  <input
                    type="number"
                    value={c.capacity ?? ""}
                    onChange={(e) => updateItem(idx, { capacity: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="Seats"
                    title="Capacity / Available seats in this zone"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-xs font-mono text-[var(--fg)] outline-none focus:border-[var(--brand)]"
                  />
                </div>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="grid size-8 place-items-center rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                  title="Remove this category"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>

              {/* Description / Seating Zone Perks */}
              <div>
                <input
                  type="text"
                  value={c.description || ""}
                  onChange={(e) => updateItem(idx, { description: e.target.value })}
                  placeholder="Seating zone perks & location (e.g. Front Row VIP, Middle Stalls, Elevated Balcony)"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[11.5px] text-[var(--fg-muted)] outline-none focus:border-[var(--brand)]"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
