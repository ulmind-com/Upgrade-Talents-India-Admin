"use client";

import { useState } from "react";
import { Eye, EyeOff, Save, Check, Radio, Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import { CrudPage } from "@/components/Crud";
import { Button, Field, Input, Panel, StatusBadge, Textarea, Toggle, useResource } from "@/components/Kit";
import { useToast } from "@/components/Providers";
import { cmsApi, safe } from "@/lib/api";
import { formatDate, fromDateTimeInput, rowId, cn } from "@/lib/utils";

const TABS = [
  { key: "brand", label: "Brand & Contact" },
  { key: "banners", label: "Sponsored Banners" },
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
     "contact_email", "contact_phone", "office_address", "support_url", "privacy_policy_url", "terms_url"]
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
          { name: "image_url", label: "Background image URL", type: "url" },
          { name: "target_url", label: "CTA link", type: "url", half: true },
          { name: "display_order", label: "Display order", type: "number", half: true, defaultValue: 0 },
          { name: "is_visible", label: "Visible", type: "toggle", half: true, defaultValue: true },
          { name: "is_published", label: "Published", type: "toggle", half: true, defaultValue: false },
        ],
        toBody: (v) => ({
          title: v.title, description: v.description || null,
          image_url: v.image_url || null, target_url: v.target_url || null,
          is_published: !!v.is_published, is_visible: !!v.is_visible,
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
