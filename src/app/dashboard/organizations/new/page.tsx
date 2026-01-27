/* ------------------------------------------------------------------ */
/*  src/app/dashboard/organizations/new/page.tsx                       */
/* ------------------------------------------------------------------ */
"use client";

import React, { useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm, Controller, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { v4 as uuid } from "uuid";
import clsx from "clsx";
import { Building2, ImagePlus, Link2, Sparkles, Info } from "lucide-react";

import LabelledInput from "@/components/ui/LabelledInput";
import { TextArea } from "@/components/ui/TextArea";
import ImageUpload from "@/components/ui/ImageUpload";
import { Button } from "@/components/ui/Button";
import ConnectionProfileCard from "@/components/connections/ConnectionProfileCard";
import TikdColorPicker from "@/components/ui/TikdColorPicker";
import PlacesAddressInput from "@/components/ui/PlacesAddressInput";
import ImagePositionEditorModal, {
  type ImageEditorMode,
} from "@/components/ui/ImagePositionEditorModal";

/* ------------------------------------------------------------------ */
/*  Constants & schema                                                */
/* ------------------------------------------------------------------ */

const businessTypeValues = [
  "brand",
  "venue",
  "community",
  "artist",
  "fraternity",
  "charity",
] as const;
type BusinessType = (typeof businessTypeValues)[number];

const BUSINESS_TYPES: {
  value: BusinessType;
  label: string;
  description: string;
}[] = [
  {
    value: "brand",
    label: "Brand",
    description: "You run or host events/parties under your own brand.",
  },
  {
    value: "venue",
    label: "Venue",
    description:
      "You run your own events or host others’ events at a consistent location.",
  },
  {
    value: "community",
    label: "Community",
    description: "You organize events for a club, group, or community.",
  },
  {
    value: "artist",
    label: "Artist",
    description: "You perform at events as a DJ, musician, or creator.",
  },
  {
    value: "fraternity",
    label: "Fraternity/Sorority",
    description: "You organize social events for a Greek-life organization.",
  },
  {
    value: "charity",
    label: "Charity",
    description:
      "You host events to support non-profits, causes, or fundraisers.",
  },
];

/* 🔧 helper: website is truly optional (empty allowed, but invalid URLs rejected) */
const websiteSchema = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) => {
      if (!value) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    {
      message: "Must be a valid URL (e.g., https://example.com)",
    },
  );

/**
 * ✅ Optional URL field that can be "", undefined, or a valid URL.
 * Fixes the “cannot create unless icon/logo is provided” bug.
 */
const optionalUrlSchema = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine(
    (value) => {
      if (!value) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Must be a valid URL" },
  );

const OrgSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),

  /** branding */
  banner: optionalUrlSchema,
  logo: optionalUrlSchema,

  website: websiteSchema,
  businessType: z.enum(businessTypeValues),
  location: z.string().min(2, "Location is required"),
  accentColor: z
    .string()
    .regex(
      /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/,
      "Use a valid hex color (e.g., #6366F1)",
    )
    .optional()
    .or(z.literal("")),
});
type OrgFormData = z.infer<typeof OrgSchema>;

/* ----------------------------- helpers ---------------------------- */
const meshBg: CSSProperties = {
  background:
    "radial-gradient(1000px 420px at 15% 10%, rgba(130,46,255,.25), transparent 60%)," +
    "radial-gradient(800px 420px at 85% 0%, rgba(88,101,242,.20), transparent 60%)",
};

function RequiredAsterisk() {
  return (
    <span aria-hidden className="ml-1 text-error-400">
      *
    </span>
  );
}

function FieldLabel({
  children,
  required,
  htmlFor,
}: {
  children: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm font-medium text-neutral-0"
    >
      <span className="inline-flex items-center">
        {children}
        {required ? <RequiredAsterisk /> : null}
      </span>
    </label>
  );
}

function Section({
  title,
  icon,
  desc,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-neutral-950/70 p-5">
      <div className="mb-6 flex items-start gap-3">
        {icon ? (
          <div className="mt-[2px] grid h-8 w-8 place-items-center rounded-md bg-primary-900/50 ring-1 ring-primary-500">
            {icon}
          </div>
        ) : null}
        <div>
          <h2 className="text-base font-semibold md:text-lg">{title}</h2>
          {desc ? <p className="mt-1 text-neutral-300">{desc}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function hostFromUrl(u?: string) {
  try {
    if (!u) return "";
    const url = new URL(u);
    return url.host.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function getBusinessTypeLabel(value?: BusinessType | null) {
  if (!value) return "";
  return BUSINESS_TYPES.find((t) => t.value === value)?.label ?? "";
}

/** Remove query/hash so we never store cache-busters in DB. */
function stripQueryAndHash(u?: string) {
  if (!u) return "";
  try {
    const url = new URL(u);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return u.split("?")[0]?.split("#")[0] ?? u;
  }
}

/** Force fresh fetch after overwrite/crop (Cloudinary CDN + Next/Image cache). */
function withCacheBust(u: string, nonce: number) {
  try {
    const url = new URL(u);
    url.searchParams.set("cb", String(nonce));
    return url.toString();
  } catch {
    const sep = u.includes("?") ? "&" : "?";
    return `${u}${sep}cb=${nonce}`;
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export default function NewOrganizationPage() {
  const router = useRouter();

  const errorRing =
    "rounded-lg ring-1 ring-inset ring-error-500 border-transparent";

  // ✅ Stable publicIds (previous version used uuid() in render, causing re-renders to change ids)
  const bannerPublicId = useMemo(() => uuid(), []);
  const logoPublicId = useMemo(() => uuid(), []);

  const bannerOriginalRef = useRef<string | null>(null);
  const logoOriginalRef = useRef<string | null>(null);

  // ✅ Global “cache-bust” nonce used to force fresh Cloudinary/Next fetches
  const [previewNonce, setPreviewNonce] = useState<number>(() => Date.now());

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<OrgFormData>({
    resolver: zodResolver(OrgSchema),
    defaultValues: {
      name: "",
      description: "",
      website: "",
      location: "",
      accentColor: "",
      banner: "",
      logo: "",
    } as Partial<OrgFormData>,
    mode: "onBlur",
  });

  const [editor, setEditor] = useState<{
    open: boolean;
    mode: ImageEditorMode;
    src: string;
    title: string;
  } | null>(null);

  function openAdjust(mode: ImageEditorMode) {
    const banner = watch("banner") || "";
    const logo = watch("logo") || "";

    if (mode === "banner") {
      const original = bannerOriginalRef.current || stripQueryAndHash(banner);
      if (!original) return;
      setEditor({
        open: true,
        mode,
        src: original,
        title: "Adjust banner",
      });
      return;
    }

    const original = logoOriginalRef.current || stripQueryAndHash(logo);
    if (!original) return;
    setEditor({
      open: true,
      mode,
      src: original,
      title: "Adjust logo",
    });
  }

  const onSubmit: SubmitHandler<OrgFormData> = async (data) => {
    // ✅ strip cache-busters before saving
    const cleanBanner = data.banner?.trim()
      ? stripQueryAndHash(data.banner)
      : "";
    const cleanLogo = data.logo?.trim() ? stripQueryAndHash(data.logo) : "";

    const payload = {
      ...data,
      banner: cleanBanner ? cleanBanner : undefined,
      logo: cleanLogo ? cleanLogo : undefined,
      website: data.website?.trim() ? data.website.trim() : undefined,
      accentColor: data.accentColor?.trim()
        ? data.accentColor.trim()
        : undefined,
      description: data.description?.trim()
        ? data.description.trim()
        : undefined,
      location: data.location?.trim() ? data.location.trim() : data.location,
      name: data.name?.trim() ? data.name.trim() : data.name,
    };

    const res = await fetch("/api/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const body = await res.json().catch(() => null);
      const orgId = body?._id || body?.id;

      // ✅ go to Org Dashboard after creation
      if (orgId) router.push(`/dashboard/organizations/${orgId}`);
      else router.push("/dashboard/organizations");
    } else {
      alert("Failed to create organization");
    }
  };

  /* ---------------------------- preview --------------------------- */
  const name = watch("name");
  const description = watch("description");
  const banner = watch("banner");
  const logo = watch("logo");
  const website = watch("website");
  const businessType = watch("businessType");
  const location = watch("location");
  const accentColor = watch("accentColor");

  const siteHost = useMemo(() => hostFromUrl(website || undefined), [website]);
  const previewAccent =
    accentColor && accentColor.trim() !== "" ? accentColor : "#7C3AED";

  const hasErrors = Object.keys(errors).length > 0;

  const cardDescription =
    description?.trim() ||
    siteHost ||
    (businessType ? getBusinessTypeLabel(businessType) : "") ||
    "Public profile";

  // ✅ Always show cache-busted URLs in UI so overwrites/crops reflect instantly
  const uiBanner = useMemo(() => {
    const v = banner?.trim() ? banner.trim() : "";
    return v ? withCacheBust(v, previewNonce) : "";
  }, [banner, previewNonce]);

  const uiLogo = useMemo(() => {
    const v = logo?.trim() ? logo.trim() : "";
    return v ? withCacheBust(v, previewNonce) : "";
  }, [logo, previewNonce]);

  return (
    <main className="relative bg-neutral-950 text-neutral-0">
      {editor?.open ? (
        <ImagePositionEditorModal
          open={editor.open}
          mode={editor.mode}
          src={editor.src}
          title={editor.title}
          onClose={() => setEditor(null)}
          onApply={({ cropUrl }) => {
            const fieldName = editor.mode === "banner" ? "banner" : "logo";

            // ✅ bump nonce so Cloudinary + Next/Image can’t reuse stale cached asset
            const nonce = Date.now();
            setPreviewNonce(nonce);

            // ✅ store cache-busted URL for immediate preview
            const nextValue = withCacheBust(cropUrl, nonce);

            setValue(fieldName, nextValue, {
              shouldDirty: true,
              shouldValidate: true,
              shouldTouch: true,
            });

            // ✅ propagate immediately
            void trigger(fieldName);

            setEditor(null);
          }}
        />
      ) : null}

      {/* Header / mesh */}
      <div className="relative isolate mt-6 px-4 pt-10 md:py-12 lg:mt-8">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-80"
          style={meshBg}
        />
        <div className="mx-auto max-w-[1232px]">
          <h1 className="text-2xl font-extrabold md:text-3xl">
            Add Organization
          </h1>
          <p className="mt-2 max-w-prose text-sm text-neutral-300">
            Set up your organization profile. This helps us personalize your
            dashboard, event cards, and previews for your fans.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto grid max-w-[1232px] grid-cols-1 gap-6 px-4 py-8 md:grid-cols-12"
        noValidate
      >
        {/* ------------------------- Main form ----------------------- */}
        <div className="space-y-6 md:col-span-7 lg:col-span-8">
          {/* Required fields note (same as event creation) */}
          <div className="rounded-lg border border-white/10 bg-neutral-950/60 p-3">
            <div className="flex items-center gap-3">
              <div className="mt-[2px] grid h-8 w-8 place-items-center rounded-lg bg-white/5 ring-1 ring-white/10">
                <Info className="h-5 w-5 text-neutral-200" />
              </div>
              <p className="text-sm text-neutral-300 leading-relaxed">
                Required fields are marked with an{" "}
                <span className="font-semibold text-error-300">*</span>.
              </p>
            </div>
          </div>

          {/* Error summary after first submit */}
          {submitCount > 0 && hasErrors && (
            <div
              role="alert"
              className="rounded-2xl border border-error-500/40 bg-error-500/10 p-4 text-sm"
            >
              <p className="font-semibold text-error-300">
                Please fix the highlighted fields.
              </p>
            </div>
          )}

          {/* Basic info */}
          <Section
            title="Basic Information"
            desc="This appears on your organization page and on event cards."
            icon={<Building2 className="h-5 w-5 text-primary-300" />}
          >
            <div className="space-y-7">
              <div className="space-y-2">
                <FieldLabel required>Organization Name</FieldLabel>
                <LabelledInput
                  noLabel
                  aria-label="Organization Name"
                  placeholder="e.g., Nightwave Collective"
                  {...register("name")}
                  variant="transparent"
                  size="md"
                  className={clsx(errors.name && errorRing)}
                />
                {errors.name?.message ? (
                  <p className="text-xs text-error-300">
                    {String(errors.name.message)}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <FieldLabel required>Address</FieldLabel>
                <Controller
                  control={control}
                  name="location"
                  render={({ field }) => (
                    <PlacesAddressInput
                      value={field.value ?? ""}
                      onChange={(v) => field.onChange(v)}
                      placeholder="Type to search address"
                      error={!!errors.location}
                    />
                  )}
                />
                {errors.location?.message ? (
                  <p className="text-xs text-error-300">
                    {String(errors.location.message)}
                  </p>
                ) : (
                  <p className="text-xs text-neutral-400">
                    Where are most of your events based?
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <FieldLabel>Description</FieldLabel>
                <TextArea
                  {...register("description")}
                  placeholder="What is this org about?"
                  variant="transparent"
                  size="md"
                />
              </div>
            </div>
          </Section>

          {/* Business type */}
          <Section
            title="Type of business"
            desc="Tell us what best describes how you run or host events."
            icon={<Sparkles className="h-5 w-5 text-primary-300" />}
          >
            <Controller
              control={control}
              name="businessType"
              render={({ field }) => (
                <div className="space-y-3">
                  <FieldLabel required>Business Type</FieldLabel>

                  <p className="text-xs text-neutral-400">
                    Choose one. You can always tweak this later in settings.
                  </p>

                  <fieldset>
                    <legend className="sr-only">
                      What describes best the type of your business?
                    </legend>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {BUSINESS_TYPES.map((type) => {
                        const selected = field.value === type.value;

                        return (
                          <label
                            key={type.value}
                            className="cursor-pointer"
                            aria-label={type.label}
                          >
                            <input
                              type="radio"
                              value={type.value}
                              checked={selected}
                              onChange={() => field.onChange(type.value)}
                              className="sr-only"
                            />

                            <div
                              className={clsx(
                                "relative rounded-2xl border bg-neutral-900/55 px-4 py-3 text-left transition",
                                "shadow-[0_16px_36px_rgba(0,0,0,0.45)]",
                                "min-h-[86px] sm:min-h-[86px] pr-12",
                                selected
                                  ? "border-primary-500/90 ring-1 ring-primary-400/55 bg-gradient-to-br from-primary-950/55 via-neutral-950 to-neutral-950"
                                  : "border-white/10 hover:border-primary-500/55 hover:bg-neutral-900/70",
                              )}
                            >
                              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                <span
                                  className={clsx(
                                    "flex h-5 w-5 items-center justify-center rounded-full border bg-black/45",
                                    selected
                                      ? "border-primary-400 ring-1 ring-primary-400/30"
                                      : "border-white/25",
                                  )}
                                >
                                  <span
                                    className={clsx(
                                      "h-2.5 w-2.5 rounded-full",
                                      selected
                                        ? "bg-primary-300"
                                        : "bg-white/20",
                                    )}
                                  />
                                </span>
                              </div>

                              <p className="text-sm font-semibold">
                                {type.label}
                              </p>
                              <p className="mt-1 line-clamp-2 text-xs leading-snug text-neutral-300">
                                {type.description}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  {errors.businessType && (
                    <p className="text-xs leading-snug text-error-300">
                      Choose the type that best describes your organization.
                    </p>
                  )}
                </div>
              )}
            />
          </Section>

          {/* Branding */}
          <Section
            title="Branding"
            desc="Upload a banner + a crisp square logo and choose your accent color."
            icon={<ImagePlus className="h-5 w-5 text-primary-300" />}
          >
            <div className="space-y-5">
              <Controller
                control={control}
                name="banner"
                render={({ field }) => (
                  <div className="space-y-2">
                    <ImageUpload
                      label="Banner"
                      value={uiBanner || ""}
                      onChange={(next) => {
                        const nonce = Date.now();
                        setPreviewNonce(nonce);

                        const cleanOriginal = stripQueryAndHash(next);
                        if (cleanOriginal)
                          bannerOriginalRef.current = cleanOriginal;

                        // store cache-busted for UI responsiveness; strip on submit
                        field.onChange(withCacheBust(next, nonce));
                      }}
                      publicId={`temp/orgs/banners/${bannerPublicId}`}
                    />
                    {field.value?.trim() ? (
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => openAdjust("banner")}
                        >
                          Adjust banner
                        </Button>
                      </div>
                    ) : null}
                  </div>
                )}
              />

              <div className="rounded-lg border border-white/10 bg-neutral-950/45 p-4">
                <div className="flex flex-col items-center justify-between gap-4">
                  <div className="shrink-0">
                    <Controller
                      control={control}
                      name="logo"
                      render={({ field }) => (
                        <div className="space-y-2 flex flex-col items-center">
                          <ImageUpload
                            label=""
                            value={uiLogo || ""}
                            onChange={(next) => {
                              const nonce = Date.now();
                              setPreviewNonce(nonce);

                              const cleanOriginal = stripQueryAndHash(next);
                              if (cleanOriginal)
                                logoOriginalRef.current = cleanOriginal;

                              field.onChange(withCacheBust(next, nonce));
                            }}
                            publicId={`temp/orgs/logos/${logoPublicId}`}
                            sizing="square"
                          />
                          {field.value?.trim() ? (
                            <div className="flex justify-center">
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => openAdjust("logo")}
                              >
                                Adjust logo
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      )}
                    />
                  </div>
                  <div className="min-w-0 text-center">
                    <p className="text-sm font-semibold">Logo</p>

                    <p className="mt-2 text-[11px] text-neutral-400">
                      Recommended: ≥ 512×512, transparent PNG if possible.
                    </p>
                  </div>
                </div>
              </div>

              <Controller
                control={control}
                name="accentColor"
                render={({ field }) => (
                  <div className="md:pl-1">
                    <TikdColorPicker
                      value={field.value || ""}
                      onChange={field.onChange}
                      defaultColor="#7C3AED"
                      label="Select an accent color"
                      description="Used for highlights on your organization page and event cards."
                      showAlpha
                      onResetToDefault={() => field.onChange("")}
                      error={errors.accentColor?.message || null}
                    />
                  </div>
                )}
              />
            </div>
          </Section>

          {/* Links */}
          <Section
            title="Links"
            desc="Add your main website so fans and partners can learn more."
            icon={<Link2 className="h-5 w-5 text-primary-300" />}
          >
            <div className="space-y-2">
              <FieldLabel>Website (optional)</FieldLabel>
              <LabelledInput
                noLabel
                aria-label="Website"
                placeholder="https://example.com"
                {...register("website")}
                variant="transparent"
                size="md"
                className={clsx(errors.website && errorRing)}
              />
              {errors.website?.message ? (
                <p className="text-xs text-error-300">
                  {String(errors.website.message)}
                </p>
              ) : null}
            </div>
          </Section>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              animation
            >
              Create Organization
            </Button>
          </div>
        </div>

        {/* ------------------------- Sidebar -------------------------- */}
        <aside className="md:col-span-5 lg:col-span-4">
          <div className="space-y-6 md:sticky md:top-20">
            <div className="rounded-lg border border-white/10 bg-neutral-950/70 p-5">
              <h3 className="mb-3 text-sm font-semibold">Live Preview</h3>

              <div className="flex justify-center">
                <ConnectionProfileCard
                  // key includes URLs so any internal memoization can’t freeze old images
                  key={`org-live-${uiBanner}-${uiLogo}-${previewNonce}`}
                  href="#"
                  kind="organization"
                  title={name?.trim() || "Organization name"}
                  description={cardDescription}
                  bannerUrl={uiBanner?.trim() ? uiBanner : undefined}
                  iconUrl={uiLogo?.trim() ? uiLogo : undefined}
                  totalMembers={undefined}
                  joinDateLabel={
                    businessType
                      ? `${getBusinessTypeLabel(businessType)} · Draft`
                      : "Draft"
                  }
                />
              </div>

              <div className="mt-3 text-xs text-neutral-400">
                Preview reflects your banner/logo/accent choices.
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-neutral-950/70 p-5">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-primary-300" />
                Make it stand out
              </h3>
              <ul className="list-inside list-disc space-y-1 text-sm text-neutral-300">
                <li>Use a clean banner (≥ 1600×400).</li>
                <li>Use a simple, square logo (≥ 512×512).</li>
                <li>Keep the description concise and specific.</li>
                <li>
                  Pick a business type and accent color that match how guests
                  see you.
                </li>
              </ul>
            </div>

            <div className="rounded-lg border border-white/10 bg-neutral-950/70 p-5">
              <p className="text-xs text-neutral-300">
                Address:{" "}
                <span className="font-semibold text-neutral-0">
                  {location?.trim() || "—"}
                </span>
              </p>
              <p className="mt-2 text-xs text-neutral-300">
                Accent:{" "}
                <span className="font-mono font-semibold text-neutral-0">
                  {previewAccent}
                </span>
              </p>
            </div>
          </div>
        </aside>
      </form>
    </main>
  );
}
