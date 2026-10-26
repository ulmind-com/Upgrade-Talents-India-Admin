"use client";

import { useState, useMemo } from "react";
import {
  Gavel, Lock, Trophy, Send, RefreshCw, Eye, UserPlus, UserMinus,
  Users, FileText, ExternalLink, CheckCircle2, Video, Search, Phone, Mail,
  Upload, Loader2, Plus, Trash2, Image as ImageIcon
} from "lucide-react";
import { CrudPage } from "@/components/Crud";
import { Button, Field, Input, Modal, Panel, StatusBadge, Loading, useResource, useConfirm, DataTable, Select } from "@/components/Kit";
import { KeyValues, StatCard } from "@/components/Dash";
import { useToast } from "@/components/Providers";
import { competitionsApi, judgesApi, safe, toRows } from "@/lib/api";
import { formatDate, formatINR, formatNumber, rowId, cn } from "@/lib/utils";

function ImageUploaderField({
  label,
  aspectRatioLabel,
  aspectClass,
  value,
  onChange,
  onUpload,
}: {
  label: string;
  aspectRatioLabel: string;
  aspectClass: string;
  value: string;
  onChange: (url: string) => void;
  onUpload: (file: File) => Promise<any>;
}) {
  const [uploading, setUploading] = useState(false);
  const { push } = useToast();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await onUpload(file);
      const url = res?.url || res?.card_image_url || res?.banner_image_url || res?.banner_url || res?.image_url;
      if (url) {
        onChange(url);
        push("success", `${label} uploaded successfully.`);
      } else {
        push("error", "No URL returned from upload.");
      }
    } catch (err: any) {
      push("error", err?.message || "Upload failed.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-[var(--fg)]">
          {label} <span className="font-bold text-[var(--brand)]">({aspectRatioLabel})</span>
        </span>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-[11px] font-semibold text-[var(--danger)] hover:underline"
          >
            Clear image
          </button>
        )}
      </div>

      <div className="flex items-start gap-3">
        {value ? (
          <div className={cn("relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)] shrink-0 shadow-sm", aspectClass)}>
            <img src={value} alt="" className="size-full object-cover" />
          </div>
        ) : (
          <div className={cn("grid place-items-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] text-[11px] text-[var(--fg-subtle)] shrink-0", aspectClass)}>
            <ImageIcon className="size-5 opacity-40" />
          </div>
        )}

        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--surface-2)] transition-colors shadow-sm">
            {uploading ? (
              <>
                <Loader2 className="size-3.5 animate-spin text-[var(--brand)]" /> Uploading to Cloud…
              </>
            ) : (
              <>
                <Upload className="size-3.5 text-[var(--brand)]" /> Choose &amp; Upload Image
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={handleFile}
            />
          </label>

          <Input
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Or paste direct image URL (https://…)"
            className="text-xs"
          />
        </div>
      </div>
    </div>
  );
}

function JudgingCriteriaBuilder({
  value,
  onChange,
}: {
  value: any[];
  onChange: (criteria: any[]) => void;
}) {
  const criteria = Array.isArray(value) ? value : [];

  const addCriterion = () => {
    onChange([
      ...criteria,
      {
        name: `Criterion ${criteria.length + 1}`,
        description: "",
        max_score: 10,
        weight: 1.0,
        display_order: criteria.length + 1,
      },
    ]);
  };

  const removeCriterion = (idx: number) => {
    onChange(criteria.filter((_, i) => i !== idx));
  };

  const updateCriterion = (idx: number, patch: Partial<any>) => {
    onChange(
      criteria.map((c, i) => (i === idx ? { ...c, ...patch } : c))
    );
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-3.5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-[var(--fg)]">Dynamic Judging Criteria</p>
          <p className="text-[11px] text-[var(--fg-muted)]">
            Define categories, maximum scores &amp; weights for judges scoring worksheet.
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={addCriterion} type="button">
          <Plus className="size-3.5" /> Add Criterion
        </Button>
      </div>

      {criteria.length === 0 ? (
        <div className="text-center py-4 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--fg-subtle)]">
          <p className="italic">No criteria defined yet. Click &quot;Add Criterion&quot; to configure scoring dimensions.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {criteria.map((c, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 shadow-sm"
            >
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={c.name || ""}
                  onChange={(e) => updateCriterion(idx, { name: e.target.value })}
                  placeholder="Criterion Name (e.g. Vocal Quality, Choreography, Style)"
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1 text-xs font-semibold text-[var(--fg)] focus:border-[var(--brand)] focus:outline-none"
                />
              </div>
              <div className="w-24 shrink-0">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-[var(--fg-subtle)]">Max:</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={c.max_score ?? 10}
                    onChange={(e) =>
                      updateCriterion(idx, { max_score: parseFloat(e.target.value) || 10 })
                    }
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-1.5 py-1 text-xs text-center font-bold text-[var(--fg)] focus:border-[var(--brand)] focus:outline-none"
                  />
                </div>
              </div>
              <div className="w-20 shrink-0">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-[var(--fg-subtle)]">Wt:</span>
                  <input
                    type="number"
                    step={0.1}
                    min={0.1}
                    max={5}
                    value={c.weight ?? 1.0}
                    onChange={(e) =>
                      updateCriterion(idx, { weight: parseFloat(e.target.value) || 1.0 })
                    }
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-1.5 py-1 text-xs text-center font-bold text-[var(--fg)] focus:border-[var(--brand)] focus:outline-none"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeCriterion(idx)}
                className="grid size-7 shrink-0 place-items-center rounded text-[var(--danger)] hover:bg-[var(--surface-3)] transition-colors"
                title="Remove Criterion"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CompetitionsPage() {
  const { push } = useToast();
  const { confirm, dialog } = useConfirm();
  const [detail, setDetail] = useState<any | null>(null);
  const [modalTab, setModalTab] = useState<"participants" | "workflow">("participants");

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
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setDetail(row);
                  setModalTab("participants");
                }}
                title="View Registered Participants & Submissions"
              >
                <Users className="size-3.5" aria-hidden /> Participants
              </Button>
              <button
                onClick={() => {
                  setDetail(row);
                  setModalTab("workflow");
                }}
                aria-label="Open competition judging controls"
                title="Judging & Session Controls"
                className="grid size-8 cursor-pointer place-items-center rounded-lg text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--brand)]"
              >
                <Gavel className="size-4" aria-hidden />
              </button>
              <Button
                size="sm"
                variant={row.is_published ? "secondary" : "success"}
                onClick={() => run(row.is_published ? "Unpublish" : "Publish",
                  () => (row.is_published ? competitionsApi.unpublish(rowId(row)) : competitionsApi.publish(rowId(row))), reload)}
              >
                {row.is_published ? "Unpublish" : "Publish"}
              </Button>
            </div>
          ),
          fields: [
            { name: "title", label: "Title", required: true, placeholder: "e.g. Big Classic Dance Competition" },
            { name: "category", label: "Category", half: true, placeholder: "Solo / Group / Freestyle" },
            { name: "max_participants", label: "Max participants", type: "number", half: true, placeholder: "e.g. 150" },
            {
              name: "card_image_url",
              label: "16:9 Desktop Image / Card",
              half: true,
              render: ({ value, onChange }) => (
                <ImageUploaderField
                  label="Desktop / Card Image"
                  aspectRatioLabel="16:9 Aspect Ratio"
                  aspectClass="w-32 aspect-video"
                  value={value}
                  onChange={onChange}
                  onUpload={(f) => competitionsApi.uploadCard(f)}
                />
              ),
            },
            {
              name: "banner_image_url",
              label: "9:16 Mobile Image / Banner",
              half: true,
              render: ({ value, onChange }) => (
                <ImageUploaderField
                  label="Mobile Banner Image"
                  aspectRatioLabel="9:16 Aspect Ratio"
                  aspectClass="w-16 aspect-[9/16]"
                  value={value}
                  onChange={onChange}
                  onUpload={(f) => competitionsApi.uploadBanner(f)}
                />
              ),
            },
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
            {
              name: "judging_criteria",
              label: "Dynamic Judging Criteria",
              defaultValue: [
                { name: "Skill & Technique", max_score: 10, weight: 1.0, display_order: 1 },
                { name: "Creativity & Style", max_score: 10, weight: 1.0, display_order: 2 },
                { name: "Overall Impression", max_score: 10, weight: 1.0, display_order: 3 },
              ],
              render: ({ value, onChange }) => (
                <JudgingCriteriaBuilder value={value} onChange={onChange} />
              ),
            },
          ],
          toForm: (r: any) => ({
            title: r.title || r.name || "",
            description: r.description || "",
            category: r.category || "",
            card_image_url: r.card_image_url || r.image_url || "",
            banner_image_url: r.banner_image_url || r.banner_url || "",
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
            judging_criteria: Array.isArray(r.judging_criteria) && r.judging_criteria.length
              ? r.judging_criteria
              : [
                  { name: "Skill & Technique", max_score: 10, weight: 1.0, display_order: 1 },
                  { name: "Creativity & Style", max_score: 10, weight: 1.0, display_order: 2 },
                  { name: "Overall Impression", max_score: 10, weight: 1.0, display_order: 3 },
                ],
            is_published: !!r.is_published,
          }),
          toBody: (v: any, editing: any) => {
            const toIso = (val?: string | null) => {
              if (!val) return null;
              const d = new Date(val);
              return isNaN(d.getTime()) ? null : d.toISOString();
            };

            const voteEnabled = v.audience_voting_enabled !== undefined ? !!v.audience_voting_enabled : true;
            let judgeEnabled = v.judge_scoring_enabled !== undefined ? !!v.judge_scoring_enabled : true;
            if (!voteEnabled && !judgeEnabled) {
              judgeEnabled = true;
            }

            const cleanCriteria = Array.isArray(v.judging_criteria) && v.judging_criteria.length
              ? v.judging_criteria.map((c: any, idx: number) => ({
                  name: String(c.name || `Criterion ${idx + 1}`).trim(),
                  description: c.description ? String(c.description).trim() : null,
                  max_score: Number(c.max_score) || 10,
                  weight: Number(c.weight) || 1.0,
                  display_order: idx + 1,
                }))
              : judgeEnabled
              ? [
                  { name: "Skill & Technique", max_score: 10, weight: 1.0, display_order: 1 },
                  { name: "Creativity & Style", max_score: 10, weight: 1.0, display_order: 2 },
                  { name: "Overall Impression", max_score: 10, weight: 1.0, display_order: 3 },
                ]
              : [];

            if (editing) {
              return {
                title: v.title ? String(v.title).trim() : undefined,
                description: v.description !== undefined ? String(v.description || "").trim() : undefined,
                category: v.category ? String(v.category).trim() : undefined,
                card_image_url: v.card_image_url ? String(v.card_image_url).trim() : null,
                image_url: v.card_image_url ? String(v.card_image_url).trim() : null,
                banner_image_url: v.banner_image_url ? String(v.banner_image_url).trim() : null,
                banner_url: v.banner_image_url ? String(v.banner_image_url).trim() : null,
                is_published: !!v.is_published,
                audience_voting_enabled: voteEnabled,
                judge_scoring_enabled: judgeEnabled,
                judging_criteria: cleanCriteria,
              };
            }

            const sDate = toIso(v.start_date) || new Date().toISOString();
            const eDate = toIso(v.end_date) || new Date(Date.now() + 7 * 86400000).toISOString();
            const regStart = toIso(v.registration_start_date) || new Date().toISOString();
            const regEnd = toIso(v.registration_deadline) || sDate;
            const subEnd = toIso(v.submission_deadline) || eDate;

            const audienceWeight = voteEnabled && judgeEnabled ? 0.5 : voteEnabled ? 1.0 : 0.0;
            const judgeWeight = voteEnabled && judgeEnabled ? 0.5 : judgeEnabled ? 1.0 : 0.0;

            return {
              title: String(v.title || "").trim(),
              description: String(v.description || v.title || "").trim(),
              category: String(v.category || "General").trim() || "General",
              type: "General",
              card_image_url: v.card_image_url ? String(v.card_image_url).trim() : null,
              image_url: v.card_image_url ? String(v.card_image_url).trim() : null,
              banner_image_url: v.banner_image_url ? String(v.banner_image_url).trim() : null,
              banner_url: v.banner_image_url ? String(v.banner_image_url).trim() : null,
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
              judging_criteria: cleanCriteria,
              /* No commas in a field name: entries are posted to the API as a
                 single comma separated field_names string, so a comma inside
                 the name splits it in two and the entry is rejected as a
                 missing required field. */
              dynamic_submission_fields: [
                { name: "Performance Entry (Video / Audio / Link)", label: "Performance Entry (Video / Audio / Link)", type: "VIDEO", required: true, display_order: 1 },
                { name: "Portfolio / Photos", label: "Photos or Portfolio", type: "IMAGE", required: false, display_order: 2 },
              ],
            };
          },
        }}
      />

      <CompetitionControls
        comp={detail}
        initialTab={modalTab}
        onClose={() => setDetail(null)}
        onAction={run}
      />
      {dialog}
    </div>
  );
}

function CompetitionControls({
  comp, onClose, onAction, initialTab = "participants",
}: {
  comp: any | null;
  onClose: () => void;
  onAction: (label: string, fn: () => Promise<any>, reload: () => void, confirmText?: string) => void;
  initialTab?: "participants" | "workflow";
}) {
  const id = comp ? rowId(comp) : "";
  const [activeTab, setActiveTab] = useState<"participants" | "workflow">(initialTab);

  const { data, loading, reload } = useResource(
    async () => (!id ? null : {
      overview: await safe(competitionsApi.overview(id), null),
      progress: await safe(competitionsApi.judgingProgress(id), null),
      judges: await safe(judgesApi.list({ limit: 200 }), []),
    }),
    [id]
  );

  const [pin, setPin] = useState("");

  const actions = [
    { label: "Close judging session", Icon: Gavel, fn: () => competitionsApi.closeSession(id) },
    { label: "Close audience voting", Icon: Lock, fn: () => competitionsApi.closeVoting(id), confirm: "Voting cannot be reopened from here." },
    { label: "Lock judging", Icon: Lock, fn: () => competitionsApi.lockJudging(id), confirm: "Judges will no longer be able to change scores." },
    { label: "Recalculate rankings", Icon: RefreshCw, fn: () => competitionsApi.recalculate(id) },
    { label: "Start finalization", Icon: Trophy, fn: () => competitionsApi.startFinalization(id) },
    { label: "Approve results", Icon: Trophy, fn: () => competitionsApi.approveResults(id), confirm: "Approved results become eligible for publishing." },
    { label: "Publish results", Icon: Send, fn: () => competitionsApi.publishResults(id), confirm: "Results go live on the public leaderboard." },
  ];

  return (
    <Modal
      open={!!comp}
      onClose={onClose}
      title={comp?.title || comp?.name || "Competition"}
      subtitle={activeTab === "participants" ? "Registered participants, verified payments, and submitted media" : "Judging session, voting and ranking controls"}
      wide
    >
      <div className="mb-5 flex gap-2 border-b border-[var(--border)] pb-3">
        <button
          onClick={() => setActiveTab("participants")}
          aria-pressed={activeTab === "participants"}
          className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
            activeTab === "participants"
              ? "bg-[var(--brand)] text-[var(--on-brand)]"
              : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-muted)] hover:text-white"
          }`}
        >
          <Users className="inline size-3.5 mr-1.5" /> Participants & Submissions
        </button>
        <button
          onClick={() => setActiveTab("workflow")}
          aria-pressed={activeTab === "workflow"}
          className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
            activeTab === "workflow"
              ? "bg-[var(--brand)] text-[var(--on-brand)]"
              : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-muted)] hover:text-white"
          }`}
        >
          <Gavel className="inline size-3.5 mr-1.5" /> Judging & Session Controls
        </button>
      </div>

      {activeTab === "participants" ? (
        <CompetitionParticipantsPanel compId={id} compTitle={comp?.title} />
      ) : loading ? (
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
            <div className="mb-3 flex flex-wrap items-end gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
              <div className="min-w-[160px] flex-1">
                <Field label="Session PIN" hint="Leave empty to open the session without a PIN.">
                  {(p) => (
                    <Input
                      {...p}
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="e.g. 4821"
                    />
                  )}
                </Field>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="mb-1 shrink-0"
                onClick={() =>
                  onAction(
                    "Open judging session",
                    async () => {
                      await competitionsApi.openSession(id, pin.trim() || undefined);
                      setPin("");
                    },
                    reload
                  )
                }
              >
                <Gavel className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">Open judging session</span>
              </Button>
            </div>

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

          <JudgesPanel
            compId={id}
            judges={data?.judges || []}
            progress={data?.progress}
            reload={reload}
          />
        </div>
      )}
    </Modal>
  );
}

function JudgesPanel({
  compId, judges, progress, reload,
}: {
  compId: string;
  judges: any[];
  progress: any;
  reload: () => void;
}) {
  const { push } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const details: any[] = progress?.judge_details || [];
  const assigned = new Map<string, any>(details.map((d: any) => [d.judge_email, d]));
  const rows = [...judges].sort(
    (a, b) => Number(assigned.has(b.email)) - Number(assigned.has(a.email))
  );

  const toggle = async (email: string, isAssigned: boolean) => {
    setBusy(email);
    try {
      const body = { judge_email: email, competition_id: compId };
      if (isAssigned) await judgesApi.unassign(body);
      else await judgesApi.assign(body);
      push("success", isAssigned ? `Removed ${email} from this competition.` : `Assigned ${email} to this competition.`);
      reload();
    } catch (e: any) {
      push("error", e?.message || "Could not update the assignment.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Panel
      title="Judges on this competition"
      subtitle="Assigned judges see this competition in their scoring portal."
      className="shadow-none"
      bodyClassName="p-0"
    >
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-[13px] text-[var(--fg-muted)]">
          No judges yet — add them from the Judges page first.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {rows.map((j) => {
            const isAssigned = assigned.has(j.email);
            const stat = assigned.get(j.email);
            return (
              <li key={j.email} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold">
                    {j.full_name || j.name || "Unnamed"}
                  </p>
                  <p className="truncate text-[11.5px] text-[var(--fg-muted)]">
                    {j.email}
                    {isAssigned && stat ? ` · ${stat.scored ?? 0} scored · ${stat.pending ?? 0} pending` : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={isAssigned ? "ghost" : "secondary"}
                  loading={busy === j.email}
                  disabled={!!busy && busy !== j.email}
                  onClick={() => toggle(j.email, isAssigned)}
                >
                  {isAssigned ? <UserMinus className="size-3.5" aria-hidden /> : <UserPlus className="size-3.5" aria-hidden />}
                  {isAssigned ? "Remove" : "Assign"}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function CompetitionParticipantsPanel({ compId, compTitle }: { compId: string; compTitle?: string }) {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const { data, loading, error, reload } = useResource(
    () => (!compId ? Promise.resolve(null) : competitionsApi.participants(compId, { limit: 200 })),
    [compId]
  );

  const rawParticipants = toRows(data?.participants);
  const totalRegistered = data?.total_registered ?? rawParticipants.length;
  const confirmedCount = data?.confirmed_count ?? rawParticipants.filter((p: any) => p.status === "CONFIRMED").length;
  const pendingCount = data?.pending_payment_count ?? rawParticipants.filter((p: any) => p.status === "PENDING").length;
  const submissionsCount = data?.submissions_count ?? rawParticipants.filter((p: any) => !!p.submission).length;
  const totalFees = data?.total_fees_collected ?? 0;

  const filtered = useMemo(() => {
    return rawParticipants.filter((p: any) => {
      const matchStatus = statusFilter === "ALL" || (p.status || "").toUpperCase() === statusFilter;
      const s = search.toLowerCase().trim();
      const matchSearch =
        !s ||
        (p.registration_reference || "").toLowerCase().includes(s) ||
        (p.user_email || "").toLowerCase().includes(s) ||
        (p.user_name || "").toLowerCase().includes(s) ||
        (p.user_phone || "").toLowerCase().includes(s);
      return matchStatus && matchSearch;
    });
  }, [rawParticipants, statusFilter, search]);

  return (
    <div className="flex flex-col gap-5 text-xs">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Registered" value={formatNumber(totalRegistered)} Icon={Users} accent index={0} />
        <StatCard label="Confirmed" value={formatNumber(confirmedCount)} Icon={CheckCircle2} index={1} />
        <StatCard label="Submissions" value={formatNumber(submissionsCount)} Icon={Video} index={2} />
        <StatCard label="Fees Collected" value={formatINR(totalFees)} Icon={Trophy} index={3} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: "ALL", label: "All Statuses" },
              { value: "CONFIRMED", label: "Confirmed" },
              { value: "PENDING", label: "Pending Payment" },
            ]}
            className="h-9 w-36 text-xs"
          />
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--fg-subtle)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search participants..."
              className="h-9 w-52 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] pl-8 pr-3 text-xs outline-none focus:border-[var(--brand)]"
            />
          </div>
        </div>
        <Button size="sm" variant="secondary" onClick={reload}>Refresh</Button>
      </div>

      <DataTable
        rows={filtered}
        loading={loading}
        error={error}
        onRetry={reload}
        empty={{ title: "No registered participants yet", body: "Users who register for this competition will display here with their submitted media." }}
        columns={[
          {
            key: "user",
            header: "Participant",
            render: (r: any) => (
              <div>
                <p className="font-semibold text-white">{r.user_name || "Participant"}</p>
                <p className="font-mono text-[11px] text-[var(--fg-muted)]">{r.user_email}</p>
                {r.user_phone && <p className="font-mono text-[10.5px] text-[var(--fg-subtle)]">{r.user_phone}</p>}
              </div>
            ),
          },
          {
            key: "registration_reference",
            header: "Reg Reference",
            render: (r: any) => (
              <div>
                <span className="font-mono font-bold text-[var(--brand)]">{r.registration_reference}</span>
                <span className="block text-[10.5px] text-[var(--fg-subtle)]">{formatDate(r.registered_at, true)}</span>
              </div>
            ),
          },
          {
            key: "fee",
            header: "Fee / Payment",
            render: (r: any) => (
              <div>
                <span className="font-semibold text-white">{formatINR(r.fee)}</span>
                <span className={`block text-[10px] font-bold uppercase ${r.payment_status === "PAID" || r.payment_status === "NOT_REQUIRED" ? "text-green-400" : "text-amber-400"}`}>
                  {r.payment_status}
                </span>
              </div>
            ),
          },
          {
            key: "status",
            header: "Registration",
            render: (r: any) => <StatusBadge value={r.status} />,
          },
          {
            key: "submission",
            header: "Submitted Files / Media",
            render: (r: any) => {
              const sub = r.submission;
              if (!sub) {
                return <span className="text-[11px] text-[var(--fg-subtle)]">Awaiting files</span>;
              }
              const files = sub.files || {};
              const entries = Object.entries(files);
              return (
                <div className="flex flex-col gap-1">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-400">
                    <CheckCircle2 className="size-3" /> {sub.status || "Submitted"}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {entries.map(([label, url]: any) => (
                      <a
                        key={label}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded bg-[var(--surface-3)] px-2 py-0.5 text-[10.5px] font-mono text-[var(--brand)] hover:underline"
                        title={label}
                      >
                        <Video className="size-3" /> {label} <ExternalLink className="size-2.5 opacity-60" />
                      </a>
                    ))}
                  </div>
                </div>
              );
            },
          },
        ]}
      />
    </div>
  );
}

