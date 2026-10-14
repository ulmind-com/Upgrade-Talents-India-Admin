"use client";

import { Eye, EyeOff } from "lucide-react";
import { CrudPage } from "@/components/Crud";
import { Button, StatusBadge } from "@/components/Kit";
import { useToast } from "@/components/Providers";
import { formatDate, formatINR, rowId } from "@/lib/utils";

/** Courses and workshops share one backend shape, so they share one screen. */
export default function LearnPage({
  api, kind,
}: {
  api: any;
  kind: "course" | "workshop";
}) {
  const { push } = useToast();
  const label = kind === "course" ? "Course" : "Workshop";

  const togglePublish = async (row: any, reload: () => void) => {
    try {
      await api.publish(rowId(row), { publish: !row.is_published });
      push("success", row.is_published ? `${label} unpublished.` : `${label} published.`);
      reload();
    } catch (e: any) { push("error", e?.message || "Could not change publish state."); }
  };

  return (
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
          <Button size="sm" variant={row.is_published ? "secondary" : "success"} onClick={() => togglePublish(row, reload)}>
            {row.is_published ? <><EyeOff className="size-3.5" aria-hidden /> Unpublish</> : <><Eye className="size-3.5" aria-hidden /> Publish</>}
          </Button>
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
          { name: "registration_start_at", label: "Registration opens", type: "datetime", required: true, half: true },
          { name: "registration_end_at", label: "Registration closes", type: "datetime", required: true, half: true },
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
          registration_start_at: v.registration_start_at ? new Date(v.registration_start_at).toISOString() : null,
          registration_end_at: v.registration_end_at ? new Date(v.registration_end_at).toISOString() : null,
          available_seats: Number(v.available_seats) || 0,
          course_type: kind,
          is_published: !!v.is_published,
          is_visible: !!v.is_visible,
          display_order: Number(v.display_order) || 0,
        }),
      }}
    />
  );
}
