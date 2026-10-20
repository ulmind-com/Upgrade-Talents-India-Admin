"use client";

import { Eye, EyeOff, Ticket } from "lucide-react";
import { CrudPage } from "@/components/Crud";
import { Button, StatusBadge } from "@/components/Kit";
import { useToast } from "@/components/Providers";
import { cmsApi } from "@/lib/api";
import { formatDate, formatINR, rowId } from "@/lib/utils";

export default function EventsPage() {
  const { push } = useToast();

  const togglePublish = async (row: any, reload: () => void) => {
    try {
      await cmsApi.publishEvent(rowId(row), { publish: !row.is_published });
      push("success", row.is_published ? "Event unpublished." : "Event published to the website.");
      reload();
    } catch (e: any) { push("error", e?.message || "Could not change publish state."); }
  };

  return (
    <CrudPage
      config={{
        title: "Events",
        singular: "Event",
        subtitle: "Everything published here appears on the public website immediately.",
        emptyBody: "Create your first event to start selling tickets.",
        load: () => cmsApi.listEvents({ limit: 200 }),
        create: (b) => cmsApi.createEvent(b),
        update: (id, b) => cmsApi.updateEvent(id, b),
        remove: (id) => cmsApi.deleteEvent(id),
        searchKeys: ["title", "venue"],
        columns: [
          { key: "title", header: "Event", render: (r) => (
            <div className="min-w-0">
              <p className="truncate font-semibold">{r.title}</p>
              <p className="truncate text-[11.5px] text-[var(--fg-muted)]">{r.venue || "Venue TBA"}</p>
            </div>
          ) },
          { key: "date", header: "Date", render: (r) => <span className="whitespace-nowrap">{formatDate(r.date)}{r.time ? ` · ${r.time}` : ""}</span> },
          { key: "price", header: "Price", render: (r) => formatINR(r.price) },
          { key: "capacity", header: "Capacity", render: (r) => r.capacity ?? "—" },
          { key: "event_status", header: "Status", render: (r) => <StatusBadge value={r.event_status} /> },
          { key: "is_published", header: "Live", render: (r) => <StatusBadge value={r.is_published ? "published" : "draft"} /> },
        ],
        rowActions: (row, { reload }) => (
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="secondary"
              href={`/tickets?eventId=${rowId(row)}`}
            >
              <Ticket className="size-3.5" aria-hidden /> Tickets
            </Button>
            <Button
              size="sm"
              variant={row.is_published ? "secondary" : "success"}
              onClick={() => togglePublish(row, reload)}
            >
              {row.is_published ? <><EyeOff className="size-3.5" aria-hidden /> Unpublish</> : <><Eye className="size-3.5" aria-hidden /> Publish</>}
            </Button>
          </div>
        ),
        fields: [
          { name: "title", label: "Title", required: true, placeholder: "Neon Nights Battle" },
          { name: "description", label: "Description", type: "textarea", required: true },
          { name: "image_url", label: "Cover image URL", type: "url", half: true, hint: "Shown on the website hero and cards." },
          { name: "venue", label: "Venue", required: true, half: true },
          { name: "date", label: "Date", type: "date", required: true, half: true },
          { name: "time", label: "Time", half: true, placeholder: "7:30 PM" },
          { name: "price", label: "Base price (₹)", type: "number", half: true, defaultValue: 0 },
          { name: "capacity", label: "Capacity", type: "number", half: true, defaultValue: 100 },
          { name: "registration_deadline", label: "Registration deadline", type: "date", half: true },
          { name: "display_order", label: "Display order", type: "number", half: true, defaultValue: 0 },
          { name: "event_status", label: "Status", type: "select", half: true, defaultValue: "upcoming",
            options: ["upcoming", "live", "completed", "cancelled"].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) })) },
          { name: "registration_enabled", label: "Registration enabled", type: "toggle", half: true, defaultValue: true },
          { name: "ticket_enabled", label: "Ticketing enabled", type: "toggle", half: true, defaultValue: true },
          { name: "is_visible", label: "Visible on website", type: "toggle", half: true, defaultValue: true },
          { name: "is_published", label: "Published", type: "toggle", half: true, defaultValue: false },
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
  );
}
