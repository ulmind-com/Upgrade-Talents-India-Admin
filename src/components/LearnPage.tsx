"use client";

import { useState } from "react";
import { Eye, EyeOff, Users } from "lucide-react";
import { CrudPage } from "@/components/Crud";
import { Button, Loading, Modal, Panel, StatusBadge, useResource } from "@/components/Kit";
import { KeyValues } from "@/components/Dash";
import { useToast } from "@/components/Providers";
import { safe } from "@/lib/api";
import { formatDate, formatINR, fromDateTimeInput, rowId } from "@/lib/utils";

/** Courses and workshops share one backend shape, so they share one screen. */
export default function LearnPage({
  api, kind,
}: {
  api: any;
  kind: "course" | "workshop";
}) {
  const { push } = useToast();
  const [regsFor, setRegsFor] = useState<any | null>(null);
  const label = kind === "course" ? "Course" : "Workshop";

  const togglePublish = async (row: any, reload: () => void) => {
    try {
      await api.publish(rowId(row), { publish: !row.is_published });
      push("success", row.is_published ? `${label} unpublished.` : `${label} published.`);
      reload();
    } catch (e: any) { push("error", e?.message || "Could not change publish state."); }
  };

  return (
    <>
    <CrudPage
      config={{
        title: `${label}s`,
        singular: label,
        subtitle: `Published ${label.toLowerCase()}s appear on the website with live seat counts.`,
        emptyBody: `Create a ${label.toLowerCase()} so people can register for it.`,
        load: () => api.list({ limit: 100 }),
        create: (b: any) => api.create(b),
        update: (id: string, b: any) => api.update(id, b),
        remove: (id: string) => api.remove(id),
        searchKeys: ["title", "instructor_name"],
        columns: [
          { key: "title", header: label, render: (r: any) => (
            <div className="min-w-0">
              <p className="truncate font-semibold">{r.title}</p>
              <p className="truncate text-[11.5px] text-[var(--fg-muted)]">{r.instructor_name || "Instructor TBA"}</p>
            </div>
          ) },
          { key: "price", header: "Fee", render: (r: any) => formatINR(r.price) },
          { key: "available_seats", header: "Seats", render: (r: any) => r.available_seats ?? "—" },
          { key: "start_date", header: "Starts", render: (r: any) => formatDate(r.start_date) },
          { key: "is_published", header: "Live", render: (r: any) => <StatusBadge value={r.is_published ? "published" : "draft"} /> },
        ],
        rowActions: (row: any, { reload }: any) => (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => setRegsFor(row)}>
              <Users className="size-3.5" aria-hidden /> Registrations
            </Button>
            <Button size="sm" variant={row.is_published ? "secondary" : "success"} onClick={() => togglePublish(row, reload)}>
              {row.is_published ? <><EyeOff className="size-3.5" aria-hidden /> Unpublish</> : <><Eye className="size-3.5" aria-hidden /> Publish</>}
            </Button>
          </div>
        ),
        fields: [
          { name: "title", label: "Title", required: true },
          { name: "description", label: "Description", type: "textarea", required: true },
          { name: "thumbnail", label: "Thumbnail URL", type: "url", half: true },
          { name: "instructor_name", label: "Instructor", required: true, half: true },
          { name: "instructor_info", label: "Instructor bio", type: "textarea" },
          { name: "price", label: "Fee (₹)", type: "number", half: true, defaultValue: 0 },
          { name: "available_seats", label: "Available seats", type: "number", half: true, defaultValue: 50 },
          { name: "start_date", label: "Start date", type: "date", half: true },
          { name: "end_date", label: "End date", type: "date", half: true },
          { name: "registration_start_at", label: "Registration opens (IST)", type: "datetime", required: true, half: true },
          { name: "registration_end_at", label: "Registration closes (IST)", type: "datetime", required: true, half: true },
          { name: "display_order", label: "Display order", type: "number", half: true, defaultValue: 0 },
          { name: "is_visible", label: "Visible", type: "toggle", half: true, defaultValue: true },
          { name: "is_published", label: "Published", type: "toggle", half: true, defaultValue: false },
        ],
        toBody: (v: any) => ({
          title: v.title,
          description: v.description,
          thumbnail: v.thumbnail || null,
          instructor_name: v.instructor_name,
          instructor_info: v.instructor_info || null,
          start_date: v.start_date || null,
          end_date: v.end_date || null,
          price: Number(v.price) || 0,
          registration_start_at: fromDateTimeInput(v.registration_start_at),
          registration_end_at: fromDateTimeInput(v.registration_end_at),
          available_seats: Number(v.available_seats) || 0,
          course_type: kind,
          is_published: !!v.is_published,
          is_visible: !!v.is_visible,
          display_order: Number(v.display_order) || 0,
        }),
      }}
    />
    <RegistrationsModal api={api} label={label} row={regsFor} onClose={() => setRegsFor(null)} />
    </>
  );
}

/** Who signed up for one course or workshop, and what it earned. */
function RegistrationsModal({
  api, label, row, onClose,
}: {
  api: any;
  label: string;
  row: any | null;
  onClose: () => void;
}) {
  const id = row ? rowId(row) : "";

  const { data, loading } = useResource<{ stats: any; rows: any[] } | null>(
    async () => (!id ? null : {
      stats: await safe(api.registrationStats(id), null),
      rows: await safe(api.registrations(id), []),
    }),
    [id]
  );

  const rows: any[] = Array.isArray(data?.rows) ? data.rows : [];
  const confirmed = rows.filter((r) => r.status === "CONFIRMED");
  const revenue = confirmed.reduce((sum, r) => sum + (Number(r.payable_amount) || 0), 0);

  return (
    <Modal
      open={!!row}
      onClose={onClose}
      title={row?.title || label}
      subtitle={`Registrations and sales for this ${label.toLowerCase()}`}
      wide
    >
      {loading ? (
        <Loading rows={4} />
      ) : (
        <div className="flex flex-col gap-6">
          <KeyValues
            items={[
              { k: "Total registrations", v: data?.stats?.total_registrations ?? rows.length },
              { k: "Confirmed", v: data?.stats?.confirmed ?? confirmed.length },
              { k: "Awaiting payment", v: data?.stats?.pending_payment ?? "—" },
              { k: "Cancelled", v: data?.stats?.cancelled ?? "—" },
              { k: "Seats left", v: data?.stats?.available_seats ?? "—" },
              { k: "Revenue collected", v: formatINR(revenue) },
            ]}
          />

          <Panel title="Registered people" className="shadow-none" bodyClassName="p-0">
            {rows.length === 0 ? (
              <p className="px-4 py-6 text-center text-[13px] text-[var(--fg-muted)]">
                Nobody has registered yet.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {rows.map((r) => (
                  <li key={r._id || r.order_reference} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold">
                        {r.participant_name || r.email || "—"}
                      </p>
                      <p className="truncate text-[11.5px] text-[var(--fg-muted)]">
                        {r.participant_email || r.email} · {formatDate(r.created_at)}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-[12px] font-semibold">
                      {formatINR(r.payable_amount ?? r.price_snapshot ?? 0)}
                    </span>
                    <StatusBadge value={r.status} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </Modal>
  );
}
