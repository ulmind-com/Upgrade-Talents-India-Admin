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
            { name: "title", label: "Title", required: true, placeholder: "e.g. Big Classic Dance Competition" },
            { name: "category", label: "Category", half: true, placeholder: "Solo / Group / Freestyle" },
            { name: "max_participants", label: "Max participants", type: "number", half: true, placeholder: "e.g. 150" },
            { name: "description", label: "Description", type: "textarea", placeholder: "Details about this competition…" },
            { name: "start_date", label: "Competition starts", type: "datetime", half: true, required: true },
            { name: "end_date", label: "Competition ends", type: "datetime", half: true, required: true },
            { name: "registration_start_date", label: "Registration starts", type: "datetime", half: true, hint: "Defaults to now if empty" },
            { name: "registration_deadline", label: "Registration deadline", type: "datetime", half: true, hint: "Defaults to competition start if empty" },
            { name: "submission_deadline", label: "Submission deadline", type: "datetime", half: true, hint: "Defaults to competition end if empty" },
            { name: "participation_fee", label: "Entry fee (₹)", type: "number", half: true, defaultValue: 0 },
            { name: "min_age", label: "Min age", type: "number", half: true, placeholder: "Optional" },
            { name: "max_age", label: "Max age", type: "number", half: true, placeholder: "Optional" },
            { name: "audience_voting_enabled", label: "Audience voting enabled", type: "toggle", half: true, defaultValue: true },
            { name: "judge_scoring_enabled", label: "Judge scoring enabled", type: "toggle", half: true, defaultValue: true },
            { name: "is_published", label: "Published", type: "toggle", half: true, defaultValue: false },
          ],
          toForm: (r: any) => ({
            title: r.title || r.name || "",
            description: r.description || "",
            category: r.category || "",
            max_participants: r.max_participants ?? "",
            start_date: r.start_date || r.starts_at || "",
            end_date: r.end_date || r.ends_at || "",
            registration_start_date: r.registration_start_date || "",
            registration_deadline: r.registration_deadline || "",
            submission_deadline: r.submission_deadline || "",
            participation_fee: r.participation_fee ?? 0,
            min_age: r.min_age ?? "",
            max_age: r.max_age ?? "",
            audience_voting_enabled: r.audience_voting_enabled ?? r.voting_enabled ?? true,
            judge_scoring_enabled: r.judge_scoring_enabled ?? true,
            is_published: !!r.is_published,
          }),
          toBody: (v: any, editing: any) => {
            const toIso = (val?: string | null) => {
              if (!val) return null;
              const d = new Date(val);
              return isNaN(d.getTime()) ? null : d.toISOString();
            };

            if (editing) {
              return {
                title: v.title,
                description: v.description || null,
                is_published: !!v.is_published,
              };
            }

            const sDate = toIso(v.start_date) || new Date().toISOString();
            const eDate = toIso(v.end_date) || new Date(Date.now() + 7 * 86400000).toISOString();
            const regStart = toIso(v.registration_start_date) || new Date().toISOString();
            const regEnd = toIso(v.registration_deadline) || sDate;
            const subEnd = toIso(v.submission_deadline) || eDate;

            const voteEnabled = v.audience_voting_enabled !== undefined ? !!v.audience_voting_enabled : true;
            let judgeEnabled = v.judge_scoring_enabled !== undefined ? !!v.judge_scoring_enabled : true;
            if (!voteEnabled && !judgeEnabled) {
              judgeEnabled = true;
            }

            const audienceWeight = voteEnabled && judgeEnabled ? 0.5 : voteEnabled ? 1.0 : 0.0;
            const judgeWeight = voteEnabled && judgeEnabled ? 0.5 : judgeEnabled ? 1.0 : 0.0;

            return {
              title: String(v.title || "").trim(),
              description: String(v.description || v.title || "").trim(),
              category: String(v.category || "General").trim() || "General",
              type: "General",
              max_participants: v.max_participants === "" || v.max_participants == null ? null : Number(v.max_participants),
              participation_fee: v.participation_fee === "" || v.participation_fee == null ? 0 : Number(v.participation_fee),
              currency: "INR",
              min_age: v.min_age === "" || v.min_age == null ? null : Number(v.min_age),
              max_age: v.max_age === "" || v.max_age == null ? null : Number(v.max_age),
              start_date: sDate,
              end_date: eDate,
              registration_start_date: regStart,
              registration_deadline: regEnd,
              submission_deadline: subEnd,
              is_published: !!v.is_published,
              audience_voting_enabled: voteEnabled,
              judge_scoring_enabled: judgeEnabled,
              audience_vote_weight: audienceWeight,
              judge_score_weight: judgeWeight,
              judging_criteria: judgeEnabled
                ? [
                    { name: "Skill & Technique", max_score: 10, weight: 1.0, display_order: 1 },
                    { name: "Creativity & Style", max_score: 10, weight: 1.0, display_order: 2 },
                    { name: "Overall Impression", max_score: 10, weight: 1.0, display_order: 3 },
                  ]
                : [],
              dynamic_submission_fields: [
                { name: "Performance Video", label: "Performance Video", type: "VIDEO", required: true, display_order: 1 },
                { name: "Portfolio / Photos", label: "Photos or Portfolio", type: "IMAGE", required: false, display_order: 2 },
              ],
            };
          },
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
