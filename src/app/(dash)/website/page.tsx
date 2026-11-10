"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff, Save, Check, Radio, Upload, Image as ImageIcon, Loader2, Plus, Trash2, RotateCcw, Sparkles, ExternalLink, Zap, ArrowUp, ArrowDown, Linkedin } from "lucide-react";
import {
  SiInstagram,
  SiYoutube,
  SiFacebook,
  SiX,
} from "react-icons/si";
import { CrudPage } from "@/components/Crud";
import { Button, Field, Input, Panel, StatusBadge, Textarea, Toggle, useResource } from "@/components/Kit";
import { useToast } from "@/components/Providers";
import { cmsApi, safe } from "@/lib/api";
import { formatDate, fromDateTimeInput, rowId, cn } from "@/lib/utils";

const TABS = [
  { key: "brand", label: "Brand & Contact" },
  { key: "stage", label: "Stage Moments (Ring)" },
  { key: "spotlight", label: "Spotlight Posts & Social" },
  { key: "partners", label: "Partners & Sponsors" },
  { key: "banners", label: "Sponsored Banners" },
  { key: "tiles", label: "Featured 4 Tiles" },
  { key: "gallery", label: "Gallery Section" },
  { key: "stats", label: "Stats Counter" },
  { key: "testimonials", label: "Testimonials" },
  { key: "live", label: "Live Events" },
  { key: "contests", label: "Contest Promo" },
  { key: "app", label: "App Promo" },
  { key: "links", label: "Important Links" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function WebsitePage() {
  const [tab, setTab] = useState<TabKey>("brand");

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-3xl text-[13.5px] text-[var(--fg-muted)]">
        Everything on the public website is controlled from here — no developer needed.
        Save a section and the live site picks it up on its next revalidation.
      </p>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key} onClick={() => setTab(t.key)} aria-pressed={tab === t.key}
            className={`min-h-[40px] cursor-pointer rounded-xl px-4 text-[13px] font-semibold transition-colors ${
              tab === t.key ? "bg-[var(--brand)] text-[var(--on-brand)]" : "border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] hover:text-[var(--fg)]"
            }`}
          >{t.label}</button>
        ))}
      </div>

      {tab === "brand" && <BrandSection />}
      {tab === "stage" && <StageMomentsSectionEditor />}
      {tab === "spotlight" && <SpotlightSectionEditor />}
      {tab === "partners" && <PartnersSectionEditor />}
      {tab === "banners" && <BannersSection />}
      {tab === "tiles" && <FeaturedTilesSection />}
      {tab === "gallery" && <GallerySectionEditor />}
      {tab === "stats" && <HomepageStatsSection />}
      {tab === "testimonials" && <TestimonialsSection />}
      {tab === "live" && <LiveEventsSection />}
      {tab === "contests" && <ContestSection />}
      {tab === "app" && <AppPromoSection />}
      {tab === "links" && <LinksSection />}
    </div>
  );
}

/* ───────── BRAND + CONTACT ───────── */

function BrandSection() {
  const { push } = useToast();
  const { data, loading, reload } = useResource(() => safe(cmsApi.getSettings(), {} as any), []);
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);

  const v = (k: string) => draft[k] ?? (data as any)?.[k] ?? "";
  const social = (k: string) => draft[`social.${k}`] ?? (data as any)?.social_media?.[k] ?? "";

  const save = async () => {
    setBusy(true);
    const body: any = {};
    ["brand_name", "logo_url", "favicon_url", "tagline", "homepage_title", "homepage_description",
     "contact_email", "contact_phone", "office_address", "support_url", "privacy_policy_url", "terms_url",
     "competitions_section_label", "competitions_section_title", "competitions_section_link",
     "live_stage_label", "live_stage_title"]
      .forEach((k) => { body[k] = v(k) || null; });

    body.social_media = ["facebook", "instagram", "twitter", "youtube", "linkedin", "whatsapp", "telegram", "threads", "github", "leetcode"]
      .reduce((acc: any, k) => { acc[k] = social(k) || null; return acc; }, {});

    try { await cmsApi.updateSettings(body); push("success", "Website brand and contact details saved."); reload(); }
    catch (e: any) { push("error", e?.message || "Could not save."); }
    finally { setBusy(false); }
  };

  if (loading) return <Panel title="Brand"><div className="skeleton h-64 w-full" /></Panel>;

  const text = (name: string, label: string, hint?: string, type = "text") => (
    <Field key={name} label={label} hint={hint}>
      {({ id, describedBy }) => (
        <Input id={id} aria-describedby={describedBy} type={type} value={v(name)}
          onChange={(e) => setDraft((p) => ({ ...p, [name]: e.target.value }))} />
      )}
    </Field>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="Brand identity" subtitle="Name, logo and homepage headline"
        action={<Button size="sm" onClick={save} loading={busy}><Save className="size-3.5" aria-hidden /> Save all</Button>}>
        <div className="flex flex-col gap-4">
          {text("brand_name", "Brand name")}
          {text("tagline", "Tagline", "Shown under the hero headline.")}
          {text("logo_url", "Logo URL", undefined, "url")}
          {text("favicon_url", "Favicon URL", undefined, "url")}
          {text("homepage_title", "Homepage headline", "Overrides the hero title when no event is featured.")}
          <Field label="Homepage description">
            {({ id }) => (
              <Textarea id={id} value={v("homepage_description")}
                onChange={(e) => setDraft((p) => ({ ...p, homepage_description: e.target.value }))} />
            )}
          </Field>
        </div>
      </Panel>

      <div className="flex flex-col gap-6">
        <Panel title="Contact details" subtitle="Shown in the website footer and contact page">
          <div className="flex flex-col gap-4">
            {text("contact_email", "Contact email", undefined, "email")}
            {text("contact_phone", "Contact phone")}
            {text("office_address", "Office address")}
            {text("support_url", "Support / help centre URL", undefined, "url")}
            {text("privacy_policy_url", "Privacy policy URL", undefined, "url")}
            {text("terms_url", "Terms URL", undefined, "url")}
          </div>
        </Panel>

        <Panel title="Upcoming Competitions section" subtitle="Homepage 3D Coverflow carousel section title & button">
          <div className="flex flex-col gap-4">
            {text("competitions_section_label", "Section label / eyebrow", "Default: What's next")}
            {text("competitions_section_title", "Section main heading", "Default: Upcoming Competitions")}
            {text("competitions_section_link", "View All link URL", "Default: /competitions")}
          </div>
        </Panel>

        <Panel title="Live Stage section" subtitle="Homepage streaming stage section title & label">
          <div className="flex flex-col gap-4">
            {text("live_stage_label", "Section label / eyebrow", "Default: Streaming right now")}
            {text("live_stage_title", "Section main heading", "Default: Live Stage")}
          </div>
        </Panel>

        <Panel title="Social links" subtitle="Configure official social profiles (displayed across footer and contact pages)">
          <div className="grid gap-4 sm:grid-cols-2">
            {["facebook", "instagram", "twitter", "youtube", "linkedin", "whatsapp", "telegram", "threads", "github", "leetcode"].map((k) => (
              <Field key={k} label={k === "x" ? "X / Twitter" : k[0].toUpperCase() + k.slice(1)}>
                {({ id }) => (
                  <Input id={id} type="url" value={social(k)}
                    onChange={(e) => setDraft((p) => ({ ...p, [`social.${k}`]: e.target.value }))} />
                )}
              </Field>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ───────── BANNERS (Hero Slider & Sponsors) ───────── */

function BannerImageUploadField({
  label,
  aspectRatioLabel,
  aspectClass,
  value,
  onChange,
  ratio = "16:9",
}: {
  label: string;
  aspectRatioLabel: string;
  aspectClass: string;
  value: string;
  onChange: (url: string) => void;
  ratio?: "16:9" | "9:16";
}) {
  const [uploading, setUploading] = useState(false);
  const { push } = useToast();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await cmsApi.uploadBannerImage(file, ratio);
      const url = res?.url;
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
          {label} <span className="font-bold text-emerald-500">({aspectRatioLabel})</span>
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
                <Upload className="size-3.5 text-[var(--brand)]" /> Choose {aspectRatioLabel} Image
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
            placeholder={`Or paste ${aspectRatioLabel} image URL...`}
          />
        </div>
      </div>
    </div>
  );
}

function BannersSection() {
  const { push } = useToast();
  return (
    <CrudPage
      config={{
        title: "Hero Slider & Sponsored Banners",
        singular: "Banner",
        subtitle: "Homepage Hero Carousel & Partner promotions with 16:9 (Desktop) and 9:16 (Mobile) ratios",
        load: () => cmsApi.listBanners(),
        create: (b) => cmsApi.createBanner(b),
        update: (id, b) => cmsApi.updateBanner(id, b),
        remove: (id) => cmsApi.deleteBanner(id),
        searchKeys: ["title", "sponsor_name"],
        columns: [
          {
            key: "title",
            header: "Banners (16:9 & 9:16)",
            render: (r: any) => {
              const desktopImg = r.image_url_desktop || r.image_url;
              const mobileImg = r.image_url_mobile || r.mobile_image_url;
              return (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 shrink-0">
                    {desktopImg ? (
                      <div className="relative" title="Desktop Banner (16:9)">
                        <img src={desktopImg} alt="" className="h-9 w-16 shrink-0 rounded border border-[var(--border)] object-cover shadow-xs" />
                        <span className="absolute bottom-0 right-0 bg-black/75 text-[7.5px] font-bold text-white px-1 rounded-tl">16:9</span>
                      </div>
                    ) : (
                      <div className="h-9 w-16 rounded border border-dashed border-[var(--border)] flex items-center justify-center text-[8.5px] text-[var(--fg-muted)]">No 16:9</div>
                    )}
                    {mobileImg ? (
                      <div className="relative" title="Mobile Banner (9:16)">
                        <img src={mobileImg} alt="" className="h-9 w-5 shrink-0 rounded border border-[var(--border)] object-cover shadow-xs" />
                        <span className="absolute bottom-0 right-0 bg-emerald-600/85 text-[7px] font-bold text-white px-0.5 rounded-tl">9:16</span>
                      </div>
                    ) : (
                      <div className="h-9 w-5 rounded border border-dashed border-zinc-700/40 flex items-center justify-center text-[8px] text-[var(--fg-muted)]" title="Falls back to desktop image">—</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[13px]">{r.title}</p>
                    <div className="flex items-center gap-2 text-[11px] text-[var(--fg-muted)]">
                      <span className="truncate">{r.sponsor_name ? `Sponsor: ${r.sponsor_name}` : "Direct Banner"}</span>
                      {r.target_url && (
                        <span className="truncate max-w-[150px] text-emerald-500 font-mono text-[10px]">
                          &rarr; {r.target_url}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            },
          },
          { key: "display_order", header: "Slide Order", render: (r: any) => r.display_order ?? 0 },
          {
            key: "is_published",
            header: "Live on Hero",
            render: (r: any) => <StatusBadge value={r.is_published ? "published" : "draft"} />,
          },
        ],
        rowActions: (row: any, { reload }: any) => (
          <Button
            size="sm"
            variant={row.is_published ? "secondary" : "success"}
            onClick={async () => {
              try {
                await cmsApi.publishBanner(rowId(row), { publish: !row.is_published });
                push("success", `Banner ${row.is_published ? "unpublished" : "published to Hero slider"}.`);
                reload();
              } catch (e: any) {
                push("error", e?.message || "Could not update status.");
              }
            }}
          >
            {row.is_published ? <EyeOff className="size-3.5" aria-hidden /> : <Eye className="size-3.5" aria-hidden />}
          </Button>
        ),
        fields: [
          { name: "title", label: "Banner Title / Campaign", required: true, half: true, placeholder: "e.g., Grand Dance Championship 2026" },
          { name: "sponsor_name", label: "Sponsor / Brand Name (Optional)", half: true, placeholder: "e.g., Red Bull, Puma, UTI" },
          {
            name: "image_url",
            label: "Desktop / Web Banner",
            type: "custom",
            required: true,
            render: ({ value, onChange }) => (
              <BannerImageUploadField
                label="Desktop / Web View Banner"
                aspectRatioLabel="16:9"
                aspectClass="w-36 aspect-[16/9]"
                value={value}
                onChange={onChange}
                ratio="16:9"
              />
            ),
          },
          {
            name: "image_url_mobile",
            label: "Mobile View Banner",
            type: "custom",
            render: ({ value, onChange }) => (
              <BannerImageUploadField
                label="Mobile View Banner"
                aspectRatioLabel="9:16"
                aspectClass="w-20 aspect-[9/16]"
                value={value}
                onChange={onChange}
                ratio="9:16"
              />
            ),
          },
          { name: "target_url", label: "Click-through Link URL (Optional)", type: "url", half: true, placeholder: "/competitions or https://..." },
          { name: "display_order", label: "Slide Order (0 = first)", type: "number", half: true, defaultValue: 0 },
          { name: "description", label: "Caption / Promo Text (Optional)", type: "textarea", placeholder: "Short description or tagline" },
          { name: "is_published", label: "Publish Immediately to Hero Slider", type: "toggle", half: true, defaultValue: true },
          { name: "is_visible", label: "Active in Carousel", type: "toggle", half: true, defaultValue: true },
        ],
        toBody: (v) => ({
          title: v.title,
          image_url: v.image_url,
          image_url_desktop: v.image_url,
          image_url_mobile: v.image_url_mobile || null,
          mobile_image_url: v.image_url_mobile || null,
          description: v.description || null,
          sponsor_name: v.sponsor_name || null,
          target_url: v.target_url || null,
          display_position: "homepage",
          display_order: Number(v.display_order) || 0,
          is_published: !!v.is_published,
          is_visible: !!v.is_visible,
        }),
        toForm: (r) => ({
          title: r.title || "",
          sponsor_name: r.sponsor_name || "",
          image_url: r.image_url_desktop || r.image_url || "",
          image_url_mobile: r.image_url_mobile || r.mobile_image_url || "",
          description: r.description || "",
          target_url: r.target_url || "",
          display_order: r.display_order ?? 0,
          is_published: r.is_published !== false,
          is_visible: r.is_visible !== false,
        }),
      }}
    />
  );
}

/* ───────── FEATURED 4 TILES ───────── */

const DEFAULT_FEATURED_TILES = [
  {
    id: "tile-competition",
    title: "Competition",
    subtitle: "National Championship",
    action_text: "Learn more",
    image_url: "https://images.unsplash.com/photo-1547153760-18fc86324498?q=80&w=1200&auto=format&fit=crop",
    target_url: "/competitions",
    icon_name: "Trophy",
    display_order: 1,
  },
  {
    id: "tile-event",
    title: "Event",
    subtitle: "Live Stage Shows",
    action_text: "Learn more",
    image_url: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1200&auto=format&fit=crop",
    target_url: "/events",
    icon_name: "CalendarDays",
    display_order: 2,
  },
  {
    id: "tile-shop",
    title: "Shop",
    subtitle: "Official Streetwear & Merch",
    action_text: "Learn more",
    image_url: "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1200&auto=format&fit=crop",
    target_url: "/shop",
    icon_name: "ShoppingBag",
    display_order: 3,
  },
  {
    id: "tile-course",
    title: "Course",
    subtitle: "Masterclasses & Workshops",
    action_text: "Learn more",
    image_url: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=1200&auto=format&fit=crop",
    target_url: "/courses",
    icon_name: "GraduationCap",
    display_order: 4,
  },
];

function FeaturedTilesSection() {
  const { push } = useToast();
  const { data, loading, reload } = useResource(async () => {
    const res = await safe(cmsApi.getFeaturedTiles(), []);
    return Array.isArray(res) && res.length >= 4 ? res : DEFAULT_FEATURED_TILES;
  }, []);

  const [tiles, setTiles] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  useEffect(() => {
    if (data && data.length >= 4) {
      setTiles(data.slice(0, 4));
    } else {
      setTiles(DEFAULT_FEATURED_TILES);
    }
  }, [data]);

  const updateTile = (idx: number, patch: Partial<any>) => {
    setTiles((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...patch };
      return copy;
    });
  };

  const handleFileUpload = async (idx: number, file: File) => {
    setUploadingIdx(idx);
    try {
      const res = await cmsApi.uploadBannerImage(file, "16:9");
      if (res?.url) {
        updateTile(idx, { image_url: res.url });
        push("success", `Tile ${idx + 1} photo uploaded successfully.`);
      }
    } catch (err: any) {
      push("error", err?.message || "Failed to upload image.");
    } finally {
      setUploadingIdx(null);
    }
  };

  const handleSave = async () => {
    setBusy(true);
    try {
      await cmsApi.updateFeaturedTiles(tiles);
      push("success", "Homepage 4 category tiles saved successfully.");
      reload();
    } catch (err: any) {
      push("error", err?.message || "Could not save featured tiles.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Panel title="Featured 4 Tiles"><div className="skeleton h-64 w-full" /></Panel>;

  return (
    <Panel
      title="Homepage Featured 4 Category Tiles"
      subtitle="Customize the 4 quick navigation showcase tiles directly under the hero banner (Competition, Event, Shop, Course)."
      action={
        <Button size="sm" onClick={handleSave} loading={busy}>
          <Save className="size-3.5" aria-hidden /> Save All 4 Tiles
        </Button>
      }
    >
      <div className="grid gap-6 md:grid-cols-2">
        {tiles.map((tile, idx) => (
          <div
            key={tile.id || `tile-${idx}`}
            className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 sm:p-5"
          >
            {/* Header: Position badge and default name */}
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-full bg-[var(--brand)] text-[11px] font-bold text-[var(--on-brand)]">
                  {idx + 1}
                </span>
                <span className="font-bold text-[14px] text-[var(--fg)]">
                  Position {idx + 1}: {tile.title || "Category"}
                </span>
              </div>
              <span className="text-[11px] font-mono text-[var(--fg-muted)]">
                {idx === 0 ? "1st (Competition)" : idx === 1 ? "2nd (Event)" : idx === 2 ? "3rd (Shop)" : "4th (Course)"}
              </span>
            </div>

            {/* Image Preview & Upload */}
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-[var(--border)] bg-black/40">
              {tile.image_url ? (
                <img
                  src={tile.image_url}
                  alt={tile.title}
                  className="size-full object-cover object-center"
                />
              ) : (
                <div className="flex size-full flex-col items-center justify-center gap-2 text-[var(--fg-muted)]">
                  <ImageIcon className="size-8 opacity-40" />
                  <span className="text-[12px]">No photo set</span>
                </div>
              )}

              {/* Upload Overlay Button */}
              <div className="absolute bottom-2 right-2 flex items-center gap-2">
                <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-black/75 px-3 py-1.5 text-[11.5px] font-semibold text-white backdrop-blur-md transition-colors hover:bg-black">
                  {uploadingIdx === idx ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                  <span>{uploadingIdx === idx ? "Uploading..." : "Upload Photo"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={uploadingIdx === idx}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(idx, f);
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Inputs: Title & Subtitle */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tile Name / Title" required>
                {({ id }) => (
                  <Input
                    id={id}
                    value={tile.title || ""}
                    placeholder="e.g. Competition"
                    onChange={(e) => updateTile(idx, { title: e.target.value })}
                  />
                )}
              </Field>

              <Field label="Subtitle / Tagline">
                {({ id }) => (
                  <Input
                    id={id}
                    value={tile.subtitle || ""}
                    placeholder="e.g. National Championship"
                    onChange={(e) => updateTile(idx, { subtitle: e.target.value })}
                  />
                )}
              </Field>
            </div>

            {/* Inputs: Target URL & Action Text */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Target Link (Href)" required>
                {({ id }) => (
                  <Input
                    id={id}
                    value={tile.target_url || ""}
                    placeholder="e.g. /competitions"
                    onChange={(e) => updateTile(idx, { target_url: e.target.value })}
                  />
                )}
              </Field>

              <Field label="Action Text">
                {({ id }) => (
                  <Input
                    id={id}
                    value={tile.action_text || "Learn more"}
                    placeholder="e.g. Learn more"
                    onChange={(e) => updateTile(idx, { action_text: e.target.value })}
                  />
                )}
              </Field>
            </div>

            {/* Photo URL Direct Input */}
            <Field label="Photo URL (or use Upload above)">
              {({ id }) => (
                <Input
                  id={id}
                  type="url"
                  value={tile.image_url || ""}
                  placeholder="https://..."
                  onChange={(e) => updateTile(idx, { image_url: e.target.value })}
                />
              )}
            </Field>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <Button size="md" onClick={handleSave} loading={busy}>
          <Save className="size-4" aria-hidden /> Save All 4 Tiles
        </Button>
      </div>
    </Panel>
  );
}

/* ───────── HOMEPAGE GALLERY COLLAGE SECTION ───────── */

const DEFAULT_GALLERY_IMAGES = [
  { id: "img-1", image_url: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=800&auto=format&fit=crop", caption: "Center Hero Card" },
  { id: "img-2", image_url: "https://images.unsplash.com/photo-1547153760-18fc86324498?q=80&w=800&auto=format&fit=crop", caption: "Top Left Card" },
  { id: "img-3", image_url: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=800&auto=format&fit=crop", caption: "Bottom Left Card" },
  { id: "img-4", image_url: "https://images.unsplash.com/photo-1469488865564-c2de10f69f96?q=80&w=800&auto=format&fit=crop", caption: "Top Right Card" },
  { id: "img-5", image_url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop", caption: "Mid Right Card" },
  { id: "img-6", image_url: "https://images.unsplash.com/photo-1514306191717-452ec28c7814?q=80&w=800&auto=format&fit=crop", caption: "Bottom Center Card" },
];

const SLOT_DESCRIPTIONS = [
  "Slot 1: Center Hero Card (Most Prominent)",
  "Slot 2: Top Left Floating Card",
  "Slot 3: Bottom Left Floating Card",
  "Slot 4: Top Right Floating Card",
  "Slot 5: Mid Right Floating Card",
  "Slot 6: Bottom Center Floating Card",
];

function GallerySectionEditor() {
  const { push } = useToast();
  const { data, loading, reload } = useResource(async () => {
    const res = await safe(cmsApi.getGallerySection(), null);
    return res;
  }, []);

  const [label, setLabel] = useState("In motion");
  const [title, setTitle] = useState("A stage worth watching");
  const [description, setDescription] = useState(
    "Every performance, workshop and showdown — captured and brought to life. Scroll through the moments that make Upgrade Talents unforgettable."
  );
  const [viewAllUrl, setViewAllUrl] = useState("/gallery");
  const [images, setImages] = useState<any[]>(DEFAULT_GALLERY_IMAGES);
  const [busy, setBusy] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  useEffect(() => {
    if (data) {
      if (data.label) setLabel(data.label);
      if (data.title) setTitle(data.title);
      if (data.description) setDescription(data.description);
      if (data.view_all_url) setViewAllUrl(data.view_all_url);
      if (Array.isArray(data.images) && data.images.length > 0) {
        const merged = Array.from({ length: 6 }, (_, idx) => {
          return data.images[idx] || DEFAULT_GALLERY_IMAGES[idx] || { id: `img-${idx + 1}`, image_url: "", caption: "" };
        });
        setImages(merged);
      } else {
        setImages(DEFAULT_GALLERY_IMAGES);
      }
    }
  }, [data]);

  const updateImage = (idx: number, patch: Partial<any>) => {
    setImages((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...patch };
      return copy;
    });
  };

  const handleFileUpload = async (idx: number, file: File) => {
    setUploadingIdx(idx);
    try {
      const res = await cmsApi.uploadBannerImage(file, "16:9");
      if (res?.url) {
        updateImage(idx, { image_url: res.url });
        push("success", `Gallery Card ${idx + 1} photo uploaded successfully.`);
      }
    } catch (err: any) {
      push("error", err?.message || "Failed to upload image.");
    } finally {
      setUploadingIdx(null);
    }
  };

  const handleSave = async () => {
    setBusy(true);
    try {
      const payload = {
        label,
        title,
        description,
        view_all_url: viewAllUrl,
        images,
      };
      await cmsApi.updateGallerySection(payload);
      push("success", "Homepage gallery section saved successfully.");
      reload();
    } catch (err: any) {
      push("error", err?.message || "Could not save gallery section.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Panel title="Gallery Section"><div className="skeleton h-64 w-full" /></Panel>;

  return (
    <Panel
      title="Homepage Gallery Collage ('In Motion')"
      subtitle="Customize the 6 floating stage photo cards, heading, and description displayed in the homepage gallery section."
      action={
        <Button size="sm" onClick={handleSave} loading={busy}>
          <Save className="size-3.5" aria-hidden /> Save Gallery Section
        </Button>
      }
    >
      <div className="flex flex-col gap-8">
        {/* Section Headings & Text */}
        <div className="grid gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h3 className="text-sm font-bold text-[var(--fg)]">Section Titles & Link</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Section Eyebrow Label" required>
              {({ id }) => (
                <Input
                  id={id}
                  value={label}
                  placeholder="e.g. In motion"
                  onChange={(e) => setLabel(e.target.value)}
                />
              )}
            </Field>

            <Field label="Heading Title" required>
              {({ id }) => (
                <Input
                  id={id}
                  value={title}
                  placeholder="e.g. A stage worth watching"
                  onChange={(e) => setTitle(e.target.value)}
                />
              )}
            </Field>
          </div>

          <Field label="Description / Caption">
            {({ id }) => (
              <Textarea
                id={id}
                rows={2}
                value={description}
                placeholder="Every performance, workshop and showdown..."
                onChange={(e) => setDescription(e.target.value)}
              />
            )}
          </Field>

          <Field label="Explore Gallery Button Link">
            {({ id }) => (
              <Input
                id={id}
                value={viewAllUrl}
                placeholder="/gallery"
                onChange={(e) => setViewAllUrl(e.target.value)}
              />
            )}
          </Field>
        </div>

        {/* 6 Photo Cards Grid */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[var(--fg)]">6 Floating Stage Photos</h3>
              <p className="text-xs text-[var(--fg-muted)]">Upload photos to replace the 6 fanned cards in the floating collage.</p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((img, idx) => (
              <div
                key={img.id || `gallery-slot-${idx}`}
                className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 shadow-sm"
              >
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="grid size-6 place-items-center rounded-full bg-[var(--brand)] text-[11px] font-bold text-[var(--on-brand)]">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-xs text-[var(--fg)]">
                      {SLOT_DESCRIPTIONS[idx] || `Card ${idx + 1}`}
                    </span>
                  </div>
                  {img.image_url && (
                    <button
                      type="button"
                      onClick={() => updateImage(idx, { image_url: "" })}
                      className="text-[11px] font-medium text-[var(--danger)] hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Image Preview & Upload Button */}
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-[var(--border)] bg-black/40">
                  {img.image_url ? (
                    <img
                      src={img.image_url}
                      alt={img.caption || `Card ${idx + 1}`}
                      className="size-full object-cover object-center"
                    />
                  ) : (
                    <div className="grid size-full place-items-center text-center p-4 text-[var(--fg-subtle)]">
                      <div>
                        <ImageIcon className="mx-auto size-8 opacity-40 mb-1" />
                        <span className="text-[11px]">No photo uploaded</span>
                      </div>
                    </div>
                  )}

                  <div className="absolute inset-x-2 bottom-2">
                    <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-black/75 px-3 py-1.5 text-[11px] font-semibold text-white shadow-md backdrop-blur-md hover:bg-black/90 transition-all">
                      {uploadingIdx === idx ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin text-[var(--brand)]" /> Uploading…
                        </>
                      ) : (
                        <>
                          <Upload className="size-3.5 text-[var(--brand)]" /> {img.image_url ? "Change Photo" : "Upload Photo"}
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingIdx === idx}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileUpload(idx, f);
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Direct URL Input */}
                <Field label="Or Photo URL">
                  {({ id }) => (
                    <Input
                      id={id}
                      value={img.image_url || ""}
                      placeholder="https://..."
                      onChange={(e) => updateImage(idx, { image_url: e.target.value })}
                    />
                  )}
                </Field>

                {/* Card Caption / Label */}
                <Field label="Card Label / Caption (Optional)">
                  {({ id }) => (
                    <Input
                      id={id}
                      value={img.caption || ""}
                      placeholder="e.g. Solo Performance"
                      onChange={(e) => updateImage(idx, { caption: e.target.value })}
                    />
                  )}
                </Field>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button size="md" onClick={handleSave} loading={busy}>
            <Save className="size-4" aria-hidden /> Save Gallery Section
          </Button>
        </div>
      </div>
    </Panel>
  );
}

/* ───────── STAGE MOMENTS (THE FLOOR IS BUILT ON MOVEMENT) ───────── */

const DEFAULT_STAGE_PHOTOS = [
  "https://cdn.21st.dev/assets/mirror/4d/4d1bff4ea8b9f400dff7ae405f92e15bd39ec76e9285c7d96017e64ba1de3ae1.jpg",
  "https://cdn.21st.dev/assets/mirror/ee/ee36e332fe99d7611c43b90511db08a4f84e4545caa78e7b52e9ccffe273864b.jpg",
  "https://cdn.21st.dev/assets/mirror/dd/dddeaa4e6132c65bf7ff99d197f792a30937b5cbfe97a2b1ee54a793684df52e.jpg",
  "https://cdn.21st.dev/assets/mirror/48/487977107b5011b5e1c25289f6e4393ef555e1a92daee554788e9363b233ca14.jpg",
  "https://cdn.21st.dev/assets/mirror/a1/a12509688be6c9d3b2cb26d2ea1cfce48b8a8dbf2653e17be8a3fc31bd69f162.jpg",
  "https://cdn.21st.dev/assets/mirror/05/051f9e565b5b0b221384d9c27a0760febc3fb48d190c046adfda579f3614c958.jpg",
  "https://cdn.21st.dev/assets/mirror/87/87d4f60a4465d19d14b8acefa46275df4ccd767ccea6d7f234ea5bad99cfec56.jpg",
  "https://cdn.21st.dev/assets/mirror/06/0610989e0675a12c02d35aa5464e2644bf77913214b748b73a894808d2d79877.jpg",
  "https://cdn.21st.dev/assets/mirror/fe/fe90b90751e671a9526134c4743e2fcbf6c1a24991aba273ad7418c88fc9c701.jpg",
  "https://cdn.21st.dev/assets/mirror/2e/2e0452c1994fcc2130a1b8ef68e34b5ea52d1b35b80dde09b99349ad1de54598.jpg",
  "https://cdn.21st.dev/assets/mirror/84/847dc523558808119dc4bbb5218ff862ae5f5b455f33e9a0304f2f5a4b2f0f2c.jpg",
  "https://cdn.21st.dev/assets/mirror/2f/2f128763d177d6bdda3de9f0a766693406034977082bdb542138b7b74af9697b.jpg",
  "https://cdn.21st.dev/assets/mirror/30/30f8223f1d1ecc24fc8b7a9995b8ee98449b1e9fc300c14fbccec01b6a83a0ae.jpg",
  "https://cdn.21st.dev/assets/mirror/b4/b4df0e3e425ffce3b4f62fd7bc717e4dc90b94455f4d65d64fc07fe9721b0519.jpg",
  "https://cdn.21st.dev/assets/mirror/90/90c625659f072e4a701c2e37fa4ca46f25c7ca8689d723e7802fe84cf17874e9.jpg",
  "https://cdn.21st.dev/assets/mirror/6a/6aa0befc69cc3db8f3f3558d4b5e1216a5b64ceae1b86f51acf1c3f1432a8cf7.jpg",
  "https://cdn.21st.dev/assets/mirror/dc/dc126cfd753dc217945d0ea2f915e539dfe4ffb5fdea02245d0f576b25a9c4dd.jpg",
  "https://cdn.21st.dev/assets/mirror/ab/ab5f167fcb763aee7c3247fb8af97875998a7f519a6119da7dadd9cf73ae1a2c.jpg",
  "https://cdn.21st.dev/assets/mirror/57/57d6e450f7068e5f3be04907dcc0815343e67df1dc82f2da0ff1c859afc1f700.jpg",
  "https://cdn.21st.dev/assets/mirror/e4/e491359016d1494074e287dfbb55be068cffc0110017ae2257a5d4cdec193a47.jpg",
];

function StageMomentsSectionEditor() {
  const { push } = useToast();
  const { data, loading, reload } = useResource(() => safe(cmsApi.getStageMoments(), {} as any), []);
  const [busy, setBusy] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [isBatchUploading, setIsBatchUploading] = useState(false);

  const [introTitle, setIntroTitle] = useState("The floor is built on movement.");
  const [title, setTitle] = useState("Moments from the floor");
  const [subtitle, setSubtitle] = useState("Stages, crews and performances from across the Upgrade Talents circuit.");
  const [images, setImages] = useState<Array<{ id: string; image_url: string; caption?: string }>>([]);

  useEffect(() => {
    if (data) {
      setIntroTitle(data.intro_title || "The floor is built on movement.");
      setTitle(data.title || "Moments from the floor");
      setSubtitle(data.subtitle || "Stages, crews and performances from across the Upgrade Talents circuit.");

      const incoming = Array.isArray(data.images) && data.images.length > 0 ? data.images : [];
      if (incoming.length > 0) {
        setImages(
          incoming.map((im: any, idx: number) => ({
            id: im.id || `stage-${idx + 1}`,
            image_url: im.image_url || "",
            caption: im.caption || "",
          }))
        );
      } else {
        setImages(
          DEFAULT_STAGE_PHOTOS.map((url, idx) => ({
            id: `stage-${idx + 1}`,
            image_url: url,
            caption: `Stage Moment #${idx + 1}`,
          }))
        );
      }
    }
  }, [data]);

  const updateImage = (index: number, patch: Partial<{ image_url: string; caption: string }>) => {
    setImages((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], ...patch };
      }
      return next;
    });
  };

  const handleFileUpload = async (index: number, file: File) => {
    setUploadingIdx(index);
    try {
      const res = await cmsApi.uploadStagePhoto(file);
      const url = res?.image_url || res?.url;
      if (url) {
        updateImage(index, { image_url: url });
        push("success", `Stage photo #${index + 1} uploaded successfully.`);
      } else {
        push("error", "No URL returned from server.");
      }
    } catch (e: any) {
      push("error", e?.message || "Failed to upload photo.");
    } finally {
      setUploadingIdx(null);
    }
  };

  const handleBatchUpload = async (fileList: FileList) => {
    if (!fileList || fileList.length === 0) return;
    setIsBatchUploading(true);
    let uploadedCount = 0;
    try {
      const files = Array.from(fileList);
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const res = await cmsApi.uploadStagePhoto(file);
          const url = res?.image_url || res?.url;
          if (url) {
            setImages((prev) => {
              const next = [...prev];
              const emptyIdx = next.findIndex((item) => !item.image_url);
              if (emptyIdx !== -1) {
                next[emptyIdx] = { ...next[emptyIdx], image_url: url };
              } else if (i < next.length) {
                next[i] = { ...next[i], image_url: url };
              } else {
                next.push({
                  id: `stage-${next.length + 1}`,
                  image_url: url,
                  caption: file.name.replace(/\.[^/.]+$/, ""),
                });
              }
              return next;
            });
            uploadedCount++;
          }
        } catch (err) {
          console.error("Batch upload file error:", err);
        }
      }
      push("success", `Successfully uploaded ${uploadedCount} stage photos!`);
    } catch (e: any) {
      push("error", e?.message || "Batch upload failed.");
    } finally {
      setIsBatchUploading(false);
    }
  };

  const addSlot = () => {
    setImages((prev) => [
      ...prev,
      { id: `stage-${prev.length + 1}`, image_url: "", caption: `Stage Moment #${prev.length + 1}` },
    ]);
  };

  const removeSlot = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const resetToDefaults = () => {
    if (!window.confirm("Reset all 20 stage photos to the initial default high-res showcase photos?")) return;
    setImages(
      DEFAULT_STAGE_PHOTOS.map((url, idx) => ({
        id: `stage-${idx + 1}`,
        image_url: url,
        caption: `Stage Moment #${idx + 1}`,
      }))
    );
    push("info", "Reset stage photos to initial 20 defaults. Click 'Save Stage Moments' to apply.");
  };

  const handleSave = async () => {
    setBusy(true);
    try {
      const payload = {
        intro_title: introTitle.trim(),
        title: title.trim(),
        subtitle: subtitle.trim(),
        images: images.filter((img) => img.image_url?.trim()),
      };
      await cmsApi.updateStageMoments(payload);
      push("success", "Stage moments and floor photos updated on the homepage!");
      reload();
    } catch (e: any) {
      push("error", e?.message || "Could not save stage moments.");
    } finally {
      setBusy(false);
    }
  };

  if (loading)
    return (
      <Panel title="Stage Moments (Ring Circle)">
        <div className="skeleton h-64 w-full" />
      </Panel>
    );

  return (
    <Panel
      title="Stage Moments & Floor Photos ('The Floor is Built on Movement')"
      subtitle="Manage the 20 capsule thumbnails that form the rotating circle ring on the homepage, along with headlines and captions."
      action={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={resetToDefaults}>
            <RotateCcw className="size-3.5" aria-hidden /> Defaults
          </Button>
          <Button size="sm" onClick={handleSave} loading={busy}>
            <Save className="size-3.5" aria-hidden /> Save Stage Moments
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-8">
        {/* Section Headings */}
        <div className="grid gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h3 className="text-sm font-bold text-[var(--fg)] flex items-center gap-2">
            <Sparkles className="size-4 text-[var(--brand)]" />
            <span>Circle Ring Headlines & Titles</span>
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Intro Circle Center Headline" required hint="Shown in the center of the rotating circle ring">
              {({ id }) => (
                <Input
                  id={id}
                  value={introTitle}
                  placeholder="e.g. The floor is built on movement."
                  onChange={(e) => setIntroTitle(e.target.value)}
                />
              )}
            </Field>

            <Field label="Section Heading Title" required hint="Shown as user scrolls down">
              {({ id }) => (
                <Input
                  id={id}
                  value={title}
                  placeholder="e.g. Moments from the floor"
                  onChange={(e) => setTitle(e.target.value)}
                />
              )}
            </Field>
          </div>

          <Field label="Section Subtitle / Circuit Description">
            {({ id }) => (
              <Textarea
                id={id}
                rows={2}
                value={subtitle}
                placeholder="Stages, crews and performances from across the Upgrade Talents circuit."
                onChange={(e) => setSubtitle(e.target.value)}
              />
            )}
          </Field>
        </div>

        {/* Live Mini Circular Visualizer */}
        <div className="rounded-2xl border border-[var(--border)] bg-[#070b14] p-6 text-center shadow-inner relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-radial from-amber-500/10 via-transparent to-transparent opacity-50" />
          <h4 className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--fg-muted)] mb-1">
            Live Circle Ring Preview ({images.filter((i) => i.image_url).length} Photos Active)
          </h4>
          <p className="text-[11px] text-[var(--fg-subtle)] mb-5">
            Arranged around the center title on the homepage just as dancers perform on stage
          </p>

          <div className="relative mx-auto my-3 size-64 sm:size-72 rounded-full border border-dashed border-white/15 flex items-center justify-center">
            {/* Center text */}
            <div className="max-w-[140px] text-center z-10 pointer-events-none">
              <span className="font-serif text-[11px] font-bold tracking-wider text-white uppercase block leading-tight">
                {introTitle || "The floor is built on movement."}
              </span>
              <span className="font-mono text-[8px] uppercase tracking-widest text-neutral-400 mt-1 block">
                Scroll to explore
              </span>
            </div>

            {/* Orbiting Capsule Miniatures */}
            {images.slice(0, 20).map((img, i, arr) => {
              const total = Math.min(arr.length, 20);
              const angle = (i / total) * 2 * Math.PI - Math.PI / 2;
              const radius = 105; // radius in px inside preview
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;

              return (
                <div
                  key={img.id || i}
                  style={{
                    position: "absolute",
                    transform: `translate(${x}px, ${y}px) rotate(${angle + Math.PI / 2}rad)`,
                  }}
                  className="size-6 sm:size-7 rounded-lg overflow-hidden border border-white/30 bg-neutral-900 shadow-md transition-transform hover:scale-125 hover:z-20 cursor-pointer"
                  title={`Slot #${i + 1}: ${img.caption || img.image_url}`}
                >
                  {img.image_url ? (
                    <img src={img.image_url} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="size-full bg-neutral-800 grid place-items-center text-[7px] font-bold text-neutral-400">
                      {i + 1}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Upload Controls & 20 Stage Photo Slots Grid */}
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
            <div>
              <h3 className="text-sm font-bold text-[var(--fg)]">
                Stage Photo Capsule Slots ({images.length} Total)
              </h3>
              <p className="text-xs text-[var(--fg-muted)]">
                Upload photos to show in the 20 capsule positions on the live circle ring.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Batch Upload Button */}
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--surface)] transition-all">
                {isBatchUploading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin text-[var(--brand)]" /> Uploading Batch...
                  </>
                ) : (
                  <>
                    <Upload className="size-3.5 text-[var(--brand)]" />
                    <span>Upload Multiple Photos</span>
                  </>
                )}
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  disabled={isBatchUploading}
                  onChange={(e) => {
                    if (e.target.files) handleBatchUpload(e.target.files);
                  }}
                />
              </label>

              <Button size="sm" variant="ghost" onClick={addSlot}>
                <Plus className="size-3.5" aria-hidden /> Add Slot
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {images.map((img, idx) => (
              <div
                key={img.id || `stage-slot-${idx}`}
                className="flex flex-col gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3 shadow-sm hover:border-[var(--brand)]/50 transition-colors"
              >
                {/* Slot Header */}
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="grid size-5 place-items-center rounded-full bg-[var(--brand)] text-[10px] font-bold text-[var(--on-brand)]">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-xs text-[var(--fg)] truncate max-w-[90px]">
                      Slot #{idx + 1}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {img.image_url && (
                      <button
                        type="button"
                        onClick={() => updateImage(idx, { image_url: "" })}
                        className="text-[10px] text-[var(--fg-muted)] hover:text-[var(--danger)]"
                        title="Clear photo"
                      >
                        Clear
                      </button>
                    )}
                    {images.length > 20 && (
                      <button
                        type="button"
                        onClick={() => removeSlot(idx)}
                        className="text-neutral-400 hover:text-red-400"
                        title="Delete slot"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Capsule Thumbnail Preview with exact aspect-[60/85] */}
                <div className="relative mx-auto aspect-[60/85] w-24 overflow-hidden rounded-2xl border-2 border-[var(--border)] bg-black/60 shadow-md group">
                  {img.image_url ? (
                    <img
                      src={img.image_url}
                      alt={img.caption || `Stage photo ${idx + 1}`}
                      className="size-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="grid size-full place-items-center text-center p-2 text-[var(--fg-subtle)]">
                      <div>
                        <ImageIcon className="mx-auto size-5 opacity-40 mb-1" />
                        <span className="text-[9.5px]">Empty Slot</span>
                      </div>
                    </div>
                  )}

                  {/* Upload Overlay */}
                  <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 text-center backdrop-blur-xs">
                    {uploadingIdx === idx ? (
                      <Loader2 className="size-5 animate-spin text-[var(--brand)]" />
                    ) : (
                      <>
                        <Upload className="size-4 text-[var(--brand)] mb-1" />
                        <span className="text-[9px] font-bold text-white uppercase tracking-wider">
                          {img.image_url ? "Replace" : "Upload"}
                        </span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingIdx === idx}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFileUpload(idx, f);
                      }}
                    />
                  </label>
                </div>

                {/* URL and Caption */}
                <div className="space-y-1.5">
                  <Input
                    value={img.image_url || ""}
                    placeholder="Photo URL..."
                    className="text-[11px] h-7 px-2 font-mono"
                    onChange={(e) => updateImage(idx, { image_url: e.target.value })}
                  />
                  <Input
                    value={img.caption || ""}
                    placeholder="Caption (optional)..."
                    className="text-[11px] h-7 px-2"
                    onChange={(e) => updateImage(idx, { caption: e.target.value })}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
          <Button size="sm" variant="ghost" onClick={resetToDefaults}>
            <RotateCcw className="size-3.5" aria-hidden /> Restore 20 Defaults
          </Button>
          <Button size="md" onClick={handleSave} loading={busy}>
            <Save className="size-4" aria-hidden /> Save Stage Moments
          </Button>
        </div>
      </div>
    </Panel>
  );
}

/* ───────── SPOTLIGHT SOCIAL MEDIA & PROMO POSTS ───────── */

const DEFAULT_SPOTLIGHT_ITEMS = [
  {
    id: "spotlight-1",
    platform: "instagram",
    title: "Nrityashastra Arena",
    category: "Classical & Semi-Classical",
    tag: "Season 2026",
    image_url: "https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=1200&q=85",
    post_url: "https://instagram.com/upgradetalents",
  },
  {
    id: "spotlight-2",
    platform: "instagram",
    title: "Street Dance Showdown",
    category: "Hip-Hop & Krump",
    tag: "Live Battle",
    image_url: "https://images.unsplash.com/photo-1535525153412-5a42439a210d?auto=format&fit=crop&w=1200&q=85",
    post_url: "https://instagram.com/upgradetalents",
  },
  {
    id: "spotlight-3",
    platform: "instagram",
    title: "Spotlight Solo Battle",
    category: "Freestyle All-Styles",
    tag: "Arena Spotlight",
    image_url: "https://images.unsplash.com/photo-1518834107812-67b0b7c58434?auto=format&fit=crop&w=1200&q=85",
    post_url: "https://instagram.com/upgradetalents",
  },
  {
    id: "spotlight-4",
    platform: "instagram",
    title: "Grand Championship Stage",
    category: "Live Trophy Round",
    tag: "Finals",
    image_url: "https://images.unsplash.com/photo-1545959570-a94084071b5d?auto=format&fit=crop&w=1200&q=85",
    post_url: "https://instagram.com/upgradetalents",
  },
  {
    id: "spotlight-5",
    platform: "instagram",
    title: "Choreography Masterclass",
    category: "Artist Workshop",
    tag: "Live Training",
    image_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=85",
    post_url: "https://upgradetalentsindia.in/events",
  },
  {
    id: "spotlight-6",
    platform: "instagram",
    title: "Electrifying Stage Arena",
    category: "National Tour 2026",
    tag: "Main Stage",
    image_url: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1200&q=85",
    post_url: "https://instagram.com/upgradetalents",
  },
  {
    id: "spotlight-7",
    platform: "instagram",
    title: "Rhythm & Sync Showcase",
    category: "Crew Showdown",
    tag: "Group Dance",
    image_url: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1200&q=85",
    post_url: "https://instagram.com/upgradetalents",
  },
  {
    id: "spotlight-8",
    platform: "instagram",
    title: "Live Audience Spectacle",
    category: "Live Energy",
    tag: "Electric Crowd",
    image_url: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=85",
    post_url: "https://instagram.com/upgradetalents",
  },
];

function getPlatformBrandIcon(platform?: string) {
  const p = (platform || "instagram").toLowerCase();
  if (p.includes("youtube")) return SiYoutube;
  if (p.includes("facebook")) return SiFacebook;
  if (p.includes("x") || p.includes("twitter")) return SiX;
  if (p.includes("linkedin")) return Linkedin;
  return SiInstagram;
}

function SpotlightSectionEditor() {
  const { push } = useToast();
  const { data, loading, reload } = useResource(async () => {
    return await safe(cmsApi.getSpotlightSection(), null);
  }, []);

  const [label, setLabel] = useState("Live Stage Moments");
  const [title, setTitle] = useState("Moments in the Spotlight");
  const [subtitle, setSubtitle] = useState(
    "Raw passion, electrifying rhythm, and pure stage energy from our dancers and performers across India."
  );
  const [handle, setHandle] = useState("upgradetalents");
  const [followText, setFollowText] = useState("Follow @upgradetalents on Instagram");
  const [followUrl, setFollowUrl] = useState("https://instagram.com/upgradetalents");
  const [items, setItems] = useState<any[]>(DEFAULT_SPOTLIGHT_ITEMS);

  const [busy, setBusy] = useState(false);
  const [extractingIdx, setExtractingIdx] = useState<number | null>(null);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!data) return;
    if (data.label) setLabel(data.label);
    if (data.title) setTitle(data.title);
    if (data.subtitle) setSubtitle(data.subtitle);
    if (data.handle) setHandle(data.handle);
    if (data.follow_text) setFollowText(data.follow_text);
    if (data.follow_url) setFollowUrl(data.follow_url);
    if (Array.isArray(data.items) && data.items.length > 0) {
      setItems(data.items);
    }
  }, [data]);

  const updateItem = (index: number, patch: Partial<any>) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `spotlight-${Date.now()}`,
        platform: "instagram",
        title: "New Spotlight Moment",
        category: "Performance Showcase",
        tag: "Live Stage",
        image_url: "https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=1200&q=85",
        post_url: "https://instagram.com/upgradetalents",
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    setItems((prev) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const resetToDefaults = () => {
    if (!window.confirm("Reset spotlight section and cards to initial curated 8 moments?")) return;
    setLabel("Live Stage Moments");
    setTitle("Moments in the Spotlight");
    setSubtitle("Raw passion, electrifying rhythm, and pure stage energy from our dancers and performers across India.");
    setHandle("upgradetalents");
    setFollowText("Follow @upgradetalents on Instagram");
    setFollowUrl("https://instagram.com/upgradetalents");
    setItems(DEFAULT_SPOTLIGHT_ITEMS);
    push("info", "Reset to defaults. Click 'Save Spotlight Section' to apply.");
  };

  const handleAutoFetch = async (idx: number) => {
    const item = items[idx];
    if (!item?.post_url || !item.post_url.trim()) {
      push("error", "Please enter a valid post or video URL first.");
      return;
    }
    setExtractingIdx(idx);
    try {
      const res = await cmsApi.extractLinkPreview(item.post_url.trim());
      if (res && res.success) {
        setItems((prev) => {
          const next = [...prev];
          const curr = next[idx];
          next[idx] = {
            ...curr,
            platform: res.platform || curr.platform || "instagram",
            title: res.title || curr.title,
            category: res.category || curr.category,
            tag: res.tag || curr.tag,
            image_url: res.image_url || curr.image_url,
          };
          return next;
        });
        if (res.image_url) {
          push("success", `Poster & metadata extracted for ${res.platform?.toUpperCase() || "post"}!`);
        } else {
          push("info", res.note || "Metadata extracted. Please upload a flyer/poster photo.");
        }
      } else {
        push("error", "Could not extract link preview. Please upload image manually.");
      }
    } catch (e: any) {
      push("error", e?.message || "Failed to fetch link preview.");
    } finally {
      setExtractingIdx(null);
    }
  };

  const handlePhotoUpload = async (idx: number, file: File) => {
    if (!file) return;
    setUploadingIdx(idx);
    try {
      const res = await cmsApi.uploadSpotlightPhoto(file);
      if (res?.url) {
        updateItem(idx, { image_url: res.url });
        push("success", "Poster uploaded successfully!");
      }
    } catch (e: any) {
      push("error", e?.message || "Failed to upload photo.");
    } finally {
      setUploadingIdx(null);
    }
  };

  const handleSave = async () => {
    setBusy(true);
    try {
      const payload = {
        label: label.trim(),
        title: title.trim(),
        subtitle: subtitle.trim(),
        handle: handle.trim(),
        follow_text: followText.trim(),
        follow_url: followUrl.trim(),
        items: items.map((it, idx) => ({
          id: it.id || `spotlight-${idx + 1}`,
          platform: it.platform || "instagram",
          title: it.title || "Live Stage Performance",
          category: it.category || "Social Spotlight",
          tag: it.tag || "Live Stage",
          image_url: it.image_url || "",
          post_url: it.post_url || "",
        })),
      };
      await cmsApi.updateSpotlightSection(payload);
      push("success", "Spotlight section updated! Live website will refresh.");
      reload();
    } catch (e: any) {
      push("error", e?.message || "Failed to save spotlight section.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Panel title="Spotlight Section">
        <div className="skeleton h-64 w-full" />
      </Panel>
    );
  }

  return (
    <Panel
      title="Spotlight Section ('Moments in the Spotlight')"
      subtitle="Manage promotional banners, social media posts (Instagram, YouTube, X, Facebook), and stage flyers shown in the continuous marquee."
      action={
        <Button size="sm" onClick={handleSave} loading={busy}>
          <Save className="size-3.5" aria-hidden /> Save Spotlight Section
        </Button>
      }
    >
      <div className="flex flex-col gap-8">
        {/* Section Header Configuration */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
          <h3 className="text-sm font-semibold text-[var(--fg)] mb-3 flex items-center gap-2">
            <Sparkles className="size-4 text-pink-400" /> Section Headings & Follow Button
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Section Eyebrow / Label" required>
              {({ id }) => (
                <Input
                  id={id}
                  value={label}
                  placeholder="e.g. Live Stage Moments"
                  onChange={(e) => setLabel(e.target.value)}
                />
              )}
            </Field>

            <Field label="Main Heading Title" required>
              {({ id }) => (
                <Input
                  id={id}
                  value={title}
                  placeholder="e.g. Moments in the Spotlight"
                  onChange={(e) => setTitle(e.target.value)}
                />
              )}
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Subtitle / Description">
              {({ id }) => (
                <Textarea
                  id={id}
                  value={subtitle}
                  rows={2}
                  placeholder="Short description under the title..."
                  onChange={(e) => setSubtitle(e.target.value)}
                />
              )}
            </Field>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Instagram Handle">
              {({ id }) => (
                <Input
                  id={id}
                  value={handle}
                  placeholder="e.g. upgradetalents"
                  onChange={(e) => setHandle(e.target.value)}
                />
              )}
            </Field>

            <Field label="Bottom Button Text">
              {({ id }) => (
                <Input
                  id={id}
                  value={followText}
                  placeholder="e.g. Follow @upgradetalents on Instagram"
                  onChange={(e) => setFollowText(e.target.value)}
                />
              )}
            </Field>

            <Field label="Bottom Button Destination URL">
              {({ id }) => (
                <Input
                  id={id}
                  value={followUrl}
                  placeholder="https://instagram.com/upgradetalents"
                  onChange={(e) => setFollowUrl(e.target.value)}
                />
              )}
            </Field>
          </div>
        </div>

        {/* Live Visual Marquee Preview */}
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-3)] p-5 text-center">
          <div className="flex items-center justify-between mb-3">
            <div className="text-left">
              <h4 className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--fg-muted)]">
                Live Marquee Preview ({items.length} Cards)
              </h4>
              <p className="text-[11px] text-[var(--fg-subtle)]">
                Cards continuously glide right-to-left. Clicking opens the attached social link.
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={addItem}>
              <Plus className="size-3.5" /> Add Spotlight Card
            </Button>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-3 pt-2 scrollbar-thin">
            {items.map((it, idx) => {
              const BrandIcon = getPlatformBrandIcon(it.platform);
              return (
                <div
                  key={it.id || idx}
                  className="group relative shrink-0 w-[170px] aspect-[4/5] rounded-2xl overflow-hidden border border-white/10 bg-[var(--surface-2)] shadow-md text-left"
                >
                  <img
                    src={it.image_url || "https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=400&q=80"}
                    alt={it.title}
                    className="size-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />
                  <div className="absolute top-2 inset-x-2 flex items-center justify-between pointer-events-none">
                    <span className="rounded-full bg-black/70 px-1.5 py-0.5 text-[8.5px] font-mono text-white/90">
                      {it.tag || "Live"}
                    </span>
                    <span className="grid size-5 place-items-center rounded-full bg-black/70 text-white/90">
                      <BrandIcon className="size-3 text-pink-400" />
                    </span>
                  </div>
                  <div className="absolute bottom-2 inset-x-2 text-left">
                    <span className="text-[8.5px] font-mono text-cyan-300 truncate block">
                      {it.category || "Showcase"}
                    </span>
                    <h5 className="text-[11px] font-bold text-white truncate block">
                      {it.title || "Spotlight Moment"}
                    </h5>
                    <span className="text-[9px] text-white/70 flex items-center gap-0.5 mt-0.5">
                      <span>Open link</span>
                      <ExternalLink className="size-2.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card Items Editor List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[var(--fg)]">
                Spotlight Cards List ({items.length})
              </h3>
              <p className="text-xs text-[var(--fg-muted)]">
                Paste any Instagram, YouTube, X, or Facebook URL and hit <strong>⚡ Auto-Fetch</strong> to pull high-res poster & details automatically.
              </p>
            </div>
            <Button size="sm" onClick={addItem}>
              <Plus className="size-3.5" /> Add Card
            </Button>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {items.map((item, idx) => {
              const BrandIcon = getPlatformBrandIcon(item.platform);
              const isExtracting = extractingIdx === idx;
              const isUploading = uploadingIdx === idx;

              return (
                <div
                  key={item.id || `card-${idx}`}
                  className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 shadow-sm hover:border-[var(--brand)]/40 transition-colors"
                >
                  {/* Card Header & Controls */}
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="grid size-6 place-items-center rounded-lg bg-[var(--surface)] text-[11px] font-mono font-bold text-[var(--fg)] border border-[var(--border)]">
                        #{idx + 1}
                      </span>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-xs font-semibold text-[var(--fg-muted)]">
                        <BrandIcon className="size-3.5 text-pink-400" />
                        <span className="capitalize">{item.platform || "Instagram"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveItem(idx, "up")}
                        title="Move Up"
                        className="rounded p-1 text-[var(--fg-muted)] hover:bg-[var(--surface)] disabled:opacity-30"
                      >
                        <ArrowUp className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === items.length - 1}
                        onClick={() => moveItem(idx, "down")}
                        title="Move Down"
                        className="rounded p-1 text-[var(--fg-muted)] hover:bg-[var(--surface)] disabled:opacity-30"
                      >
                        <ArrowDown className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        title="Delete Card"
                        className="rounded p-1 text-red-400 hover:bg-red-500/10 transition-colors ml-1"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Platform & Social URL with Auto-Fetch */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="text-[11px] font-medium text-[var(--fg-muted)] mb-1 block">
                        Platform
                      </label>
                      <select
                        value={item.platform || "instagram"}
                        onChange={(e) => updateItem(idx, { platform: e.target.value })}
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs outline-none"
                      >
                        <option value="instagram">Instagram</option>
                        <option value="youtube">YouTube</option>
                        <option value="facebook">Facebook</option>
                        <option value="x">X / Twitter</option>
                        <option value="linkedin">LinkedIn</option>
                        <option value="general">Website / Promo</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-medium text-[var(--fg-muted)] mb-1 block">
                        Social Post or Video URL
                      </label>
                      <div className="flex gap-1.5">
                        <Input
                          value={item.post_url || ""}
                          placeholder="https://instagram.com/p/... or youtube.com/..."
                          className="text-xs h-8"
                          onChange={(e) => updateItem(idx, { post_url: e.target.value })}
                        />
                        <Button
                          size="sm"
                          type="button"
                          variant="secondary"
                          onClick={() => handleAutoFetch(idx)}
                          disabled={isExtracting}
                          className="shrink-0 h-8 px-2.5 text-[11px] font-bold text-amber-300 border-amber-500/40 hover:bg-amber-500/10"
                        >
                          {isExtracting ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <>
                              <Zap className="size-3 text-amber-400" /> Fetch
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Title, Category, Tag */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-medium text-[var(--fg-muted)] mb-1 block">
                        Card Title (Short Heading)
                      </label>
                      <Input
                        value={item.title || ""}
                        placeholder="e.g. Street Dance Showdown"
                        className="text-xs h-8"
                        onChange={(e) => updateItem(idx, { title: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-[var(--fg-muted)] mb-1 block">
                        Badge / Tag
                      </label>
                      <Input
                        value={item.tag || ""}
                        placeholder="e.g. Live Battle"
                        className="text-xs h-8"
                        onChange={(e) => updateItem(idx, { tag: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-[var(--fg-muted)] mb-1 block">
                      Category / Subtitle
                    </label>
                    <Input
                      value={item.category || ""}
                      placeholder="e.g. Hip-Hop & Krump"
                      className="text-xs h-8"
                      onChange={(e) => updateItem(idx, { category: e.target.value })}
                    />
                  </div>

                  {/* Poster Thumbnail & Upload / Direct Image URL */}
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5">
                    <label className="text-[11px] font-medium text-[var(--fg-muted)] mb-1.5 block">
                      Poster / Flyer Image
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="relative size-16 shrink-0 rounded-lg overflow-hidden border border-white/10 bg-black/40">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.title}
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="size-full grid place-items-center text-white/30">
                            <ImageIcon className="size-6" />
                          </div>
                        )}
                        {isUploading && (
                          <div className="absolute inset-0 bg-black/70 grid place-items-center">
                            <Loader2 className="size-4 animate-spin text-white" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                        <Input
                          value={item.image_url || ""}
                          placeholder="Poster image URL..."
                          className="text-xs h-7"
                          onChange={(e) => updateItem(idx, { image_url: e.target.value })}
                        />
                        <div className="flex items-center gap-2">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-medium text-[var(--fg)] hover:border-[var(--brand)] transition-colors">
                            <Upload className="size-3 text-cyan-400" />
                            <span>Upload Flyer/Photo</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handlePhotoUpload(idx, f);
                              }}
                            />
                          </label>
                          {item.image_url && (
                            <a
                              href={item.image_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-[var(--brand)] hover:underline inline-flex items-center gap-1"
                            >
                              <span>View</span>
                              <ExternalLink className="size-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
          <Button size="sm" variant="ghost" onClick={resetToDefaults}>
            <RotateCcw className="size-3.5" aria-hidden /> Restore Curated Defaults
          </Button>
          <Button size="md" onClick={handleSave} loading={busy}>
            <Save className="size-4" aria-hidden /> Save Spotlight Section
          </Button>
        </div>
      </div>
    </Panel>
  );
}

/* ───────── PARTNERS & SPONSORS SECTION ───────── */

const DEFAULT_PARTNERS_LIST = [
  {
    id: "partner-1",
    name: "Red Bull",
    logo_url: "https://upload.wikimedia.org/wikipedia/en/thumb/f/f5/RedBullEnergyDrink.svg/640px-RedBullEnergyDrink.svg.png",
    website_url: "https://www.redbull.com",
    is_active: true,
  },
  {
    id: "partner-2",
    name: "Puma",
    logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Puma-logo-%28text%29.svg/640px-Puma-logo-%28text%29.svg.png",
    website_url: "https://puma.com",
    is_active: true,
  },
  {
    id: "partner-3",
    name: "Sony Music",
    logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Sony_Music_logo.svg/640px-Sony_Music_logo.svg.png",
    website_url: "https://sonymusic.com",
    is_active: true,
  },
  {
    id: "partner-4",
    name: "Monster Energy",
    logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Monster_Energy_logo.svg/640px-Monster_Energy_logo.svg.png",
    website_url: "https://www.monsterenergy.com",
    is_active: true,
  },
  {
    id: "partner-5",
    name: "JBL",
    logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/JBL_logo.svg/640px-JBL_logo.svg.png",
    website_url: "https://jbl.com",
    is_active: true,
  },
  {
    id: "partner-6",
    name: "Spotify",
    logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Spotify_logo_without_text.svg/640px-Spotify_logo_without_text.svg.png",
    website_url: "https://spotify.com",
    is_active: true,
  },
];

function PartnersSectionEditor() {
  const { push } = useToast();
  const { data, loading, reload } = useResource(async () => {
    return await safe(cmsApi.getPartnersSection(), null);
  }, []);

  const [label, setLabel] = useState("Powered by our partners");
  const [title, setTitle] = useState("Official Partners & Sponsors");
  const [partners, setPartners] = useState<any[]>(DEFAULT_PARTNERS_LIST);

  const [busy, setBusy] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!data) return;
    if (data.label) setLabel(data.label);
    if (data.title) setTitle(data.title);
    if (Array.isArray(data.partners) && data.partners.length > 0) {
      setPartners(data.partners);
    }
  }, [data]);

  const updatePartner = (index: number, patch: Partial<any>) => {
    setPartners((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const addPartner = () => {
    setPartners((prev) => [
      ...prev,
      {
        id: `partner-${Date.now()}`,
        name: "New Partner",
        logo_url: "",
        website_url: "https://",
        is_active: true,
      },
    ]);
  };

  const removePartner = (index: number) => {
    setPartners((prev) => prev.filter((_, i) => i !== index));
  };

  const movePartner = (index: number, direction: "up" | "down") => {
    setPartners((prev) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const resetToDefaults = () => {
    if (!window.confirm("Reset partners to initial default brand sponsors?")) return;
    setLabel("Powered by our partners");
    setTitle("Official Partners & Sponsors");
    setPartners(DEFAULT_PARTNERS_LIST);
    push("info", "Reset to default partners. Click 'Save Partners & Sponsors' to apply.");
  };

  const handleLogoUpload = async (idx: number, file: File) => {
    if (!file) return;
    setUploadingIdx(idx);
    try {
      const res = await cmsApi.uploadPartnerLogo(file);
      if (res?.url) {
        updatePartner(idx, { logo_url: res.url });
        push("success", "Partner logo uploaded successfully!");
      }
    } catch (e: any) {
      push("error", e?.message || "Failed to upload logo.");
    } finally {
      setUploadingIdx(null);
    }
  };

  const handleSave = async () => {
    setBusy(true);
    try {
      const payload = {
        label: label.trim(),
        title: title.trim(),
        partners: partners.map((p, idx) => ({
          id: p.id || `partner-${idx + 1}`,
          name: (p.name || "").trim(),
          logo_url: (p.logo_url || "").trim(),
          website_url: (p.website_url || "").trim(),
          is_active: p.is_active !== false,
        })),
      };
      await cmsApi.updatePartnersSection(payload);
      push("success", "Partners section updated! Live homepage will reflect changes.");
      reload();
    } catch (e: any) {
      push("error", e?.message || "Failed to save partners section.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Panel title="Partners & Sponsors">
        <div className="skeleton h-64 w-full" />
      </Panel>
    );
  }

  const activePartners = partners.filter((p) => p.is_active !== false && p.logo_url);

  return (
    <Panel
      title="Partners & Sponsors ('Powered by our partners')"
      subtitle="Manage sponsor and partner brand logos shown in the continuous scrolling partners ribbon on the homepage."
      action={
        <Button size="sm" onClick={handleSave} loading={busy}>
          <Save className="size-3.5" aria-hidden /> Save Partners & Sponsors
        </Button>
      }
    >
      <div className="flex flex-col gap-8">
        {/* Section Headings */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
          <h3 className="text-sm font-semibold text-[var(--fg)] mb-3 flex items-center gap-2">
            <Sparkles className="size-4 text-cyan-400" /> Section Label & Title
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Section Eyebrow / Label" required>
              {({ id }) => (
                <Input
                  id={id}
                  value={label}
                  placeholder="e.g. Powered by our partners"
                  onChange={(e) => setLabel(e.target.value)}
                />
              )}
            </Field>

            <Field label="Section Title">
              {({ id }) => (
                <Input
                  id={id}
                  value={title}
                  placeholder="e.g. Official Partners & Sponsors"
                  onChange={(e) => setTitle(e.target.value)}
                />
              )}
            </Field>
          </div>
        </div>

        {/* Live Ribbon Preview */}
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-3)] p-5 text-center">
          <div className="flex items-center justify-between mb-3">
            <div className="text-left">
              <h4 className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--fg-muted)]">
                Live Ribbon Preview ({activePartners.length} Active Logos)
              </h4>
              <p className="text-[11px] text-[var(--fg-subtle)]">
                Full original logo colors are displayed cleanly without darkening or grayscale.
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={addPartner}>
              <Plus className="size-3.5" /> Add Partner Logo
            </Button>
          </div>

          <div className="flex items-center gap-6 overflow-x-auto py-4 px-2 rounded-xl bg-black/40 border border-white/5 scrollbar-thin">
            {activePartners.length > 0 ? (
              activePartners.map((p, idx) => (
                <div
                  key={p.id || idx}
                  className="flex h-14 shrink-0 items-center px-4 py-2 rounded-xl bg-white/[0.05] border border-white/10 shadow-sm"
                >
                  <img
                    src={p.logo_url}
                    alt={p.name}
                    className="h-8 w-auto max-w-[140px] object-contain drop-shadow"
                  />
                </div>
              ))
            ) : (
              <p className="text-xs text-[var(--fg-muted)] py-3 mx-auto">
                No active partner logos yet. Click "Add Partner Logo" below.
              </p>
            )}
          </div>
        </div>

        {/* Partners List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[var(--fg)]">
                Partner Logos List ({partners.length})
              </h3>
              <p className="text-xs text-[var(--fg-muted)]">
                Upload company or brand logos (transparent PNG or SVG recommended) and set their destination link.
              </p>
            </div>
            <Button size="sm" onClick={addPartner}>
              <Plus className="size-3.5" /> Add Partner
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {partners.map((p, idx) => {
              const isUploading = uploadingIdx === idx;

              return (
                <div
                  key={p.id || `partner-${idx}`}
                  className={cn(
                    "flex flex-col gap-3 rounded-2xl border p-4 shadow-sm transition-colors",
                    p.is_active !== false
                      ? "border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--brand)]/40"
                      : "border-[var(--border)] bg-[var(--surface)] opacity-60"
                  )}
                >
                  {/* Header & Controls */}
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="grid size-6 place-items-center rounded-lg bg-[var(--surface)] text-[11px] font-mono font-bold text-[var(--fg)] border border-[var(--border)]">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-bold text-[var(--fg)] truncate max-w-[120px]">
                        {p.name || "Untitled"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updatePartner(idx, { is_active: p.is_active === false })}
                        title={p.is_active !== false ? "Disable Partner" : "Enable Partner"}
                        className={cn(
                          "rounded px-2 py-0.5 text-[10px] font-mono font-semibold transition-colors",
                          p.is_active !== false
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                        )}
                      >
                        {p.is_active !== false ? "Active" : "Disabled"}
                      </button>

                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => movePartner(idx, "up")}
                        title="Move Up"
                        className="rounded p-1 text-[var(--fg-muted)] hover:bg-[var(--surface)] disabled:opacity-30"
                      >
                        <ArrowUp className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === partners.length - 1}
                        onClick={() => movePartner(idx, "down")}
                        title="Move Down"
                        className="rounded p-1 text-[var(--fg-muted)] hover:bg-[var(--surface)] disabled:opacity-30"
                      >
                        <ArrowDown className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removePartner(idx)}
                        title="Delete Partner"
                        className="rounded p-1 text-red-400 hover:bg-red-500/10 transition-colors ml-0.5"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Logo Display & Upload Box */}
                  <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                    <div className="relative size-16 shrink-0 rounded-lg overflow-hidden border border-white/10 bg-black/60 flex items-center justify-center p-1.5">
                      {p.logo_url ? (
                        <img
                          src={p.logo_url}
                          alt={p.name}
                          className="size-full object-contain drop-shadow"
                        />
                      ) : (
                        <div className="size-full grid place-items-center text-white/30">
                          <ImageIcon className="size-6" />
                        </div>
                      )}
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/75 grid place-items-center">
                          <Loader2 className="size-4 animate-spin text-white" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-medium text-[var(--fg)] hover:border-[var(--brand)] transition-colors w-fit">
                        <Upload className="size-3 text-cyan-400" />
                        <span>Upload Logo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleLogoUpload(idx, f);
                          }}
                        />
                      </label>
                      {p.logo_url && (
                        <a
                          href={p.logo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-[var(--brand)] hover:underline inline-flex items-center gap-1 truncate"
                        >
                          <span>View Logo File</span>
                          <ExternalLink className="size-2.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Partner Name & Website URL */}
                  <div>
                    <label className="text-[11px] font-medium text-[var(--fg-muted)] mb-1 block">
                      Partner / Sponsor Name
                    </label>
                    <Input
                      value={p.name || ""}
                      placeholder="e.g. Red Bull, Sony Music"
                      className="text-xs h-8"
                      onChange={(e) => updatePartner(idx, { name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-[var(--fg-muted)] mb-1 block">
                      Partner Website URL
                    </label>
                    <Input
                      value={p.website_url || ""}
                      placeholder="https://partner-website.com"
                      className="text-xs h-8"
                      onChange={(e) => updatePartner(idx, { website_url: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-[var(--fg-muted)] mb-1 block">
                      Direct Logo Image URL
                    </label>
                    <Input
                      value={p.logo_url || ""}
                      placeholder="https://..."
                      className="text-xs h-7"
                      onChange={(e) => updatePartner(idx, { logo_url: e.target.value })}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
          <Button size="sm" variant="ghost" onClick={resetToDefaults}>
            <RotateCcw className="size-3.5" aria-hidden /> Restore Defaults
          </Button>
          <Button size="md" onClick={handleSave} loading={busy}>
            <Save className="size-4" aria-hidden /> Save Partners & Sponsors
          </Button>
        </div>
      </div>
    </Panel>
  );
}

/* ───────── HOMEPAGE STATS COUNTER (4 NUMBERS) ───────── */

const DEFAULT_HOMEPAGE_STATS = [
  { label: "Live events", value: 12, suffix: "+", icon: "calendar" },
  { label: "Dancers on stage", value: 25000, suffix: "+", icon: "users" },
  { label: "Masterclasses", value: 40, suffix: "+", icon: "graduation" },
  { label: "Cities covered", value: 28, suffix: "", icon: "trophy" },
];

function HomepageStatsSection() {
  const { push } = useToast();
  const { data, loading, reload } = useResource(async () => {
    const res = await safe(cmsApi.getHomepageStats(), []);
    return Array.isArray(res) && res.length >= 4 ? res : DEFAULT_HOMEPAGE_STATS;
  }, []);

  const [stats, setStats] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data && data.length >= 4) {
      setStats(data.slice(0, 4));
    } else {
      setStats(DEFAULT_HOMEPAGE_STATS);
    }
  }, [data]);

  const updateStat = (idx: number, patch: Partial<any>) => {
    setStats((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...patch };
      return copy;
    });
  };

  const handleSave = async () => {
    setBusy(true);
    try {
      await cmsApi.updateHomepageStats(stats);
      push("success", "Homepage stats counters saved successfully.");
      reload();
    } catch (err: any) {
      push("error", err?.message || "Could not save stats.");
    } finally {
      setBusy(false);
    }
  };

  const handleReset = () => {
    setStats(DEFAULT_HOMEPAGE_STATS);
  };

  if (loading) return <Panel title="Stats Counter"><div className="skeleton h-64 w-full" /></Panel>;

  return (
    <Panel
      title="Homepage Stats Counter (4 Numbers)"
      subtitle="Customize the 4 animated metric counters shown on the homepage (numbers, suffixes, labels, and icons)."
      action={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={handleReset}>
            Reset defaults
          </Button>
          <Button size="sm" onClick={handleSave} loading={busy}>
            <Save className="size-3.5" aria-hidden /> Save All Stats
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, idx) => (
          <div
            key={idx}
            className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 sm:p-5"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <span className="rounded-full bg-[var(--surface)] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[var(--fg-muted)]">
                Stat #{idx + 1}
              </span>
              <span className="font-mono text-xs font-semibold text-[var(--brand)]">
                {s.value?.toLocaleString?.() || s.value}{s.suffix}
              </span>
            </div>

            <Field label="Label / Text" required>
              {({ id }) => (
                <Input
                  id={id}
                  value={s.label || ""}
                  onChange={(e) => updateStat(idx, { label: e.target.value })}
                  placeholder="e.g. Live events"
                />
              )}
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Value (Number)" required>
                {({ id }) => (
                  <Input
                    id={id}
                    type="number"
                    value={s.value ?? 0}
                    onChange={(e) => updateStat(idx, { value: Number(e.target.value) || 0 })}
                  />
                )}
              </Field>

              <Field label="Suffix">
                {({ id }) => (
                  <Input
                    id={id}
                    value={s.suffix ?? ""}
                    onChange={(e) => updateStat(idx, { suffix: e.target.value })}
                    placeholder="e.g. +"
                  />
                )}
              </Field>
            </div>

            <Field label="Icon Style">
              {({ id }) => (
                <select
                  id={id}
                  value={(s.icon || "calendar").toLowerCase()}
                  onChange={(e) => updateStat(idx, { icon: e.target.value })}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[13px] outline-none"
                >
                  <option value="calendar">Calendar (Live Events)</option>
                  <option value="users">Users (Dancers On Stage)</option>
                  <option value="graduation">Graduation Cap (Masterclasses)</option>
                  <option value="trophy">Trophy (Cities Covered)</option>
                  <option value="clock">Clock</option>
                  <option value="sparkles">Sparkles</option>
                </select>
              )}
            </Field>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <Button size="md" onClick={handleSave} loading={busy}>
          <Save className="size-4" aria-hidden /> Save All Stats
        </Button>
      </div>
    </Panel>
  );
}

/* ───────── TESTIMONIALS ───────── */

function TestimonialsSection() {
  const { push } = useToast();
  return (
    <CrudPage
      config={{
        title: "Testimonials", singular: "Testimonial",
        subtitle: "Shown on the homepage once approved and published",
        load: () => cmsApi.listTestimonials(),
        create: (b) => cmsApi.createTestimonial(b),
        update: (id, b) => cmsApi.updateTestimonial(id, b),
        remove: (id) => cmsApi.deleteTestimonial(id),
        searchKeys: ["person_name", "message"],
        columns: [
          { key: "person_name", header: "Person", render: (r: any) => (
            <div className="min-w-0">
              <p className="truncate font-semibold">{r.person_name}</p>
              <p className="truncate text-[11.5px] text-[var(--fg-muted)]">{r.role || "—"}</p>
            </div>
          ) },
          { key: "message", header: "Message", render: (r: any) => <p className="line-clamp-2 max-w-sm text-[12.5px]">{r.message}</p> },
          { key: "is_approved", header: "Approved", render: (r: any) => <StatusBadge value={r.is_approved} /> },
          { key: "is_published", header: "Live", render: (r: any) => <StatusBadge value={r.is_published ? "published" : "draft"} /> },
        ],
        rowActions: (row: any, { reload }: any) => (
          <>
            {!row.is_approved && (
              <Button size="sm" variant="secondary" onClick={async () => {
                try { await cmsApi.approveTestimonial(rowId(row), { approve: true }); push("success", "Testimonial approved."); reload(); }
                catch (e: any) { push("error", e?.message || "Could not approve."); }
              }}><Check className="size-3.5" aria-hidden /> Approve</Button>
            )}
            <Button size="sm" variant={row.is_published ? "secondary" : "success"} onClick={async () => {
              try { await cmsApi.publishTestimonial(rowId(row), { publish: !row.is_published }); push("success", "Testimonial updated."); reload(); }
              catch (e: any) { push("error", e?.message || "Could not update."); }
            }}>
              {row.is_published ? <EyeOff className="size-3.5" aria-hidden /> : <Eye className="size-3.5" aria-hidden />}
            </Button>
          </>
        ),
        fields: [
          { name: "person_name", label: "Name", required: true, half: true },
          { name: "role", label: "Role", half: true, placeholder: "Finalist, Neon Nights 2026" },
          { name: "profile_image", label: "Photo URL", type: "url" },
          { name: "message", label: "Testimonial", type: "textarea", required: true },
          { name: "display_order", label: "Display order", type: "number", half: true, defaultValue: 0 },
          { name: "is_approved", label: "Approved", type: "toggle", half: true, defaultValue: false },
          { name: "is_published", label: "Published", type: "toggle", half: true, defaultValue: false },
        ],
        toBody: (v) => ({
          person_name: v.person_name, role: v.role || null,
          profile_image: v.profile_image || null, message: v.message,
          is_approved: !!v.is_approved, is_published: !!v.is_published,
          display_order: Number(v.display_order) || 0,
        }),
      }}
    />
  );
}

/* ───────── LIVE EVENTS ───────── */

function LiveEventsSection() {
  const { push } = useToast();
  return (
    <CrudPage
      config={{
        title: "Live events", singular: "Live event",
        subtitle: "Streams featured in the Live Stage section. The private stream URL is never exposed publicly.",
        load: () => cmsApi.listLiveEvents(),
        create: (b) => cmsApi.createLiveEvent(b),
        update: (id, b) => cmsApi.updateLiveEvent(id, b),
        remove: (id) => cmsApi.deleteLiveEvent(id),
        searchKeys: ["title"],
        columns: [
          { key: "title", header: "Stream", render: (r: any) => <span className="font-semibold">{r.title}</span> },
          { key: "start_time", header: "Starts", render: (r: any) => formatDate(r.start_time, true) },
          { key: "is_published", header: "Live", render: (r: any) => <StatusBadge value={r.is_published ? "published" : "draft"} /> },
        ],
        rowActions: (row: any, { reload }: any) => (
          <Button size="sm" variant={row.is_published ? "secondary" : "success"} onClick={async () => {
            try { await cmsApi.publishLiveEvent(rowId(row), { publish: !row.is_published }); push("success", "Live event updated."); reload(); }
            catch (e: any) { push("error", e?.message || "Could not update."); }
          }}><Radio className="size-3.5" aria-hidden /> {row.is_published ? "Unpublish" : "Publish"}</Button>
        ),
        fields: [
          { name: "title", label: "Title", required: true },
          { name: "description", label: "Description", type: "textarea" },
          { name: "stream_url", label: "Private stream URL", type: "url", required: true, hint: "Admin only — never shown on the public site." },
          { name: "public_url", label: "Public watch URL", type: "url", hint: "What viewers open." },
          { name: "image_url", label: "Thumbnail URL", type: "url", half: true },
          { name: "start_time", label: "Starts (IST)", type: "datetime", required: true, half: true },
          { name: "end_time", label: "Ends (IST)", type: "datetime", half: true },
          { name: "display_order", label: "Display order", type: "number", half: true, defaultValue: 0 },
          { name: "is_visible", label: "Visible", type: "toggle", half: true, defaultValue: true },
          { name: "is_published", label: "Published", type: "toggle", half: true, defaultValue: false },
        ],
        toBody: (v) => ({
          title: v.title, description: v.description || null,
          stream_url: v.stream_url, public_url: v.public_url || null,
          image_url: v.image_url || null,
          start_time: fromDateTimeInput(v.start_time),
          end_time: fromDateTimeInput(v.end_time),
          is_published: !!v.is_published, is_visible: !!v.is_visible,
          display_order: Number(v.display_order) || 0,
        }),
      }}
    />
  );
}

/* ───────── CONTEST PROMO ───────── */

function ContestSection() {
  const { push } = useToast();
  return (
    <CrudPage
      config={{
        title: "Contest promotions", singular: "Promotion",
        subtitle: "The voting / competition banner on the homepage",
        load: () => cmsApi.listContestPromos(),
        create: (b) => cmsApi.createContestPromo(b),
        update: (id, b) => cmsApi.updateContestPromo(id, b),
        remove: (id) => cmsApi.deleteContestPromo(id),
        searchKeys: ["title"],
        columns: [
          { key: "title", header: "Promotion", render: (r: any) => <span className="font-semibold">{r.title}</span> },
          { key: "display_order", header: "Order", render: (r: any) => r.display_order ?? 0 },
          { key: "is_published", header: "Live", render: (r: any) => <StatusBadge value={r.is_published ? "published" : "draft"} /> },
        ],
        rowActions: (row: any, { reload }: any) => (
          <Button size="sm" variant={row.is_published ? "secondary" : "success"} onClick={async () => {
            try { await cmsApi.publishContestPromo(rowId(row), { publish: !row.is_published }); push("success", "Promotion updated."); reload(); }
            catch (e: any) { push("error", e?.message || "Could not update."); }
          }}>{row.is_published ? <EyeOff className="size-3.5" aria-hidden /> : <Eye className="size-3.5" aria-hidden />}</Button>
        ),
        fields: [
          { name: "title", label: "Title", required: true },
          { name: "description", label: "Description", type: "textarea" },
          { name: "competition_id", label: "Linked Competition ID", half: true, hint: "Competition ID to link for voting and leaderboard" },
          { name: "cta_text", label: "Button text", half: true, defaultValue: "Vote Now" },
          { name: "image_url", label: "Background image URL", type: "url" },
          { name: "target_url", label: "Custom CTA link (optional override)", type: "url", half: true },
          { name: "display_order", label: "Display order", type: "number", half: true, defaultValue: 0 },
          { name: "is_visible", label: "Visible", type: "toggle", half: true, defaultValue: true },
          { name: "is_published", label: "Published", type: "toggle", half: true, defaultValue: false },
        ],
        toBody: (v) => ({
          title: v.title,
          description: v.description || null,
          competition_id: v.competition_id || null,
          cta_text: v.cta_text || "Vote Now",
          image_url: v.image_url || null,
          target_url: v.target_url || null,
          is_published: !!v.is_published,
          is_visible: !!v.is_visible,
          display_order: Number(v.display_order) || 0,
        }),
      }}
    />
  );
}

/* ───────── APP PROMO ───────── */

function AppPromoSection() {
  const { push } = useToast();
  const { data, loading, reload } = useResource(() => safe(cmsApi.getAppPromo(), {} as any), []);
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);

  const v = (k: string, fb: any = "") => draft[k] ?? (data as any)?.[k] ?? fb;

  const save = async () => {
    setBusy(true);
    try {
      await cmsApi.updateAppPromo({
        title: v("title") || null,
        description: v("description") || null,
        image_url: v("image_url") || null,
        android_url: v("android_url") || null,
        ios_url: v("ios_url") || null,
        is_enabled: !!v("is_enabled", false),
        is_published: !!v("is_published", false),
      });
      push("success", "App promotion saved.");
      reload();
    } catch (e: any) { push("error", e?.message || "Could not save."); }
    finally { setBusy(false); }
  };

  if (loading) return <Panel title="App promotion"><div className="skeleton h-56 w-full" /></Panel>;

  return (
    <Panel title="Mobile app promotion" subtitle="The app download section on the homepage"
      action={<Button size="sm" onClick={save} loading={busy}><Save className="size-3.5" aria-hidden /> Save</Button>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Title">{({ id }) => <Input id={id} value={v("title")} onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))} />}</Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Description">{({ id }) => <Textarea id={id} value={v("description")} onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))} />}</Field>
        </div>
        <Field label="Screenshot URL">{({ id }) => <Input id={id} type="url" value={v("image_url")} onChange={(e) => setDraft((p) => ({ ...p, image_url: e.target.value }))} />}</Field>
        <Field label="Google Play URL">{({ id }) => <Input id={id} type="url" value={v("android_url")} onChange={(e) => setDraft((p) => ({ ...p, android_url: e.target.value }))} />}</Field>
        <Field label="App Store URL">{({ id }) => <Input id={id} type="url" value={v("ios_url")} onChange={(e) => setDraft((p) => ({ ...p, ios_url: e.target.value }))} />}</Field>
        <Toggle checked={!!v("is_enabled", false)} onChange={(b) => setDraft((p) => ({ ...p, is_enabled: b }))} label="Enabled" />
        <Toggle checked={!!v("is_published", false)} onChange={(b) => setDraft((p) => ({ ...p, is_published: b }))} label="Published" />
      </div>
    </Panel>
  );
}

/* ───────── IMPORTANT LINKS ───────── */

function LinksSection() {
  return (
    <CrudPage
      config={{
        title: "Important links", singular: "Link",
        subtitle: "Footer links — policies, help pages and anything else",
        load: () => cmsApi.listLinks(),
        create: (b) => cmsApi.createLink(b),
        update: (id, b) => cmsApi.updateLink(id, b),
        remove: (id) => cmsApi.deleteLink(id),
        searchKeys: ["title", "url"],
        columns: [
          { key: "title", header: "Label", render: (r: any) => <span className="font-semibold">{r.title || r.label}</span> },
          { key: "url", header: "URL", render: (r: any) => <span className="truncate font-mono text-[12px] text-[var(--fg-muted)]">{r.url}</span> },
          { key: "display_order", header: "Order", render: (r: any) => r.display_order ?? 0 },
          { key: "is_enabled", header: "Enabled", render: (r: any) => <StatusBadge value={r.is_enabled} /> },
        ],
        fields: [
          { name: "title", label: "Label", required: true, half: true },
          { name: "url", label: "URL", type: "url", required: true, half: true },
          { name: "display_order", label: "Display order", type: "number", half: true, defaultValue: 0 },
          { name: "is_enabled", label: "Enabled", type: "toggle", half: true, defaultValue: true },
        ],
        toBody: (v) => ({
          title: v.title, url: v.url,
          display_order: Number(v.display_order) || 0,
          is_enabled: !!v.is_enabled,
        }),
      }}
    />
  );
}
