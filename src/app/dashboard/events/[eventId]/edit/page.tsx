"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  useForm,
  useFieldArray,
  type SubmitHandler,
  Controller,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { fetchEventById, type EventWithMeta } from "@/lib/api/events";

/* ----------------------------- Types ------------------------------ */

type OrgMember = {
  _id: string;
  name: string;
  email: string;
};

type EventEditMeta = EventWithMeta & {
  durationMinutes?: number | null;
  categories?: string[];
  promoters?: string[];
  message?: string;
  artists?: Array<{
    _id?: string;
    stageName?: string;
    avatar?: string;
  }>;
};

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown error";
  }
}

/* ----------------------------- Schema ----------------------------- */
/** Duration "HH:MM" 00:15 - 23:59 */
const hhmm = z
  .string()
  .regex(/^([0-1]\d|2[0-3]):([0-5]\d)$/, "Use HH:MM (e.g. 03:45)");

const FormSchema = z.object({
  title: z.string().min(3, "Event name is required"),
  description: z.string().optional(),

  /** Date + Start time + Duration */
  dateOnly: z.string().min(1, "Date is required"),
  startTime: z.string().regex(/^([0-1]\d|2[0-3]):([0-5]\d)$/, "HH:MM"),
  duration: hhmm,

  /** Derived ISO sent to API (hidden field) */
  date: z.string().optional(),

  /** Meta */
  minAge: z.coerce.number().int().min(0).max(99).optional(),
  location: z.string().min(2, "Location is required"),
  image: z.string().url().optional(),

  /** Org comes from URL */
  organizationId: z.string().min(1, "Organization is required"),

  /** Categories (chips) */
  categories: z.array(z.string()).default([]),

  /** Promoters + message */
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

  /** Status (used only for draft action) */
  status: z.enum(["published", "draft"]).default("published"),
});

type Schema = typeof FormSchema;
type FormInput = z.input<Schema>;
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

function hhmmFromMinutes(minutes?: number | null) {
  if (!minutes || minutes <= 0) return "01:00";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}`;
}

function Section({
  title,
  icon,
  desc,
  children,
}: {
  title: string;
  icon?: ReactNode;
  desc?: string;
  children: ReactNode;
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
export default function EditEventPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { id: orgIdFromRoute, eventId } = useParams() as {
    id?: string;
    eventId?: string;
  };

  const [saved, setSaved] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /* ---------- Fetch existing event -------------------------- */
  const { data: event, isLoading } = useQuery<EventEditMeta>({
    queryKey: ["event", eventId],
    queryFn: () => fetchEventById(eventId!),
    enabled: !!eventId,
  });

  /* ---------- Form setup ------------------------------------- */
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { isSubmitting, errors, submitCount },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      categories: [],
      promoters: [],
      artists: [],
      status: "published",
      organizationId: orgIdFromRoute ?? "",
    },
    mode: "onBlur",
  });

  /* ---------- Pre-fill from existing event ------------------- */
  useEffect(() => {
    if (!event) return;

    const d = event.date ? new Date(event.date) : null;
    const dateOnly = d ? d.toISOString().slice(0, 10) : "";
    const startTime = d ? d.toISOString().slice(11, 16) : "";
    const duration = hhmmFromMinutes(event.durationMinutes ?? 60);

    reset({
      title: event.title ?? "",
      description: event.description ?? "",
      dateOnly,
      startTime,
      duration,
      date: event.date ?? "",
      minAge: event.minAge ?? undefined,
      location: event.location ?? "",
      image: event.image ?? "",
      organizationId: orgIdFromRoute ?? "",
      categories: event.categories ?? [],
      promoters: event.promoters ?? [],
      message: event.message ?? "",
      artists:
        event.artists?.map((a) => ({
          name: a.stageName ?? "",
          image: a.avatar ?? "",
        })) ?? [],
      status: event.status ?? "published",
    });
  }, [event, orgIdFromRoute, reset]);

  /* ---------- Lock organizationId from the URL --------------- */
  useEffect(() => {
    if (orgIdFromRoute) {
      setValue("organizationId", orgIdFromRoute, { shouldDirty: false });
    }
  }, [orgIdFromRoute, setValue]);

  /* ---------- Load organization members for promoters -------- */
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  useEffect(() => {
    if (!orgIdFromRoute) return;

    let alive = true;
    setMembersLoading(true);

    fetch(`/api/organizations/${orgIdFromRoute}/members`)
      .then((res) =>
        res.ok ? res.json() : Promise.reject(new Error("Failed"))
      )
      .then((data: unknown) => {
        if (!alive) return;
        if (Array.isArray(data)) {
          setMembers(data as OrgMember[]);
        } else {
          setMembers([]);
        }
      })
      .catch(() => {
        if (!alive) return;
        setMembers([]);
      })
      .finally(() => {
        if (!alive) return;
        setMembersLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [orgIdFromRoute]);

  /* ---------- Field arrays – artists ------------------------- */
  const {
    fields: artistFields,
    append: addArtist,
    remove: removeArtist,
  } = useFieldArray<FormInput, "artists">({ control, name: "artists" });

  /* ---------- Derived ISO for submit -------------------------- */
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

  /* ---------- Submit handlers -------------------------------- */

  type SubmitMode = "default" | "draft";

  const submitImpl =
    (mode: SubmitMode): SubmitHandler<FormValues> =>
    async (data) => {
      if (!eventId) return;

      const payload: Record<string, unknown> = {
        title: data.title,
        description: data.description,
        location: data.location,
        minAge: data.minAge,
        date: startISO || undefined,
        image: data.image,
        categories: data.categories,
        promoters: data.promoters,
        message: data.message,
        // duration & artists could be wired up in the PATCH route as needed
      };

      if (mode === "draft") {
        payload.status = "draft";
      }

      // strip undefined & empty strings
      for (const key of Object.keys(payload)) {
        const v = payload[key];
        if (
          v === undefined ||
          v === "" ||
          (Array.isArray(v) && v.length === 0)
        ) {
          delete payload[key];
        }
      }

      try {
        setSubmitError(null);
        setSaved(false);

        const res = await fetch(`/api/events/${eventId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Failed to update event");
        }

        await qc.invalidateQueries({ queryKey: ["event", eventId] });
        setSaved(true);
      } catch (err: unknown) {
        setSubmitError(getErrorMessage(err) || "Failed to update event");
      }
    };

  /* ---------- Live preview ----------------------------------- */
  const title = watch("title") ?? "";
  const location = watch("location") ?? "";
  const image = watch("image") ?? "";

  const preview = useMemo(
    () => ({
      id: "preview",
      title: title || "Untitled Event",
      dateLabel: formatDateLabel(startISO || event?.date),
      venue: location || event?.location || "Location TBA",
      img: image || event?.image || "/dummy/event-1.png",
      category: "Shows",
    }),
    [title, startISO, location, image, event]
  );

  /* ---------- Chips: categories & promoters ------------------ */
  const CATS = ["Shows", "Party", "Comedy", "Social", "Listing Party"] as const;

  const categories = watch("categories") ?? [];
  const toggleCat = (c: string) => {
    const set = new Set(categories);
    set.has(c) ? set.delete(c) : set.add(c);
    setValue("categories", Array.from(set), { shouldDirty: true });
  };

  const promoters = watch("promoters") ?? [];
  const togglePromoter = (email: string) => {
    const set = new Set(promoters);
    if (set.has(email)) set.delete(email);
    else set.add(email);
    setValue("promoters", Array.from(set), { shouldDirty: true });
  };

  const hasErrors = Object.keys(errors).length > 0;

  /* ---------------------------------------------------------------- */

  return (
    <main className="relative bg-neutral-950 text-neutral-0">
      {/* Header / mesh */}
      <div className="relative isolate px-4 pt-8 md:py-10 mt-2">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-80"
          style={{
            background:
              "radial-gradient(1000px 420px at 15% 10%, rgba(130,46,255,.25), transparent 60%), radial-gradient(800px 420px at 85% 0%, rgba(88,101,242,.20), transparent 60%)",
          }}
        />
        <div className="mx-auto max-w-[1232px] flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold md:text-3xl">Edit Event</h1>
            <p className="mt-2 max-w-prose text-sm text-neutral-300">
              Update your event details. Changes will reflect on the public
              event page and dashboards.
            </p>
          </div>
          {saved && (
            <span className="mt-1 rounded-full bg-success-900/40 px-3 py-1 text-[11px] font-medium text-success-300">
              Changes saved
            </span>
          )}
        </div>
      </div>

      <form
        onSubmit={handleSubmit(submitImpl("default"))}
        className="mx-auto grid max-w-[1232px] grid-cols-1 gap-6 px-4 pt-2 pb-14 md:grid-cols-12"
        noValidate
      >
        {/* hidden org id bound to URL */}
        <input type="hidden" {...register("organizationId")} />

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

          {submitError && (
            <div className="rounded-2xl border border-error-500/40 bg-error-500/10 p-3 text-xs text-error-200">
              {submitError}
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
                placeholder={isLoading ? "Loading…" : "Enter name"}
                {...register("title")}
                size="md"
                variant="full"
                className={errors.title ? "border border-error-500" : undefined}
              />

              {/* Date + Start + Duration row */}
              <div className="grid gap-4 md:grid-cols-3">
                <LabelledInput
                  label="Date"
                  type="date"
                  {...register("dateOnly")}
                  size="md"
                  variant="full"
                  className={
                    errors.dateOnly ? "border border-error-500" : undefined
                  }
                />
                <LabelledInput
                  label="Start Time"
                  type="time"
                  {...register("startTime")}
                  size="md"
                  variant="full"
                  className={
                    errors.startTime ? "border border-error-500" : undefined
                  }
                  endAdornment={<Clock className="h-4 w-4 opacity-60" />}
                />
                <LabelledInput
                  label="Duration"
                  placeholder="03:45"
                  {...register("duration")}
                  size="md"
                  variant="full"
                  className={
                    errors.duration ? "border border-error-500" : undefined
                  }
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
                    : event?.date
                      ? new Date(event.date).toLocaleDateString(undefined, {
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
                    : event?.date
                      ? new Date(event.date).toLocaleTimeString(undefined, {
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
                    const active = categories.includes(c);
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
                placeholder={isLoading ? "Loading…" : "Choose Location"}
                {...register("location")}
                size="md"
                variant="full"
                className={
                  errors.location ? "border border-error-500" : undefined
                }
              />
            </div>
          </Section>

          <Section
            title="Organizer & Artists"
            desc="Event is tied to the organization you’re currently managing. You can optionally showcase who’s performing."
            icon={<UsersIcon className="h-5 w-5 text-primary-300" />}
          >
            <div className="space-y-4">
              {/* Organization info (no chooser) */}
              <div className="space-y-1">
                <label className="block text-sm font-medium">
                  Organization
                </label>
                <p className="text-sm text-neutral-300">
                  This event is attached to the currently open organization.
                </p>
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
                        <div>
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

          {/* Promoters + Message */}
          <Section
            title="Promoters & Message"
            desc="Optionally select organization members who will help promote this event and add a note."
            icon={<MailPlus className="h-5 w-5 text-primary-300" />}
          >
            {membersLoading && (
              <div className="mb-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-neutral-300">
                Loading organization members…
              </div>
            )}

            {/* Promoters – only show if org has members */}
            {members.length > 0 && (
              <div className="space-y-2 mb-6">
                <label className="block text-sm font-medium">Promoters</label>
                <p className="text-xs text-neutral-400">
                  Select members who will help promote this event.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {members.map((m) => {
                    const selected = promoters.includes(m.email);
                    return (
                      <button
                        key={m._id}
                        type="button"
                        onClick={() => togglePromoter(m.email)}
                        className={clsx(
                          "rounded-full border px-3 py-1.5 text-xs md:text-sm transition-colors",
                          selected
                            ? "border-white/40 bg-white/10 text-neutral-0"
                            : "border-white/10 text-neutral-300 hover:text-neutral-0"
                        )}
                      >
                        {m.name || m.email}
                      </button>
                    );
                  })}
                </div>
                {promoters.length > 0 && (
                  <p className="text-xs text-neutral-400">
                    {promoters.length} promoter{promoters.length > 1 ? "s" : ""}{" "}
                    selected.
                  </p>
                )}
              </div>
            )}

            {/* Message */}
            <div className="mt-2">
              <label className="block text-sm font-medium mb-2">Message</label>
              <TextArea
                {...register("message")}
                placeholder="Enter your message here..."
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
                  label="Update Event Poster"
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
              loading={isSubmitting}
            >
              Save as Draft
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              Save changes
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                router.push(
                  `/dashboard/organizations/${orgIdFromRoute}/events/${eventId}/summary`
                )
              }
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
