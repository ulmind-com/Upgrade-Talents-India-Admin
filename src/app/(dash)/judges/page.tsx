"use client";

import { useState } from "react";
import { Send, UserPlus, UserMinus, Gavel } from "lucide-react";
import { CrudPage } from "@/components/Crud";
import { Button, Modal, Loading, StatusBadge, useResource } from "@/components/Kit";
import { useToast } from "@/components/Providers";
import { competitionsApi, judgesApi, safe, toRows } from "@/lib/api";
import { formatDate, rowId } from "@/lib/utils";

export default function JudgesPage() {
  const { push } = useToast();
  const [assignFor, setAssignFor] = useState<any | null>(null);

  const invite = async (row: any) => {
    try { await judgesApi.sendInvitation(row.email); push("success", `Invitation sent to ${row.email}.`); }
    catch (e: any) { push("error", e?.message || "Could not send the invitation."); }
  };

  return (
    <>
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
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => setAssignFor(row)}>
              <Gavel className="size-3.5" aria-hidden /> Assign
            </Button>
            <Button size="sm" variant="secondary" onClick={() => invite(row)}>
              <Send className="size-3.5" aria-hidden /> Invite
            </Button>
          </div>
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
    <AssignModal judge={assignFor} onClose={() => setAssignFor(null)} />
    </>
  );
}

function AssignModal({ judge, onClose }: { judge: any | null; onClose: () => void }) {
  const { push } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const email: string = judge?.email || "";

  const { data, loading, reload } = useResource(async () => {
    if (!email) return null;
    const comps = toRows(await safe(competitionsApi.list({ limit: 100 }), []));
    const progress = await Promise.all(
      comps.map((c: any) => safe(competitionsApi.judgingProgress(rowId(c)), null))
    );
    const assigned = new Set<string>();
    comps.forEach((c: any, i: number) => {
      const details: any[] = progress[i]?.judge_details || [];
      if (details.some((d) => d.judge_email === email)) assigned.add(rowId(c));
    });
    return { comps, assigned };
  }, [email]);

  const toggle = async (compId: string, isAssigned: boolean) => {
    setBusy(compId);
    try {
      const body = { judge_email: email, competition_id: compId };
      if (isAssigned) await judgesApi.unassign(body);
      else await judgesApi.assign(body);
      push("success", isAssigned ? "Removed from this competition." : "Assigned to this competition.");
      reload();
    } catch (e: any) {
      push("error", e?.message || "Could not update the assignment.");
    } finally {
      setBusy(null);
    }
  };

  const comps: any[] = data?.comps || [];

  return (
    <Modal
      open={!!judge}
      onClose={onClose}
      title={judge?.full_name || judge?.name || "Judge"}
      subtitle={`Competitions ${email} can score`}
    >
      {loading ? (
        <Loading rows={4} />
      ) : comps.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-[var(--fg-muted)]">
          No competitions yet — create one from the Competitions page first.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-[var(--border)]">
          {comps.map((c) => {
            const cid = rowId(c);
            const isAssigned = !!data?.assigned.has(cid);
            return (
              <li key={cid} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold">{c.title || c.name || "Untitled"}</p>
                  <p className="truncate text-[11.5px] text-[var(--fg-muted)]">
                    {isAssigned ? "Assigned" : "Not assigned"}
                    {c.category ? ` · ${c.category}` : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={isAssigned ? "ghost" : "secondary"}
                  loading={busy === cid}
                  disabled={!!busy && busy !== cid}
                  onClick={() => toggle(cid, isAssigned)}
                >
                  {isAssigned ? <UserMinus className="size-3.5" aria-hidden /> : <UserPlus className="size-3.5" aria-hidden />}
                  {isAssigned ? "Remove" : "Assign"}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
