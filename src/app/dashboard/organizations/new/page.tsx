/* ------------------------------------------------------------------ */
/*  Create Organization – Tikd.                                       */
/*  - Elegant sectioned layout                                         */
/*  - Sticky live preview (desktop)                                    */
/*  - Helpful microcopy + error summary                                */
/* ------------------------------------------------------------------ */
"use client";

import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { v4 as uuid } from "uuid";
import { useMemo } from "react";
import type { CSSProperties } from "react";
import clsx from "clsx";
import {
  Building2,
  ImagePlus,
  Link2,
  ExternalLink,
  Sparkles,
  MapPin,
  Palette,
} from "lucide-react";

import LabelledInput from "@/components/ui/LabelledInput";
import { TextArea } from "@/components/ui/TextArea";
import ImageUpload from "@/components/ui/ImageUpload";
import { Button } from "@/components/ui/Button";

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
      if (!value) return true; // empty / undefined => OK
      try {
        // will throw for invalid URLs
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    {
      message: "Must be a valid URL (e.g., https://example.com)",
    }
  );

const OrgSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  logo: z.string().url().optional(),
  website: websiteSchema,
  businessType: z.enum(businessTypeValues),
  location: z.string().min(2, "Location is required"),
  accentColor: z
    .string()
    .regex(
      /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/,
      "Use a valid hex color (e.g., #6366F1)"
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
    <section className="rounded-2xl border border-white/10 bg-neutral-950/70 p-5 md:p-6">
      <div className="mb-4 flex items-start gap-3">
        {icon ? (
          <div className="mt-[2px] grid h-8 w-8 place-items-center rounded-lg bg-primary-900/50 ring-1 ring-primary-700/40">
            {icon}
          </div>
        ) : null}
        <div>
          <h2 className="text-base font-semibold md:text-lg">{title}</h2>
          {desc ? (
            <p className="mt-1 text-sm text-neutral-300">{desc}</p>
          ) : null}
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

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export default function NewOrganizationPage() {
  const router = useRouter();

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<OrgFormData>({
    resolver: zodResolver(OrgSchema),
    defaultValues: {
      name: "",
      description: "",
      website: "",
      location: "",
      accentColor: "",
    } as Partial<OrgFormData>,
    mode: "onBlur",
  });

  const onSubmit: SubmitHandler<OrgFormData> = async (data) => {
    const res = await fetch("/api/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      router.push("/dashboard");
    } else {
      alert("Failed to create organization");
    }
  };

  /* ---------------------------- preview --------------------------- */
  const name = watch("name");
  const description = watch("description");
  const logo = watch("logo");
  const website = watch("website");
  const businessType = watch("businessType");
  const location = watch("location");
  const accentColor = watch("accentColor");

  const siteHost = useMemo(() => hostFromUrl(website), [website]);
  const previewAccent =
    accentColor && accentColor.trim() !== "" ? accentColor : "#7C3AED";

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <main className="relative bg-neutral-950 text-neutral-0">
      {/* Header / mesh */}
      <div className="relative isolate px-4 pt-10 md:py-12 mt-6 lg:mt-8">
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
            <div className="space-y-4">
              <LabelledInput
                label="Organization Name"
                placeholder="e.g., Nightwave Collective"
                {...register("name")}
                variant="full"
                size="md"
                error={errors.name?.message || null}
              />

              <LabelledInput
                label="Location"
                placeholder="City, Country"
                {...register("location")}
                variant="full"
                size="md"
                icon={<MapPin className="h-4 w-4 text-neutral-400" />}
                hint="Where are most of your events based?"
                error={errors.location?.message || null}
              />

              <div className="space-y-2">
                <label className="block text-sm font-medium">Description</label>
                <TextArea
                  {...register("description")}
                  placeholder="What is this org about?"
                  variant="full"
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
                                "relative flex h-full flex-col rounded-2xl border bg-neutral-900/70 px-4 py-4 text-left transition",
                                "shadow-[0_18px_45px_rgba(0,0,0,0.55)]",
                                selected
                                  ? "border-primary-500/90 ring-1 ring-primary-400/60 bg-gradient-to-br from-primary-950/60 via-neutral-950 to-neutral-950"
                                  : "border-white/10 hover:border-primary-500/60 hover:bg-neutral-900"
                              )}
                            >
                              <div className="mb-5 flex justify-center">
                                <span
                                  className={clsx(
                                    "flex h-5 w-5 items-center justify-center rounded-full border border-white/35 bg-black/50",
                                    selected &&
                                      "border-primary-400 bg-primary-500/20"
                                  )}
                                >
                                  <span
                                    className={clsx(
                                      "h-2.5 w-2.5 rounded-full",
                                      selected
                                        ? "bg-primary-300"
                                        : "bg-white/25"
                                    )}
                                  />
                                </span>
                              </div>
                              <p className="text-sm font-semibold">
                                {type.label}
                              </p>
                              <p className="mt-1 text-xs text-neutral-300">
                                {type.description}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                  {errors.businessType && (
                    <p className="text-xs leading-snug text-error-500">
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
            desc="Upload a crisp, high-contrast logo and choose your accent color."
            icon={<ImagePlus className="h-5 w-5 text-primary-300" />}
          >
            <div className="space-y-4">
              <Controller
                control={control}
                name="logo"
                render={({ field }) => (
                  <ImageUpload
                    label="Logo"
                    value={field.value}
                    onChange={field.onChange}
                    publicId={`temp/orgs/${uuid()}`}
                  />
                )}
              />

              {/* Accent color: color picker + big preview */}
              <Controller
                control={control}
                name="accentColor"
                render={({ field }) => {
                  const effectiveColor =
                    field.value && field.value.trim() !== ""
                      ? field.value
                      : previewAccent;

                  return (
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Palette className="h-4 w-4 text-primary-300" />
                            <p className="text-sm font-medium">
                              Select an accent color
                            </p>
                          </div>
                          <p className="mt-1 text-xs text-neutral-300">
                            Used for highlights on your organization page and
                            event cards.
                          </p>
                        </div>
                      </div>

                      <div className="grid items-center gap-4 md:grid-cols-[minmax(0,1.5fr)_auto]">
                        {/* Big preview bar */}
                        <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/80">
                          <div
                            className="h-16 sm:h-20"
                            style={{ backgroundColor: effectiveColor }}
                          />
                          <div className="flex items-center justify-between px-4 py-2 text-xs text-neutral-200">
                            <span className="text-neutral-300">Preview</span>
                            <span className="font-mono uppercase">
                              {effectiveColor}
                            </span>
                          </div>
                        </div>

                        {/* Native color input + reset */}
                        <div className="flex flex-col items-end gap-2">
                          <input
                            type="color"
                            value={effectiveColor}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="h-10 w-10 cursor-pointer rounded-full border border-white/30 bg-transparent p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                          />
                          <button
                            type="button"
                            onClick={() => field.onChange("")}
                            className="text-[11px] text-neutral-400 underline-offset-2 hover:text-neutral-200 hover:underline"
                          >
                            Use default theme color
                          </button>
                        </div>
                      </div>

                      <LabelledInput
                        noLabel
                        placeholder="#6366F1"
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value)}
                        variant="full"
                        size="sm"
                        hint="Use a hex color like #6366F1 or pick using the color chooser."
                        error={errors.accentColor?.message || null}
                        endAdornment={
                          <span
                            className="h-4 w-4 rounded-full border border-white/20"
                            style={{ backgroundColor: effectiveColor }}
                          />
                        }
                      />
                    </div>
                  );
                }}
              />
            </div>
          </Section>

          {/* Links */}
          <Section
            title="Links"
            desc="Add your main website so fans and partners can learn more."
            icon={<Link2 className="h-5 w-5 text-primary-300" />}
          >
            <LabelledInput
              label="Website (optional)"
              placeholder="https://example.com"
              {...register("website")}
              variant="full"
              size="md"
              error={errors.website?.message || null}
            />
          </Section>

          {/* Submit */}
          <div className="flex gap-3">
            <Button type="submit" variant="primary" loading={isSubmitting}>
              Create Organization
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </div>

        {/* ------------------------- Sidebar -------------------------- */}
        <aside className="md:col-span-5 lg:col-span-4">
          <div className="space-y-6 md:sticky md:top-20">
            {/* Live preview */}
            <div className="rounded-2xl border border-white/10 bg-neutral-950/70 p-5">
              <h3 className="mb-3 text-sm font-semibold">Live Preview</h3>

              <div className="flex items-start gap-4">
                {/* Logo */}
                <div
                  className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-neutral-900/80"
                  style={{
                    borderColor: previewAccent,
                    boxShadow:
                      "0 0 0 1px rgba(0,0,0,0.6), 0 18px 45px rgba(0,0,0,0.75)",
                  }}
                >
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logo}
                      alt="Org logo preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className="grid h-full w-full place-items-center text-white"
                      style={{
                        background: `conic-gradient(from_220deg_at_50%_50%,${previewAccent},#3b82f6,#111827)`,
                      }}
                    >
                      <span className="text-xl font-semibold">
                        {name?.[0]?.toUpperCase() ?? "O"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <h4 className="truncate text-base font-semibold">
                        {name || "Organization name"}
                      </h4>
                      {siteHost && (
                        <a
                          href={website}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary-300 hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          {siteHost}
                        </a>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-300">
                      {businessType && (
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                          style={{
                            backgroundColor: `${previewAccent}1A`,
                            color: previewAccent,
                            borderColor: `${previewAccent}33`,
                            borderWidth: 1,
                            borderStyle: "solid",
                          }}
                        >
                          {getBusinessTypeLabel(businessType) || "Business"}
                        </span>
                      )}
                      {location && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-neutral-300">
                          <MapPin className="h-3 w-3 text-neutral-400" />
                          {location}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="mt-2 line-clamp-3 text-sm text-neutral-300">
                    {description ||
                      "Your short mission or tagline appears here."}
                  </p>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="rounded-2xl border border-white/10 bg-neutral-950/70 p-5">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-primary-300" />
                Make it stand out
              </h3>
              <ul className="list-inside list-disc space-y-1 text-sm text-neutral-300">
                <li>Use a simple, square logo (≥ 512×512).</li>
                <li>Keep the description concise and specific.</li>
                <li>
                  Pick a business type and accent color that match how guests
                  see you.
                </li>
              </ul>
            </div>
          </div>
        </aside>
      </form>
    </main>
  );
}
