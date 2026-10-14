"use client";

import { useState } from "react";
import { Gavel, Lock, Trophy, Send, RefreshCw, Eye } from "lucide-react";
import { CrudPage } from "@/components/Crud";
import { Button, Modal, Panel, StatusBadge, Loading, useResource, useConfirm } from "@/components/Kit";
import { KeyValues } from "@/components/Dash";
import { useToast } from "@/components/Providers";
import { competitionsApi, safe } from "@/lib/api";
import { formatDate, rowId } from "@/lib/utils";

export default function CompetitionsPage() {
  const { push } = useToast();
  const { confirm, dialog } = useConfirm();
  const [detail, setDetail] = useState<any | null>(null);

  const run = async (label: string, fn: () => Promise<any>, reload: () => void, needsConfirm?: string) => {
    if (needsConfirm) {
      const ok = await confirm(label, needsConfirm);
      if (!ok) return;
    }
    try { await fn(); push("success", `${label} done.`); reload(); }
    catch (e: any) { push("error", e?.message || `${label} failed.`); }
  };

  return (
    <div className="flex flex-col gap-6">
      <CrudPage
        config={{
          title: "Competitions",
          singular: "Competition",
          subtitle: "Contests and talent shows with judging, voting and rankings",
          emptyBody: "Create a competition to open registrations and assign judges.",
          load: () => competitionsApi.list({ limit: 100 }),
          create: (b) => competitionsApi.create(b),
          update: (id, b) => competitionsApi.update(id, b),
          remove: (id) => competitionsApi.remove(id),
          searchKeys: ["title", "name"],
          pageSize: 8,
          columns: [
            { key: "title", header: "Competition", render: (r: any) => (
              <div className="min-w-0">
                <p className="truncate font-semibold">{r.title || r.name || "Untitled"}</p>
                <p className="truncate text-[11.5px] text-[var(--fg-muted)]">{r.category || r.type || "General"}</p>
              </div>
            ) },
            { key: "status", header: "Status", render: (r: any) => <StatusBadge value={r.status || r.state} /> },
            { key: "is_published", header: "Published", render: (r: any) => <StatusBadge value={r.is_published ? "published" : "draft"} /> },
            { key: "start_date", header: "Starts", render: (r: any) => formatDate(r.start_date || r.starts_at) },
          ],
          rowActions: (row, { reload }) => (
            <>
              <button
                onClick={() => setDetail(row)}
                aria-label="Open competition controls"
                className="grid size-9 cursor-pointer place-items-center rounded-lg text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--brand)]"
              >
                <Eye className="size-4" aria-hidden />
              </button>
              <Button
                size="sm"
                variant={row.is_published ? "secondary" : "success"}
                onClick={() => run(row.is_published ? "Unpublish" : "Publish",
                  () => (row.is_published ? competitionsApi.unpublish(rowId(row)) : competitionsApi.publish(rowId(row))), reload)}
              >
                {row.is_published ? "Unpublish" : "Publish"}
              </Button>
            </>
          ),
          fields: [
            { name: "title", label: "Title", required: true },
            { name: "description", label: "Description", type: "textarea" },
            { name: "category", label: "Category", half: true, placeholder: "Solo / Group / Freestyle" },
            { name: "max_participants", label: "Max participants", type: "number", half: true },
            { name: "start_date", label: "Starts", type: "datetime", half: true },
            { name: "end_date", label: "Ends", type: "datetime", half: true },
            { name: "voting_enabled", label: "Audience voting enabled", type: "toggle", half: true, defaultValue: true },
            { name: "is_published", label: "Published", type: "toggle", half: true, defaultValue: false },
          ],
          toBody: (v) => ({
            title: v.title,
            description: v.description || null,
            category: v.category || null,
            max_participants: v.max_participants === "" ? null : Number(v.max_participants),
            start_date: v.start_date || null,
            end_date: v.end_date || null,
            voting_enabled: !!v.voting_enabled,
            is_published: !!v.is_published,
          }),
        }}
      />

      <CompetitionControls comp={detail} onClose={() => setDetail(null)} onAction={run} />
      {dialog}
    </div>
  );
}

function CompetitionControls({
  comp, onClose, onAction,
}: {
  comp: any | null;
  onClose: () => void;
  onAction: (label: string, fn: () => Promise<any>, reload: () => void, confirmText?: string) => void;
}) {
  const id = comp ? rowId(comp) : "";
  const { data, loading, reload } = useResource(
    async () => (!id ? null : {
      overview: await safe(competitionsApi.overview(id), null),
      progress: await safe(competitionsApi.judgingProgress(id), null),
    }),
    [id]
  );

  const actions = [
    { label: "Open judging session", Icon: Gavel, fn: () => competitionsApi.openSession(id) },
    { label: "Close judging session", Icon: Gavel, fn: () => competitionsApi.closeSession(id) },
    { label: "Close audience voting", Icon: Lock, fn: () => competitionsApi.closeVoting(id), confirm: "Voting cannot be reopened from here." },
    { label: "Lock judging", Icon: Lock, fn: () => competitionsApi.lockJudging(id), confirm: "Judges will no longer be able to change scores." },
    { label: "Recalculate rankings", Icon: RefreshCw, fn: () => competitionsApi.recalculate(id) },
    { label: "Start finalization", Icon: Trophy, fn: () => competitionsApi.startFinalization(id) },
    { label: "Approve results", Icon: Trophy, fn: () => competitionsApi.approveResults(id), confirm: "Approved results become eligible for publishing." },
    { label: "Publish results", Icon: Send, fn: () => competitionsApi.publishResults(id), confirm: "Results go live on the public leaderboard." },
  ];

  return (
    <Modal open={!!comp} onClose={onClose} title={comp?.title || comp?.name || "Competition"} subtitle="Judging, voting and result controls" wide>
      {loading ? (
        <Loading rows={4} />
      ) : (
        <div className="flex flex-col gap-6">
          <KeyValues
            items={[
              { k: "Status", v: <StatusBadge value={comp?.status || comp?.state} /> },
              { k: "Published", v: <StatusBadge value={comp?.is_published ? "published" : "draft"} /> },
              { k: "Category", v: comp?.category || "—" },
              { k: "Starts", v: formatDate(comp?.start_date || comp?.starts_at, true) },
              { k: "Participants", v: data?.overview?.participant_count ?? data?.overview?.total_participants ?? "—" },
              { k: "Judging progress", v: data?.progress?.completion_percentage != null ? `${data.progress.completion_percentage}%` : "—" },
            ]}
          />

          <Panel title="Workflow controls" className="shadow-none" bodyClassName="p-4">
            <div className="grid gap-2.5 sm:grid-cols-2">
              {actions.map((a) => (
                <Button
                  key={a.label}
                  variant="secondary"
                  size="sm"
                  className="justify-start"
                  onClick={() => onAction(a.label, a.fn, reload, a.confirm)}
                >
                  <a.Icon className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{a.label}</span>
                </Button>
              ))}
            </div>
          </Panel>
        </div>
      )}
    </Modal>
  );
}
