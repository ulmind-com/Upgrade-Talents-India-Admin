"use client";

import { useState } from "react";
import { Send, UserPlus, UserMinus, Gavel, CheckCircle2 } from "lucide-react";
import { CrudPage } from "@/components/Crud";
import { Button, Modal, Loading, StatusBadge, useResource } from "@/components/Kit";
import { useToast } from "@/components/Providers";
import { competitionsApi, judgesApi, safe, toRows } from "@/lib/api";
import { formatDate, rowId } from "@/lib/utils";

export default function JudgesPage() {
  const { push } = useToast();
  const [assignFor, setAssignFor] = useState<any | null>(null);
  const [reloadTableFn, setReloadTableFn] = useState<(() => void) | null>(null);

  const invite = async (row: any) => {
    try {
      await judgesApi.sendInvitation(row.email);
      push("success", `Official invitation email sent to ${row.email}.`);
    } catch (e: any) {
      push("error", e?.message || "Could not send the invitation.");
    }
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
          {
            key: "full_name",
            header: "Judge",
            render: (r: any) => (
              <div className="min-w-0">
                <p className="truncate font-semibold">{r.full_name || r.name || "Unnamed"}</p>
                <p className="truncate text-[11.5px] text-[var(--fg-muted)]">{r.email}</p>
              </div>
            )
          },
          {
            key: "assigned_count",
            header: "Competitions",
            render: (r: any) => {
              const count = r.assigned_count ?? (r.assigned_competitions?.length || 0);
              return count > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                  <CheckCircle2 className="size-3 text-emerald-500" />
                  Assigned ({count})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11.5px] font-medium bg-zinc-500/10 text-zinc-500 border border-zinc-500/20">
                  Unassigned
                </span>
              );
            }
          },
          { key: "designation", header: "Expertise", render: (r: any) => r.designation || r.expertise || "—" },
          { key: "is_active", header: "Status", render: (r: any) => <StatusBadge value={r.is_active ?? r.status} /> },
          { key: "created_at", header: "Added", render: (r: any) => formatDate(r.created_at) },
        ],
        rowActions: (row, { reload }) => {
          const count = row.assigned_count ?? (row.assigned_competitions?.length || 0);
          return (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                className={count > 0 ? "border-emerald-500/50 text-emerald-600 dark:text-emerald-400 font-medium hover:bg-emerald-500/10" : ""}
                onClick={() => {
                  setReloadTableFn(() => reload);
                  setAssignFor(row);
                }}
              >
                <Gavel className="size-3.5" aria-hidden />
                {count > 0 ? `Assigned (${count})` : "Assign"}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => invite(row)}>
                <Send className="size-3.5" aria-hidden /> Invite
              </Button>
            </div>
          );
        },
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
    <AssignModal
      judge={assignFor}
      onClose={() => {
        setAssignFor(null);
        reloadTableFn?.();
      }}
      onUpdated={() => reloadTableFn?.()}
    />
    </>
  );
}

function AssignModal({
  judge,
  onClose,
  onUpdated
}: {
  judge: any | null;
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const { push } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const email: string = (judge?.email || "").trim().toLowerCase();

  const { data, loading, reload } = useResource(async () => {
    if (!email) return null;
    const comps = toRows(await safe(competitionsApi.list({ limit: 100 }), []));
    
    // 1. Direct backend assignments lookup
    const directAssignments = await safe(judgesApi.assignments(email), []);
    const initialFromRow = Array.isArray(judge?.assigned_competitions) ? judge.assigned_competitions : [];
    const assigned = new Set<string>(
      [...(initialFromRow || []), ...(directAssignments || [])].map((id: any) => String(id))
    );

    // 2. Comprehensive check across competition progress
    if (comps.length > 0) {
      const progress = await Promise.all(
        comps.map((c: any) => safe(competitionsApi.judgingProgress(rowId(c)), null))
      );
      comps.forEach((c: any, i: number) => {
        const details: any[] = progress[i]?.judges || progress[i]?.judge_details || [];
        if (details.some((d: any) => String(d?.judge_email || "").trim().toLowerCase() === email)) {
          assigned.add(rowId(c));
          if (c._id) assigned.add(String(c._id));
          if (c.id) assigned.add(String(c.id));
        }
      });
    }

    return { comps, assigned };
  }, [email]);

  const toggle = async (compId: string, isAssigned: boolean) => {
    setBusy(compId);
    try {
      const body = { judge_email: judge?.email || email, competition_id: compId };
      if (isAssigned) await judgesApi.unassign(body);
      else await judgesApi.assign(body);
      push("success", isAssigned ? "Removed judge from this competition." : "Assigned judge to this competition.");
      await reload();
      onUpdated?.();
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
      subtitle={`Competitions ${judge?.email || email} can score`}
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
            const isAssigned = !!(
              data?.assigned.has(cid) ||
              (c._id && data?.assigned.has(String(c._id))) ||
              (c.id && data?.assigned.has(String(c.id)))
            );
            return (
              <li key={cid} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13.5px] font-semibold">{c.title || c.name || "Untitled"}</p>
                    {isAssigned && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                        <CheckCircle2 className="size-2.5 text-emerald-500" />
                        Active
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[11.5px] text-[var(--fg-muted)] mt-0.5">
                    {isAssigned ? "Currently assigned to judge this competition" : "Not assigned yet"}
                    {c.category ? ` · ${c.category}` : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={isAssigned ? "danger" : "secondary"}
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
