"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff, Save, Check, Radio, Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import { CrudPage } from "@/components/Crud";
import { Button, Field, Input, Panel, StatusBadge, Textarea, Toggle, useResource } from "@/components/Kit";
import { useToast } from "@/components/Providers";
import { cmsApi, safe } from "@/lib/api";
import { formatDate, fromDateTimeInput, rowId, cn } from "@/lib/utils";

const TABS = [
  { key: "brand", label: "Brand & Contact" },
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

    body.social_media = ["facebook", "instagram", "twitter", "youtube", "linkedin"]
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

        <Panel title="Social links">
          <div className="grid gap-4 sm:grid-cols-2">
            {["facebook", "instagram", "twitter", "youtube", "linkedin"].map((k) => (
              <Field key={k} label={k[0].toUpperCase() + k.slice(1)}>
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
