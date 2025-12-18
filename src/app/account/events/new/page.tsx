/* ------------------------------------------------------------------ */
/*  Create Event (new) – Tikd.                                        */
/*  - Elegant sectioned layout                                         */
/*  - Sticky live preview (desktop)                                    */
/*  - Helpful microcopy + error summary                                */
/*  - Polished Ticket Types UI (currency select, clean remove button)  */
/* ------------------------------------------------------------------ */
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useForm,
  useFieldArray,
  SubmitHandler,
  Controller,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  CalendarClock,
  MapPin,
  ImagePlus,
  Users as UsersIcon,
  Plus,
  Trash2,
  Sparkles,
} from "lucide-react";

import ImageUpload from "@/components/ui/ImageUpload";
import { Button } from "@/components/ui/Button";
import LabelledInput from "@/components/ui/LabelledInput";
import { TextArea } from "@/components/ui/TextArea";
import { EventCard } from "@/components/ui/EventCard";

/* ------------------------------------------------------------------ */
/*  Schema                                                            */
/* ------------------------------------------------------------------ */
const ticketTypeSchema = z.object({
  slug: z.string().min(1, "Slug is required"),
  label: z.string().min(1, "Ticket label is required"),
  // Use plain number and let RHF coerce via valueAsNumber
  price: z.number().nonnegative("Price cannot be negative"),
  currency: z
    .string()
    .length(3, "Use 3-letter currency code")
    .transform((v) => v.toUpperCase()),
  quantity: z.number().int().nonnegative("Quantity must be ≥ 0"),
});

const FormSchema = z.object({
  title: z.string().min(3, "Title is required"),
  description: z.string().optional(),
  date: z.string().min(1, "Date & time is required"),
  location: z.string().min(2, "Location is required"),
  image: z.string().url().optional(),
  organizationId: z.string().min(1, "Pick an organization"),
  // default([]) makes input optional but output always an array
  artists: z
    .array(
      z.object({
        name: z.string().min(1, "Artist name required"),
        image: z.string().url().optional(),
      })
    )
    .default([]),
  ticketTypes: z.array(ticketTypeSchema).min(1, "Add at least 1 ticket type"),
});

type Schema = typeof FormSchema;
// RHF 3-generic pattern: <Input, Context, Output>
type FormInput = z.input<Schema>; // what the resolver accepts (artists may be undefined before default, numbers are numbers thanks to valueAsNumber)
type FormValues = z.output<Schema>; // what you get in onSubmit after parsing (artists is always [], numbers are numbers)

/* ------------------------------------------------------------------ */
/*  Tiny helpers                                                      */
/* ------------------------------------------------------------------ */
const CURRENCIES = ["USD", "EUR", "GEL", "GBP", "CAD"];

function formatDateLabel(input?: string) {
  if (!input) return "";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export default function NewEventPage() {
  const router = useRouter();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting, errors, submitCount },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      ticketTypes: [
        {
          slug: "general",
          label: "General Admission",
          price: 0,
          currency: "USD",
          quantity: 0,
        },
      ],
      artists: [],
    },
    mode: "onBlur",
  });

  /* ---------- Organisations (owned by user) ----------------------- */
  const [orgs, setOrgs] = useState<{ _id: string; name: string }[]>([]);
  useEffect(() => {
    fetch("/api/organizations")
      .then((r) => r.json())
      .then(setOrgs)
      .catch(() => setOrgs([]));
  }, []);

  /* ---------- Field arrays ---------------------------------------- */
  const {
    fields: artistFields,
    append: addArtist,
    remove: removeArtist,
  } = useFieldArray({ control, name: "artists" as const });

  const {
    fields: ticketFields,
    append: addTicketType,
    remove: removeTicketType,
  } = useFieldArray({ control, name: "ticketTypes" as const });

  /* ---------- Submit ---------------------------------------------- */
  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const { _id } = await res.json();
      router.push(`/events/${_id}`);
    } else {
      console.error(await res.json());
      alert("Failed to create event");
    }
  };

  /* ---------- Live preview ---------------------------------------- */
  const title = watch("title");
  const date = watch("date");
  const location = watch("location");
  const image = watch("image");
  const preview = useMemo(
    () => ({
      id: "preview",
      title: title || "Untitled Event",
      dateLabel: formatDateLabel(date) || "Date TBA",
      venue: location || "Location TBA",
      img: image || "/dummy/event-1.png",
      category: "Shows",
    }),
    [title, date, location, image]
  );

  /* ---------- Quick helpers --------------------------------------- */
  function seedStandardTiers() {
    if (ticketFields.length > 1) return;
    addTicketType({
      slug: "vip",
      label: "VIP",
      price: 0,
      currency: "USD",
      quantity: 0,
    });
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                          */
  /* ---------------------------------------------------------------- */
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <main className="relative bg-neutral-950 text-neutral-0">
      {/* Header / mesh */}
      <div className="relative isolate px-4 py-10 md:py-12 mt-6 lg:mt-8">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-80"
          style={{
            background:
              "radial-gradient(1000px 420px at 15% 10%, rgba(130,46,255,.25), transparent 60%), radial-gradient(800px 420px at 85% 0%, rgba(88,101,242,.20), transparent 60%)",
          }}
        />
        <div className="mx-auto max-w-[1232px]">
          <h1 className="text-2xl font-extrabold md:text-3xl">
            Create New Event
          </h1>
          <p className="mt-2 max-w-prose text-sm text-neutral-300">
            Add the essentials, upload a poster, set ticket tiers, and you’re
            ready to publish. You can edit everything later.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto grid max-w-[1232px] grid-cols-1 gap-6 px-4 py-8 md:grid-cols-12"
        noValidate
      >
        {/* ------------------------- Main form ----------------------- */}
        <div className="md:col-span-7 lg:col-span-8 space-y-6">
          {/* Error summary (after first submit) */}
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
            desc="This is what attendees will see first — keep it clear and catchy."
            icon={<Sparkles className="h-5 w-5 text-primary-300" />}
          >
            <div className="space-y-4">
              <LabelledInput
                label="Title"
                placeholder="Event title"
                {...register("title")}
                size="md"
                variant="full"
                className={errors.title && "border border-error-500"}
              />

              <div className="space-y-2">
                <label className="block text-sm font-medium">Description</label>
                <TextArea
                  {...register("description")}
                  placeholder="Tell people what makes this event special…"
                  size="md"
                  variant="full"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <LabelledInput
                  label="Date & Time"
                  type="datetime-local"
                  {...register("date")}
                  size="md"
                  variant="full"
                  className={errors.date && "border border-error-500"}
                />
                <LabelledInput
                  label="Location"
                  placeholder="Venue, City"
                  {...register("location")}
                  size="md"
                  variant="full"
                  className={errors.location && "border border-error-500"}
                />
              </div>
            </div>
          </Section>

          <Section
            title="Media"
            desc="A great poster dramatically improves conversions."
            icon={<ImagePlus className="h-5 w-5 text-primary-300" />}
          >
            <Controller
              control={control}
              name="image"
              render={({ field }) => (
                <ImageUpload
                  label="Event Poster"
                  value={field.value}
                  onChange={field.onChange}
                  publicId={`temp/events/${uuid()}`}
                />
              )}
            />
          </Section>

          <Section
            title="Organizer & Artists"
            desc="Link your organization and optionally showcase who’s performing."
            icon={<UsersIcon className="h-5 w-5 text-primary-300" />}
          >
            <div className="space-y-4">
              {/* Organization */}
              <div className="space-y-1">
                <label className="block text-sm font-medium">
                  Organization
                </label>
                <select
                  {...register("organizationId")}
                  className={clsx(
                    "w-full rounded-md border border-white/10 bg-neutral-950 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600",
                    errors.organizationId &&
                      "border-error-500 focus:ring-error-500/70"
                  )}
                >
                  <option value="">Select…</option>
                  {orgs.map((o) => (
                    <option key={o._id} value={o._id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Artists */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Artists Attending</h3>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => addArtist({ name: "" })}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add artist
                  </Button>
                </div>

                {artistFields.length === 0 && (
                  <p className="mb-3 text-sm text-neutral-400">
                    Optional — add performers to improve discovery.
                  </p>
                )}

                <div className="space-y-3">
                  {artistFields.map((field, idx) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-12 items-center gap-2 rounded-xl border border-white/10 bg-neutral-950/60 p-3"
                    >
                      <div className="col-span-6 md:col-span-7">
                        <LabelledInput
                          label="Stage name"
                          noLabel
                          placeholder="Artist"
                          {...register(`artists.${idx}.name` as const)}
                          size="md"
                          variant="transparent"
                        />
                      </div>
                      <div className="col-span-5 md:col-span-4">
                        <Controller
                          control={control}
                          name={`artists.${idx}.image`}
                          render={({ field }) => (
                            <ImageUpload
                              value={field.value}
                              onChange={field.onChange}
                              publicId={`temp/artists/${uuid()}`}
                            />
                          )}
                        />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label="Remove artist"
                          onClick={() => removeArtist(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          {/* Ticket Types */}
          <Section
            title="Ticket Types & Pricing"
            desc="Create tiers, set prices and quantities. You can add more later."
            icon={<CalendarClock className="h-5 w-5 text-primary-300" />}
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  addTicketType({
                    slug: `tier-${ticketFields.length + 1}`,
                    label: "",
                    price: 0,
                    currency: "USD",
                    quantity: 0,
                  })
                }
              >
                <Plus className="mr-1 h-4 w-4" />
                Add tier
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={seedStandardTiers}
              >
                Quick add: General + VIP
              </Button>
            </div>

            {ticketFields.map((field, idx) => (
              <div
                key={field.id}
                className="mb-4 rounded-2xl border border-white/10 bg-neutral-950/60 p-3"
              >
                <div className="grid grid-cols-12 items-center gap-2">
                  {/* Slug */}
                  <div className="col-span-12 sm:col-span-3">
                    <LabelledInput
                      noLabel
                      placeholder="slug (e.g., general, early-bird)"
                      {...register(`ticketTypes.${idx}.slug` as const)}
                      size="sm"
                      variant="transparent"
                      onBlur={(e) => {
                        const labelPath = `ticketTypes.${idx}.label` as const;
                        const current = (e.target as HTMLInputElement).value;
                        if (!watch(labelPath) && current) {
                          setValue(labelPath, current.replace(/[-_]/g, " "), {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                        }
                      }}
                    />
                  </div>

                  {/* Label */}
                  <div className="col-span-12 sm:col-span-4">
                    <LabelledInput
                      noLabel
                      placeholder="Label (e.g., General Admission)"
                      {...register(`ticketTypes.${idx}.label` as const)}
                      size="sm"
                      variant="transparent"
                    />
                  </div>

                  {/* Price */}
                  <div className="col-span-6 sm:col-span-2">
                    <LabelledInput
                      noLabel
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      placeholder="Price"
                      {...register(`ticketTypes.${idx}.price` as const, {
                        valueAsNumber: true,
                      })}
                      size="sm"
                      variant="transparent"
                    />
                  </div>

                  {/* Currency (select) */}
                  <div className="col-span-6 sm:col-span-1">
                    <Controller
                      control={control}
                      name={`ticketTypes.${idx}.currency`}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="w-full rounded-md border border-white/10 bg-neutral-950 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                        >
                          {CURRENCIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      )}
                    />
                  </div>

                  {/* Quantity */}
                  <div className="col-span-6 sm:col-span-1">
                    <LabelledInput
                      noLabel
                      type="number"
                      inputMode="numeric"
                      step="1"
                      min="0"
                      placeholder="Qty"
                      {...register(`ticketTypes.${idx}.quantity` as const, {
                        valueAsNumber: true,
                      })}
                      size="sm"
                      variant="transparent"
                    />
                  </div>

                  {/* Remove */}
                  <div className="col-span-6 sm:col-span-1 flex justify-end">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label="Remove tier"
                      onClick={() => removeTicketType(idx)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {errors.ticketTypes && (
              <p className="text-sm text-error-300">
                {errors.ticketTypes?.message as string}
              </p>
            )}
          </Section>

          {/* Submit */}
          <div className="flex gap-3">
            <Button type="submit" variant="primary" loading={isSubmitting}>
              Create Event
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/dashboard/events")}
            >
              Cancel
            </Button>
          </div>
        </div>

        {/* ------------------------- Sidebar -------------------------- */}
        <aside className="md:col-span-5 lg:col-span-4">
          <div className="md:sticky md:top-20 space-y-6">
            {/* Live preview card */}
            <div className="rounded-2xl border border-white/10 bg-neutral-950/70 p-5">
              <h3 className="mb-3 text-sm font-semibold">Live Preview</h3>
              <EventCard {...preview} clickable={false} />
              <div className="mt-3 flex items-center gap-2 text-xs text-neutral-300">
                <CalendarClock className="h-4 w-4" />
                {preview.dateLabel}
                <span className="opacity-40">•</span>
                <MapPin className="h-4 w-4" />
                {preview.venue}
              </div>
            </div>

            {/* Tips */}
            <div className="rounded-2xl border border-white/10 bg-neutral-950/70 p-5">
              <h3 className="mb-2 text-sm font-semibold">
                Tips for higher sales
              </h3>
              <ul className="list-inside list-disc space-y-1 text-sm text-neutral-300">
                <li>Use a high-contrast poster (1200×1600+).</li>
                <li>Keep the title concise (artist · venue · date).</li>
                <li>Set limited VIP quantities to create urgency.</li>
              </ul>
            </div>
          </div>
        </aside>
      </form>
    </main>
  );
}
