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
} from "lucide-react";

import LabelledInput from "@/components/ui/LabelledInput";
import { TextArea } from "@/components/ui/TextArea";
import ImageUpload from "@/components/ui/ImageUpload";
import { Button } from "@/components/ui/Button";

/* ------------------------------------------------------------------ */
/*  Schema                                                            */
/* ------------------------------------------------------------------ */
const OrgSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  logo: z.string().url().optional(),
  website: z
    .string()
    .url("Must be a valid URL (e.g., https://example.com)")
    .optional(),
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
    defaultValues: { name: "" },
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
  const siteHost = useMemo(() => hostFromUrl(website), [website]);

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
            Set up your organization profile. You can edit details later; start
            with the essentials and a clean logo.
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
                className={errors.name && "border border-error-500"}
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

          <Section
            title="Branding"
            desc="Upload a crisp, high-contrast logo (preferably square)."
            icon={<ImagePlus className="h-5 w-5 text-primary-300" />}
          >
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
          </Section>

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
              className={errors.website && "border border-error-500"}
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
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl ring-4 ring-black/50">
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logo}
                      alt="Org logo preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-[conic-gradient(from_220deg_at_50%_50%,#6d28d9,#3b82f6,#111827)] text-white">
                      <span className="text-xl font-semibold">
                        {name?.[0]?.toUpperCase() ?? "O"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
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
                  <p className="mt-1 line-clamp-3 text-sm text-neutral-300">
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
                <li>Add a website to build trust and discovery.</li>
              </ul>
            </div>
          </div>
        </aside>
      </form>
    </main>
  );
}
