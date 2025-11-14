/* ------------------------------------------------------------------ */
/*  Create Event – Dashboard (moved from /profile)                    */
/*  - Matches figma: date + start time + duration + categories        */
/*  - Minimum age, location, co-hosts, promo team, promoters, msg     */
/*  - Improved Artists UI                                             */
/*  - Poster uploader                                                 */
/*  - Send to Drafts (status='draft')                                 */
/* ------------------------------------------------------------------ */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  Clock,
  MailPlus,
} from "lucide-react";

import ImageUpload from "@/components/ui/ImageUpload";
import { Button } from "@/components/ui/Button";
import LabelledInput from "@/components/ui/LabelledInput";
import { TextArea } from "@/components/ui/TextArea";
import { EventCard } from "@/components/ui/EventCard";

/* ----------------------------- Schema ----------------------------- */
/** Duration "HH:MM" 00:15 - 23:59 */
const hhmm = z
  .string()
  .regex(/^([0-1]\d|2[0-3]):([0-5]\d)$/, "Use HH:MM (e.g. 03:45)");

const FormSchema = z.object({
  title: z.string().min(3, "Event name is required"),
  description: z.string().optional(),

  /** Date + Start time + Duration (figma) */
  dateOnly: z.string().min(1, "Date is required"),
  startTime: z.string().regex(/^([0-1]\d|2[0-3]):([0-5]\d)$/, "HH:MM"),
  duration: hhmm, // "HH:MM"

  /** Derived ISO sent to API (hidden field) */
  date: z.string().optional(),

  /** Meta */
  minAge: z.coerce.number().int().min(0).max(99).optional(),
  location: z.string().min(2, "Location is required"),
  image: z.string().url().optional(),
  organizationId: z.string().min(1, "Pick an organization"),

  /** Categories (chips) */
  categories: z.array(z.string()).default([]),

  /** People & comms */
  coHosts: z.array(z.string().email("Invalid email")).default([]),
  promotionalTeamEmails: z.array(z.string().email()).default([]),
  promoters: z.array(z.string().email()).default([]),
  message: z.string().optional(),

  /** Artists block */
  artists: z
    .array(
      z.object({
        name: z.string().min(1, "Artist name required"),
        image: z.string().url().optional(),
      })
    )
    .default([]),

  /** Status */
  status: z.enum(["published", "draft"]).default("published"),
});

type Schema = typeof FormSchema;
/** Values BEFORE resolver transform (z.input). Optional arrays here => can be undefined. */
type FormInput = z.input<Schema>;
/** Values AFTER resolver transform (z.output). Arrays are concrete here. */
type FormValues = z.output<Schema>;

/* ----------------------------- Helpers ---------------------------- */
function isoFromDateAndTime(dateOnly: string, time: string) {
  if (!dateOnly || !time) return "";
  const [h, m] = time.split(":").map((n) => parseInt(n, 10));
  const d = new Date(dateOnly);
  if (Number.isNaN(d.getTime())) return "";
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

function endTimeFromStartAndDuration(startISO: string, hhmmDur: string) {
  if (!startISO || !hhmmDur) return "";
  const [h, m] = hhmmDur.split(":").map((n) => parseInt(n, 10));
  const d = new Date(startISO);
  d.setMinutes(d.getMinutes() + h * 60 + m);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

/* ------------------------------ Page ------------------------------ */
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
      categories: [],
      coHosts: [],
      promotionalTeamEmails: [],
      promoters: [],
      artists: [],
      status: "published",
    },
    mode: "onBlur",
  });

  /** Safe watcher with a default for optional array fields coming from z.input */
  const watchArr = <K extends keyof FormInput>(
    key: K,
    fallback: NonNullable<FormInput[K]>
  ) => (watch(key) ?? fallback) as NonNullable<FormInput[K]>;

  /* ---------- Organisations (owned by user) ----------------------- */
  const [orgs, setOrgs] = useState<{ _id: string; name: string }[]>([]);
  useEffect(() => {
    fetch("/api/organizations")
      .then((r) => r.json())
      .then(setOrgs)
      .catch(() => setOrgs([]));
  }, []);

  /* ---------- Field arrays (typed) -------------------------------- */
  const {
    fields: artistFields,
    append: addArtist,
    remove: removeArtist,
  } = useFieldArray<FormInput, "artists">({ control, name: "artists" });

  const {
    fields: coHostFields,
    append: addCoHost,
    remove: removeCoHost,
  } = useFieldArray<FormInput, "coHosts">({ control, name: "coHosts" });

  const {
    fields: teamFields,
    append: addTeamEmail,
    remove: removeTeamEmail,
  } = useFieldArray<FormInput, "promotionalTeamEmails">({
    control,
    name: "promotionalTeamEmails",
  });

  const {
    fields: promoterFields,
    append: addPromoter,
    remove: removePromoter,
  } = useFieldArray<FormInput, "promoters">({ control, name: "promoters" });

  /* ---------- Derived ISO for submit ------------------------------ */
  const dateOnly = watch("dateOnly") ?? "";
  const startTime = watch("startTime") ?? "";
  const startISO = useMemo(
    () => isoFromDateAndTime(dateOnly, startTime),
    [dateOnly, startTime]
  );
  useEffect(() => {
    setValue("date", startISO, { shouldDirty: true });
  }, [startISO, setValue]);

  const duration = watch("duration") ?? "";

  /* ---------- Submit ---------------------------------------------- */
  const submitImpl =
    (status: "published" | "draft"): SubmitHandler<FormValues> =>
    async (data) => {
      const payload: FormValues = {
        ...data,
        status,
        date: startISO,
      };

      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        if (status === "draft") {
          router.push("/dashboard/events?tab=drafts");
        } else {
          const { _id } = await res.json();
          router.push(`/events/${_id}`);
        }
      } else {
        console.error(await res.json());
        alert("Failed to create event");
      }
    };

  /* ---------- Live preview ---------------------------------------- */
  const title = watch("title") ?? "";
  const location = watch("location") ?? "";
  const image = watch("image") ?? "";
  const preview = useMemo(
    () => ({
      id: "preview",
      title: title || "Untitled Event",
      dateLabel: formatDateLabel(startISO) || "Date TBA",
      venue: location || "Location TBA",
      img: image || "/dummy/event-1.png",
      category: "Shows",
    }),
    [title, startISO, location, image]
  );

  /* ---------- Categories chips ------------------------------------ */
  const CATS = ["Shows", "Party", "Comedy", "Social", "Listing Party"] as const;
  const categories = watchArr("categories", [] as unknown as string[]);
  const toggleCat = (c: string) => {
    const set = new Set(categories as string[]);
    set.has(c) ? set.delete(c) : set.add(c);
    setValue("categories", Array.from(set), { shouldDirty: true });
  };

  /* ---------- Add-by-email helpers (separate refs) ---------------- */
  const coHostRef = useRef<HTMLInputElement | null>(null);
  const teamRef = useRef<HTMLInputElement | null>(null);
  const promoterRef = useRef<HTMLInputElement | null>(null);

  const addEmail = (kind: "co" | "team" | "promoter") => {
    const map = {
      co: coHostRef,
      team: teamRef,
      promoter: promoterRef,
    } as const;
    const ref = map[kind];
    const val = ref.current?.value?.trim() || "";
    if (!val) return;
    if (kind === "co") addCoHost(val);
    if (kind === "team") addTeamEmail(val);
    if (kind === "promoter") addPromoter(val);
    if (ref.current) ref.current.value = "";
  };

  /* ---------------------------------------------------------------- */
  const hasErrors = Object.keys(errors).length > 0;

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
            Create New Event
          </h1>
          <p className="mt-2 max-w-prose text-sm text-neutral-300">
            Add the essentials, upload a poster, choose organization and you’re
            ready to publish. You can edit everything later.
          </p>
        </div>
      </div>
      <form
        onSubmit={handleSubmit(submitImpl("published"))}
        className="grid grid-cols-1 gap-6 pt-6 pb-14 md:grid-cols-12"
        noValidate
      >
        {/* ------------------------- Main form ----------------------- */}
        <div className="md:col-span-7 lg:col-span-8 space-y-6">
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
                label="Event Name"
                placeholder="Enter name"
                {...register("title")}
                size="md"
                variant="full"
                className={errors.title && "border border-error-500"}
              />

              {/* Date + Start + Duration row */}
              <div className="grid gap-4 md:grid-cols-3">
                <LabelledInput
                  label="Date"
                  type="date"
                  {...register("dateOnly")}
                  size="md"
                  variant="full"
                  className={errors.dateOnly && "border border-error-500"}
                />
                <LabelledInput
                  label="Start Time"
                  type="time"
                  {...register("startTime")}
                  size="md"
                  variant="full"
                  className={errors.startTime && "border border-error-500"}
                  endAdornment={<Clock className="h-4 w-4 opacity-60" />}
                />
                <LabelledInput
                  label="Duration"
                  placeholder="03:45"
                  {...register("duration")}
                  size="md"
                  variant="full"
                  className={errors.duration && "border border-error-500"}
                />
              </div>

              {/* Microcopy summary */}
              <p className="text-sm text-neutral-300">
                This event will take place on{" "}
                <span className="font-medium">
                  {startISO
                    ? new Date(startISO).toLocaleDateString(undefined, {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—"}
                </span>{" "}
                from{" "}
                <span className="font-medium">
                  {startISO
                    ? new Date(startISO).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "--:--"}
                </span>{" "}
                until{" "}
                <span className="font-medium">
                  {startISO && duration
                    ? endTimeFromStartAndDuration(startISO, duration)
                    : "--:--"}
                </span>
              </p>

              {/* Categories */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Choose Categories
                </label>
                <div className="flex flex-wrap gap-3">
                  {CATS.map((c) => {
                    const active = (categories as string[]).includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleCat(c)}
                        className={clsx(
                          "rounded-full border px-4 py-2 text-sm transition-colors",
                          active
                            ? "border-white/20 bg-white/10 text-neutral-0"
                            : "border-white/10 text-neutral-300 hover:text-neutral-0"
                        )}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Minimum age */}
              <LabelledInput
                label="Minimum Age"
                placeholder="Enter Minimum Age"
                type="number"
                inputMode="numeric"
                min="0"
                {...register("minAge", { valueAsNumber: true })}
                size="md"
                variant="full"
              />

              {/* Location */}
              <LabelledInput
                label="Location"
                placeholder="Choose Location"
                {...register("location")}
                size="md"
                variant="full"
                className={errors.location && "border border-error-500"}
              />
            </div>
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

                <div className="space-y-3 w-full">
                  {artistFields.map((field, idx) => (
                    <div
                      key={field.id}
                      className="flex items-end gap-3 rounded-lg border border-white/10 bg-neutral-950/60 p-4 w-full relative"
                    >
                      <div className="flex flex-col gap-2 w-full">
                        <div className="max-w-sm">
                          <Controller
                            control={control}
                            name={`artists.${idx}.image`}
                            render={({ field }) => (
                              <ImageUpload
                                value={field.value}
                                onChange={field.onChange}
                                publicId={`temp/artists/${uuid()}`}
                                sizing="avatar"
                              />
                            )}
                          />
                        </div>
                        <div className=" ">
                          <LabelledInput
                            noLabel
                            placeholder="Artist"
                            {...register(`artists.${idx}.name` as const)}
                            size="md"
                            variant="transparent"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end absolute top-2 right-2">
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
                  {artistFields.length === 0 && (
                    <p className="text-sm text-neutral-400">
                      Optional — add performers to improve discovery.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Section>

          {/* Communication & roles */}
          <Section
            title="Co-hosts & Promotion"
            desc="Invite collaborators and your promotional team by email."
            icon={<MailPlus className="h-5 w-5 text-primary-300" />}
          >
            {/* Add Co-Host */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">Add Co-Host</label>
              <div className="flex gap-3">
                <input
                  ref={coHostRef}
                  type="email"
                  placeholder="Enter Email"
                  className="w-full rounded-md border border-white/10 bg-neutral-950 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
                <Button type="button" onClick={() => addEmail("co")}>
                  + Add
                </Button>
              </div>

              {/* chips */}
              <div className="mt-2 flex flex-wrap gap-2">
                {coHostFields.map((f, i) => (
                  <span
                    key={f.id}
                    className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm"
                  >
                    {watch(`coHosts.${i}`) ?? ""}
                    <button
                      type="button"
                      onClick={() => removeCoHost(i)}
                      className="opacity-70 hover:opacity-100"
                      aria-label="Remove"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              {coHostFields.length > 0 && (
                <p className="text-sm text-neutral-400">
                  {(watch("coHosts") ?? []).join(", ")} - will be your
                  co-host(s)
                </p>
              )}
            </div>

            {/* Add Promotional Team */}
            <div className="mt-6 space-y-2">
              <label className="block text-sm font-medium">
                Add Promotional Team
              </label>
              <div className="flex gap-3">
                <input
                  ref={teamRef}
                  type="email"
                  placeholder="Enter Email"
                  className="w-full rounded-md border border-white/10 bg-neutral-950 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addEmail("team");
                    }
                  }}
                />
                <Button type="button" onClick={() => addEmail("team")}>
                  + Add
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {teamFields.map((f, i) => (
                  <span
                    key={f.id}
                    className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm"
                  >
                    {watch(`promotionalTeamEmails.${i}`) ?? ""}
                    <button
                      type="button"
                      onClick={() => removeTeamEmail(i)}
                      className="opacity-70 hover:opacity-100"
                      aria-label="Remove"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Individual promoters */}
            <div className="mt-6 space-y-2">
              <label className="block text-sm font-medium">
                Add Individual Promoters
              </label>
              <div className="flex gap-3">
                <input
                  ref={promoterRef}
                  type="email"
                  placeholder="Enter Email"
                  className="w-full rounded-md border border-white/10 bg-neutral-950 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addEmail("promoter");
                    }
                  }}
                />
                <Button type="button" onClick={() => addEmail("promoter")}>
                  + Add
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {promoterFields.map((f, i) => (
                  <span
                    key={f.id}
                    className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm"
                  >
                    {watch(`promoters.${i}`) ?? ""}
                    <button
                      type="button"
                      onClick={() => removePromoter(i)}
                      className="opacity-70 hover:opacity-100"
                      aria-label="Remove"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Message */}
            <div className="mt-6">
              <label className="block text-sm font-medium mb-2">Message</label>
              <TextArea
                {...register("message")}
                placeholder="Enter your message here.."
                size="md"
                variant="full"
              />
            </div>
          </Section>

          {/* Media / Poster */}
          <Section
            title="Event Poster"
            desc="Upload a featured image/poster. JPEG/PNG/MP4 up to 50MB."
            icon={<ImagePlus className="h-5 w-5 text-primary-300" />}
          >
            <Controller
              control={control}
              name="image"
              render={({ field }) => (
                <ImageUpload
                  label="Add Event Poster"
                  value={field.value}
                  onChange={field.onChange}
                  publicId={`temp/events/${uuid()}`}
                />
              )}
            />
          </Section>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handleSubmit(submitImpl("draft"))}
            >
              Send to Drafts
            </Button>
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
                <li>Share early with your promoters and team.</li>
              </ul>
            </div>
          </div>
        </aside>
      </form>
    </main>
  );
}
