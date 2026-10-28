"use client";

import { useState, useMemo } from "react";
import {
  Gavel, Lock, Trophy, Send, RefreshCw, Eye, UserPlus, UserMinus,
  Users, FileText, ExternalLink, CheckCircle2, Video, Search, Phone, Mail,
  Upload, Loader2, Plus, Trash2, Image as ImageIcon,
  CreditCard, Banknote, CircleDollarSign, Clock, AlertCircle, Copy, Check, Filter, RotateCcw
} from "lucide-react";
import { CrudPage } from "@/components/Crud";
import { Button, Field, Input, Modal, Panel, StatusBadge, Loading, useResource, useConfirm, DataTable, Select } from "@/components/Kit";
import { KeyValues, StatCard } from "@/components/Dash";
import { useToast } from "@/components/Providers";
import { competitionsApi, judgesApi, safe, toRows } from "@/lib/api";
import { formatDate, formatINR, formatNumber, fromDateTimeInput, rowId, cn } from "@/lib/utils";

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
            { key: "start_date", header: "Starts", render: (r: any) => formatDate(r.start_date || r.starts_at, true) },
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
            { name: "start_date", label: "Competition starts (IST)", type: "datetime", half: true, required: true },
            { name: "end_date", label: "Competition ends (IST)", type: "datetime", half: true, required: true },
            { name: "registration_start_date", label: "Registration starts (IST)", type: "datetime", half: true, hint: "Defaults to now if empty" },
            { name: "registration_deadline", label: "Registration deadline (IST)", type: "datetime", half: true, hint: "Defaults to competition start if empty" },
            { name: "submission_deadline", label: "Submission deadline (IST)", type: "datetime", half: true, hint: "Defaults to competition end if empty" },
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
            const toIso = (val?: string | null) => fromDateTimeInput(val);

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
                max_participants: v.max_participants === "" || v.max_participants == null ? null : Number(v.max_participants),
                participation_fee: v.participation_fee === "" || v.participation_fee == null ? 0 : Number(v.participation_fee),
                min_age: v.min_age === "" || v.min_age == null ? null : Number(v.min_age),
                max_age: v.max_age === "" || v.max_age == null ? null : Number(v.max_age),
                start_date: toIso(v.start_date),
                end_date: toIso(v.end_date),
                registration_start_date: toIso(v.registration_start_date),
                registration_deadline: toIso(v.registration_deadline),
                submission_deadline: toIso(v.submission_deadline),
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
  const [filterMode, setFilterMode] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const { push } = useToast();

  const { data, loading, error, reload } = useResource(
    () => (!compId ? Promise.resolve(null) : competitionsApi.participants(compId, { limit: 500 })),
    [compId]
  );

  const rawParticipants = toRows(data?.participants);
  const totalRegistered = data?.total_registered ?? rawParticipants.length;
  const confirmedCount = data?.confirmed_count ?? rawParticipants.filter((p: any) => p.status === "CONFIRMED").length;
  const submissionsCount = data?.submissions_count ?? rawParticipants.filter((p: any) => !!p.submission).length;

  // Online metrics:
  const onlineTotal = data?.online_total ?? rawParticipants.filter((p: any) => p.payment_method === "ONLINE" || (!p.cash_payment && p.payment_method !== "CASH" && p.payment_method !== "FREE")).length;
  const onlinePaid = data?.online_paid ?? rawParticipants.filter((p: any) => (p.payment_method === "ONLINE" || (!p.cash_payment && p.payment_method !== "CASH")) && p.payment_status === "PAID").length;
  const onlinePending = data?.online_pending ?? rawParticipants.filter((p: any) => (p.payment_method === "ONLINE" || (!p.cash_payment && p.payment_method !== "CASH")) && p.payment_status !== "PAID" && Number(p.fee) > 0).length;
  const onlineFees = data?.online_fees_collected ?? rawParticipants.filter((p: any) => (p.payment_method === "ONLINE" || (!p.cash_payment && p.payment_method !== "CASH")) && p.payment_status === "PAID").reduce((sum: number, p: any) => sum + (Number(p.fee) || 0), 0);

  // Cash metrics:
  const cashTotal = data?.cash_total ?? rawParticipants.filter((p: any) => Boolean(p.cash_payment || p.payment_method === "CASH")).length;
  const cashCollected = data?.cash_collected ?? rawParticipants.filter((p: any) => Boolean(p.cash_payment || p.payment_method === "CASH") && (p.payment_status === "PAID" || p.cash_status === "COLLECTED" || p.cash_status === "PAID")).length;
  const cashPending = data?.cash_pending ?? rawParticipants.filter((p: any) => Boolean(p.cash_payment || p.payment_method === "CASH") && p.payment_status !== "PAID" && p.cash_status !== "COLLECTED" && p.cash_status !== "PAID").length;
  const cashFeesCollected = data?.cash_fees_collected ?? rawParticipants.filter((p: any) => Boolean(p.cash_payment || p.payment_method === "CASH") && (p.payment_status === "PAID" || p.cash_status === "COLLECTED" || p.cash_status === "PAID")).reduce((sum: number, p: any) => sum + (Number(p.fee) || 0), 0);
  const cashFeesPending = data?.cash_fees_pending ?? rawParticipants.filter((p: any) => Boolean(p.cash_payment || p.payment_method === "CASH") && p.payment_status !== "PAID" && p.cash_status !== "COLLECTED" && p.cash_status !== "PAID").reduce((sum: number, p: any) => sum + (Number(p.fee) || 0), 0);

  const totalFees = data?.total_fees_collected ?? (onlineFees + cashFeesCollected);

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedRef(text);
    push("info", `Copied "${text}" to clipboard`);
    setTimeout(() => setCopiedRef(null), 2200);
  };

  const handleConfirmCash = async (regId: string, name: string, fee: number) => {
    setActionLoading(regId);
    try {
      await competitionsApi.confirmCashPayment(compId, regId);
      push("success", `Cash payment of ${formatINR(fee)} confirmed for ${name || "participant"}!`);
      reload();
    } catch (err: any) {
      push("error", err?.message || "Failed to confirm cash payment.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevertCash = async (regId: string, name: string) => {
    if (!confirm(`Revert cash payment status for ${name || "this participant"} back to pending?`)) return;
    setActionLoading(regId);
    try {
      await competitionsApi.revertCashPayment(compId, regId);
      push("info", `Cash payment reverted to pending for ${name || "participant"}.`);
      reload();
    } catch (err: any) {
      push("error", err?.message || "Failed to revert cash payment.");
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = useMemo(() => {
    return rawParticipants.filter((p: any) => {
      const isCash = Boolean(p.cash_payment || p.payment_method === "CASH");
      const isFree = p.payment_method === "FREE" || Number(p.fee) === 0 || p.payment_status === "NOT_REQUIRED";
      const isPaid = p.payment_status === "PAID" || p.cash_status === "COLLECTED" || p.cash_status === "PAID";

      let matchFilter = true;
      if (filterMode === "ONLINE_PAID") {
        matchFilter = !isCash && !isFree && p.payment_status === "PAID";
      } else if (filterMode === "ONLINE_PENDING") {
        matchFilter = !isCash && !isFree && p.payment_status !== "PAID";
      } else if (filterMode === "CASH_ALL") {
        matchFilter = isCash;
      } else if (filterMode === "CASH_PENDING") {
        matchFilter = isCash && !isPaid;
      } else if (filterMode === "CASH_COLLECTED") {
        matchFilter = isCash && isPaid;
      } else if (filterMode === "FREE") {
        matchFilter = isFree;
      } else if (filterMode === "CONFIRMED") {
        matchFilter = p.status === "CONFIRMED";
      } else if (filterMode === "PENDING") {
        matchFilter = p.status === "PENDING";
      }

      const s = search.toLowerCase().trim();
      const matchSearch =
        !s ||
        (p.registration_reference || "").toLowerCase().includes(s) ||
        (p.user_email || "").toLowerCase().includes(s) ||
        (p.user_name || "").toLowerCase().includes(s) ||
        (p.user_phone || "").toLowerCase().includes(s) ||
        (isCash ? "cash venue offline spot" : "online upi card razorpay").includes(s);

      return matchFilter && matchSearch;
    });
  }, [rawParticipants, filterMode, search]);

  return (
    <div className="flex flex-col gap-5 text-xs">
      {/* ── Top Stat Cards with Online vs Cash Breakdown ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Total Registered"
          value={formatNumber(totalRegistered)}
          hint={`${confirmedCount} confirmed • ${submissionsCount} media`}
          Icon={Users}
          accent
          index={0}
        />
        <StatCard
          label="Online Payments"
          value={`${onlinePaid} Paid`}
          hint={onlinePending > 0 ? `${onlinePending} Pending • ${formatINR(onlineFees)}` : `${formatINR(onlineFees)} collected`}
          Icon={CreditCard}
          index={1}
        />
        <StatCard
          label="Cash at Venue"
          value={`${cashTotal} Chosen`}
          hint={`${cashCollected} Received • ${cashPending} Pending`}
          Icon={Banknote}
          index={2}
        />
        <StatCard
          label="Submissions"
          value={formatNumber(submissionsCount)}
          hint="Media entries submitted"
          Icon={Video}
          index={3}
        />
        <StatCard
          label="Revenue Collected"
          value={formatINR(totalFees)}
          hint={cashFeesPending > 0 ? `+${formatINR(cashFeesPending)} cash pending` : "All fees collected"}
          Icon={CircleDollarSign}
          index={4}
        />
      </div>

      {/* ── Filter Pills & Search Bar ── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Quick Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterMode("ALL")}
              className={cn(
                "cursor-pointer rounded-xl px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5",
                filterMode === "ALL"
                  ? "bg-[var(--brand)] text-[var(--on-brand)] shadow-sm"
                  : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-muted)] hover:text-white"
              )}
            >
              <Users className="size-3.5" /> All ({totalRegistered})
            </button>

            <button
              type="button"
              onClick={() => setFilterMode("ONLINE_PAID")}
              className={cn(
                "cursor-pointer rounded-xl px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5",
                filterMode === "ONLINE_PAID"
                  ? "bg-sky-500/25 text-sky-200 border border-sky-500/50 shadow-sm"
                  : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-muted)] hover:text-sky-300"
              )}
            >
              <CreditCard className="size-3.5 text-sky-400" /> Online Paid ({onlinePaid})
            </button>

            {onlinePending > 0 && (
              <button
                type="button"
                onClick={() => setFilterMode("ONLINE_PENDING")}
                className={cn(
                  "cursor-pointer rounded-xl px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5",
                  filterMode === "ONLINE_PENDING"
                    ? "bg-amber-500/25 text-amber-200 border border-amber-500/50 shadow-sm"
                    : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-muted)] hover:text-amber-300"
                )}
              >
                <Clock className="size-3.5 text-amber-400" /> Online Pending ({onlinePending})
              </button>
            )}

            <button
              type="button"
              onClick={() => setFilterMode("CASH_ALL")}
              className={cn(
                "cursor-pointer rounded-xl px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5",
                filterMode === "CASH_ALL"
                  ? "bg-amber-500/25 text-amber-200 border border-amber-500/50 shadow-sm"
                  : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-muted)] hover:text-amber-300"
              )}
            >
              <Banknote className="size-3.5 text-amber-400" /> Cash on Venue ({cashTotal})
            </button>

            <button
              type="button"
              onClick={() => setFilterMode("CASH_PENDING")}
              className={cn(
                "cursor-pointer rounded-xl px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5",
                filterMode === "CASH_PENDING"
                  ? "bg-amber-500 text-black font-bold shadow-md"
                  : "border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
              )}
            >
              <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
              Cash Pending ({cashPending})
            </button>

            <button
              type="button"
              onClick={() => setFilterMode("CASH_COLLECTED")}
              className={cn(
                "cursor-pointer rounded-xl px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5",
                filterMode === "CASH_COLLECTED"
                  ? "bg-emerald-500/25 text-emerald-200 border border-emerald-500/50 shadow-sm"
                  : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-muted)] hover:text-emerald-300"
              )}
            >
              <CheckCircle2 className="size-3.5 text-emerald-400" /> Cash Received ({cashCollected})
            </button>
          </div>

          {/* Search & Refresh */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--fg-subtle)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, phone, cash..."
                className="h-9 w-60 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] pl-8 pr-3 text-xs outline-none focus:border-[var(--brand)] transition-colors"
              />
            </div>
            <Button size="sm" variant="secondary" onClick={reload}>
              <RefreshCw className="size-3 mr-1" /> Refresh
            </Button>
          </div>
        </div>

        {/* Informative helper banner for cash collection */}
        {cashPending > 0 && (
          <div className="flex items-center justify-between rounded-xl border border-amber-500/25 bg-amber-500/10 px-3.5 py-2 text-[11px] text-amber-200">
            <div className="flex items-center gap-2">
              <Banknote className="size-4 shrink-0 text-amber-400" />
              <span>
                <strong className="font-semibold text-amber-300">{cashPending} participant{cashPending > 1 ? "s" : ""}</strong> selected <strong>Cash on Venue</strong> payment (Total <strong className="font-semibold text-white">{formatINR(cashFeesPending)}</strong> pending collection). You can verify and collect cash on the spot using the button below.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setFilterMode("CASH_PENDING")}
              className="cursor-pointer whitespace-nowrap rounded-lg bg-amber-500/20 px-2 py-0.5 font-bold text-amber-300 hover:bg-amber-500/30"
            >
              View pending cash →
            </button>
          </div>
        )}
      </div>

      {/* ── Participants Table with Rich Payment Badges & Actions ── */}
      <DataTable
        rows={filtered}
        loading={loading}
        error={error}
        onRetry={reload}
        empty={{
          title: "No participants match your filter",
          body: search || filterMode !== "ALL"
            ? "Try resetting your search query or payment filters above."
            : "Users who register for this competition will display here with their payment mode and submitted media."
        }}
        columns={[
          {
            key: "user",
            header: "Participant",
            render: (r: any) => {
              const initial = ((r.user_name || r.user_email || "P").trim()[0] || "P").toUpperCase();
              return (
                <div className="flex items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/30 to-indigo-600/30 border border-violet-500/30 font-bold text-violet-200 text-xs shadow-inner">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{r.user_name || "Participant"}</p>
                    <a
                      href={`mailto:${r.user_email}`}
                      className="block font-mono text-[11px] text-[var(--fg-muted)] hover:text-white truncate"
                    >
                      {r.user_email}
                    </a>
                    {r.user_phone && (
                      <a
                        href={`tel:${r.user_phone}`}
                        className="inline-flex items-center gap-1 font-mono text-[10.5px] text-[var(--fg-subtle)] hover:text-white"
                      >
                        <Phone className="size-2.5" /> {r.user_phone}
                      </a>
                    )}
                  </div>
                </div>
              );
            },
          },
          {
            key: "registration_reference",
            header: "Reg Reference",
            render: (r: any) => (
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-[var(--brand)] tracking-wider">
                    {r.registration_reference}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(r.registration_reference)}
                    title="Copy registration reference"
                    className="cursor-pointer text-[var(--fg-subtle)] hover:text-white transition-colors"
                  >
                    {copiedRef === r.registration_reference ? (
                      <Check className="size-3 text-emerald-400" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </button>
                </div>
                <span className="block text-[10.5px] text-[var(--fg-subtle)]">
                  {formatDate(r.registered_at, true)}
                </span>
              </div>
            ),
          },
          {
            key: "fee",
            header: "Fee / Payment Method",
            render: (r: any) => {
              const isCash = Boolean(r.cash_payment || r.payment_method === "CASH");
              const isFree = r.payment_method === "FREE" || Number(r.fee) === 0 || r.payment_status === "NOT_REQUIRED";
              const isPaid = r.payment_status === "PAID" || r.cash_status === "COLLECTED" || r.cash_status === "PAID";

              if (isFree) {
                return (
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/40 bg-purple-500/15 px-2.5 py-0.5 text-[10.5px] font-bold text-purple-300">
                      <Trophy className="size-3 text-purple-400" /> Free Entry
                    </span>
                    <span className="block mt-1 text-[10.5px] text-[var(--fg-subtle)] font-medium">
                      No Fee Required
                    </span>
                  </div>
                );
              }

              if (isCash) {
                return (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-[13px]">{formatINR(r.fee)}</span>
                      <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10.5px] font-bold tracking-wide text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.12)]">
                        <Banknote className="size-3 text-amber-400" /> Cash on Venue
                      </span>
                    </div>

                    {isPaid ? (
                      <div>
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
                          <CheckCircle2 className="size-3.5 shrink-0" />
                          <span>Cash Received at Venue</span>
                          <button
                            type="button"
                            title="Revert cash payment back to pending"
                            disabled={actionLoading === r._id}
                            onClick={() => handleRevertCash(r._id, r.user_name)}
                            className="cursor-pointer ml-1 text-[10px] text-[var(--fg-subtle)] hover:text-amber-400 underline"
                          >
                            Revert
                          </button>
                        </div>
                        {r.cash_collected_at && (
                          <span className="block text-[10px] font-mono text-[var(--fg-subtle)]">
                            Collected: {formatDate(r.cash_collected_at, true)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1 mt-0.5">
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-300">
                          <Clock className="size-3 shrink-0 animate-pulse text-amber-400" />
                          <span>User chose Cash payment (Pending)</span>
                        </div>
                        <button
                          type="button"
                          disabled={actionLoading === r._id}
                          onClick={() => handleConfirmCash(r._id, r.user_name, r.fee)}
                          className="cursor-pointer mt-0.5 inline-flex items-center gap-1.5 w-fit rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10.5px] px-2.5 py-1 transition-all shadow-sm disabled:opacity-50"
                        >
                          {actionLoading === r._id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Check className="size-3" />
                          )}
                          Mark Cash Collected
                        </button>
                      </div>
                    )}
                  </div>
                );
              }

              // Online payment
              return (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-[13px]">{formatINR(r.fee)}</span>
                    <span className="inline-flex items-center gap-1 rounded-md border border-sky-500/40 bg-sky-500/15 px-2 py-0.5 text-[10.5px] font-bold tracking-wide text-sky-300 shadow-[0_0_12px_rgba(14,165,233,0.12)]">
                      <CreditCard className="size-3 text-sky-400" /> Online Payment
                    </span>
                  </div>

                  {r.payment_status === "PAID" ? (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
                      <CheckCircle2 className="size-3.5 shrink-0" />
                      <span>Paid Online</span>
                    </div>
                  ) : r.payment_status === "FAILED" ? (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-400">
                      <AlertCircle className="size-3.5 shrink-0" />
                      <span>Payment Failed</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-400">
                      <Clock className="size-3.5 shrink-0" />
                      <span>Online Payment Pending</span>
                    </div>
                  )}
                </div>
              );
            },
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

