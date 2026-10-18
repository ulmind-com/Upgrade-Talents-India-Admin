"use client";

import { Send } from "lucide-react";
import { CrudPage } from "@/components/Crud";
import { Button, StatusBadge } from "@/components/Kit";
import { useToast } from "@/components/Providers";
import { judgesApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function JudgesPage() {
  const { push } = useToast();

  const invite = async (row: any) => {
    try { await judgesApi.sendInvitation(row.email); push("success", `Invitation sent to ${row.email}.`); }
    catch (e: any) { push("error", e?.message || "Could not send the invitation."); }
  };

  return (
    <CrudPage
      config={{
        title: "Judges",
        singular: "Judge",
        subtitle: "Judges score contestants from a private panel — they never use the public site.",
        emptyBody: "Add a judge and send them an invitation to get access.",
        load: () => judgesApi.list({ limit: 200 }),
        create: (b) => judgesApi.create(b),
        searchKeys: ["full_name", "email"],
        columns: [
          { key: "full_name", header: "Judge", render: (r: any) => (
            <div className="min-w-0">
              <p className="truncate font-semibold">{r.full_name || r.name || "Unnamed"}</p>
              <p className="truncate text-[11.5px] text-[var(--fg-muted)]">{r.email}</p>
            </div>
          ) },
          { key: "designation", header: "Expertise", render: (r: any) => r.designation || r.expertise || "—" },
          { key: "is_active", header: "Status", render: (r: any) => <StatusBadge value={r.is_active ?? r.status} /> },
          { key: "created_at", header: "Added", render: (r: any) => formatDate(r.created_at) },
        ],
        rowActions: (row) => (
          <Button size="sm" variant="secondary" onClick={() => invite(row)}>
            <Send className="size-3.5" aria-hidden /> Invite
          </Button>
        ),
        fields: [
          { name: "full_name", label: "Full name", required: true, half: true },
          { name: "email", label: "Email", type: "email", required: true, half: true },
          { name: "phone_number", label: "Phone", half: true },
          { name: "designation", label: "Expertise", half: true, placeholder: "Hip hop, Contemporary" },
          { name: "biography", label: "Short bio", type: "textarea" },
        ],
        toBody: (v) => ({
          full_name: v.full_name, email: v.email,
          phone_number: v.phone_number || null,
          designation: v.designation || null,
          biography: v.biography || null,
        }),
      }}
    />
  );
}
