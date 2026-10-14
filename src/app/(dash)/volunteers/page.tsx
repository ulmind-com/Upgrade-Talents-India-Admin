"use client";

import { CrudPage } from "@/components/Crud";
import { StatusBadge } from "@/components/Kit";
import { volunteersApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function VolunteersPage() {
  return (
    <CrudPage
      config={{
        title: "Volunteers",
        singular: "Volunteer",
        subtitle: "Gate and floor staff who scan passes during events",
        emptyBody: "Add volunteers so they can verify tickets at the gate.",
        load: () => volunteersApi.list({ limit: 200 }),
        create: (b) => volunteersApi.create(b),
        remove: (email) => volunteersApi.remove(email),
        searchKeys: ["name", "email"],
        columns: [
          { key: "name", header: "Volunteer", render: (r: any) => (
            <div className="min-w-0">
              <p className="truncate font-semibold">{r.name || "Unnamed"}</p>
              <p className="truncate text-[11.5px] text-[var(--fg-muted)]">{r.email}</p>
            </div>
          ) },
          { key: "phone_number", header: "Phone", render: (r: any) => r.phone_number || "—" },
          { key: "is_active", header: "Status", render: (r: any) => <StatusBadge value={r.is_active ?? r.status} /> },
          { key: "created_at", header: "Added", render: (r: any) => formatDate(r.created_at) },
        ],
        fields: [
          { name: "name", label: "Full name", required: true, half: true },
          { name: "email", label: "Email", type: "email", required: true, half: true },
          { name: "phone_number", label: "Phone", half: true },
          { name: "password", label: "Access password", required: true, half: true, hint: "Used to sign in to the scanner app." },
        ],
        toBody: (v) => ({
          name: v.name, email: v.email,
          phone_number: v.phone_number || null,
          password: v.password,
        }),
      }}
    />
  );
}
