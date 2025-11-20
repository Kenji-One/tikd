// src/app/dashboard/organizations/[id]/edit/page.tsx
"use client";

import { useEffect, useMemo, useState, ReactNode } from "react";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { v4 as uuid } from "uuid";
import { useParams, useRouter } from "next/navigation";
import clsx from "clsx";
import { Building2, Palette, Globe2, MapPin, Sparkles } from "lucide-react";

import ImageUpload from "@/components/ui/ImageUpload";
import { Button } from "@/components/ui/Button";
import LabelledInput from "@/components/ui/LabelledInput";
import { TextArea } from "@/components/ui/TextArea";

/* ----------------------------- Schema ----------------------------- */

const businessTypeValues = [
  "brand",
  "venue",
  "community",
  "artist",
  "fraternity",
  "charity",
] as const;

type OrgBusinessType = (typeof businessTypeValues)[number];

const FormSchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),

  logo: z.string().url().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  businessType: z.enum(businessTypeValues),
  location: z.string().optional().or(z.literal("")),
  accentColor: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof FormSchema>;

type OrgResponse = FormValues & {
  _id: string;
  ownerId: string;
  createdAt?: string;
  updatedAt?: string;
};

/* ----------------------------- Helpers ---------------------------- */

function Section(props: {
  title: string;
  icon?: ReactNode;
  desc?: string;
  children: ReactNode;
}) {
  const { title, icon, desc, children } = props;
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

/* ------------------------------ Page ------------------------------ */

export default function EditOrganizationPage() {
  const router = useRouter();
  const params = useParams() as { id?: string };
  const orgId = params?.id ?? "";

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors, submitCount },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "",
      description: "",
      logo: "",
      website: "",
      businessType: "brand",
      location: "",
      accentColor: "",
    },
    mode: "onBlur",
  });

  const hasErrors = useMemo(() => Object.keys(errors).length > 0, [errors]);

  /* -------------------------- Load org --------------------------- */

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const res = await fetch(`/api/organizations/${orgId}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load organization");
        }
        const org = (await res.json()) as OrgResponse;

        if (!cancelled) {
          reset({
            name: org.name ?? "",
            description: org.description ?? "",
            logo: org.logo ?? "",
            website: org.website ?? "",
            businessType: org.businessType as OrgBusinessType,
            location: org.location ?? "",
            accentColor: org.accentColor ?? "",
          });
        }
      } catch (err: any) {
        if (!cancelled) {
          setLoadError(err?.message || "Failed to load organization");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [orgId, reset]);

  /* -------------------------- Submit ----------------------------- */

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (!orgId) return;
    try {
      const res = await fetch(`/api/organizations/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        console.error("Update failed", payload);
        alert(payload.error || "Failed to update organization");
        return;
      }

      router.push(`/dashboard/organizations/${orgId}`);
    } catch (err) {
      console.error(err);
      alert("Something went wrong while updating");
    }
  };

  /* --------------------------- Render ----------------------------- */

  if (loading) {
    return (
      <main className="relative bg-neutral-950 text-neutral-0">
        <div className="relative isolate px-4 pt-8 md:py-10 mt-2">
          <div
            className="pointer-events-none absolute inset-0 -z-10 opacity-80"
            style={{
              background:
                "radial-gradient(1000px 420px at 15% 10%, rgba(130,46,255,.25), transparent 60%), radial-gradient(800px 420px at 85% 0%, rgba(88,101,242,.20), transparent 60%)",
            }}
          />
          <div className="mx-auto max-w-[1232px]">
            <h1 className="text-2xl font-extrabold md:text-3xl">
              Edit Organization
            </h1>
            <p className="mt-2 max-w-prose text-sm text-neutral-300">
              Loading organization details...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="relative bg-neutral-950 text-neutral-0">
        <div className="relative isolate px-4 pt-8 md:py-10 mt-2">
          <div
            className="pointer-events-none absolute inset-0 -z-10 opacity-80"
            style={{
              background:
                "radial-gradient(1000px 420px at 15% 10%, rgba(130,46,255,.25), transparent 60%), radial-gradient(800px 420px at 85% 0%, rgba(88,101,242,.20), transparent 60%)",
            }}
          />
          <div className="mx-auto max-w-[1232px] space-y-2">
            <h1 className="text-2xl font-extrabold md:text-3xl">
              Edit Organization
            </h1>
            <p className="max-w-prose text-sm text-red-400">{loadError}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative bg-neutral-950 text-neutral-0">
      <div className="relative isolate px-4 pt-8 md:py-10 mt-2">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-80"
          style={{
            background:
              "radial-gradient(1000px 420px at 15% 10%, rgba(130,46,255,.25), transparent 60%), radial-gradient(800px 420px at 85% 0%, rgba(88,101,242,.20), transparent 60%)",
          }}
        />
        <div className="mx-auto max-w-[1232px]">
          <h1 className="text-2xl font-extrabold md:text-3xl">
            Edit Organization
          </h1>
          <p className="mt-2 max-w-prose text-sm text-neutral-300">
            Update your organization’s details, branding and links. Changes
            apply immediately.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="mx-auto grid max-w-[1232px] grid-cols-1 gap-6 py-8 md:grid-cols-12"
      >
        <div className="space-y-6 md:col-span-7 lg:col-span-8">
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
            title="Basic information"
            desc="This is how your organization appears across Tikd."
            icon={<Building2 className="h-5 w-5 text-primary-300" />}
          >
            <div className="space-y-4">
              <LabelledInput
                label="Organization name"
                placeholder="Enter name"
                {...register("name")}
                size="md"
                variant="full"
                className={errors.name && "border border-error-500"}
              />

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Description
                </label>
                <TextArea
                  {...register("description")}
                  placeholder="Tell attendees what this organization is about"
                  size="md"
                  variant="full"
                />
              </div>

              {/* Business type chips */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Business type
                </label>
                <div className="flex flex-wrap gap-2">
                  {businessTypeValues.map((bt) => (
                    <label key={bt} className="cursor-pointer">
                      <input
                        type="radio"
                        value={bt}
                        {...register("businessType")}
                        className="peer sr-only"
                      />
                      <span
                        className={clsx(
                          "inline-flex items-center rounded-full border px-4 py-1.5 text-xs md:text-sm transition-colors",
                          "border-white/10 text-neutral-300 peer-checked:border-white/30 peer-checked:bg-white/10 peer-checked:text-neutral-0"
                        )}
                      >
                        {bt.charAt(0).toUpperCase() + bt.slice(1)}
                      </span>
                    </label>
                  ))}
                </div>
                {errors.businessType && (
                  <p className="text-xs text-error-400 mt-1">
                    {errors.businessType.message}
                  </p>
                )}
              </div>
            </div>
          </Section>

          {/* Branding and links */}
          <Section
            title="Branding & links"
            desc="Logo, accent color and website help your org feel recognizable."
            icon={<Palette className="h-5 w-5 text-primary-300" />}
          >
            <div className="space-y-4">
              {/* Logo */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">Logo</label>
                <Controller
                  control={control}
                  name="logo"
                  render={({ field }) => (
                    <ImageUpload
                      label="Upload logo"
                      value={field.value}
                      onChange={field.onChange}
                      publicId={`org-logos/${orgId || "temp"}/${uuid()}`}
                      sizing="avatar"
                    />
                  )}
                />
              </div>

              {/* Website */}
              <LabelledInput
                label="Website"
                placeholder="https://example.com"
                {...register("website")}
                size="md"
                variant="full"
                icon={<Globe2 className="h-4 w-4 opacity-60" />}
                className={errors.website && "border border-error-500"}
              />

              {/* Location */}
              <LabelledInput
                label="Location"
                placeholder="City, Country"
                {...register("location")}
                size="md"
                variant="full"
                icon={<MapPin className="h-4 w-4 opacity-60" />}
              />

              {/* Accent color */}
              <div className="space-y-2">
                <LabelledInput
                  label="Accent color"
                  placeholder="#8257E6"
                  {...register("accentColor")}
                  size="md"
                  variant="full"
                  className={errors.accentColor && "border border-error-500"}
                />
                <p className="text-xs text-neutral-400">
                  Optional — used for highlights on your org page.
                </p>
              </div>
            </div>
          </Section>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push(`/dashboard/organizations/${orgId}`)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              Save changes
            </Button>
          </div>
        </div>

        {/* Right-side tips / info */}
        <aside className="md:col-span-5 lg:col-span-4">
          <div className="md:sticky md:top-20 space-y-6">
            <Section
              title="Tips for a strong profile"
              icon={<Sparkles className="h-5 w-5 text-primary-300" />}
              desc="Small tweaks can make your organization much more attractive."
            >
              <ul className="list-inside list-disc space-y-1 text-sm text-neutral-300">
                <li>
                  Use a clear logo with transparent background if possible.
                </li>
                <li>
                  Keep the description short but specific — who are you, what do
                  you host?
                </li>
                <li>
                  Add a website or socials so people can learn more before
                  buying.
                </li>
              </ul>
            </Section>
          </div>
        </aside>
      </form>
    </main>
  );
}
