"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Gavel, Lock, Trophy, Send, RefreshCw, Eye, EyeOff, UserPlus, UserMinus,
  Users, FileText, ExternalLink, CheckCircle2, Video, Search, Phone, Mail,
  Upload, Loader2, Plus, Trash2, Image as ImageIcon,
  CreditCard, Banknote, CircleDollarSign, Clock, AlertCircle, Copy, Check, Filter, RotateCcw,
  ShieldCheck, ShieldAlert, BadgeCheck, Radio, Mic, SkipForward, Play, Square,
  Link2, Music, FileUp, Sparkles, UserCheck, XCircle, Layers, ArrowRight, Settings, CheckSquare
} from "lucide-react";
import { CrudPage } from "@/components/Crud";
import { Button, Field, Input, Modal, Panel, StatusBadge, Loading, useResource, useConfirm, DataTable, Select } from "@/components/Kit";
import { KeyValues, StatCard } from "@/components/Dash";
import { useToast } from "@/components/Providers";
import VerifiedBadge from "@/components/VerifiedBadge";
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

interface CompCategoryItem {
  name: string;
  min_age?: number | null;
  max_age?: number | null;
  age_limit?: string;
  description?: string;
}

function CompetitionCategoriesBuilder({
  value,
  onChange,
}: {
  value: CompCategoryItem[] | undefined;
  onChange: (v: CompCategoryItem[]) => void;
}) {
  const categories: CompCategoryItem[] = Array.isArray(value) ? value : [];

  const updateItem = (idx: number, patch: Partial<CompCategoryItem>) => {
    const next = [...categories];
    const updated = { ...next[idx], ...patch };
    if (updated.min_age != null && updated.max_age != null) {
      updated.age_limit = `${updated.min_age}-${updated.max_age} years`;
    } else if (updated.min_age != null) {
      updated.age_limit = `${updated.min_age}+ years`;
    } else if (updated.max_age != null) {
      updated.age_limit = `Up to ${updated.max_age} years`;
    } else {
      updated.age_limit = "Open for all ages";
    }
    next[idx] = updated;
    onChange(next);
  };

  const removeItem = (idx: number) => {
    onChange(categories.filter((_, i) => i !== idx));
  };

  const addItem = (cat: CompCategoryItem = { name: "", min_age: 8, max_age: 14, description: "" }) => {
    onChange([...categories, cat]);
  };

  const applyPreset = (preset: CompCategoryItem[]) => {
    onChange(preset);
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
        <div>
          <div className="flex items-center gap-1.5 font-semibold text-xs text-[var(--fg)]">
            <Trophy className="size-4 text-[var(--brand)]" />
            Competition Categories &amp; Age Divisions
          </div>
          <p className="text-[11px] text-[var(--fg-muted)]">
            Define divisions (e.g. Sub-Junior: 3-7, Junior: 8-14, Senior: 15-28). Contestants select their division during registration.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-mono text-[var(--fg-muted)] uppercase">Presets:</span>
          <button
            type="button"
            onClick={() =>
              applyPreset([
                { name: "Sub-Junior", min_age: 3, max_age: 7, age_limit: "3-7 years", description: "Ages 3 to 7 years" },
                { name: "Junior", min_age: 8, max_age: 14, age_limit: "8-14 years", description: "Ages 8 to 14 years" },
                { name: "Senior", min_age: 15, max_age: 28, age_limit: "15-28 years", description: "Ages 15 to 28 years" },
              ])
            }
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] font-medium text-[var(--fg)] hover:border-[var(--brand)] hover:text-[var(--brand)] transition-colors"
          >
            Sub-Jr / Jr / Sr
          </button>
          <button
            type="button"
            onClick={() =>
              applyPreset([
                { name: "Junior", min_age: 6, max_age: 14, age_limit: "6-14 years", description: "Junior division (6-14 years)" },
                { name: "Senior", min_age: 15, max_age: 30, age_limit: "15-30 years", description: "Senior division (15-30 years)" },
              ])
            }
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] font-medium text-[var(--fg)] hover:border-[var(--brand)] hover:text-[var(--brand)] transition-colors"
          >
            Junior &amp; Senior
          </button>
          <button
            type="button"
            onClick={() =>
              applyPreset([
                { name: "Solo", min_age: null, max_age: null, age_limit: "Open for all ages", description: "Solo performers" },
                { name: "Duet", min_age: null, max_age: null, age_limit: "Open for all ages", description: "Duet performers" },
                { name: "Group", min_age: null, max_age: null, age_limit: "Open for all ages", description: "Group performers" },
              ])
            }
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] font-medium text-[var(--fg)] hover:border-[var(--brand)] hover:text-[var(--brand)] transition-colors"
          >
            Solo/Duet/Group
          </button>
          <button
            type="button"
            onClick={() => addItem()}
            className="inline-flex items-center gap-1 rounded-lg bg-[var(--brand)] px-2.5 py-1 text-[11px] font-bold text-[var(--on-brand)] shadow-sm hover:opacity-90"
          >
            <Plus className="size-3" /> Add Category
          </button>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="py-6 text-center text-xs text-[var(--fg-muted)] border border-dashed border-[var(--border)] rounded-xl">
          <p>No separate categories defined yet.</p>
          <p className="mt-1 text-[11px]">
            Click <strong>Sub-Jr / Jr / Sr</strong> above to automatically configure age-based categories, or add custom ones.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {categories.map((c, idx) => (
            <div
              key={idx}
              className="relative flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-xs"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="grid size-6 place-items-center rounded-md bg-[var(--surface-2)] text-[10.5px] font-mono font-bold text-[var(--fg-muted)]">
                  #{idx + 1}
                </span>

                {/* Category Name */}
                <div className="flex-1 min-w-[140px]">
                  <input
                    type="text"
                    value={c.name}
                    onChange={(e) => updateItem(idx, { name: e.target.value })}
                    placeholder="Category Name (e.g. Sub-Junior, Junior, Senior)"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-xs font-semibold text-[var(--fg)] outline-none focus:border-[var(--brand)]"
                  />
                </div>

                {/* Min Age */}
                <div className="w-24">
                  <input
                    type="number"
                    value={c.min_age ?? ""}
                    onChange={(e) => updateItem(idx, { min_age: e.target.value ? Number(e.target.value) : null })}
                    placeholder="Min Age"
                    title="Minimum Age for this category"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-xs font-mono text-[var(--fg)] outline-none focus:border-[var(--brand)]"
                  />
                </div>

                {/* Max Age */}
                <div className="w-24">
                  <input
                    type="number"
                    value={c.max_age ?? ""}
                    onChange={(e) => updateItem(idx, { max_age: e.target.value ? Number(e.target.value) : null })}
                    placeholder="Max Age"
                    title="Maximum Age for this category"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-xs font-mono text-[var(--fg)] outline-none focus:border-[var(--brand)]"
                  />
                </div>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="grid size-8 place-items-center rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                  title="Remove this category"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>

              {/* Description */}
              <div>
                <input
                  type="text"
                  value={c.description || ""}
                  onChange={(e) => updateItem(idx, { description: e.target.value })}
                  placeholder="Optional division description / rules (e.g. Kids aged 3 to 7 years)"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[11.5px] text-[var(--fg-muted)] outline-none focus:border-[var(--brand)]"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const SUBMISSION_PRESETS = [
  {
    id: "link_only",
    label: "🔗 Drive / YouTube Link Only",
    hint: "Contestants only submit a video/drive link (No file or MP3 upload)",
    fields: [
      {
        name: "Performance Link",
        label: "YouTube / Drive Video Link",
        type: "URL",
        required: true,
        allowed_formats: ["youtube", "drive", "url"],
        description: "Submit public YouTube video or Google Drive link",
        display_order: 1,
      },
    ],
  },
  {
    id: "audio_only",
    label: "🎵 MP3 Audio Only",
    hint: "Contestants only upload an MP3 audio recording (.mp3 only)",
    fields: [
      {
        name: "Audition Audio Track",
        label: "MP3 Audio Recording",
        type: "AUDIO",
        required: true,
        allowed_formats: ["mp3"],
        max_size_mb: 20.0,
        description: "Upload an MP3 audio file (.mp3 only)",
        display_order: 1,
      },
    ],
  },
  {
    id: "link_and_audio",
    label: "🌟 Link + MP3 Audio",
    hint: "Both a video link (Drive/YouTube) and audio MP3 are accepted",
    fields: [
      {
        name: "Performance Link",
        label: "YouTube / Drive Video Link",
        type: "URL",
        required: true,
        allowed_formats: ["youtube", "drive", "url"],
        description: "Submit YouTube or Google Drive performance video link",
        display_order: 1,
      },
      {
        name: "Backing Audio Track",
        label: "MP3 Audio Track (Optional)",
        type: "AUDIO",
        required: false,
        allowed_formats: ["mp3"],
        max_size_mb: 20.0,
        description: "Upload MP3 backing or vocal soundtrack",
        display_order: 2,
      },
    ],
  },
  {
    id: "file_only",
    label: "📁 Document / Portfolio",
    hint: "Contestants upload portfolio, photos or documents (.pdf, images, .zip)",
    fields: [
      {
        name: "Portfolio Submission",
        label: "Portfolio Document / Photos",
        type: "DOCUMENT",
        required: true,
        allowed_formats: ["pdf", "docx", "png", "jpg", "zip"],
        max_size_mb: 25.0,
        description: "Upload PDF or image portfolio",
        display_order: 1,
      },
    ],
  },
  {
    id: "all_formats",
    label: "🎛️ Full (Link + Audio + Portfolio)",
    hint: "Configures all 3 formats for comprehensive multi-stage submissions",
    fields: [
      {
        name: "Performance Video Link",
        label: "YouTube / Drive Video Link",
        type: "URL",
        required: true,
        display_order: 1,
      },
      {
        name: "Audition Audio File",
        label: "MP3 Audio Track",
        type: "AUDIO",
        required: false,
        display_order: 2,
      },
      {
        name: "Portfolio / Photos",
        label: "Photos or Portfolio Document",
        type: "DOCUMENT",
        required: false,
        display_order: 3,
      },
    ],
  },
];

function SubmissionFieldsBuilder({
  value,
  onChange,
}: {
  value?: any[];
  onChange: (val: any[]) => void;
}) {
  const fields = Array.isArray(value) && value.length > 0 ? value : [];

  const addField = () => {
    const nextOrder = fields.length + 1;
    onChange([
      ...fields,
      {
        name: `Submission Field ${nextOrder}`,
        label: `Submission Field ${nextOrder}`,
        type: "URL",
        required: true,
        display_order: nextOrder,
      },
    ]);
  };

  const removeField = (idx: number) => {
    onChange(fields.filter((_, i) => i !== idx));
  };

  const updateField = (idx: number, patch: Partial<any>) => {
    onChange(
      fields.map((f, i) => {
        if (i !== idx) return f;
        const updated = { ...f, ...patch };
        if (patch.label && (!f.name || f.name === f.label)) {
          updated.name = patch.label;
        }
        return updated;
      })
    );
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-[var(--fg)] flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-amber-400" /> Submission Requirements &amp; Formats
          </p>
          <p className="text-[11px] text-[var(--fg-muted)]">
            Configure what participants must submit. If only a link is added, participants only see the link field (no MP3/video upload needed).
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={addField} type="button">
          <Plus className="size-3.5" /> Add Field
        </Button>
      </div>

      {/* Quick 1-click Preset Selector */}
      <div className="flex flex-col gap-1.5 pt-1">
        <p className="text-[10px] font-semibold text-[var(--fg-subtle)] uppercase tracking-wider">Quick Presets:</p>
        <div className="flex flex-wrap gap-1.5">
          {SUBMISSION_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(p.fields)}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--fg-muted)] hover:border-[var(--brand)] hover:text-[var(--brand)] hover:bg-[var(--surface-2)] transition-all"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {fields.length === 0 ? (
        <div className="text-center py-4 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--fg-subtle)]">
          <p className="italic">No submission fields configured. Choose a preset above or click &quot;Add Field&quot;.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {fields.map((f, idx) => {
            const fType = String(f.type || "URL").toUpperCase();
            return (
              <div
                key={idx}
                className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5 shadow-sm"
              >
                <div className="flex items-center gap-2 shrink-0">
                  <span className="grid size-5 place-items-center rounded bg-[var(--surface-2)] text-[10px] font-bold text-[var(--fg-subtle)]">
                    #{idx + 1}
                  </span>
                  {fType === "URL" ? (
                    <Link2 className="size-3.5 text-sky-400" />
                  ) : fType === "VIDEO" ? (
                    <Video className="size-3.5 text-rose-400" />
                  ) : fType === "AUDIO" ? (
                    <Music className="size-3.5 text-violet-400" />
                  ) : (
                    <FileUp className="size-3.5 text-amber-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={f.label || f.name || ""}
                    onChange={(e) => updateField(idx, { label: e.target.value, name: e.target.value })}
                    placeholder="Field Label (e.g. YouTube / Drive Video Link)"
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1 text-xs font-semibold text-[var(--fg)] focus:border-[var(--brand)] focus:outline-none"
                  />
                </div>

                <div className="w-full sm:w-44 shrink-0">
                  <select
                    value={fType}
                    onChange={(e) => updateField(idx, { type: e.target.value })}
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs font-medium text-[var(--fg)] focus:border-[var(--brand)] focus:outline-none"
                  >
                    <option value="URL">🔗 Drive / YouTube Link</option>
                    <option value="VIDEO">🔴 YouTube Link Only</option>
                    <option value="AUDIO">🎵 MP3 Audio Upload</option>
                    <option value="DOCUMENT">📁 Document / PDF Upload</option>
                    <option value="IMAGE">🖼️ Photo / Image Upload</option>
                  </select>
                </div>

                <div className="flex items-center justify-between sm:justify-start gap-2 shrink-0">
                  <label className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--fg-muted)] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={f.required !== false}
                      onChange={(e) => updateField(idx, { required: e.target.checked })}
                      className="size-3.5 accent-[var(--brand)] rounded"
                    />
                    Required
                  </label>

                  <button
                    type="button"
                    onClick={() => removeField(idx)}
                    className="grid size-7 place-items-center rounded text-[var(--danger)] hover:bg-[var(--surface-3)] transition-colors"
                    title="Remove Field"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CompetitionsPage() {
  const { push } = useToast();
  const { confirm, dialog } = useConfirm();
  const [detail, setDetail] = useState<any | null>(null);
  const [modalTab, setModalTab] = useState<"participants" | "workflow" | "stage">("participants");

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
                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                  <span className="truncate text-[11.5px] text-[var(--fg-muted)]">{r.category || r.type || "General"}</span>
                  {Array.isArray(r.categories) && r.categories.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1">
                      {r.categories.map((c: any, i: number) => (
                        <span key={i} className="inline-flex items-center rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/20">
                          {c.name} {c.age_limit ? `(${c.age_limit})` : (c.min_age != null || c.max_age != null ? `(${c.min_age ?? 0}-${c.max_age ?? "+"}y)` : "")}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) },
            { key: "status", header: "Status", render: (r: any) => <StatusBadge value={r.status || r.state} /> },
            { key: "is_published", header: "Published", render: (r: any) => <StatusBadge value={r.is_published ? "published" : "draft"} /> },
            { key: "start_date", header: "Starts", render: (r: any) => formatDate(r.start_date || r.starts_at, true) },
            { key: "registration_deadline", header: "Reg Deadline", render: (r: any) => (
              r.registration_deadline ? (
                <span className="text-xs text-[var(--fg)]">{formatDate(r.registration_deadline, true)}</span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                  Open / No deadline
                </span>
              )
            ) },
            { key: "formats", header: "Formats", render: (r: any) => {
              const fmts = r.submission_formats || [];
              const fields = r.dynamic_submission_fields || [];
              const hasL = fmts.includes("VIDEO_LINK") || fields.some((f: any) => f.type === "URL" || f.type === "VIDEO" || /link|url|drive|youtube/i.test(f.name));
              const hasA = fmts.includes("AUDIO") || fields.some((f: any) => f.type === "AUDIO" || /audio|mp3/i.test(f.name));
              const hasF = fmts.includes("FILE") || fields.some((f: any) => f.type === "DOCUMENT" || f.type === "IMAGE" || /file|document|photo/i.test(f.name));
              return (
                <div className="flex flex-wrap items-center gap-1">
                  {hasL && <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[10.5px] font-medium text-sky-400">Link</span>}
                  {hasA && <span className="rounded bg-violet-500/10 px-1.5 py-0.5 text-[10.5px] font-medium text-violet-400">MP3</span>}
                  {hasF && <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10.5px] font-medium text-amber-400">File</span>}
                </div>
              );
            } },
          ],
          rowActions: (row, { reload }) => (
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setDetail(row);
                  setModalTab("stage");
                }}
                className="border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 hover:text-white"
                title="Manage Live Stage Performance & Lineup Queue"
              >
                <Radio className="size-3.5 text-rose-500 animate-pulse" aria-hidden /> Live Stage
              </Button>
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
            { name: "category", label: "Primary Genre / Domain", half: true, placeholder: "e.g. Dance, Singing, Acting" },
            { name: "max_participants", label: "Max participants", type: "number", half: true, placeholder: "e.g. 150" },
            {
              name: "categories",
              label: "Age Divisions & Categories",
              defaultValue: [
                { name: "Sub-Junior", min_age: 3, max_age: 7, age_limit: "3-7 years", description: "Ages 3 to 7 years" },
                { name: "Junior", min_age: 8, max_age: 14, age_limit: "8-14 years", description: "Ages 8 to 14 years" },
                { name: "Senior", min_age: 15, max_age: 28, age_limit: "15-28 years", description: "Ages 15 to 28 years" },
              ],
              render: ({ value, onChange }) => (
                <CompetitionCategoriesBuilder value={value} onChange={onChange} />
              ),
            },
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
            { name: "registration_deadline", label: "Registration deadline (IST)", type: "datetime", half: true, hint: "Optional — leave empty for open-ended registration (no deadline)" },
            { name: "submission_deadline", label: "Submission deadline (IST)", type: "datetime", half: true, hint: "Defaults to competition end if empty" },
            { name: "participation_fee", label: "Entry fee (₹)", type: "number", half: true, defaultValue: 0 },
            { name: "min_age", label: "Min age", type: "number", half: true, placeholder: "Optional" },
            { name: "max_age", label: "Max age", type: "number", half: true, placeholder: "Optional" },
            { name: "audience_voting_enabled", label: "Audience voting enabled", type: "toggle", half: true, defaultValue: true },
            { name: "judge_scoring_enabled", label: "Judge scoring enabled", type: "toggle", half: true, defaultValue: true },
            { name: "total_rounds", label: "Total competition rounds", type: "number", half: true, defaultValue: 3, placeholder: "e.g. 1, 2, or 3 rounds" },
            { name: "score_visible_for_public", label: "Score visible for public", type: "toggle", half: true, defaultValue: false, hint: "When OFF, public scores are private; contestants only see their own score." },
            { name: "is_published", label: "Published", type: "toggle", half: true, defaultValue: false },
            {
              name: "dynamic_submission_fields",
              label: "Submission Requirements & Formats",
              defaultValue: [
                {
                  name: "Performance Link",
                  label: "YouTube / Drive Video Link",
                  type: "URL",
                  required: true,
                  display_order: 1,
                },
              ],
              render: ({ value, onChange }) => (
                <SubmissionFieldsBuilder value={value} onChange={onChange} />
              ),
            },
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
            categories: Array.isArray(r.categories) ? r.categories : [],
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
            total_rounds: r.total_rounds ?? (Array.isArray(r.rounds) ? r.rounds.length : 3),
            score_visible_for_public: !!(r.score_visible_for_public || r.results_published),
            dynamic_submission_fields: Array.isArray(r.dynamic_submission_fields) && r.dynamic_submission_fields.length
              ? r.dynamic_submission_fields
              : (r.allow_audio_upload && !r.allow_video_link)
              ? [{ name: "Audition Audio Track", label: "MP3 Audio Recording", type: "AUDIO", required: true, display_order: 1 }]
              : [{ name: "Performance Link", label: "YouTube / Drive Video Link", type: "URL", required: true, display_order: 1 }],
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

            const rawSubmissionFields = Array.isArray(v.dynamic_submission_fields) && v.dynamic_submission_fields.length > 0
              ? v.dynamic_submission_fields
              : [
                  { name: "Performance Link", label: "YouTube / Drive Video Link", type: "URL", required: true, display_order: 1 },
                ];

            const cleanSubmissionFields = rawSubmissionFields.map((f: any, idx: number) => {
              const safeName = String(f.name || f.label || `Field ${idx + 1}`).trim().replace(/,/g, " ");
              const fieldType = String(f.type || "URL").toUpperCase();
              return {
                name: safeName,
                label: String(f.label || safeName).trim().replace(/,/g, " "),
                type: fieldType,
                description: f.description ? String(f.description).trim() : null,
                required: f.required !== false,
                allowed_formats:
                  fieldType === "AUDIO"
                    ? ["mp3"]
                    : fieldType === "VIDEO"
                    ? ["youtube"]
                    : fieldType === "URL"
                    ? ["youtube", "drive", "url"]
                    : ["pdf", "docx", "png", "jpg", "zip"],
                max_size_mb: fieldType === "AUDIO" ? 20.0 : fieldType === "DOCUMENT" || fieldType === "IMAGE" ? 25.0 : null,
                display_order: idx + 1,
              };
            });

            const hasLink = cleanSubmissionFields.some((f: any) => f.type === "URL" || f.type === "VIDEO" || /link|url|drive|youtube/i.test(f.name));
            const hasAudio = cleanSubmissionFields.some((f: any) => f.type === "AUDIO" || /audio|mp3|sound|song|singing/i.test(f.name));
            const hasFile = cleanSubmissionFields.some((f: any) => f.type === "DOCUMENT" || f.type === "IMAGE" || f.type === "FILE" || /file|document|image|photo/i.test(f.name));

            const allowedFormats: string[] = [];
            if (hasFile) allowedFormats.push("FILE");
            if (hasLink) allowedFormats.push("VIDEO_LINK");
            if (hasAudio) allowedFormats.push("AUDIO");
            if (allowedFormats.length === 0) allowedFormats.push("VIDEO_LINK");

            const submissionFormatConfig = {
              allow_file_upload: hasFile,
              allow_video_link: hasLink,
              allow_audio_upload: hasAudio,
              allowed_submission_types: allowedFormats,
              enabled_fields: cleanSubmissionFields.map((f: any) => f.name),
              description: `Allowed submission formats: ${allowedFormats.join(", ")}`,
            };

            const cleanCategories = Array.isArray(v.categories) && v.categories.length > 0
              ? v.categories.filter((c: any) => c && String(c.name || "").trim()).map((c: any) => ({
                  name: String(c.name).trim(),
                  min_age: c.min_age != null && c.min_age !== "" ? Number(c.min_age) : null,
                  max_age: c.max_age != null && c.max_age !== "" ? Number(c.max_age) : null,
                  age_limit: c.age_limit || (c.min_age != null && c.max_age != null ? `${c.min_age}-${c.max_age} years` : undefined),
                  description: c.description ? String(c.description).trim() : null,
                }))
              : [];

            if (editing) {
              return {
                title: v.title ? String(v.title).trim() : undefined,
                description: v.description !== undefined ? String(v.description || "").trim() : undefined,
                category: v.category ? String(v.category).trim() : (cleanCategories[0]?.name || undefined),
                categories: cleanCategories.length > 0 ? cleanCategories : undefined,
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
                registration_deadline: toIso(v.registration_deadline) || null,
                submission_deadline: toIso(v.submission_deadline),
                is_published: !!v.is_published,
                audience_voting_enabled: voteEnabled,
                judge_scoring_enabled: judgeEnabled,
                total_rounds: v.total_rounds ? Number(v.total_rounds) : undefined,
                score_visible_for_public: v.score_visible_for_public !== undefined ? !!v.score_visible_for_public : undefined,
                judging_criteria: cleanCriteria,
                allow_file_upload: hasFile,
                allow_video_link: hasLink,
                allow_audio_upload: hasAudio,
                submission_formats: allowedFormats,
                submission_format_config: submissionFormatConfig,
                dynamic_submission_fields: cleanSubmissionFields,
              };
            }

            const sDate = toIso(v.start_date) || new Date().toISOString();
            const eDate = toIso(v.end_date) || new Date(Date.now() + 7 * 86400000).toISOString();
            const regStart = toIso(v.registration_start_date) || new Date().toISOString();
            const regEnd = toIso(v.registration_deadline) || null;
            const subEnd = toIso(v.submission_deadline) || eDate;

            const audienceWeight = voteEnabled && judgeEnabled ? 0.5 : voteEnabled ? 1.0 : 0.0;
            const judgeWeight = voteEnabled && judgeEnabled ? 0.5 : judgeEnabled ? 1.0 : 0.0;

            return {
              title: String(v.title || "").trim(),
              description: String(v.description || v.title || "").trim(),
              category: String(v.category || cleanCategories[0]?.name || "General").trim() || "General",
              categories: cleanCategories.length > 0 ? cleanCategories : undefined,
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
              total_rounds: v.total_rounds ? Number(v.total_rounds) : 3,
              score_visible_for_public: !!v.score_visible_for_public,
              audience_vote_weight: audienceWeight,
              judge_score_weight: judgeWeight,
              judging_criteria: cleanCriteria,
              allow_file_upload: hasFile,
              allow_video_link: hasLink,
              allow_audio_upload: hasAudio,
              submission_formats: allowedFormats,
              submission_format_config: submissionFormatConfig,
              dynamic_submission_fields: cleanSubmissionFields,
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
  initialTab?: "participants" | "workflow" | "stage" | "rounds";
}) {
  const id = comp ? rowId(comp) : "";
  const [activeTab, setActiveTab] = useState<"participants" | "workflow" | "stage" | "rounds">(initialTab);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const { data, loading, reload } = useResource(
    async () => (!id ? null : {
      overview: await safe(competitionsApi.overview(id), null),
      progress: await safe(competitionsApi.judgingProgress(id), null),
      judges: await safe(judgesApi.list({ limit: 200 }), []),
    }),
    [id]
  );

  const [pin, setPin] = useState("");
  const [isScoresPublic, setIsScoresPublic] = useState<boolean>(
    Boolean(comp?.score_visible_for_public || comp?.results_published || comp?.result_status === "PUBLISHED")
  );
  const [scoreToggleBusy, setScoreToggleBusy] = useState(false);
  const { push } = useToast();

  useEffect(() => {
    if (comp) {
      setIsScoresPublic(Boolean(comp.score_visible_for_public || comp.results_published || comp.result_status === "PUBLISHED"));
    }
  }, [comp]);

  const handleTogglePublicScores = async () => {
    setScoreToggleBusy(true);
    const nextVal = !isScoresPublic;
    try {
      await competitionsApi.togglePublicScores(id, nextVal);
      setIsScoresPublic(nextVal);
      push("success", `Score visibility for public is now ${nextVal ? "ON (Public Leaderboard Unlocked)" : "OFF (Scores Private to Contestants)"}`);
      reload();
    } catch (e: any) {
      push("error", e?.message || "Failed to update score visibility.");
    } finally {
      setScoreToggleBusy(false);
    }
  };

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
      subtitle={
        activeTab === "stage"
          ? "Live stage sequence, performer on stage, and real-time lineup"
          : activeTab === "rounds"
          ? "Multi-round knockout lifecycle: Prelims, Semi-Finals, and Grand Finale"
          : activeTab === "participants"
          ? "Registered participants, verified payments, and submitted media"
          : "Judging session, voting and ranking controls"
      }
      size="3xl"
      wide
    >
      <div className="mb-5 flex flex-wrap gap-2 border-b border-[var(--border)] pb-3">
        <button
          onClick={() => setActiveTab("stage")}
          aria-pressed={activeTab === "stage"}
          className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === "stage"
              ? "bg-rose-600 text-white shadow-md shadow-rose-600/30 font-bold"
              : "border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
          }`}
        >
          <Radio className="size-3.5 text-rose-400 animate-pulse" /> Live Stage Performance
        </button>
        <button
          onClick={() => setActiveTab("rounds")}
          aria-pressed={activeTab === "rounds"}
          className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === "rounds"
              ? "bg-amber-600 text-white shadow-md shadow-amber-600/30 font-bold"
              : "border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
          }`}
        >
          <Layers className="size-3.5 text-amber-400" /> Stages &amp; Knockout Rounds
        </button>
        <button
          onClick={() => setActiveTab("participants")}
          aria-pressed={activeTab === "participants"}
          className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === "participants"
              ? "bg-[var(--brand)] text-[var(--on-brand)]"
              : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-muted)] hover:text-white"
          }`}
        >
          <Users className="size-3.5" /> Participants & Submissions
        </button>
        <button
          onClick={() => setActiveTab("workflow")}
          aria-pressed={activeTab === "workflow"}
          className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === "workflow"
              ? "bg-[var(--brand)] text-[var(--on-brand)]"
              : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-muted)] hover:text-white"
          }`}
        >
          <Gavel className="size-3.5" /> Judging & Session Controls
        </button>
      </div>

      {activeTab === "stage" ? (
        <CompetitionStagePanel compId={id} compTitle={comp?.title || comp?.name} />
      ) : activeTab === "rounds" ? (
        <CompetitionRoundsPanel compId={id} compTitle={comp?.title || comp?.name} />
      ) : activeTab === "participants" ? (
        <CompetitionParticipantsPanel compId={id} compTitle={comp?.title || comp?.name} />
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

          {/* ── Public Score Visibility Switch (Client Requirement) ── */}
          <div className="rounded-2xl border border-[var(--border)] bg-gradient-to-r from-[var(--surface-2)] via-[var(--surface)] to-[var(--surface-2)] p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                isScoresPublic ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
              }`}>
                {isScoresPublic ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-[var(--fg)]">Score visible for public</h4>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-black uppercase tracking-wider ${
                    isScoresPublic
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                  }`}>
                    {isScoresPublic ? "ON • Public" : "OFF • Private"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[var(--fg-muted)]">
                  {isScoresPublic
                    ? "Full scores and podium rankings are visible to everyone on the public leaderboard."
                    : "Scores are hidden from the public leaderboard. Contestants can only view their own score in their account."}
                </p>
              </div>
            </div>

            <Button
              variant={isScoresPublic ? "secondary" : "primary"}
              size="sm"
              loading={scoreToggleBusy}
              onClick={handleTogglePublicScores}
              className="shrink-0 text-xs font-bold"
            >
              {isScoresPublic ? (
                <>
                  <EyeOff className="size-3.5 mr-1.5" /> Turn OFF (Private)
                </>
              ) : (
                <>
                  <Eye className="size-3.5 mr-1.5" /> Turn ON (Public)
                </>
              )}
            </Button>
          </div>

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
  const [search, setSearch] = useState("");
  const [directEmail, setDirectEmail] = useState("");

  const details: any[] = progress?.judge_details || progress?.judges || [];
  const assignedMap = new Map<string, any>();
  for (const d of details) {
    if (d?.judge_email) {
      assignedMap.set(String(d.judge_email).trim().toLowerCase(), d);
    }
  }

  const isAssigned = (j: any) => {
    const em = String(j.email || "").trim().toLowerCase();
    if (assignedMap.has(em)) return true;
    if (Array.isArray(j.assigned_competitions)) {
      return j.assigned_competitions.some((c: any) => String(c).trim().toLowerCase() === String(compId).trim().toLowerCase());
    }
    return false;
  };

  const getStat = (j: any) => {
    const em = String(j.email || "").trim().toLowerCase();
    return assignedMap.get(em);
  };

  const filtered = [...judges].filter((j) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      String(j.full_name || j.name || "").toLowerCase().includes(q) ||
      String(j.email || "").toLowerCase().includes(q)
    );
  });

  const rows = filtered.sort(
    (a, b) => Number(isAssigned(b)) - Number(isAssigned(a))
  );

  const totalAssigned = judges.filter(isAssigned).length;

  const toggle = async (email: string, currentlyAssigned: boolean) => {
    const cleanEmail = email.trim().toLowerCase();
    setBusy(cleanEmail);
    try {
      const body = { judge_email: cleanEmail, competition_id: compId };
      if (currentlyAssigned) {
        await judgesApi.unassign(body);
        push("info", `Removed ${cleanEmail} from this competition.`);
      } else {
        await judgesApi.assign(body);
        push("success", `Assigned ${cleanEmail} to this competition & official appointment email sent!`);
      }
      reload();
    } catch (e: any) {
      push("error", e?.message || "Could not update the assignment.");
    } finally {
      setBusy(null);
    }
  };

  const handleDirectAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = directEmail.trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      push("error", "Please enter a valid judge email address.");
      return;
    }
    setBusy(clean);
    try {
      await judgesApi.assign({ judge_email: clean, competition_id: compId });
      push("success", `Judge ${clean} assigned to competition & official appointment email sent!`);
      setDirectEmail("");
      reload();
    } catch (e: any) {
      push("error", e?.message || "Failed to assign judge.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Panel
      title={`Judges on this competition (${totalAssigned} assigned)`}
      subtitle="Assigned judges see this competition and its live stage contestants in their scoring portal."
      className="shadow-none"
      bodyClassName="p-0"
    >
      <div className="border-b border-[var(--border)] p-3 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--fg-subtle)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search judges by name or email…"
            className="h-8.5 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] pl-8 pr-3 text-xs outline-none focus:border-[var(--brand)] transition-colors"
          />
        </div>
        <form onSubmit={handleDirectAssign} className="flex gap-1.5 shrink-0">
          <input
            type="email"
            value={directEmail}
            onChange={(e) => setDirectEmail(e.target.value)}
            placeholder="judge@example.com"
            className="h-8.5 w-48 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-2.5 text-xs outline-none focus:border-[var(--brand)]"
          />
          <Button size="sm" type="submit" loading={busy === directEmail.trim().toLowerCase()} disabled={!directEmail.trim()}>
            <Plus className="size-3" /> Assign
          </Button>
        </form>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-[13px] text-[var(--fg-muted)]">
          {search ? "No judges match your search." : "No judges yet — add them from the Judges page first."}
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border)] max-h-80 overflow-y-auto">
          {rows.map((j) => {
            const assignedStatus = isAssigned(j);
            const stat = getStat(j);
            const cleanEm = String(j.email || "").trim().toLowerCase();
            return (
              <li key={cleanEm} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13.5px] font-semibold text-white">
                      {j.full_name || j.name || "Unnamed"}
                    </p>
                    {assignedStatus && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10.5px] font-bold text-emerald-400">
                        <CheckCircle2 className="size-3 text-emerald-400" /> Active Judge
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[11.5px] text-[var(--fg-muted)]">
                    {cleanEm}
                    {assignedStatus && stat ? ` · ${stat.scored ?? 0} scored · ${stat.pending ?? 0} pending` : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={assignedStatus ? "ghost" : "secondary"}
                  loading={busy === cleanEm}
                  disabled={!!busy && busy !== cleanEm}
                  onClick={() => toggle(cleanEm, assignedStatus)}
                  className={assignedStatus ? "text-rose-400 hover:text-rose-300 hover:bg-rose-500/10" : "bg-emerald-600/80 hover:bg-emerald-500 text-white"}
                >
                  {assignedStatus ? <UserMinus className="size-3.5" aria-hidden /> : <UserPlus className="size-3.5" aria-hidden />}
                  {assignedStatus ? "Remove" : "Assign Judge"}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function CompetitionStagePanel({ compId, compTitle }: { compId: string; compTitle?: string }) {
  const { push } = useToast();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data, loading, reload } = useResource(
    () => (!compId ? Promise.resolve(null) : competitionsApi.stageDashboard(compId)),
    [compId]
  );

  const currentPerformer = data?.current_performer;
  const stageStatus = data?.stage_status || (currentPerformer ? "LIVE" : "IDLE");
  const participants = Array.isArray(data?.participants) ? data.participants : [];
  const completedCount = data?.completed_count ?? participants.filter((p: any) => p.stage_status === "COMPLETED").length;
  const remainingCount = data?.remaining_count ?? participants.filter((p: any) => p.stage_status !== "COMPLETED").length;
  const totalCount = data?.total_participants ?? participants.length;

  const handleSetPerformer = async (identifier: string, name: string) => {
    setActionLoading(`set-${identifier}`);
    try {
      await competitionsApi.setStagePerformer(compId, identifier);
      push("success", `${name} is now LIVE ON STAGE! Judge panel and public page updated.`);
      reload();
    } catch (e: any) {
      push("error", e?.message || "Failed to set stage performer.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleNextPerformer = async () => {
    setActionLoading("next");
    try {
      const res = await competitionsApi.nextStagePerformer(compId);
      const nextName = res?.current_performer?.user_name || "Next participant";
      push("success", `${nextName} called to stage!`);
      reload();
    } catch (e: any) {
      push("error", e?.message || "Failed to transition to next performer.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleEndPerformance = async () => {
    setActionLoading("end");
    try {
      await competitionsApi.endStagePerformance(compId);
      push("success", "Performance marked completed. Stage is now idle.");
      reload();
    } catch (e: any) {
      push("error", e?.message || "Failed to end stage performance.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearStage = async () => {
    setActionLoading("clear");
    try {
      await competitionsApi.clearStage(compId);
      push("success", "Stage cleared.");
      reload();
    } catch (e: any) {
      push("error", e?.message || "Failed to clear stage.");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && !data) {
    return <Loading rows={5} />;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Top Live Stage Status & Action Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-gradient-to-r from-[var(--surface-2)] via-[var(--surface)] to-[var(--surface-2)] p-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className={cn(
            "relative grid size-12 shrink-0 place-items-center rounded-2xl border shadow-inner",
            currentPerformer
              ? "border-rose-500/50 bg-rose-500/20 text-rose-400"
              : "border-[var(--border)] bg-[var(--surface-3)] text-[var(--fg-muted)]"
          )}>
            <Radio className={cn("size-6", currentPerformer && "animate-pulse")} />
            {currentPerformer && (
              <span className="absolute -top-1 -right-1 size-3 rounded-full bg-rose-500 animate-ping" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                currentPerformer
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  : "bg-[var(--surface-3)] text-[var(--fg-muted)] border border-[var(--border)]"
              )}>
                {currentPerformer ? "STAGE LIVE" : "STAGE IDLE"}
              </span>
              <span className="text-xs text-[var(--fg-subtle)] font-mono">
                {compTitle || "Competition Stage"}
              </span>
            </div>
            <p className="mt-1 text-sm font-bold text-white">
              {currentPerformer
                ? `Active Performer: ${currentPerformer.user_name || currentPerformer.user_email}`
                : "No contestant currently on stage"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={handleNextPerformer}
            disabled={!!actionLoading || remainingCount === 0}
            className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30"
          >
            {actionLoading === "next" ? (
              <Loader2 className="size-3.5 animate-spin mr-1.5" />
            ) : (
              <SkipForward className="size-3.5 mr-1.5" />
            )}
            Call Next Performer
          </Button>

          {currentPerformer && (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleEndPerformance}
              disabled={!!actionLoading}
              className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 text-xs font-semibold"
            >
              {actionLoading === "end" ? (
                <Loader2 className="size-3.5 animate-spin mr-1.5" />
              ) : (
                <Square className="size-3.5 mr-1.5" />
              )}
              End Performance
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={() => reload()}
            title="Refresh Live Stage"
            disabled={!!actionLoading}
          >
            <RefreshCw className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Metrics Cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-sky-500/25 bg-gradient-to-br from-sky-500/10 via-[var(--surface-2)] to-[var(--surface)] p-3.5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-300">Total Contestants</span>
            <Users className="size-3.5 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white tabular-nums">{formatNumber(totalCount)}</div>
        </div>

        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-rose-500/25 bg-gradient-to-br from-rose-500/10 via-[var(--surface-2)] to-[var(--surface)] p-3.5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-300">Stage Status</span>
            <Radio className="size-3.5 text-rose-400 animate-pulse" />
          </div>
          <div className="mt-2 text-xl font-black text-rose-400 tracking-wide uppercase">{stageStatus}</div>
        </div>

        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-[var(--surface-2)] to-[var(--surface)] p-3.5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Completed</span>
            <CheckCircle2 className="size-3.5 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white tabular-nums">{formatNumber(completedCount)}</div>
        </div>

        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-[var(--surface-2)] to-[var(--surface)] p-3.5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">Remaining Queue</span>
            <Clock className="size-3.5 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white tabular-nums">{formatNumber(remainingCount)}</div>
        </div>
      </div>

      {/* ── Active Performer Hero Card ── */}
      {currentPerformer ? (
        <div className="relative overflow-hidden rounded-2xl border-2 border-rose-500/40 bg-gradient-to-br from-rose-500/15 via-[var(--surface-2)] to-[var(--surface)] p-5 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="relative">
                {currentPerformer.user_photo || currentPerformer.avatar ? (
                  <img
                    src={currentPerformer.user_photo || currentPerformer.avatar}
                    alt={currentPerformer.user_name}
                    className="size-16 rounded-2xl object-cover border-2 border-rose-500 shadow-md"
                  />
                ) : (
                  <div className="flex size-16 items-center justify-center rounded-2xl bg-rose-500/20 border-2 border-rose-500 text-rose-200 font-black text-xl shadow-md">
                    {((currentPerformer.user_name || currentPerformer.user_email || "P")[0] || "P").toUpperCase()}
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1">
                  <VerifiedBadge size="sm" />
                </span>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-rose-500 text-white font-extrabold text-[10px] px-2.5 py-0.5 uppercase tracking-wider animate-pulse flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-white" /> NOW PERFORMING ON STAGE
                  </span>
                  <span className="font-mono text-xs font-bold text-rose-300">
                    Order #{currentPerformer.stage_order || 1}
                  </span>
                </div>

                <h3 className="mt-1 text-lg font-bold text-white flex items-center gap-1.5">
                  {currentPerformer.user_name || "Performer"}
                  {(currentPerformer.is_verified || currentPerformer.verified_badge) && (
                    <VerifiedBadge size="sm" />
                  )}
                </h3>

                <p className="text-xs text-[var(--fg-muted)]">
                  {currentPerformer.entry_title || "Performance Entry"}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] font-mono text-[var(--fg-subtle)]">
                  {currentPerformer.registration_reference && (
                    <span className="text-[var(--brand)] font-bold">
                      Ref: {currentPerformer.registration_reference}
                    </span>
                  )}
                  {currentPerformer.user_email && <span>{currentPerformer.user_email}</span>}
                  {currentPerformer.user_phone && <span>Tel: {currentPerformer.user_phone}</span>}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleEndPerformance}
                loading={actionLoading === "end"}
                className="border-rose-500/40 text-rose-300 hover:bg-rose-500/10 font-bold"
              >
                <Square className="size-3.5 mr-1.5" /> End Performance
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleNextPerformer}
                loading={actionLoading === "next"}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold"
              >
                <SkipForward className="size-3.5 mr-1.5" /> Next Performer →
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)]/40 p-6 text-center">
          <Mic className="size-8 mx-auto text-[var(--fg-muted)] opacity-60 mb-2" />
          <p className="text-sm font-semibold text-white">Stage is Currently Idle</p>
          <p className="text-xs text-[var(--fg-muted)] mt-1 max-w-md mx-auto">
            Click <strong>"Call Next Performer"</strong> above to advance the lineup, or click <strong>"Send to Stage"</strong> next to any competitor below to put them on stage immediately.
          </p>
        </div>
      )}

      {/* ── Serial Performance Lineup Table ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="size-4 text-[var(--brand)]" />
              Serial Performance Lineup ({participants.length} Registered)
            </h3>
            <p className="text-xs text-[var(--fg-muted)] mt-0.5">
              Admin controls who takes the stage in serial sequence. Judges and registered users receive live real-time sync.
            </p>
          </div>
          <span className="text-xs text-[var(--fg-subtle)] font-mono">
            {completedCount} of {participants.length} done
          </span>
        </div>

        <DataTable
          rows={participants}
          columns={[
            {
              key: "stage_order",
              header: "# Order",
              width: "70px",
              render: (r: any) => (
                <span className="font-mono font-bold text-xs text-[var(--brand)]">
                  #{r.stage_order || 1}
                </span>
              ),
            },
            {
              key: "participant",
              header: "Competitor & Profile",
              width: "280px",
              render: (r: any) => {
                const isVerified = Boolean(r.is_verified || r.verified_badge || r.verified_tick);
                return (
                  <div className="flex items-center gap-3 min-w-[200px]">
                    <div className="relative">
                      {r.user_photo || r.avatar ? (
                        <img
                          src={r.user_photo || r.avatar}
                          alt={r.user_name}
                          className="size-9 rounded-xl object-cover border border-[var(--border)]"
                        />
                      ) : (
                        <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--surface-3)] text-xs font-bold text-[var(--fg-muted)]">
                          {((r.user_name || r.user_email || "P")[0] || "P").toUpperCase()}
                        </div>
                      )}
                      {isVerified && (
                        <span className="absolute -bottom-1 -right-1">
                          <VerifiedBadge size="xs" />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-white truncate">
                          {r.user_name || "Competitor"}
                        </span>
                        {isVerified && <VerifiedBadge size="xs" />}
                      </div>
                      <span className="block font-mono text-[11px] text-[var(--fg-subtle)] truncate">
                        {r.user_email}
                      </span>
                    </div>
                  </div>
                );
              },
            },
            {
              key: "registration_reference",
              header: "Reg Reference",
              width: "150px",
              render: (r: any) => (
                <span className="font-mono text-xs text-emerald-400 font-bold whitespace-nowrap">
                  {r.registration_reference || "—"}
                </span>
              ),
            },
            {
              key: "stage_status",
              header: "Stage Status",
              width: "160px",
              render: (r: any) => {
                if (r.is_current_performer || r.stage_status === "ON_STAGE") {
                  return (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/50 bg-rose-500/20 px-2.5 py-1 text-[11px] font-extrabold text-rose-300 shadow-sm animate-pulse whitespace-nowrap">
                      <Radio className="size-3 text-rose-400 animate-ping" />
                      ON STAGE NOW
                    </span>
                  );
                }
                if (r.stage_status === "COMPLETED") {
                  return (
                    <div className="flex flex-col gap-0.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 whitespace-nowrap">
                        <CheckCircle2 className="size-3 text-emerald-400" /> Completed
                      </span>
                      {r.is_scored && (
                        <span className="text-[10px] text-[var(--fg-subtle)] font-mono">
                          Avg: {r.average_score} ({r.judge_score_count} judge{r.judge_score_count === 1 ? "" : "s"})
                        </span>
                      )}
                    </div>
                  );
                }
                return (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-3)] px-2.5 py-0.5 text-[10.5px] font-medium text-[var(--fg-muted)] whitespace-nowrap">
                    <Clock className="size-2.5" /> In Lineup
                  </span>
                );
              },
            },
            {
              key: "actions",
              header: "Stage Action",
              width: "160px",
              render: (r: any) => {
                const isOnStage = Boolean(r.is_current_performer || r.stage_status === "ON_STAGE");
                const rId = r.registration_id || r.user_email;

                if (isOnStage) {
                  return (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleEndPerformance}
                      loading={actionLoading === "end"}
                      className="border-rose-500/40 text-rose-300 hover:bg-rose-500/10 text-[11px] font-bold"
                    >
                      <Square className="size-3 mr-1" /> End Now
                    </Button>
                  );
                }

                return (
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={actionLoading === `set-${rId}`}
                    onClick={() => handleSetPerformer(rId, r.user_name || "Competitor")}
                    className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] whitespace-nowrap"
                  >
                    {actionLoading === `set-${rId}` ? (
                      <Loader2 className="size-3 animate-spin mr-1" />
                    ) : (
                      <Mic className="size-3 mr-1" />
                    )}
                    Send to Stage
                  </Button>
                );
              },
            },
          ]}
        />
      </div>
    </div>
  );
}

function CompetitionParticipantsPanel({ compId, compTitle }: { compId: string; compTitle?: string }) {
  const [filterMode, setFilterMode] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<any | null>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const { push } = useToast();

  const { data, loading, error, reload } = useResource(
    () => (!compId ? Promise.resolve(null) : competitionsApi.participants(compId, { limit: 500 })),
    [compId]
  );

  const rawParticipants = useMemo(() => {
    if (Array.isArray(data?.participants)) return data.participants;
    if (Array.isArray(data)) return data;
    return toRows(data);
  }, [data]);
  const totalRegistered = data?.total_registered ?? rawParticipants.length;
  const confirmedCount = data?.confirmed_count ?? rawParticipants.filter((p: any) => p.status === "CONFIRMED").length;
  const submissionsCount = data?.submissions_count ?? rawParticipants.filter((p: any) => !!p.submission).length;
  const presentCount = data?.present_count ?? rawParticipants.filter((p: any) => p.is_present || p.attendance_status === "PRESENT").length;
  const absentCount = data?.absent_count ?? Math.max(0, totalRegistered - presentCount);

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

  const handleConfirmPayment = async (regId: string, name?: string, fee?: number) => {
    setActionLoading(regId);
    try {
      await competitionsApi.confirmParticipantPayment(compId, regId);
      push("success", `Payment confirmed for ${name || "participant"}! Admitted to official lineup.`);
      reload();
    } catch (err: any) {
      push("error", err?.message || "Failed to confirm participant payment.");
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

  const handleVerifyAadhaar = async (p: any) => {
    const regId = p._id || p.registration_id;
    const name = p.user_name || p.user_email || "Participant";
    setVerifyingId(regId);
    try {
      await competitionsApi.verifyParticipantGovtId(compId, regId, {
        notes: `Manually verified after physical Aadhaar card check for competition ${compTitle || compId}`,
        govt_id_type: p.govt_id_type || "AADHAAR",
        govt_id_number: p.govt_id_number || undefined,
      });
      push("success", `✓ ${name} verified with permanent Blue Badge! Lifetime verification active.`);
      reload();
      if (selectedParticipant && (selectedParticipant._id === regId || selectedParticipant.registration_id === regId)) {
        setSelectedParticipant((prev: any) =>
          prev
            ? {
                ...prev,
                is_verified: true,
                is_id_verified: true,
                is_govt_id_verified: true,
                verified_badge: true,
                verified_tick: true,
                verification_status: "VERIFIED",
              }
            : null
        );
      }
    } catch (err: any) {
      push("error", err?.message || "Failed to verify participant government ID.");
    } finally {
      setVerifyingId(null);
    }
  };

  // Selected Category filter for registrations
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    rawParticipants.forEach((p: any) => {
      if (p.category && typeof p.category === "string" && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return Array.from(set);
  }, [rawParticipants]);

  // Map each confirmed present participant to their chronological on-the-spot venue entry order
  const entryOrderMap = useMemo(() => {
    const presentOnly = rawParticipants
      .filter((p: any) => Boolean(p.is_present || p.attendance_status === "PRESENT") && p.attended_at)
      .sort((a: any, b: any) => new Date(a.attended_at).getTime() - new Date(b.attended_at).getTime());
    const map = new Map<string, number>();
    presentOnly.forEach((p: any, idx: number) => {
      const id = String(p._id || p.registration_id || "");
      if (id) map.set(id, idx + 1);
    });
    return map;
  }, [rawParticipants]);

  const filtered = useMemo(() => {
    return rawParticipants.filter((p: any) => {
      const isCash = Boolean(p.cash_payment || p.payment_method === "CASH");
      const isFree = p.payment_method === "FREE" || Number(p.fee) === 0 || p.payment_status === "NOT_REQUIRED";
      const isPaid = p.payment_status === "PAID" || p.cash_status === "COLLECTED" || p.cash_status === "PAID";

      let matchFilter = true;
      if (filterMode === "LINEUP_CONFIRMED") {
        matchFilter = isPaid || isFree || p.status === "CONFIRMED";
      } else if (filterMode === "LINEUP_PENDING") {
        matchFilter = !isPaid && !isFree && p.status !== "CONFIRMED";
      } else if (filterMode === "PRESENT") {
        matchFilter = Boolean(p.is_present || p.attendance_status === "PRESENT");
      } else if (filterMode === "ABSENT") {
        matchFilter = !Boolean(p.is_present || p.attendance_status === "PRESENT");
      } else if (filterMode === "ONLINE_PAID") {
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

      if (selectedCategory !== "ALL") {
        const cat = (p.category || "General").trim().toLowerCase();
        if (cat !== selectedCategory.trim().toLowerCase()) return false;
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
      {/* ── KPI Metric Strip (Clean, Compact, No Word Breaks) ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* Total Registered */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-[var(--surface-2)] to-[var(--surface)] p-3.5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 whitespace-nowrap">Total Registered</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 shrink-0">
              <Users className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white tabular-nums tracking-tight whitespace-nowrap">{formatNumber(totalRegistered)}</span>
            <span className="text-[11px] font-medium text-[var(--fg-muted)]">participants</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[10.5px] text-emerald-300/80">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            <span>{confirmedCount} confirmed</span>
          </div>
        </div>

        {/* On-The-Spot Attendance */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-teal-500/35 bg-gradient-to-br from-teal-500/15 via-[var(--surface-2)] to-[var(--surface)] p-3.5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-300 whitespace-nowrap">Event Attendance</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-teal-500/20 text-teal-300 shrink-0">
              <UserCheck className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-teal-300 tabular-nums tracking-tight whitespace-nowrap">{presentCount}</span>
            <span className="text-[11px] font-medium text-teal-400 whitespace-nowrap">Present</span>
            <span className="text-[10px] text-[var(--fg-muted)] whitespace-nowrap">({absentCount} absent)</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10.5px]">
            <span className={absentCount > 0 ? "text-amber-300 font-semibold" : "text-emerald-400 font-medium"}>
              {absentCount > 0 ? `${absentCount} Absent` : "All Present"}
            </span>
            <span className="text-teal-400 font-bold tabular-nums">
              {totalRegistered > 0 ? Math.round((presentCount / totalRegistered) * 100) : 0}% Turnout
            </span>
          </div>
        </div>

        {/* Online Payments */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-sky-500/25 bg-gradient-to-br from-sky-500/10 via-[var(--surface-2)] to-[var(--surface)] p-3.5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 whitespace-nowrap">Online Payments</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400 shrink-0">
              <CreditCard className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white tabular-nums tracking-tight whitespace-nowrap">{onlinePaid}</span>
            <span className="text-[11px] font-medium text-sky-300 whitespace-nowrap">Paid</span>
            {onlinePending > 0 && (
              <span className="text-[10px] text-amber-400 font-semibold whitespace-nowrap">({onlinePending} pending)</span>
            )}
          </div>
          <div className="mt-1 text-[10.5px] text-[var(--fg-muted)] truncate">
            {formatINR(onlineFees)} collected
          </div>
        </div>

        {/* Cash at Venue */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-[var(--surface-2)] to-[var(--surface)] p-3.5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 whitespace-nowrap">Cash on Venue</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 shrink-0">
              <Banknote className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white tabular-nums tracking-tight whitespace-nowrap">{cashTotal}</span>
            <span className="text-[11px] font-medium text-amber-300 whitespace-nowrap">Selected</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[10.5px]">
            {cashPending > 0 ? (
              <span className="inline-flex items-center gap-1 font-semibold text-amber-300 whitespace-nowrap">
                <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
                {cashPending} Pending ({formatINR(cashFeesPending)})
              </span>
            ) : (
              <span className="text-emerald-400 font-medium whitespace-nowrap">All cash collected</span>
            )}
          </div>
        </div>

        {/* Submissions */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-purple-500/25 bg-gradient-to-br from-purple-500/10 via-[var(--surface-2)] to-[var(--surface)] p-3.5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 whitespace-nowrap">Submissions</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400 shrink-0">
              <Video className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-white tabular-nums tracking-tight whitespace-nowrap">{submissionsCount}</span>
            <span className="text-[11px] font-medium text-[var(--fg-muted)]">entries</span>
          </div>
          <div className="mt-1 text-[10.5px] text-[var(--fg-muted)] truncate">
            Media links uploaded
          </div>
        </div>

        {/* Revenue Collected */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-[var(--surface-2)] to-[var(--surface)] p-3.5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 whitespace-nowrap">Revenue Collected</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 shrink-0">
              <CircleDollarSign className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-white tabular-nums tracking-tight whitespace-nowrap">{formatINR(totalFees)}</span>
          </div>
          <div className="mt-1 text-[10.5px] text-[var(--fg-muted)] truncate">
            {cashFeesPending > 0 ? (
              <span className="text-amber-300 font-medium">+{formatINR(cashFeesPending)} cash pending</span>
            ) : (
              <span>All fees collected</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Filter Pills & Search Bar Toolbar ── */}
      <div className="flex flex-col gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-2.5 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
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
              onClick={() => setFilterMode("LINEUP_CONFIRMED")}
              className={cn(
                "cursor-pointer rounded-xl px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5",
                filterMode === "LINEUP_CONFIRMED"
                  ? "bg-emerald-500/25 text-emerald-200 border border-emerald-500/50 shadow-sm font-bold"
                  : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-muted)] hover:text-emerald-300"
              )}
            >
              <CheckCircle2 className="size-3.5 text-emerald-400" /> In Lineup ({rawParticipants.filter((p: any) => p.status === "CONFIRMED" || p.payment_status === "PAID" || p.cash_status === "COLLECTED" || p.payment_method === "FREE" || Number(p.fee) === 0).length})
            </button>

            <button
              type="button"
              onClick={() => setFilterMode("LINEUP_PENDING")}
              className={cn(
                "cursor-pointer rounded-xl px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5",
                filterMode === "LINEUP_PENDING"
                  ? "bg-amber-500/25 text-amber-200 border border-amber-500/50 shadow-sm font-bold"
                  : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-muted)] hover:text-amber-300"
              )}
            >
              <Clock className="size-3.5 text-amber-400" /> Awaiting Payment ({rawParticipants.filter((p: any) => p.status !== "CONFIRMED" && p.payment_status !== "PAID" && p.cash_status !== "COLLECTED" && p.payment_method !== "FREE" && Number(p.fee) > 0).length})
            </button>

            <button
              type="button"
              onClick={() => setFilterMode("PRESENT")}
              className={cn(
                "cursor-pointer rounded-xl px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5",
                filterMode === "PRESENT"
                  ? "bg-teal-500/25 text-teal-200 border border-teal-500/50 shadow-sm"
                  : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-muted)] hover:text-teal-300"
              )}
            >
              <UserCheck className="size-3.5 text-teal-400" /> Present ({presentCount})
            </button>

            {absentCount > 0 && (
              <button
                type="button"
                onClick={() => setFilterMode("ABSENT")}
                className={cn(
                  "cursor-pointer rounded-xl px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5",
                  filterMode === "ABSENT"
                    ? "bg-rose-500/25 text-rose-200 border border-rose-500/50 shadow-sm"
                    : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-muted)] hover:text-rose-300"
                )}
              >
                <XCircle className="size-3.5 text-rose-400" /> Absent ({absentCount})
              </button>
            )}

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

            {cashPending > 0 && (
              <button
                type="button"
                onClick={() => setFilterMode("CASH_PENDING")}
                className={cn(
                  "cursor-pointer rounded-xl px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5",
                  filterMode === "CASH_PENDING"
                    ? "bg-amber-500 text-black font-bold shadow-md"
                    : "border border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
                )}
              >
                <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
                Cash Pending ({cashPending})
              </button>
            )}

            {cashCollected > 0 && (
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
            )}
          </div>

          {/* Search & Refresh */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--fg-subtle)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search participant, ref, cash…"
                className="h-8.5 w-56 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] pl-8 pr-3 text-xs outline-none focus:border-[var(--brand)] transition-colors"
              />
            </div>
            <Button size="sm" variant="secondary" onClick={reload} className="h-8.5 px-3">
              <RefreshCw className="size-3 mr-1" /> Refresh
            </Button>
          </div>
        </div>

        {/* Category Division Filter Bar (Junior, Sub-Junior, Senior) */}
        {availableCategories.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--border)] pt-2 mt-1">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-subtle)] mr-1 shrink-0">Category Division:</span>
            <button
              type="button"
              onClick={() => setSelectedCategory("ALL")}
              className={cn(
                "cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all",
                selectedCategory === "ALL"
                  ? "bg-violet-600 text-white shadow-sm font-black"
                  : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-muted)] hover:text-white"
              )}
            >
              All Categories ({rawParticipants.length})
            </button>
            {availableCategories.map((cat) => {
              const count = rawParticipants.filter(
                (p: any) => (p.category || "General").trim().toLowerCase() === cat.trim().toLowerCase()
              ).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all",
                    selectedCategory === cat
                      ? "bg-violet-600 text-white shadow-sm font-black"
                      : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-muted)] hover:text-violet-300"
                  )}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Informative helper banner for cash collection */}
        {cashPending > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
            <div className="flex items-center gap-2">
              <Banknote className="size-4 shrink-0 text-amber-400" />
              <span>
                <strong className="font-semibold text-amber-300">{cashPending} participant{cashPending > 1 ? "s" : ""}</strong> selected <strong>Cash on Venue</strong> ({formatINR(cashFeesPending)} pending collection). Click "Mark Cash Collected" in the table when cash is received.
              </span>
            </div>
            {filterMode !== "CASH_PENDING" && (
              <button
                type="button"
                onClick={() => setFilterMode("CASH_PENDING")}
                className="cursor-pointer text-[10.5px] font-bold text-amber-300 hover:text-amber-100 underline whitespace-nowrap"
              >
                Filter cash pending ({cashPending}) →
              </button>
            )}
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
            width: "250px",
            render: (r: any) => {
              const initial = ((r.user_name || r.user_email || "P").trim()[0] || "P").toUpperCase();
              const isVerified = Boolean(
                r.is_verified || r.verified_badge || r.verified_tick || r.is_id_verified || r.is_govt_id_verified
              );
              return (
                <div className="flex items-center gap-2.5 min-w-[210px] max-w-[260px]">
                  <div className="relative flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/30 to-indigo-600/30 border border-violet-500/30 font-bold text-violet-200 text-xs shadow-inner">
                    {initial}
                    {isVerified && (
                      <span className="absolute -bottom-1 -right-1">
                        <VerifiedBadge size="xs" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-white truncate text-xs">{r.user_name || "Participant"}</p>
                      {isVerified && <VerifiedBadge size="xs" />}
                    </div>
                    <a
                      href={`mailto:${r.user_email}`}
                      className="block font-mono text-[11px] text-[var(--fg-muted)] hover:text-white truncate"
                      title={r.user_email}
                    >
                      {r.user_email}
                    </a>
                    <div className="flex items-center gap-2 mt-0.5">
                      {r.user_phone && (
                        <a
                          href={`tel:${r.user_phone}`}
                          className="inline-flex items-center gap-1 font-mono text-[10px] text-[var(--fg-subtle)] hover:text-white"
                        >
                          <Phone className="size-2.5" /> {r.user_phone}
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedParticipant(r)}
                        className="cursor-pointer text-[10.5px] font-semibold text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1 ml-auto"
                      >
                        <Eye className="size-3" /> View Profile & ID
                      </button>
                    </div>
                  </div>
                </div>
              );
            },
          },
          {
            key: "verification",
            header: "Aadhaar / Blue Badge",
            width: "200px",
            render: (r: any) => {
              const isVerified = Boolean(
                r.is_verified || r.verified_badge || r.verified_tick || r.is_id_verified || r.is_govt_id_verified
              );
              const rId = r._id || r.registration_id;

              if (isVerified) {
                return (
                  <div className="flex flex-col gap-1 min-w-[170px]">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/40 bg-sky-500/15 px-2.5 py-0.5 text-[10.5px] font-bold text-sky-300 shadow-sm w-fit">
                      <VerifiedBadge size="xs" /> Verified (Lifetime)
                    </span>
                    <span className="text-[10px] text-[var(--fg-subtle)]">
                      Aadhaar checked • No re-check needed
                    </span>
                  </div>
                );
              }

              return (
                <div className="flex flex-col gap-1.5 min-w-[170px]">
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-amber-300">
                    <ShieldAlert className="size-3 text-amber-400 shrink-0" /> Aadhaar Not Checked
                  </span>
                  <button
                    type="button"
                    disabled={verifyingId === rId}
                    onClick={() => handleVerifyAadhaar(r)}
                    className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 font-bold text-[10.5px] px-2.5 py-1 transition-all shadow-sm whitespace-nowrap disabled:opacity-50 w-fit"
                  >
                    {verifyingId === rId ? (
                      <Loader2 className="size-3 animate-spin text-sky-400" />
                    ) : (
                      <ShieldCheck className="size-3 text-sky-400" />
                    )}
                    Verify Aadhaar
                  </button>
                </div>
              );
            },
          },
          {
            key: "attendance",
            header: "On-The-Spot Attendance",
            width: "210px",
            render: (r: any) => {
              const isPresent = Boolean(r.is_present || r.attendance_status === "PRESENT");
              const rId = r._id || r.registration_id;
              const isBusy = actionLoading === `att-${rId}`;
              return (
                <div className="flex flex-col gap-1.5 min-w-[170px]">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={async () => {
                        setActionLoading(`att-${rId}`);
                        try {
                          const nextState = !isPresent;
                          await competitionsApi.markAttendance(compId, rId, nextState);
                          push(
                            nextState ? "success" : "info",
                            nextState
                              ? `✓ Marked ${r.user_name || "participant"} as PRESENT on venue.`
                              : `Marked ${r.user_name || "participant"} as ABSENT.`
                          );
                          reload();
                        } catch (e: any) {
                          push("error", e?.message || "Failed to update attendance.");
                        } finally {
                          setActionLoading(null);
                        }
                      }}
                      className={cn(
                        "cursor-pointer inline-flex items-center gap-1.5 rounded-lg font-bold text-[10.5px] px-2.5 py-1.5 transition-all shadow-sm whitespace-nowrap disabled:opacity-50",
                        isPresent
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/40 shadow-emerald-950/20"
                          : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 hover:border-zinc-500"
                      )}
                      title={isPresent ? "Click to toggle Absent" : "Click to mark Present"}
                    >
                      {isBusy ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : isPresent ? (
                        <CheckCircle2 className="size-3 text-emerald-200" />
                      ) : (
                        <XCircle className="size-3 text-zinc-400" />
                      )}
                      {isPresent ? "✓ Present (Checked In)" : "Mark Present"}
                    </button>
                  </div>
                  {isPresent && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {entryOrderMap.has(String(rId)) && (
                        <span className="rounded bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.2 font-mono text-[9.5px] font-black text-emerald-300">
                          Venue Entry #{entryOrderMap.get(String(rId))}
                        </span>
                      )}
                      {r.attended_at && (
                        <span className="text-[10px] font-mono text-emerald-400/90 flex items-center gap-1">
                          <Clock className="size-2.5 text-emerald-400" /> {formatDate(r.attended_at, true)}
                        </span>
                      )}
                    </div>
                  )}
                  {!isPresent && (
                    <span className="text-[10px] text-zinc-500 font-medium">
                      Not checked in at venue
                    </span>
                  )}
                </div>
              );
            },
          },
          {
            key: "category",
            header: "Category",
            width: "120px",
            render: (r: any) => (
              <span className="inline-flex items-center rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-[10.5px] font-bold text-violet-300 whitespace-nowrap">
                {r.category || "General"}
              </span>
            ),
          },
          {
            key: "registration_reference",
            header: "Reg Reference",
            width: "170px",
            render: (r: any) => (
              <div className="min-w-[150px]">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-[var(--brand)] text-[11.5px] tracking-wider whitespace-nowrap">
                    {r.registration_reference}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(r.registration_reference)}
                    title="Copy reference code"
                    className="cursor-pointer text-[var(--fg-subtle)] hover:text-white transition-colors p-0.5 rounded"
                  >
                    {copiedRef === r.registration_reference ? (
                      <Check className="size-3 text-emerald-400" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </button>
                </div>
                <span className="block text-[10.5px] text-[var(--fg-subtle)] whitespace-nowrap mt-0.5">
                  {formatDate(r.registered_at, true)}
                </span>
              </div>
            ),
          },
          {
            key: "fee",
            header: "Fee / Payment Method",
            width: "270px",
            render: (r: any) => {
              const isCash = Boolean(r.cash_payment || r.payment_method === "CASH");
              const isFree = r.payment_method === "FREE" || Number(r.fee) === 0 || r.payment_status === "NOT_REQUIRED";
              const isPaid = r.payment_status === "PAID" || r.cash_status === "COLLECTED" || r.cash_status === "PAID";

              if (isFree) {
                return (
                  <div className="min-w-[160px]">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/40 bg-purple-500/15 px-2.5 py-0.5 text-[10.5px] font-bold text-purple-300 whitespace-nowrap">
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
                  <div className="flex flex-col gap-1.5 min-w-[240px]">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white text-[13px] tabular-nums whitespace-nowrap">{formatINR(r.fee)}</span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[10.5px] font-bold text-amber-300 shadow-sm whitespace-nowrap">
                        <Banknote className="size-3 text-amber-400" /> Cash on Venue
                      </span>
                    </div>

                    {isPaid ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 whitespace-nowrap">
                          <CheckCircle2 className="size-3.5 shrink-0" /> Cash Received
                        </span>
                        <button
                          type="button"
                          title="Revert cash payment back to pending"
                          disabled={actionLoading === r._id}
                          onClick={() => handleRevertCash(r._id, r.user_name)}
                          className="cursor-pointer text-[10px] text-[var(--fg-subtle)] hover:text-amber-400 underline whitespace-nowrap"
                        >
                          Revert
                        </button>
                        {r.cash_collected_at && (
                          <span className="text-[10px] font-mono text-[var(--fg-subtle)] whitespace-nowrap">
                            • {formatDate(r.cash_collected_at, true)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-amber-300 whitespace-nowrap">
                          <Clock className="size-3 shrink-0 text-amber-400 animate-pulse" /> Pending
                        </span>
                        <button
                          type="button"
                          disabled={actionLoading === r._id}
                          onClick={() => handleConfirmCash(r._id, r.user_name, r.fee)}
                          className="cursor-pointer inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10.5px] px-2.5 py-1 transition-all shadow-sm whitespace-nowrap disabled:opacity-50"
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
                <div className="flex flex-col gap-1.5 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-white text-[13px] tabular-nums whitespace-nowrap">{formatINR(r.fee)}</span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/40 bg-sky-500/15 px-2.5 py-0.5 text-[10.5px] font-bold text-sky-300 shadow-sm whitespace-nowrap">
                      <CreditCard className="size-3 text-sky-400" /> Online Payment
                    </span>
                  </div>

                  {r.payment_status === "PAID" ? (
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 whitespace-nowrap">
                      <CheckCircle2 className="size-3.5 shrink-0" />
                      <span>Paid Online</span>
                    </div>
                  ) : r.payment_status === "FAILED" ? (
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-400 whitespace-nowrap">
                      <AlertCircle className="size-3.5 shrink-0" />
                      <span>Payment Failed</span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 whitespace-nowrap">
                        <Clock className="size-3.5 shrink-0 animate-pulse" />
                        <span>Online Pending</span>
                      </span>
                      <button
                        type="button"
                        disabled={actionLoading === r._id}
                        onClick={() => handleConfirmPayment(r._id, r.user_name, r.fee)}
                        className="cursor-pointer inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10.5px] px-2.5 py-1 transition-all shadow-sm whitespace-nowrap disabled:opacity-50"
                        title="Confirm participant payment and admit to official performance lineup"
                      >
                        {actionLoading === r._id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Check className="size-3" />
                        )}
                        Confirm &amp; Admit
                      </button>
                    </div>
                  )}
                </div>
              );
            },
          },
          {
            key: "status",
            header: "Lineup Status",
            width: "160px",
            render: (r: any) => {
              const isFree = r.payment_method === "FREE" || Number(r.fee) === 0 || r.payment_status === "NOT_REQUIRED";
              const isPaid = r.payment_status === "PAID" || r.cash_status === "COLLECTED" || r.cash_status === "PAID";
              const isConfirmed = r.status === "CONFIRMED" || isPaid || isFree;

              if (isConfirmed && (isPaid || isFree)) {
                return (
                  <div className="flex flex-col gap-0.5">
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-[10.5px] font-extrabold text-emerald-400">
                      <CheckCircle2 className="size-3" /> In Lineup
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Payment Confirmed</span>
                  </div>
                );
              }

              return (
                <div className="flex flex-col gap-0.5">
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[10.5px] font-bold text-amber-300">
                    <Clock className="size-3 animate-pulse" /> Pending
                  </span>
                  <span className="text-[10px] text-amber-300/80 font-medium">Awaiting Confirmation</span>
                </div>
              );
            },
          },
          {
            key: "stage",
            header: "Live Stage",
            width: "160px",
            render: (r: any) => {
              const isOnStage = Boolean(r.is_on_stage || r.stage_status === "ON_STAGE");
              const isCompleted = r.stage_status === "COMPLETED";
              const rId = r._id || r.registration_id;

              if (isOnStage) {
                return (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/50 bg-rose-500/20 px-2.5 py-1 text-[10.5px] font-extrabold text-rose-300 animate-pulse whitespace-nowrap">
                    <Radio className="size-3 text-rose-400" /> On Stage Now
                  </span>
                );
              }

              if (isCompleted) {
                return (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 whitespace-nowrap">
                    <CheckCircle2 className="size-3" /> Done Performing
                  </span>
                );
              }

              return (
                <button
                  type="button"
                  disabled={actionLoading === `stage-${rId}`}
                  onClick={async () => {
                    setActionLoading(`stage-${rId}`);
                    try {
                      await competitionsApi.setStagePerformer(compId, rId);
                      push("success", `${r.user_name || "Competitor"} is now LIVE ON STAGE!`);
                      reload();
                    } catch (e: any) {
                      push("error", e?.message || "Failed to put competitor on stage.");
                    } finally {
                      setActionLoading(null);
                    }
                  }}
                  className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 font-bold text-[10.5px] px-2.5 py-1 transition-all shadow-sm whitespace-nowrap disabled:opacity-50"
                  title="Send this participant straight to the live performance stage"
                >
                  {actionLoading === `stage-${rId}` ? (
                    <Loader2 className="size-3 animate-spin text-rose-400" />
                  ) : (
                    <Mic className="size-3 text-rose-400" />
                  )}
                  Send to Stage
                </button>
              );
            },
          },
          {
            key: "submission",
            header: "Submitted Files / Media",
            width: "240px",
            render: (r: any) => {
              const sub = r.submission;
              if (!sub) {
                return <span className="text-[11px] text-[var(--fg-subtle)] whitespace-nowrap">Awaiting files</span>;
              }
              const files = sub.files || {};
              const entries = Object.entries(files);
              return (
                <div className="flex flex-col gap-1.5 min-w-[200px] max-w-[260px]">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-400 whitespace-nowrap">
                    <CheckCircle2 className="size-3" /> {sub.status || "Submitted"}
                  </span>
                  <div className="flex flex-col gap-1">
                    {entries.map(([label, url]: any) => (
                      <a
                        key={label}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="group/link inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-3)] px-2.5 py-1 text-[10.5px] font-mono text-[var(--brand)] hover:border-[var(--brand)] transition-colors truncate max-w-[240px]"
                        title={`${label}: ${url}`}
                      >
                        <Video className="size-3 shrink-0 text-[var(--fg-muted)] group-hover/link:text-[var(--brand)]" />
                        <span className="truncate flex-1">{label}</span>
                        <ExternalLink className="size-2.5 shrink-0 opacity-60" />
                      </a>
                    ))}
                  </div>
                </div>
              );
            },
          },
        ]}
      />

      {/* ── Competitor Profile & Aadhaar Verification Modal ── */}
      {selectedParticipant && (
        <Modal
          open={!!selectedParticipant}
          onClose={() => setSelectedParticipant(null)}
          title={selectedParticipant.user_name || "Competitor Profile"}
          subtitle={`Registration Reference: ${selectedParticipant.registration_reference} • ${compTitle || "Competition"}`}
          wide
        >
          <div className="flex flex-col gap-5 text-xs">
            {/* Identity Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <div className="flex items-center gap-3.5">
                <div className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/30 to-violet-600/30 border border-violet-500/40 text-lg font-black text-violet-200 shadow-inner">
                  {((selectedParticipant.user_name || selectedParticipant.user_email || "P").trim()[0] || "P").toUpperCase()}
                  {(selectedParticipant.is_verified || selectedParticipant.verified_badge) && (
                    <span className="absolute -bottom-1 -right-1">
                      <VerifiedBadge size="sm" />
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                    {selectedParticipant.user_name || "Participant"}
                    {(selectedParticipant.is_verified || selectedParticipant.verified_badge) && (
                      <VerifiedBadge size="sm" />
                    )}
                  </h3>
                  <p className="text-xs text-[var(--fg-muted)] font-mono">{selectedParticipant.user_email}</p>
                  {selectedParticipant.user_phone && (
                    <p className="text-xs text-[var(--fg-subtle)] font-mono mt-0.5 flex items-center gap-1">
                      <Phone className="size-3" /> {selectedParticipant.user_phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Action / Verified Tag */}
              <div>
                {(selectedParticipant.is_verified || selectedParticipant.verified_badge) ? (
                  <div className="flex items-center gap-2 rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 py-1.5 text-xs font-bold text-sky-300">
                    <VerifiedBadge size="sm" />
                    <span>Official Blue Badge Active</span>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleVerifyAadhaar(selectedParticipant)}
                    loading={verifyingId === (selectedParticipant._id || selectedParticipant.registration_id)}
                    className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs"
                  >
                    <ShieldCheck className="size-3.5 mr-1.5" /> Verify Aadhaar & Issue Blue Badge
                  </Button>
                )}
              </div>
            </div>

            {/* Verification Status Banner */}
            {(selectedParticipant.is_verified || selectedParticipant.verified_badge) ? (
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3.5 flex items-start gap-3">
                <VerifiedBadge size="md" className="mt-0.5" />
                <div className="text-xs text-sky-200 leading-relaxed">
                  <p className="font-bold text-sky-300">Lifetime Verified Competitor</p>
                  <p className="text-[11.5px] text-sky-200/80 mt-0.5">
                    This user has been physically verified by admin with their Aadhaar / Government ID. 
                    The official Blue Badge is permanently active across their profile, competition registrations, and live stages. 
                    <strong>No further manual verification is ever required.</strong>
                  </p>
                  {selectedParticipant.verified_at && (
                    <p className="text-[10.5px] text-sky-300/60 font-mono mt-1">
                      Verified at: {formatDate(selectedParticipant.verified_at, true)}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-3">
                <ShieldAlert className="size-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-200 leading-relaxed">
                  <p className="font-bold text-amber-300">Physical Aadhaar Check Required</p>
                  <p className="text-[11.5px] text-amber-200/80 mt-0.5">
                    Please inspect the competitor's original Aadhaar or valid Government ID at the venue or registration desk.
                    Once confirmed, click "Verify Aadhaar & Issue Blue Badge". The blue checkmark badge will immediately reflect next to their name.
                  </p>
                </div>
              </div>
            )}

            {/* Registration Details Grid */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col gap-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                Registration Input Details
              </h4>
              <KeyValues
                items={[
                  { k: "Full Name", v: selectedParticipant.user_name || "—" },
                  { k: "Registered Email", v: selectedParticipant.user_email },
                  { k: "Mobile Number", v: selectedParticipant.user_phone || "—" },
                  { k: "Parent / Guardian Phone", v: selectedParticipant.parent_phone_number ? `+91 ${selectedParticipant.parent_phone_number}` : "Not provided" },
                  { k: "Date of Birth", v: selectedParticipant.date_of_birth ? `${selectedParticipant.date_of_birth} ${selectedParticipant.age ? `(${selectedParticipant.age} years old)` : ""}` : "Not provided" },
                  { k: "Residential Address", v: selectedParticipant.address || "Not provided" },
                  { k: "Government ID Type", v: selectedParticipant.govt_id_type || "AADHAAR" },
                  { k: "Government ID Number", v: selectedParticipant.govt_id_number || "Checked physically by admin" },
                  { k: "Registration Ref", v: <span className="font-mono font-bold text-[var(--brand)]">{selectedParticipant.registration_reference}</span> },
                  { k: "Registered At", v: formatDate(selectedParticipant.registered_at, true) },
                  { k: "Payment Method", v: selectedParticipant.cash_payment || selectedParticipant.payment_method === "CASH" ? "Cash on Venue" : selectedParticipant.payment_method },
                  { k: "Fee Amount", v: formatINR(selectedParticipant.fee) },
                  { k: "Payment Status", v: <StatusBadge value={selectedParticipant.payment_status} /> },
                ]}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function CompetitionRoundsPanel({ compId, compTitle }: { compId: string; compTitle?: string }) {
  const { push } = useToast();
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [advancingCount, setAdvancingCount] = useState<number>(20);
  const [advanceNotes, setAdvanceNotes] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [configureModalOpen, setConfigureModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: roundsData, loading: roundsLoading, reload: reloadRounds } = useResource(
    () => (!compId ? Promise.resolve(null) : competitionsApi.rounds(compId)),
    [compId]
  );

  const roundsList: any[] = useMemo(() => {
    return Array.isArray(roundsData?.rounds) && roundsData.rounds.length > 0
      ? roundsData.rounds
      : [
          { round_number: 1, name: "Round 1 - Preliminary Auditions", status: "ACTIVE", advancing_count: 20, is_final_round: false },
          { round_number: 2, name: "Round 2 - Semi-Finals", status: "UPCOMING", advancing_count: 5, is_final_round: false },
          { round_number: 3, name: "Round 3 - Grand Finale", status: "UPCOMING", advancing_count: null, is_final_round: true },
        ];
  }, [roundsData]);

  const [configRounds, setConfigRounds] = useState<any[]>(roundsList);

  const applyPreset = async (type: "3_stage" | "2_stage" | "1_stage", semiCutoff = 5, prelimCutoff = 20) => {
    setActionLoading(`preset-${type}`);
    try {
      let presets: any[] = [];
      if (type === "3_stage") {
        presets = [
          { round_number: 1, name: "Round 1 - Preliminary Auditions", status: "ACTIVE", advancing_count: prelimCutoff, is_final_round: false },
          { round_number: 2, name: "Round 2 - Semi-Finals", status: "UPCOMING", advancing_count: semiCutoff, is_final_round: false },
          { round_number: 3, name: "Round 3 - Grand Finale", status: "UPCOMING", advancing_count: null, is_final_round: true },
        ];
      } else if (type === "2_stage") {
        presets = [
          { round_number: 1, name: "Round 1 - Preliminary Auditions", status: "ACTIVE", advancing_count: semiCutoff || 10, is_final_round: false },
          { round_number: 2, name: "Round 2 - Grand Finale", status: "UPCOMING", advancing_count: null, is_final_round: true },
        ];
      } else {
        presets = [
          { round_number: 1, name: "Round 1 - Grand Finale (Direct)", status: "ACTIVE", advancing_count: null, is_final_round: true },
        ];
      }
      await competitionsApi.configureRounds(compId, presets);
      push("success", `Knockout stages configured! (${presets.length} rounds).`);
      reloadRounds();
      reloadLb();
    } catch (e: any) {
      push("error", e?.message || "Failed to configure preset stages.");
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    if (roundsData?.current_round) {
      setSelectedRound(roundsData.current_round);
    }
  }, [roundsData?.current_round]);

  useEffect(() => {
    if (Array.isArray(roundsData?.rounds) && roundsData.rounds.length > 0) {
      setConfigRounds(roundsData.rounds);
    }
  }, [roundsData?.rounds]);

  const { data: lbData, loading: lbLoading, reload: reloadLb } = useResource(
    () =>
      !compId
        ? Promise.resolve(null)
        : competitionsApi.roundLeaderboard(
            compId,
            selectedRound,
            selectedCategory === "ALL" ? undefined : selectedCategory
          ),
    [compId, selectedRound, selectedCategory]
  );

  const participantsList = Array.isArray(lbData?.leaderboard) ? lbData.leaderboard : [];
  const activeRoundConfig = roundsList.find((r) => r.round_number === selectedRound) || roundsList[0];
  const nextRoundNumber = selectedRound + 1;
  const nextRoundConfig = roundsList.find((r) => r.round_number === nextRoundNumber);
  const isFinalRound = !!activeRoundConfig?.is_final_round;

  useEffect(() => {
    if (activeRoundConfig?.advancing_count) {
      setAdvancingCount(activeRoundConfig.advancing_count);
    }
  }, [activeRoundConfig?.advancing_count]);

  const categories: string[] = useMemo(() => {
    const set = new Set<string>();
    if (Array.isArray(lbData?.categories)) {
      lbData.categories.forEach((c: any) => c && set.add(String(c)));
    }
    participantsList.forEach((p: any) => {
      if (p.category) set.add(String(p.category));
    });
    return Array.from(set);
  }, [lbData?.categories, participantsList]);

  const filteredParticipants = useMemo(() => {
    let list = participantsList;
    if (selectedCategory !== "ALL") {
      list = list.filter(
        (p: any) => (p.category || "General").trim().toLowerCase() === selectedCategory.trim().toLowerCase()
      );
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (p: any) =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.email || p.user_email || "").toLowerCase().includes(q) ||
        (p.registration_reference || "").toLowerCase().includes(q)
    );
  }, [participantsList, search, selectedCategory]);

  const handleSelectTopN = (count: number) => {
    const newSet = new Set<string>();
    filteredParticipants.slice(0, count).forEach((p: any) => {
      const id = p.registration_id || p.email || p.user_email;
      if (id) newSet.add(id);
    });
    setSelectedIds(newSet);
    push("info", `Selected top ${newSet.size} contestants for qualification.`);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredParticipants.length) {
      setSelectedIds(new Set());
    } else {
      const newSet = new Set<string>();
      filteredParticipants.forEach((p: any) => {
        const id = p.registration_id || p.email || p.user_email;
        if (id) newSet.add(id);
      });
      setSelectedIds(newSet);
    }
  };

  const handleSetActiveRound = async (rNum: number) => {
    setActionLoading(`set-${rNum}`);
    try {
      await competitionsApi.setActiveRound(compId, rNum);
      push("success", `Stage ${rNum} is now the ACTIVE competition round.`);
      reloadRounds();
      reloadLb();
    } catch (e: any) {
      push("error", e?.message || "Failed to set active round.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAdvance = async () => {
    setActionLoading("advance");
    try {
      const payload: any = {
        notes: advanceNotes.trim() || undefined,
      };

      if (selectedIds.size > 0) {
        payload.contestant_ids = Array.from(selectedIds);
      } else {
        payload.advancing_count = Number(advancingCount) || 10;
      }

      const res = await competitionsApi.advanceRound(compId, selectedRound, payload);
      push(
        "success",
        `🎉 Successfully advanced ${res?.advanced_count ?? selectedIds.size ?? advancingCount} contestants to Round ${res?.next_round ?? nextRoundNumber}!`
      );
      setSelectedIds(new Set());
      reloadRounds();
      reloadLb();
    } catch (e: any) {
      push("error", e?.message || "Failed to advance contestants.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveConfig = async () => {
    setActionLoading("save-config");
    try {
      await competitionsApi.configureRounds(compId, configRounds);
      push("success", "Knockout stages and round configuration saved successfully!");
      setConfigureModalOpen(false);
      reloadRounds();
      reloadLb();
    } catch (e: any) {
      push("error", e?.message || "Failed to save rounds configuration.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Top Knockout Pipeline Banner ── */}
      <div className="rounded-2xl border border-[var(--border)] bg-gradient-to-r from-[var(--surface-2)] via-[var(--surface)] to-[var(--surface-2)] p-5 shadow-sm flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-amber-500/15 text-amber-400">
              <Layers className="size-5" />
            </span>
            <div>
              <h3 className="font-display text-base font-bold text-[var(--fg)] flex items-center gap-2">
                <span>Knockout Stages &amp; Progression</span>
                <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-black text-amber-300">
                  Current: Round {roundsData?.current_round ?? 1}
                </span>
              </h3>
              <p className="text-xs text-[var(--fg-muted)]">
                Manage preliminary auditions, advance top performers into semi-finals, and crown the final champions.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 bg-[var(--surface-2)] p-1 rounded-xl border border-[var(--border)]">
              <span className="text-[10px] font-bold text-[var(--fg-subtle)] px-1.5 uppercase tracking-wider">Presets:</span>
              <button
                type="button"
                disabled={!!actionLoading}
                onClick={() => applyPreset("3_stage", 3, 10)}
                className="cursor-pointer text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[var(--surface)] hover:bg-amber-500/20 text-amber-300 transition-all border border-amber-500/30 font-mono"
                title="Exact 3 Stages: Prelims (Top 10 Advance) -> Semi-Final (Top 3 Advance) -> Grand Finale"
              >
                3 Stages (Top 10 Semi ➔ Top 3 Final)
              </button>
              <button
                type="button"
                disabled={!!actionLoading}
                onClick={() => applyPreset("3_stage", 5, 20)}
                className="cursor-pointer text-[11px] font-bold px-2 py-1 rounded-lg bg-[var(--surface)] hover:bg-amber-500/20 text-amber-300 transition-all border border-amber-500/30"
                title="3 Rounds: Prelims (Top 20) -> Semi-Final (Top 5 to Grand Finale) -> Grand Finale"
              >
                3 Stages (Top 20 ➔ Top 5)
              </button>
              <button
                type="button"
                disabled={!!actionLoading}
                onClick={() => applyPreset("2_stage", 10)}
                className="cursor-pointer text-[11px] font-bold px-2 py-1 rounded-lg bg-[var(--surface)] hover:bg-sky-500/20 text-sky-300 transition-all border border-sky-500/30"
                title="2 Rounds: Prelims (Top 10) -> Grand Finale"
              >
                2 Rounds (Prelims ➔ Final)
              </button>
              <button
                type="button"
                disabled={!!actionLoading}
                onClick={() => applyPreset("1_stage")}
                className="cursor-pointer text-[11px] font-bold px-2 py-1 rounded-lg bg-[var(--surface)] hover:bg-emerald-500/20 text-emerald-300 transition-all border border-emerald-500/30"
                title="1 Round: Direct Grand Finale"
              >
                1 Round (Direct Final)
              </button>
            </div>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setConfigRounds(roundsList);
                setConfigureModalOpen(true);
              }}
              className="text-xs border-[var(--border)]"
            >
              <Settings className="size-3.5 mr-1.5" /> Configure Stages
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                reloadRounds();
                reloadLb();
              }}
              loading={roundsLoading || lbLoading}
              className="text-xs border-[var(--border)]"
            >
              <RotateCcw className="size-3.5 mr-1.5" /> Refresh
            </Button>
          </div>
        </div>

        {/* Stages Pipeline Visualizer */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {roundsList.map((rd: any) => {
            const isCurrentActive = rd.round_number === (roundsData?.current_round ?? 1);
            const isSelected = rd.round_number === selectedRound;
            const isCompleted = rd.status === "COMPLETED";

            return (
              <div
                key={rd.round_number}
                onClick={() => setSelectedRound(rd.round_number)}
                className={cn(
                  "cursor-pointer rounded-xl p-3.5 border transition-all relative flex flex-col justify-between gap-2.5",
                  isSelected
                    ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30 shadow-md"
                    : "border-[var(--border)] bg-[var(--surface-2)]/60 hover:border-[var(--border-strong)]"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-[var(--fg)]">
                    {rd.name || `Round ${rd.round_number}`}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase",
                      isCurrentActive
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse"
                        : isCompleted
                        ? "bg-slate-500/20 text-slate-300 border border-slate-500/30"
                        : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                    )}
                  >
                    {isCurrentActive ? "Active Stage" : isCompleted ? "Completed" : "Upcoming"}
                  </span>
                </div>

                {rd.description && (
                  <p className="line-clamp-1 text-[11.5px] text-[var(--fg-muted)]">{rd.description}</p>
                )}

                <div className="flex items-center justify-between text-[11px] font-medium pt-1 border-t border-[var(--border)]/60">
                  <span className="text-amber-400 font-bold">
                    {rd.is_final_round
                      ? "👑 Championship Final"
                      : rd.advancing_count
                      ? `Top ${rd.advancing_count} Advance`
                      : "Qualifying Stage"}
                  </span>

                  {!isCurrentActive && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetActiveRound(rd.round_number);
                      }}
                      disabled={!!actionLoading}
                      className="cursor-pointer text-[10.5px] font-bold text-amber-300 hover:text-white underline decoration-amber-400/50"
                    >
                      Set Active
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Round Advancing Action Box (Only if not final round) ── */}
      {!isFinalRound && (
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-[var(--surface-2)] to-amber-500/10 p-5 shadow-sm flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="font-display text-sm font-bold text-amber-300 flex items-center gap-2">
                <Sparkles className="size-4 text-amber-400" />
                <span>Advance Qualifiers to Round {nextRoundNumber} {nextRoundConfig?.name ? `(${nextRoundConfig.name})` : ""}</span>
              </h4>
              <p className="text-xs text-[var(--fg-muted)] mt-0.5">
                Eligible qualifiers advance to the next round with their status set to <strong className="text-emerald-400">QUALIFIED</strong>. 
                Non-qualifiers will be permanently marked <strong className="text-rose-400">ELIMINATED</strong>.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--fg-muted)]">Quick select:</span>
              <button
                type="button"
                onClick={() => handleSelectTopN(5)}
                className="cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-bold hover:border-amber-400 text-amber-300"
              >
                Top 5
              </button>
              <button
                type="button"
                onClick={() => handleSelectTopN(10)}
                className="cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-bold hover:border-amber-400 text-amber-300"
              >
                Top 10
              </button>
              <button
                type="button"
                onClick={() => handleSelectTopN(20)}
                className="cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-bold hover:border-amber-400 text-amber-300"
              >
                Top 20
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                Advancing Quota (Top N Cutoff)
              </label>
              <input
                type="number"
                min="1"
                max={participantsList.length || 100}
                value={advancingCount}
                onChange={(e) => setAdvancingCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-xs font-bold text-[var(--fg)] outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                Progression Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Top performers advanced from prelims"
                value={advanceNotes}
                onChange={(e) => setAdvanceNotes(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-xs text-[var(--fg)] outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <Button
                onClick={handleAdvance}
                loading={actionLoading === "advance"}
                disabled={participantsList.length === 0}
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs py-2 shadow-lg shadow-amber-500/25"
              >
                <ArrowRight className="size-4 mr-1.5" />
                {selectedIds.size > 0
                  ? `Advance ${selectedIds.size} Selected Contestants ➔`
                  : `Advance Top ${advancingCount} Contestants ➔`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Round Leaderboard & Standings Table ── */}
      <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-[var(--fg)] flex items-center gap-1.5">
              <Trophy className="size-3.5 text-amber-400" />
              <span>Round {selectedRound} Standings &amp; Shortlist</span>
            </span>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 ml-2">
              <button
                type="button"
                onClick={() => setSelectedCategory("ALL")}
                className={cn(
                  "cursor-pointer rounded-full px-3 py-1 text-[11px] font-bold transition-all",
                  selectedCategory === "ALL"
                    ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                    : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-muted)] hover:text-white"
                )}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "cursor-pointer rounded-full px-3 py-1 text-[11px] font-bold transition-all",
                    selectedCategory === cat
                      ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                      : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-muted)] hover:text-white"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-48">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--fg-muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search contestant…"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-1.5 pl-8 pr-3 text-xs outline-none focus:border-amber-400"
              />
            </div>
            <button
              type="button"
              onClick={handleSelectAll}
              className="cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-semibold text-[var(--fg-muted)] hover:text-white"
            >
              {selectedIds.size === filteredParticipants.length ? "Deselect All" : "Select All"}
            </button>
          </div>
        </div>

        {/* Table */}
        {lbLoading ? (
          <Loading rows={4} />
        ) : filteredParticipants.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--fg-muted)]">
            No contestants or scores recorded for Round {selectedRound} yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                  <th className="py-2.5 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={selectedIds.size > 0 && selectedIds.size === filteredParticipants.length}
                      onChange={handleSelectAll}
                      className="rounded accent-amber-500"
                    />
                  </th>
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3">Contestant</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">Judge Score</th>
                  <th className="py-2.5 px-3 text-right">Audience Votes</th>
                  <th className="py-2.5 px-3 text-right">Points</th>
                  <th className="py-2.5 px-3 text-center">Round Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredParticipants.map((p: any, idx: number) => {
                  const id = p.registration_id || p.email || p.user_email;
                  const isChecked = selectedIds.has(id);
                  const isAdvancingZone = idx < advancingCount;
                  const displayRank = selectedCategory !== "ALL" ? (idx + 1) : (p.rank ?? (idx + 1));

                  return (
                    <tr
                      key={id || idx}
                      className={cn(
                        "border-b border-[var(--border)]/60 hover:bg-[var(--surface-2)]/60 transition-colors",
                        isChecked ? "bg-amber-500/10" : isAdvancingZone ? "bg-emerald-500/[0.04]" : ""
                      )}
                    >
                      <td className="py-2.5 px-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(id)}
                          className="rounded accent-amber-500"
                        />
                      </td>
                      <td className="py-2.5 px-3 font-bold">
                        {displayRank === 1 ? (
                          <span className="grid size-6 place-items-center rounded-full bg-amber-400 text-slate-950 font-black text-[11px]">1</span>
                        ) : displayRank === 2 ? (
                          <span className="grid size-6 place-items-center rounded-full bg-slate-300 text-slate-900 font-bold text-[11px]">2</span>
                        ) : displayRank === 3 ? (
                          <span className="grid size-6 place-items-center rounded-full bg-amber-700 text-amber-50 font-bold text-[11px]">3</span>
                        ) : (
                          <span className="text-[var(--fg-muted)] pl-2">{displayRank}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="min-w-0">
                            <p className="font-semibold text-[var(--fg)] flex items-center gap-1">
                              <span>{p.name || p.user_name || "Contestant"}</span>
                              {p.is_verified && <VerifiedBadge size="xs" />}
                            </p>
                            <p className="text-[10.5px] text-[var(--fg-muted)] truncate max-w-[200px]">
                              {p.email || p.user_email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10.5px] font-bold text-violet-300">
                          {p.category || "General"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-[var(--fg-muted)] font-medium">
                        {p.judge_score != null ? p.judge_score : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-[var(--fg-muted)] font-medium">
                        {p.audience_votes != null ? formatNumber(p.audience_votes) : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-bold text-amber-400 font-display">
                        {p.points ?? p.final_score ?? p.audience_votes ?? "—"}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {p.round_status === "ELIMINATED" ? (
                          <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-bold text-rose-400">
                            Eliminated
                          </span>
                        ) : p.is_advancing || isAdvancingZone ? (
                          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-400 flex items-center justify-center gap-1">
                            <Sparkles className="size-2.5" /> Advancing
                          </span>
                        ) : (
                          <span className="rounded-full border border-slate-500/30 bg-slate-500/10 px-2.5 py-0.5 text-[10px] font-bold text-slate-300">
                            Qualified
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Configure Rounds Modal ── */}
      {configureModalOpen && (
        <Modal
          open={configureModalOpen}
          onClose={() => setConfigureModalOpen(false)}
          title="Configure Knockout Stages (Prelims → Semifinal → Final)"
          subtitle="Customize the competition stages, advancing quotas, and championship round."
          size="2xl"
        >
          <div className="flex flex-col gap-4">
            <p className="text-xs text-[var(--fg-muted)]">
              Specify the progression lifecycle. Contestants will battle round-by-round until the Grand Finale champion is crowned!
            </p>

            <div className="flex flex-col gap-3">
              {configRounds.map((r: any, idx: number) => (
                <div key={idx} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-400 uppercase tracking-wide">
                      Stage {idx + 1}
                    </span>
                    {configRounds.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setConfigRounds(configRounds.filter((_, i) => i !== idx))}
                        className="text-xs font-semibold text-rose-400 hover:text-rose-300"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Stage Name">
                      {(p) => (
                        <Input
                          {...p}
                          value={r.name || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setConfigRounds(configRounds.map((item, i) => i === idx ? { ...item, name: val } : item));
                          }}
                        />
                      )}
                    </Field>

                    <Field label="Advancing Cutoff (Top N to Advance)">
                      {(p) => (
                        <Input
                          {...p}
                          type="number"
                          placeholder={idx === configRounds.length - 1 ? "None (Final Round)" : "e.g. 20"}
                          value={r.advancing_count ?? ""}
                          onChange={(e) => {
                            const val = e.target.value ? parseInt(e.target.value) : null;
                            setConfigRounds(configRounds.map((item, i) => i === idx ? { ...item, advancing_count: val } : item));
                          }}
                        />
                      )}
                    </Field>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id={`is_final_${idx}`}
                      checked={!!r.is_final_round}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setConfigRounds(configRounds.map((item, i) => i === idx ? { ...item, is_final_round: checked } : item));
                      }}
                      className="rounded accent-amber-500"
                    />
                    <label htmlFor={`is_final_${idx}`} className="text-xs font-medium text-[var(--fg-muted)]">
                      Is Grand Finale (Final Championship Round)
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const nextNum = configRounds.length + 1;
                setConfigRounds([
                  ...configRounds,
                  {
                    round_number: nextNum,
                    name: `Round ${nextNum}`,
                    status: "UPCOMING",
                    advancing_count: null,
                    is_final_round: true,
                  },
                ]);
              }}
              className="text-xs border-dashed"
            >
              <Plus className="size-3.5 mr-1.5" /> Add Another Stage
            </Button>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <Button size="sm" variant="secondary" onClick={() => setConfigureModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveConfig}
                loading={actionLoading === "save-config"}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold"
              >
                Save Stages Configuration
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

