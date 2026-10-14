"use client";

import { useEffect, useState } from "react";
import { CrudPage } from "@/components/Crud";
import { Panel, Select, useResource, Loading, ErrorState, EmptyState } from "@/components/Kit";
import { cmsApi, toRows } from "@/lib/api";
import { formatDate, formatINR } from "@/lib/utils";

export default function TicketsPage() {
  const { data: events, loading, error, reload } = useResource(() => cmsApi.listEvents({ limit: 200 }), []);
  const [eventId, setEventId] = useState("");

  const list = toRows(events);
  useEffect(() => { if (!eventId && list.length) setEventId(String(list[0]._id)); }, [list, eventId]);

  if (loading) return <Loading rows={5} />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!list.length) {
    return <EmptyState title="No events yet" body="Ticket tiers belong to an event — create an event first." />;
  }

  return (
    <div className="flex flex-col gap-6">
      <Panel title="Choose an event" subtitle="Ticket tiers are configured per event">
        <div className="max-w-md">
          <label htmlFor="event-picker" className="sr-only">Event</label>
          <Select
            id="event-picker"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            options={list.map((e) => ({ value: String(e._id), label: `${e.title} — ${formatDate(e.date)}` }))}
          />
        </div>
      </Panel>

      {eventId && (
        <CrudPage
          key={eventId}
          config={{
            title: "Ticket tiers",
            singular: "Ticket tier",
            subtitle: "Price, stock and sale window for each category",
            emptyBody: "Add a tier so people can buy tickets for this event.",
            load: () => cmsApi.listTickets({ event_id: eventId, limit: 100 }),
            create: (b) => cmsApi.createTicket(b),
            update: (id, b) => cmsApi.updateTicket(id, b),
            remove: (id) => cmsApi.deleteTicket(id),
            searchKeys: ["type"],
            columns: [
              { key: "type", header: "Tier", render: (r) => <span className="font-semibold capitalize">{String(r.type || "general").replace(/_/g, " ")}</span> },
              { key: "price", header: "Price", render: (r) => formatINR(r.price) },
              { key: "total_quantity", header: "Total", render: (r) => r.total_quantity ?? "—" },
              { key: "available", header: "Available", render: (r) => (
                <span className={Number(r.available) <= 10 ? "font-semibold text-[var(--danger)]" : ""}>{r.available ?? "—"}</span>
              ) },
              { key: "sold", header: "Sold", render: (r) => Number(r.total_quantity ?? 0) - Number(r.available ?? 0) },
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
              if (!editing) body.event_id = eventId;
              return body;
            },
          }}
        />
      )}
    </div>
  );
}
