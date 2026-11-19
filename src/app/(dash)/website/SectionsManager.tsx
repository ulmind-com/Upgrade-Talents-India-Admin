"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Eye, EyeOff, Save, Plus, Trash2, RotateCcw, Sparkles, ExternalLink,
  ArrowUp, ArrowDown, Search, Layers, CheckCircle2, Sliders, Edit3,
  Monitor, Smartphone, Play, Image as ImageIcon, Grid, AlertCircle
} from "lucide-react";
import { Button, Input, Panel, StatusBadge, Textarea, Toggle, Select, Modal } from "@/components/Kit";
import { useToast } from "@/components/Providers";
import { cmsApi, safe, type HomepageSectionItem } from "@/lib/api";

function FormField({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12.5px] font-semibold text-[var(--fg)]">
        {label}
        {required && <span className="ml-0.5 text-[var(--danger)]">*</span>}
      </label>
      {hint && <p className="text-[11.5px] text-[var(--fg-muted)]">{hint}</p>}
      {children}
    </div>
  );
}

const SECTION_TYPE_LABELS: Record<string, { label: string; tone: string }> = {
  builtin: { label: "Built-in Core", tone: "neutral" },
  custom_banner: { label: "Custom Banner", tone: "brand" },
  custom_cards: { label: "Custom Cards Grid", tone: "info" },
  custom_split_media: { label: "Custom Split Media", tone: "warning" },
  custom_cta: { label: "Custom CTA Strip", tone: "success" },
  custom_rich_text: { label: "Custom Editorial", tone: "brand" },
  custom_video_embed: { label: "Custom Video", tone: "danger" },
};

// Maps built-in section IDs to existing Website control room tabs
const BUILTIN_TAB_MAP: Record<string, { tab: string; label: string }> = {
  sponsor_popup: { tab: "popup", label: "Grand Sponsor Pop-up" },
  hero_banner: { tab: "banners", label: "Sponsored Banners" },
  hero: { tab: "brand", label: "Brand & Contact" },
  quad_tiles: { tab: "tiles", label: "Featured 4 Tiles" },
  gallery: { tab: "gallery", label: "Gallery Section" },
  stats: { tab: "stats", label: "Stats Counter" },
  live_now: { tab: "live", label: "Live Events" },
  contest_band: { tab: "contests", label: "Contest Promo" },
  testimonials: { tab: "testimonials", label: "Testimonials" },
  stage_moments: { tab: "stage", label: "Stage Moments (Ring)" },
  spotlight: { tab: "spotlight", label: "Spotlight Posts & Social" },
  sponsors: { tab: "partners", label: "Partners & Sponsors" },
  app_promo: { tab: "app", label: "App Promo" },
};

interface SectionsManagerProps {
  onNavigateTab?: (tabKey: string) => void;
}

export function SectionsManager({ onNavigateTab }: SectionsManagerProps) {
  const toast = useToast();
  const [sections, setSections] = useState<HomepageSectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "hidden">("all");

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<HomepageSectionItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // New section form state
  const [newSection, setNewSection] = useState({
    name: "",
    section_type: "custom_banner",
    category: "Custom Sections",
    badge: "Special Feature",
    description: "",
    title: "",
    subtitle: "",
    content: "",
    button_text: "Explore Now",
    button_url: "/competitions",
    button_style: "glow",
    background_style: "gradient",
    image_url: "",
    video_url: "",
    items: [
      { title: "Championship Stage", description: "State & national level showdowns", icon: "Trophy", link: "/competitions" },
      { title: "Master Choreographers", description: "Learn from top international judges", icon: "GraduationCap", link: "/courses" },
    ],
  });

  // Load sections on mount
  const loadSections = async () => {
    setLoading(true);
    try {
      const data = await cmsApi.getHomepageSections();
      if (Array.isArray(data)) {
        setSections(data.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)));
      }
    } catch (err: any) {
      toast.push("error", err.message || "Failed to load sections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSections();
  }, []);

  // Unique categories for filtering
  const categories = useMemo(() => {
    const set = new Set<string>();
    sections.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return Array.from(set);
  }, [sections]);

  // Filtered sections
  const filteredSections = useMemo(() => {
    return sections.filter((s) => {
      const matchSearch =
        !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.id.toLowerCase().includes(search.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(search.toLowerCase()));

      const matchCat = categoryFilter === "all" || s.category === categoryFilter;

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && s.is_enabled) ||
        (statusFilter === "hidden" && !s.is_enabled);

      return matchSearch && matchCat && matchStatus;
    });
  }, [sections, search, categoryFilter, statusFilter]);

  // Statistics
  const activeCount = useMemo(() => sections.filter((s) => s.is_enabled).length, [sections]);
  const hiddenCount = useMemo(() => sections.filter((s) => !s.is_enabled).length, [sections]);
  const customCount = useMemo(() => sections.filter((s) => s.section_type !== "builtin").length, [sections]);

  // Toggle single section ON/OFF
  const handleToggle = async (section: HomepageSectionItem) => {
    const nextState = !section.is_enabled;
    // Optimistic update
    setSections((prev) =>
      prev.map((s) => (s.id === section.id ? { ...s, is_enabled: nextState } : s))
    );

    try {
      await cmsApi.updateHomepageSection(section.id, { is_enabled: nextState });
      toast.push(
        "success",
        `"${section.name}" is now ${nextState ? "VISIBLE (ON)" : "HIDDEN (OFF)"} on homepage`
      );
    } catch (err: any) {
      // Revert on error
      setSections((prev) =>
        prev.map((s) => (s.id === section.id ? { ...s, is_enabled: !nextState } : s))
      );
      toast.push("error", err.message || "Failed to toggle section visibility");
    }
  };

  // Reorder: Move Up
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const reordered = [...sections];
    const prevSec = reordered[index - 1];
    const currSec = reordered[index];
    reordered[index - 1] = currSec;
    reordered[index] = prevSec;

    // Normalize display_orders
    reordered.forEach((s, idx) => {
      s.display_order = idx + 1;
    });
    setSections(reordered);
  };

  // Reorder: Move Down
  const handleMoveDown = (index: number) => {
    if (index >= sections.length - 1) return;
    const reordered = [...sections];
    const nextSec = reordered[index + 1];
    const currSec = reordered[index];
    reordered[index + 1] = currSec;
    reordered[index] = nextSec;

    // Normalize display_orders
    reordered.forEach((s, idx) => {
      s.display_order = idx + 1;
    });
    setSections(reordered);
  };

  // Save all reordering
  const handleSaveLayout = async () => {
    setSaving(true);
    try {
      const updated = await cmsApi.updateHomepageSections(sections);
      if (Array.isArray(updated)) {
        setSections(updated);
      }
      toast.push("success", "Homepage section layout & ordering saved successfully!");
    } catch (err: any) {
      toast.push("error", err.message || "Failed to save layout");
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const handleResetDefaults = async () => {
    if (!confirm("Are you sure you want to restore the default homepage section order and enable all built-in sections? Custom sections will be preserved at the bottom.")) {
      return;
    }
    setSaving(true);
    try {
      const reset = await cmsApi.resetHomepageSections();
      if (Array.isArray(reset)) {
        setSections(reset);
      }
      toast.push("success", "Homepage sections restored to default layout!");
    } catch (err: any) {
      toast.push("error", err.message || "Failed to reset sections");
    } finally {
      setSaving(false);
    }
  };

  // Open Configure Modal
  const openConfigureModal = (sec: HomepageSectionItem) => {
    setEditingSection(JSON.parse(JSON.stringify(sec)));
    setIsConfigOpen(true);
  };

  // Save Section Configuration
  const handleSaveConfig = async () => {
    if (!editingSection) return;
    setSaving(true);
    try {
      const updated = await cmsApi.updateHomepageSection(editingSection.id, {
        name: editingSection.name,
        description: editingSection.description,
        badge: editingSection.badge,
        config: editingSection.config,
      });
      setSections((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setIsConfigOpen(false);
      toast.push("success", `Section "${editingSection.name}" updated successfully!`);
    } catch (err: any) {
      toast.push("error", err.message || "Failed to update section");
    } finally {
      setSaving(false);
    }
  };

  // Handle Add Custom Section Submit
  const handleCreateCustomSection = async () => {
    if (!newSection.name.trim()) {
      toast.push("error", "Please enter a section name");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: newSection.name.trim(),
        section_type: newSection.section_type,
        category: newSection.category,
        badge: newSection.badge,
        description: newSection.description,
        is_enabled: true,
        config: {
          title: newSection.title || newSection.name,
          subtitle: newSection.subtitle,
          badge: newSection.badge,
          description: newSection.content,
          button_text: newSection.button_text,
          button_url: newSection.button_url,
          button_style: newSection.button_style,
          background_style: newSection.background_style,
          image_url: newSection.image_url,
          video_url: newSection.video_url,
          items: newSection.items,
        },
      };

      const created = await cmsApi.createCustomSection(payload);
      setSections((prev) => [...prev, created]);
      setIsAddOpen(false);
      // Reset form
      setNewSection({
        name: "",
        section_type: "custom_banner",
        category: "Custom Sections",
        badge: "Special Feature",
        description: "",
        title: "",
        subtitle: "",
        content: "",
        button_text: "Explore Now",
        button_url: "/competitions",
        button_style: "glow",
        background_style: "gradient",
        image_url: "",
        video_url: "",
        items: [
          { title: "Championship Stage", description: "State & national level showdowns", icon: "Trophy", link: "/competitions" },
          { title: "Master Choreographers", description: "Learn from top international judges", icon: "GraduationCap", link: "/courses" },
        ],
      });
      toast.push("success", `New section "${created.name}" created and added to homepage!`);
    } catch (err: any) {
      toast.push("error", err.message || "Failed to create section");
    } finally {
      setSaving(false);
    }
  };

  // Confirm delete custom section
  const handleDeleteSection = async () => {
    if (!deletingId) return;
    setSaving(true);
    try {
      await cmsApi.deleteHomepageSection(deletingId);
      setSections((prev) => prev.filter((s) => s.id !== deletingId));
      setIsDeleteOpen(false);
      setDeletingId(null);
      toast.push("success", "Custom section deleted successfully");
    } catch (err: any) {
      toast.push("error", err.message || "Failed to delete section");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Top Master Control Bar ── */}
      <Panel
        title="Homepage Layout & Section Control Room"
        subtitle="Turn any homepage section ON or OFF with a single click, reorder display sequence, customize content, or add brand-new custom sections to the live website."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleResetDefaults}
              disabled={saving}
            >
              <RotateCcw className="size-4" />
              Reset Defaults
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSaveLayout}
              disabled={saving}
            >
              <Save className="size-4" />
              {saving ? "Saving Layout..." : "Save Layout Order"}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddOpen(true)}
            >
              <Plus className="size-4" />
              Add New Section
            </Button>
          </div>
        }
      >
        {/* ── Live Stats Strip ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] p-3.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">Total Sections</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold text-[var(--fg)]">{sections.length}</span>
              <span className="text-[12px] text-[var(--fg-muted)]">configured</span>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Active / Visible (ON)
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {activeCount}
              </span>
              <span className="inline-flex size-2 animate-pulse rounded-full bg-emerald-500" />
            </div>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Hidden / Muted (OFF)
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold text-amber-600 dark:text-amber-400">
                {hiddenCount}
              </span>
              <span className="text-[12px] text-amber-600/70 dark:text-amber-400/70">not shown to users</span>
            </div>
          </div>

          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Custom Sections
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {customCount}
              </span>
              <span className="text-[12px] text-indigo-600/70 dark:text-indigo-400/70">admin created</span>
            </div>
          </div>
        </div>

        {/* ── Filters & Search Bar ── */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
          <div className="flex flex-1 items-center gap-2 min-w-[240px] max-w-md">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--fg-muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search sections by name, id, or keywords..."
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2 pl-9 pr-3 text-[13px] text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:border-[var(--brand)] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[12.5px] font-medium text-[var(--fg)] focus:border-[var(--brand)] focus:outline-none"
            >
              <option value="all">All Categories ({sections.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <div className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] p-0.5 text-[12px]">
              {(["all", "active", "hidden"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setStatusFilter(mode)}
                  className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                    statusFilter === mode
                      ? "bg-[var(--surface)] text-[var(--fg)] shadow-sm"
                      : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  }`}
                >
                  {mode === "all" ? "All" : mode === "active" ? "Visible Only" : "Hidden Only"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      {/* ── Sections Ordered List ── */}
      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center">
            <div className="size-8 animate-spin rounded-full border-2 border-[var(--brand)] border-t-transparent" />
            <p className="mt-3 text-[13px] text-[var(--fg-muted)]">Loading homepage sections & layout...</p>
          </div>
        ) : filteredSections.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-12 text-center">
            <AlertCircle className="size-8 text-[var(--fg-muted)]" />
            <h4 className="mt-2 text-[15px] font-semibold text-[var(--fg)]">No sections match your filter</h4>
            <p className="mt-1 text-[13px] text-[var(--fg-muted)]">Try clearing the search box or category filter.</p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={() => { setSearch(""); setCategoryFilter("all"); setStatusFilter("all"); }}>
              Reset Filters
            </Button>
          </div>
        ) : (
          filteredSections.map((sec) => {
            const realIndex = sections.findIndex((s) => s.id === sec.id);
            const isBuiltin = sec.section_type === "builtin";
            const tabTarget = BUILTIN_TAB_MAP[sec.id];
            const typeMeta = SECTION_TYPE_LABELS[sec.section_type] || { label: sec.section_type, tone: "neutral" };

            return (
              <div
                key={sec.id}
                className={`group relative flex flex-col gap-3 rounded-2xl border p-4 transition-all sm:flex-row sm:items-center sm:justify-between ${
                  sec.is_enabled
                    ? "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:shadow-sm"
                    : "border-[var(--border)]/60 bg-[var(--surface-sunken)]/60 opacity-70 hover:opacity-100"
                }`}
              >
                {/* ── Left Side: Order & Identity ── */}
                <div className="flex items-center gap-3">
                  {/* Order controls */}
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(realIndex)}
                      disabled={realIndex === 0}
                      className="rounded p-1 text-[var(--fg-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--fg)] disabled:opacity-20"
                      title="Move section up"
                    >
                      <ArrowUp className="size-3.5" />
                    </button>
                    <span className="font-mono text-[11px] font-bold text-[var(--fg-muted)]">
                      #{realIndex + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(realIndex)}
                      disabled={realIndex === sections.length - 1}
                      className="rounded p-1 text-[var(--fg-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--fg)] disabled:opacity-20"
                      title="Move section down"
                    >
                      <ArrowDown className="size-3.5" />
                    </button>
                  </div>

                  {/* Section Visual Indicator */}
                  <div
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl font-bold transition-colors ${
                      sec.is_enabled
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-[var(--surface-sunken)] text-[var(--fg-muted)]"
                    }`}
                  >
                    {sec.is_enabled ? (
                      <Eye className="size-5" />
                    ) : (
                      <EyeOff className="size-5" />
                    )}
                  </div>

                  {/* Title & Metadata */}
                  <div className="flex flex-col">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[14px] font-bold text-[var(--fg)]">{sec.name}</span>
                      <span className="rounded-md bg-[var(--surface-sunken)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--fg-muted)]">
                        {sec.category}
                      </span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10.5px] font-semibold ${
                          isBuiltin
                            ? "bg-slate-500/10 text-slate-600 dark:text-slate-400"
                            : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                        }`}
                      >
                        {typeMeta.label}
                      </span>
                      {sec.badge && (
                        <span className="rounded-md bg-[var(--brand)]/10 px-2 py-0.5 text-[10.5px] font-bold text-[var(--brand)]">
                          {sec.badge}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[12px] text-[var(--fg-muted)] line-clamp-1">
                      {sec.description || `Identifier: ${sec.id}`}
                    </p>
                  </div>
                </div>

                {/* ── Right Side: On/Off Toggle & Quick Actions ── */}
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  {/* ON / OFF Switch */}
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-[12px] font-bold transition-colors ${
                        sec.is_enabled
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-[var(--fg-muted)]"
                      }`}
                    >
                      {sec.is_enabled ? "ON (Visible)" : "OFF (Hidden)"}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={sec.is_enabled}
                      onClick={() => handleToggle(sec)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        sec.is_enabled ? "bg-emerald-500" : "bg-[var(--border)]"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          sec.is_enabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="h-6 w-px bg-[var(--border)] hidden sm:block" />

                  {/* Actions Group */}
                  <div className="flex items-center gap-1.5">
                    {/* Jump to existing Tab if built-in */}
                    {tabTarget && onNavigateTab && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onNavigateTab(tabTarget.tab)}
                        className="text-[12px] font-medium"
                        title={`Jump to ${tabTarget.label} control tab`}
                      >
                        Manage Content
                      </Button>
                    )}

                    {/* Configure Settings button */}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openConfigureModal(sec)}
                      className="text-[12px]"
                      title="Configure Section Settings & Headers"
                    >
                      <Sliders className="size-3.5" />
                      Configure
                    </Button>

                    {/* Delete for custom sections */}
                    {!isBuiltin && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          setDeletingId(sec.id);
                          setIsDeleteOpen(true);
                        }}
                        className="text-[12px]"
                        title="Delete custom section"
                      >
                        <Trash2 className="size-3.5" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Modal: Add New Section ── */}
      <Modal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Create New Homepage Section"
        size="lg"
      >
        <div className="flex flex-col gap-5 py-2">
          <p className="text-[13px] text-[var(--fg-muted)]">
            Create a custom block that will instantly integrate into the live homepage. You can position it anywhere, customize its styling, add call-to-actions, and toggle it on or off anytime.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Section Name" required hint="Admin display identifier">
              <Input
                value={newSection.name}
                onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
                placeholder="e.g. Summer Dance Boot Camp 2026"
              />
            </FormField>

            <FormField label="Section Layout Type" required hint="How the block will render">
              <Select
                value={newSection.section_type}
                onChange={(e) => setNewSection({ ...newSection, section_type: e.target.value })}
                options={[
                  { value: "custom_banner", label: "Grand Promo Banner (Backdrop + CTA)" },
                  { value: "custom_cards", label: "Feature Cards Grid (Interactive Cards)" },
                  { value: "custom_split_media", label: "Split Media (Text + Image/Video)" },
                  { value: "custom_cta", label: "High-Impact CTA Strip (Conversion Band)" },
                  { value: "custom_rich_text", label: "Editorial & Rich Content Block" },
                  { value: "custom_video_embed", label: "Video Showcase (YouTube / MP4)" },
                ]}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="Badge Text" hint="Small pill over heading">
              <Input
                value={newSection.badge}
                onChange={(e) => setNewSection({ ...newSection, badge: e.target.value })}
                placeholder="e.g. Limited Slots"
              />
            </FormField>

            <FormField label="Category" hint="Grouping in admin">
              <Input
                value={newSection.category}
                onChange={(e) => setNewSection({ ...newSection, category: e.target.value })}
                placeholder="e.g. Special Events"
              />
            </FormField>

            <FormField label="Background Theme">
              <Select
                value={newSection.background_style}
                onChange={(e) => setNewSection({ ...newSection, background_style: e.target.value })}
                options={[
                  { value: "gradient", label: "Brand Violet Gradient" },
                  { value: "dark", label: "Deep Charcoal Glow" },
                  { value: "glass", label: "Glassmorphism" },
                  { value: "brand", label: "Solid Brand" },
                  { value: "default", label: "Clean Default Surface" },
                ]}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Headline / Main Title" hint="Primary bold title">
              <Input
                value={newSection.title}
                onChange={(e) => setNewSection({ ...newSection, title: e.target.value })}
                placeholder="e.g. Train with India's Elite Choreographers"
              />
            </FormField>

            <FormField label="Subtitle / Label" hint="Sub-heading or kicker">
              <Input
                value={newSection.subtitle}
                onChange={(e) => setNewSection({ ...newSection, subtitle: e.target.value })}
                placeholder="e.g. Intensive 7-Day Residency"
              />
            </FormField>
          </div>

          <FormField label="Description / Body Content">
            <Textarea
              rows={3}
              value={newSection.content}
              onChange={(e) => setNewSection({ ...newSection, content: e.target.value })}
              placeholder="Tell your dancers about this opportunity, eligibility, and what makes it extraordinary..."
            />
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="Action Button Label">
              <Input
                value={newSection.button_text}
                onChange={(e) => setNewSection({ ...newSection, button_text: e.target.value })}
                placeholder="e.g. Register for Pass"
              />
            </FormField>

            <FormField label="Action Button Link (URL)">
              <Input
                value={newSection.button_url}
                onChange={(e) => setNewSection({ ...newSection, button_url: e.target.value })}
                placeholder="e.g. /workshops or https://..."
              />
            </FormField>

            <FormField label="Button Style">
              <Select
                value={newSection.button_style}
                onChange={(e) => setNewSection({ ...newSection, button_style: e.target.value })}
                options={[
                  { value: "glow", label: "Glowing Brand (Accent)" },
                  { value: "primary", label: "Solid Primary" },
                  { value: "outline", label: "Clean Outline" },
                  { value: "secondary", label: "Subtle Surface" },
                ]}
              />
            </FormField>
          </div>

          <FormField label="Image URL (Desktop/Mobile banner or split-screen picture)">
            <Input
              value={newSection.image_url}
              onChange={(e) => setNewSection({ ...newSection, image_url: e.target.value })}
              placeholder="https://images.unsplash.com/..."
            />
          </FormField>

          {newSection.section_type === "custom_video_embed" && (
            <FormField label="Video Embed URL (YouTube, Vimeo, or direct MP4)">
              <Input
                value={newSection.video_url}
                onChange={(e) => setNewSection({ ...newSection, video_url: e.target.value })}
                placeholder="https://www.youtube.com/embed/..."
              />
            </FormField>
          )}

          {/* ── Live Quick Preview Box ── */}
          <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] p-4">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
              <Sparkles className="size-3.5 text-[var(--brand)]" />
              Live Preview Representation
            </div>
            <div className="mt-3 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
              {newSection.badge && (
                <span className="inline-block rounded-full bg-[var(--brand)]/10 px-3 py-1 text-[11px] font-bold text-[var(--brand)]">
                  {newSection.badge}
                </span>
              )}
              <h3 className="mt-2 text-xl font-bold text-[var(--fg)]">
                {newSection.title || newSection.name || "Headline Title"}
              </h3>
              {newSection.subtitle && (
                <p className="mt-1 text-[13px] font-medium text-[var(--brand)]">{newSection.subtitle}</p>
              )}
              {newSection.content && (
                <p className="mt-2 text-[13px] text-[var(--fg-muted)] line-clamp-2">{newSection.content}</p>
              )}
              {newSection.button_text && (
                <div className="mt-4">
                  <span className="inline-flex rounded-xl bg-[var(--brand)] px-4 py-2 text-[13px] font-semibold text-[var(--on-brand)]">
                    {newSection.button_text}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4">
            <Button variant="secondary" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateCustomSection}
              disabled={saving || !newSection.name.trim()}
            >
              {saving ? "Creating Section..." : "Create & Add to Homepage"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Configure Section ── */}
      <Modal
        open={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        title={`Configure Section: ${editingSection?.name || ""}`}
        size="md"
      >
        {editingSection && (
          <div className="flex flex-col gap-4 py-2">
            <FormField label="Section Name / Title" hint="Display label in layout manager">
              <Input
                value={editingSection.name}
                onChange={(e) => setEditingSection({ ...editingSection, name: e.target.value })}
              />
            </FormField>

            <FormField label="Section Description / Summary">
              <Input
                value={editingSection.description || ""}
                onChange={(e) => setEditingSection({ ...editingSection, description: e.target.value })}
              />
            </FormField>

            <FormField label="Category Tag">
              <Input
                value={editingSection.category}
                onChange={(e) => setEditingSection({ ...editingSection, category: e.target.value })}
              />
            </FormField>

            <FormField label="Badge Text (optional)">
              <Input
                value={editingSection.badge || ""}
                onChange={(e) => setEditingSection({ ...editingSection, badge: e.target.value })}
                placeholder="e.g. Highlights"
              />
            </FormField>

            {/* Special Config for Ticker / Marquee */}
            {editingSection.id === "marquee" && (
              <FormField
                label="Marquee Ticker Words (Comma Separated)"
                hint="Words displayed on the continuous animated glowing ribbon"
              >
                <Input
                  value={
                    Array.isArray(editingSection.config?.words)
                      ? editingSection.config.words.join(", ")
                      : "JOIN THE MOVEMENT, BOOK YOUR STAGE, DANCE LOUDER"
                  }
                  onChange={(e) =>
                    setEditingSection({
                      ...editingSection,
                      config: {
                        ...(editingSection.config || {}),
                        words: e.target.value.split(",").map((w) => w.trim()).filter(Boolean),
                      },
                    })
                  }
                />
              </FormField>
            )}

            {/* Special Config for Competitions */}
            {editingSection.id === "upcoming_competitions" && (
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Section Title">
                  <Input
                    value={editingSection.config?.title || "Upcoming Competitions"}
                    onChange={(e) =>
                      setEditingSection({
                        ...editingSection,
                        config: { ...(editingSection.config || {}), title: e.target.value },
                      })
                    }
                  />
                </FormField>
                <FormField label="Section Label / Kicker">
                  <Input
                    value={editingSection.config?.label || "What's next"}
                    onChange={(e) =>
                      setEditingSection({
                        ...editingSection,
                        config: { ...(editingSection.config || {}), label: e.target.value },
                      })
                    }
                  />
                </FormField>
              </div>
            )}

            {/* Special Config for Live Now */}
            {editingSection.id === "live_now" && (
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Stage Title">
                  <Input
                    value={editingSection.config?.title || "Live Stage"}
                    onChange={(e) =>
                      setEditingSection({
                        ...editingSection,
                        config: { ...(editingSection.config || {}), title: e.target.value },
                      })
                    }
                  />
                </FormField>
                <FormField label="Stage Label">
                  <Input
                    value={editingSection.config?.label || "Streaming right now"}
                    onChange={(e) =>
                      setEditingSection({
                        ...editingSection,
                        config: { ...(editingSection.config || {}), label: e.target.value },
                      })
                    }
                  />
                </FormField>
              </div>
            )}

            {/* Custom Section Body & CTA Link */}
            {editingSection.section_type !== "builtin" && (
              <>
                <FormField label="Headline Title">
                  <Input
                    value={editingSection.config?.title || ""}
                    onChange={(e) =>
                      setEditingSection({
                        ...editingSection,
                        config: { ...(editingSection.config || {}), title: e.target.value },
                      })
                    }
                  />
                </FormField>

                <FormField label="Body Description">
                  <Textarea
                    rows={2}
                    value={editingSection.config?.description || ""}
                    onChange={(e) =>
                      setEditingSection({
                        ...editingSection,
                        config: { ...(editingSection.config || {}), description: e.target.value },
                      })
                    }
                  />
                </FormField>

                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Button Text">
                    <Input
                      value={editingSection.config?.button_text || ""}
                      onChange={(e) =>
                        setEditingSection({
                          ...editingSection,
                          config: { ...(editingSection.config || {}), button_text: e.target.value },
                        })
                      }
                    />
                  </FormField>
                  <FormField label="Button URL">
                    <Input
                      value={editingSection.config?.button_url || ""}
                      onChange={(e) =>
                        setEditingSection({
                          ...editingSection,
                          config: { ...(editingSection.config || {}), button_url: e.target.value },
                        })
                      }
                    />
                  </FormField>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4">
              <Button variant="secondary" onClick={() => setIsConfigOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveConfig} disabled={saving}>
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Delete Confirmation ── */}
      <Modal
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Custom Section"
        size="sm"
      >
        <div className="flex flex-col gap-4 py-2">
          <p className="text-[13px] text-[var(--fg-muted)]">
            Are you sure you want to permanently delete this custom section? It will be immediately removed from the live homepage.
          </p>
          <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4">
            <Button variant="secondary" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteSection} disabled={saving}>
              {saving ? "Deleting..." : "Permanently Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
