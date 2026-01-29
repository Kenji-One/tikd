/* ------------------------------------------------------------------ */
/*  src/app/dashboard/teams/new/page.tsx                              */
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
import { Users, ImagePlus, Link2, Info, Sparkles } from "lucide-react";

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
 * This fixes the “cannot submit unless logo/icon is provided” bug,
 * caused by defaultValues using "" for optional URL fields.
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

const TeamSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),

  banner: optionalUrlSchema,
  logo: optionalUrlSchema,

  website: websiteSchema,
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
type TeamFormData = z.infer<typeof TeamSchema>;

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

async function commitCloudinaryCrop(args: {
  publicId: string;
  cropUrl: string;
}) {
  const res = await fetch("/api/cloudinary/commit-crop", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      public_id: args.publicId,
      source_url: args.cropUrl,
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || "Failed to commit crop");
  }

  const json = (await res.json().catch(() => null)) as {
    secure_url?: string;
  } | null;

  if (!json?.secure_url) throw new Error("Invalid crop response");
  return json.secure_url;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function NewTeamPage() {
  const router = useRouter();

  const errorRing =
    "rounded-lg ring-1 ring-inset ring-error-500 border-transparent";

  // ✅ Stable publicIds
  const bannerPublicId = useMemo(() => uuid(), []);
  const logoPublicId = useMemo(() => uuid(), []);

  // Keep originals so user can re-adjust even after we apply Cloudinary crop URL
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
  } = useForm<TeamFormData>({
    resolver: zodResolver(TeamSchema),
    defaultValues: {
      name: "",
      description: "",
      website: "",
      location: "",
      accentColor: "",
      banner: "",
      logo: "",
    } as Partial<TeamFormData>,
    mode: "onBlur",
  });

  const [editor, setEditor] = useState<{
    open: boolean;
    mode: ImageEditorMode;
    src: string;
    title: string;
    publicId: string;
  } | null>(null);

  function openAdjust(mode: ImageEditorMode) {
    const banner = watch("banner") || "";
    const logo = watch("logo") || "";

    if (mode === "banner") {
      const original =
        bannerOriginalRef.current || stripQueryAndHash(banner || "");
      if (!original) return;

      setEditor({
        open: true,
        mode,
        src: original,
        title: "Adjust banner",
        publicId: `temp/teams/banners/${bannerPublicId}`,
      });
      return;
    }

    const original = logoOriginalRef.current || stripQueryAndHash(logo || "");
    if (!original) return;

    setEditor({
      open: true,
      mode,
      src: original,
      title: "Adjust logo",
      publicId: `temp/teams/logos/${logoPublicId}`,
    });
  }

  const onSubmit: SubmitHandler<TeamFormData> = async (data) => {
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

    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const body = await res.json().catch(() => null);
      const teamId = body?._id || body?.id;

      if (teamId) router.push(`/dashboard/teams/${teamId}`);
      else router.push("/dashboard/teams");
    } else {
      alert("Failed to create team");
    }
  };

  /* ---------------------------- preview --------------------------- */
  const name = watch("name");
  const description = watch("description");
  const banner = watch("banner");
  const logo = watch("logo");
  const website = watch("website");
  const location = watch("location");
  const accentColor = watch("accentColor");

  const siteHost = useMemo(() => hostFromUrl(website || undefined), [website]);
  const previewAccent =
    accentColor && accentColor.trim() !== "" ? accentColor : "#7C3AED";

  const hasErrors = Object.keys(errors).length > 0;
  const cardDescription = description?.trim() || siteHost || "Public profile";

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
          onApply={async ({ cropUrl }) => {
            // ✅ Commit crop to Cloudinary (overwrite the temp asset)
            const secureUrl = await commitCloudinaryCrop({
              publicId: editor.publicId,
              cropUrl,
            });

            const nonce = Date.now();
            setPreviewNonce(nonce);

            // Keep the true original for re-editing (raw, no cachebust)
            const clean = stripQueryAndHash(secureUrl);
            if (editor.mode === "banner") bannerOriginalRef.current = clean;
            else logoOriginalRef.current = clean;

            const fieldName = editor.mode === "banner" ? "banner" : "logo";

            // Store cache-busted URL for instant UI update; strip before submit
            setValue(fieldName, withCacheBust(secureUrl, nonce), {
              shouldDirty: true,
              shouldValidate: true,
              shouldTouch: true,
            });

            void trigger(fieldName);
            setEditor(null);
          }}
        />
      ) : null}

      <div className="relative isolate mt-6 px-4 pt-10 md:py-12 lg:mt-8">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-80"
          style={meshBg}
        />
        <div className="mx-auto max-w-[1232px]">
          <h1 className="text-2xl font-extrabold md:text-3xl">Add Team</h1>
          <p className="mt-2 max-w-prose text-sm text-neutral-300">
            Set up your team profile. This helps us personalize dashboards and
            card previews across Tikd.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto grid max-w-[1232px] grid-cols-1 gap-6 px-4 py-8 md:grid-cols-12"
        noValidate
      >
        <div className="space-y-6 md:col-span-7 lg:col-span-8">
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

          <Section
            title="Basic Information"
            desc="This appears on your team page and in cards."
            icon={<Users className="h-5 w-5 text-primary-300" />}
          >
            <div className="space-y-7">
              <div className="space-y-2">
                <FieldLabel required>Team Name</FieldLabel>
                <LabelledInput
                  noLabel
                  aria-label="Team Name"
                  placeholder="e.g., Street Promotions"
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
                      language="en"
                      region="US"
                    />
                  )}
                />
                {errors.location?.message ? (
                  <p className="text-xs text-error-300">
                    {String(errors.location.message)}
                  </p>
                ) : (
                  <p className="text-xs text-neutral-400">
                    Where is this team primarily based?
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <FieldLabel>Description</FieldLabel>
                <TextArea
                  {...register("description")}
                  placeholder="What does this team do?"
                  variant="transparent"
                  size="md"
                />
              </div>
            </div>
          </Section>

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

                        field.onChange(withCacheBust(next, nonce));
                      }}
                      publicId={`temp/teams/banners/${bannerPublicId}`}
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
                            publicId={`temp/teams/logos/${logoPublicId}`}
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
                      description="Used for highlights on your team page and cards."
                      showAlpha
                      onResetToDefault={() => field.onChange("")}
                      error={errors.accentColor?.message || null}
                    />
                  </div>
                )}
              />
            </div>
          </Section>

          <Section
            title="Links"
            desc="Add your main website so people can learn more."
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
              Create Team
            </Button>
          </div>
        </div>

        <aside className="md:col-span-5 lg:col-span-4">
          <div className="space-y-6 md:sticky md:top-20">
            <div className="rounded-lg border border-white/10 bg-neutral-950/70 p-5">
              <h3 className="mb-3 text-sm font-semibold">Live Preview</h3>

              <div className="flex justify-center">
                <ConnectionProfileCard
                  key={`team-live-${uiBanner}-${uiLogo}-${previewNonce}`}
                  href="#"
                  kind="team"
                  title={name?.trim() || "Team name"}
                  description={cardDescription}
                  bannerUrl={uiBanner?.trim() ? uiBanner : undefined}
                  iconUrl={uiLogo?.trim() ? uiLogo : undefined}
                  totalMembers={undefined}
                  joinDateLabel="Draft"
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
                <li>Choose an accent color that matches your vibe.</li>
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
