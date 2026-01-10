// src/app/dashboard/organizations/[id]/event/new/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  useForm,
  useFieldArray,
  SubmitHandler,
  Controller,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { useRouter, useParams } from "next/navigation";
import clsx from "clsx";
import {
  MapPin,
  ImagePlus,
  Users as UsersIcon,
  Plus,
  Trash2,
  Sparkles,
  Info,
  FileText,
} from "lucide-react";

import ImageUpload from "@/components/ui/ImageUpload";
import { Button } from "@/components/ui/Button";
import LabelledInput from "@/components/ui/LabelledInput";
import { TextArea } from "@/components/ui/TextArea";
import { EventCard } from "@/components/ui/EventCard";
import DateRangePicker, {
  type DateRangeValue,
} from "@/components/ui/DateRangePicker";
import TimePicker from "@/components/ui/TimePicker";
import PlacesAddressInput from "@/components/ui/PlacesAddressInput";

/* ----------------------------- Types ------------------------------ */

type OrgMember = {
  _id: string;
  name: string;
  email: string;
};

type OrgInfo = {
  _id: string;
  name?: string;
  title?: string;
  organizationName?: string;
  slug?: string;
  image?: string;
  logo?: string;
};

type LocationMode = "specific" | "city" | "tbd" | "tba" | "secret";

/* ----------------------------- Schema ----------------------------- */

const timeHHMM = z
  .string()
  .regex(/^([0-1]\d|2[0-3]):([0-5]\d)$/, "Use HH:MM (e.g. 18:10)");

const FormSchema = z
  .object({
    title: z.string().min(3, "Event name is required"),
    description: z.string().optional(),

    /** Multi-day Date Range + Start/End time */
    dateRange: z
      .object({
        start: z.date().nullable(),
        end: z.date().nullable(),
      })
      .refine((v) => !!v.start, {
        message: "Date is required",
        path: ["start"],
      }),

    startTime: timeHHMM,
    endTime: timeHHMM,

    /** Derived ISO (sent to API) */
    date: z.string().optional(),
    endDate: z.string().optional(),

    /** Meta */
    minAge: z.coerce.number().int().min(0).max(99).optional(),
    image: z.string().url().optional(),

    /** Location (new UI fields) */
    locationMode: z
      .enum(["specific", "city", "tbd", "tba", "secret"])
      .default("specific"),
    locationCity: z.string().trim().optional(),
    locationAddress: z.string().trim().optional(),
    locationName: z.string().trim().optional(),

    /** Org is taken from URL */
    organizationId: z.string().min(1, "Organization is required"),

    /** Categories (chips) */
    categories: z.array(z.string()).default([]),

    /** People & comms */
    promoters: z.array(z.string().email()).default([]),
    message: z.string().optional(),

    /** Artists */
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
  })
  .superRefine((v, ctx) => {
    const cityNeeded =
      v.locationMode === "specific" || v.locationMode === "city";
    const addressNeeded = v.locationMode === "specific";

    if (cityNeeded) {
      if (!v.locationCity || v.locationCity.trim().length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["locationCity"],
          message: "City is required",
        });
      }
    }

    if (addressNeeded) {
      if (!v.locationAddress || v.locationAddress.trim().length < 4) {
        ctx.addIssue({
          code: "custom",
          path: ["locationAddress"],
          message: "Address is required",
        });
      }
    }
  });

type Schema = typeof FormSchema;
type FormInput = z.input<Schema>;
type FormValues = z.output<Schema>;

/* ----------------------------- Helpers ---------------------------- */

function clampToDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isoFromDayAndTime(day: Date, timeHHMM: string) {
  const [h, m] = timeHHMM.split(":").map((n) => parseInt(n, 10));
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function fmtDateShort(d: Date) {
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtDateRangeShort(a: Date, b: Date) {
  const a0 = clampToDay(a);
  const b0 = clampToDay(b);
  const same = a0.getTime() === b0.getTime();
  if (same) return fmtDateShort(a0);

  return `${fmtDateShort(a0)} – ${fmtDateShort(b0)}`;
}

function fmtTimeFromISO(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--";
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDateTimeLabel(startISO: string, endISO?: string) {
  if (!startISO) return "";
  const a = new Date(startISO);
  if (Number.isNaN(a.getTime())) return "";

  if (!endISO) {
    return `${fmtDateShort(a)} • ${fmtTimeFromISO(startISO)}`;
  }

  const b = new Date(endISO);
  if (Number.isNaN(b.getTime())) {
    return `${fmtDateShort(a)} • ${fmtTimeFromISO(startISO)}`;
  }

  const range = fmtDateRangeShort(a, b);
  return `${range} • ${fmtTimeFromISO(startISO)}`;
}

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

function buildLocationString(v: FormValues) {
  switch (v.locationMode) {
    case "tbd":
      return "TBD";
    case "tba":
      return "TBA";
    case "secret":
      return "It’s a secret";
    case "city":
      return (v.locationCity || "").trim();
    case "specific": {
      const name = (v.locationName || "").trim();
      const addr = (v.locationAddress || "").trim();
      const city = (v.locationCity || "").trim();

      // Clean, readable, and still one string for the current DB model/API.
      // Example: "Madison Square Garden · 4 Pennsylvania Plaza, New York, NY 10001, USA"
      // If you want city appended even when Google already includes it, uncomment the city logic.
      const parts = [name, addr].filter(Boolean);
      let out = parts.join(" · ");

      // If address is missing (shouldn’t pass validation), fall back to city.
      if (!out) out = city;

      return out;
    }
    default:
      return "";
  }
}

/* ------------------------------ Page ------------------------------ */
export default function NewEventPage() {
  const router = useRouter();
  const params = useParams() as { id?: string };
  const orgIdFromRoute = params?.id ?? "";

  const errorRing =
    "rounded-lg ring-1 ring-inset ring-error-500 border-transparent";

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
      dateRange: { start: null, end: null },
      startTime: "18:00",
      endTime: "21:00",
      categories: [],
      promoters: [],
      artists: [],
      status: "published",
      locationMode: "specific",
      locationCity: "",
      locationAddress: "",
      locationName: "",
    },
    mode: "onBlur",
  });

  /** Safe watcher with a default for optional array fields coming from z.input */
  const watchArr = <K extends keyof FormInput>(
    key: K,
    fallback: NonNullable<FormInput[K]>
  ) => (watch(key) ?? fallback) as NonNullable<FormInput[K]>;

  /* ---------- Lock organizationId from the URL -------------------- */
  useEffect(() => {
    if (orgIdFromRoute) {
      setValue("organizationId", orgIdFromRoute, { shouldDirty: true });
    }
  }, [orgIdFromRoute, setValue]);

  /* ---------- Load organization info (for selected org display) ---- */
  const [orgInfo, setOrgInfo] = useState<OrgInfo | null>(null);
  const [orgLoading, setOrgLoading] = useState(false);

  useEffect(() => {
    if (!orgIdFromRoute) return;

    const ac = new AbortController();
    setOrgLoading(true);

    fetch(`/api/organizations/${orgIdFromRoute}`, { signal: ac.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: OrgInfo) => {
        setOrgInfo(data && typeof data === "object" ? data : null);
      })
      .catch(() => setOrgInfo(null))
      .finally(() => setOrgLoading(false));

    return () => ac.abort();
  }, [orgIdFromRoute]);

  const selectedOrgName =
    orgInfo?.name || orgInfo?.title || orgInfo?.organizationName || "";
  const selectedOrgImage = (orgInfo?.logo || orgInfo?.image || "").trim();

  /* ---------- Load organization members for promoters ------------- */
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  useEffect(() => {
    if (!orgIdFromRoute) return;
    setMembersLoading(true);
    fetch(`/api/organizations/${orgIdFromRoute}/members`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: OrgMember[]) => {
        setMembers(Array.isArray(data) ? data : []);
      })
      .catch(() => setMembers([]))
      .finally(() => setMembersLoading(false));
  }, [orgIdFromRoute]);

  /* ---------- Field arrays (artists) ------------------------------ */
  const {
    fields: artistFields,
    append: addArtist,
    remove: removeArtist,
  } = useFieldArray<FormInput, "artists">({ control, name: "artists" });

  /* ---------- Derived ISO start/end ------------------------------- */
  const dateRange = (watch("dateRange") ?? {
    start: null,
    end: null,
  }) as DateRangeValue;
  const startTime = watch("startTime") ?? "18:00";
  const endTime = watch("endTime") ?? "21:00";

  const { startISO, endISO } = useMemo(() => {
    const sDay = dateRange.start ? clampToDay(dateRange.start) : null;
    const eDay = dateRange.end ? clampToDay(dateRange.end) : sDay;

    if (!sDay || !eDay) return { startISO: "", endISO: "" };

    const sISO = isoFromDayAndTime(sDay, startTime);
    let eISO = isoFromDayAndTime(eDay, endTime);

    if (new Date(eISO).getTime() <= new Date(sISO).getTime()) {
      eISO = isoFromDayAndTime(addDays(eDay, 1), endTime);
    }

    return { startISO: sISO, endISO: eISO };
  }, [dateRange.start, dateRange.end, startTime, endTime]);

  useEffect(() => {
    setValue("date", startISO, { shouldDirty: true });
    setValue("endDate", endISO, { shouldDirty: true });
  }, [startISO, endISO, setValue]);

  /* ---------- Location derived for preview ------------------------ */
  const locationMode = (watch("locationMode") ?? "specific") as LocationMode;
  const locationCity = watch("locationCity") ?? "";
  const locationAddress = watch("locationAddress") ?? "";
  const locationName = watch("locationName") ?? "";

  const derivedLocationLabel = useMemo(() => {
    const v = {
      locationMode,
      locationCity,
      locationAddress,
      locationName,
    } as FormValues;
    return buildLocationString(v) || "Location TBA";
  }, [locationMode, locationCity, locationAddress, locationName]);

  /* ---------- Submit ---------------------------------------------- */
  const submitImpl =
    (status: "published" | "draft"): SubmitHandler<FormValues> =>
    async (data) => {
      const sDay = data.dateRange.start
        ? clampToDay(data.dateRange.start)
        : null;
      const eDay = data.dateRange.end ? clampToDay(data.dateRange.end) : sDay;

      if (!sDay || !eDay) {
        alert("Please select a date range.");
        return;
      }

      const sISO = isoFromDayAndTime(sDay, data.startTime);
      let eISO = isoFromDayAndTime(eDay, data.endTime);
      if (new Date(eISO).getTime() <= new Date(sISO).getTime()) {
        eISO = isoFromDayAndTime(addDays(eDay, 1), data.endTime);
      }

      const location = buildLocationString(data);

      const payload = {
        ...data,
        status,
        date: sISO,
        endDate: eISO,

        // keep API/model unchanged
        location,
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
  const image = watch("image") ?? "";

  const preview = useMemo(
    () => ({
      id: "preview",
      title: title || "Untitled Event",
      dateLabel: startISO ? fmtDateTimeLabel(startISO, endISO) : "Date TBA",
      venue: derivedLocationLabel || "Location TBA",
      img: image || "/dummy/event-1.png",
      category: "Shows",
    }),
    [title, startISO, endISO, derivedLocationLabel, image]
  );

  /* ---------- Categories chips ------------------------------------ */
  const CATS = ["Shows", "Party", "Comedy", "Social", "Listing Party"] as const;
  const categories = watchArr("categories", [] as unknown as string[]);
  const toggleCat = (c: string) => {
    const set = new Set(categories as string[]);
    set.has(c) ? set.delete(c) : set.add(c);
    setValue("categories", Array.from(set), { shouldDirty: true });
  };

  /* ---------- Promoters chips ------------------------------------- */
  const promoters = watchArr("promoters", [] as unknown as string[]);
  const togglePromoter = (email: string) => {
    const set = new Set(promoters as string[]);
    if (set.has(email)) set.delete(email);
    else set.add(email);
    setValue("promoters", Array.from(set), { shouldDirty: true });
  };

  const hasErrors = Object.keys(errors).length > 0;

  const locationTabs: Array<{ key: LocationMode; label: string }> = [
    { key: "specific", label: "Specific location" },
    { key: "city", label: "City" },
    { key: "tbd", label: "TBD" },
    { key: "tba", label: "TBA" },
    { key: "secret", label: "It’s a secret" },
  ];

  const showCity = locationMode === "specific" || locationMode === "city";
  const showSpecific = locationMode === "specific";

  return (
    <main className="relative bg-neutral-950 text-neutral-0 ">
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
            Add the essentials, upload a poster, and you’re ready to publish.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(submitImpl("published"))}
        className="grid grid-cols-1 gap-6 pt-6 pb-14 md:grid-cols-12 max-w-7xl mx-auto"
        noValidate
      >
        <input type="hidden" {...register("organizationId")} />

        {/* ------------------------- Main form ----------------------- */}
        <div className="md:col-span-7 lg:col-span-8 space-y-6">
          {/* Required fields note */}
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
            desc="This is what attendees will see first — keep it clear and catchy."
            icon={<Sparkles className="h-5 w-5 text-primary-300" />}
          >
            <div className="space-y-7">
              {/* Event Name (required) */}
              <div className="space-y-2">
                <FieldLabel required>Event Name</FieldLabel>
                <LabelledInput
                  noLabel
                  aria-label="Event Name"
                  placeholder="Enter name"
                  {...register("title")}
                  size="md"
                  variant="transparent"
                  className={clsx(errors.title && errorRing)}
                />
                {errors.title?.message ? (
                  <p className="text-xs text-error-300">
                    {String(errors.title.message)}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                {/* Date Range + Start/End Time */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <FieldLabel required>Date</FieldLabel>
                    <Controller
                      control={control}
                      name="dateRange"
                      render={({ field }) => (
                        <DateRangePicker
                          value={field.value as DateRangeValue}
                          onChange={field.onChange}
                          variant="field"
                          align="left"
                          error={!!errors.dateRange?.start}
                        />
                      )}
                    />
                    {errors.dateRange?.start?.message ? (
                      <p className="text-xs text-error-300">
                        {String(errors.dateRange.start.message)}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <FieldLabel required>Start Time</FieldLabel>
                    <TimePicker
                      label=""
                      value={startTime}
                      onChange={(v) =>
                        setValue("startTime", v, { shouldDirty: true })
                      }
                      error={!!errors.startTime}
                      minuteStep={5}
                      placeholder="Select Time"
                    />
                    {errors.startTime?.message ? (
                      <p className="text-xs text-error-300">
                        {String(errors.startTime.message)}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <FieldLabel required>End Time</FieldLabel>
                    <TimePicker
                      label=""
                      value={endTime}
                      onChange={(v) =>
                        setValue("endTime", v, { shouldDirty: true })
                      }
                      error={!!errors.endTime}
                      minuteStep={5}
                      placeholder="Select Time"
                    />
                    {errors.endTime?.message ? (
                      <p className="text-xs text-error-300">
                        {String(errors.endTime.message)}
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* Microcopy summary */}
                <p className="text-sm text-neutral-300">
                  This event will run on{" "}
                  <span className="font-medium">
                    {dateRange.start
                      ? fmtDateRangeShort(
                          dateRange.start,
                          dateRange.end ?? dateRange.start
                        )
                      : "—"}
                  </span>{" "}
                  from{" "}
                  <span className="font-medium">
                    {startISO ? fmtTimeFromISO(startISO) : "--:--"}
                  </span>{" "}
                  until{" "}
                  <span className="font-medium">
                    {endISO ? fmtTimeFromISO(endISO) : "--:--"}
                  </span>
                </p>
              </div>

              {/* Categories */}
              <div className="space-y-2">
                <FieldLabel>Choose Categories</FieldLabel>
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
                            ? "border-white/20 bg-primary-900/50 text-neutral-0"
                            : "border-white/10 text-neutral-300 hover:text-neutral-0 hover:border-primary-500"
                        )}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <FieldLabel required>Minimum Age</FieldLabel>
                <LabelledInput
                  noLabel
                  placeholder="Enter Minimum Age"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  {...register("minAge", { valueAsNumber: true })}
                  size="md"
                  variant="transparent"
                />
              </div>

              {/* -------- NEW LOCATION SECTION (selector + autocomplete) -------- */}
              <div className="space-y-3">
                <FieldLabel required>
                  Where does the event take place?
                </FieldLabel>

                {/* pills */}
                <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1">
                  {locationTabs.map((t) => {
                    const active = locationMode === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => {
                          setValue("locationMode", t.key, {
                            shouldDirty: true,
                          });

                          // reset fields when changing modes (keeps UX clean)
                          if (
                            t.key === "tbd" ||
                            t.key === "tba" ||
                            t.key === "secret"
                          ) {
                            setValue("locationCity", "", { shouldDirty: true });
                            setValue("locationAddress", "", {
                              shouldDirty: true,
                            });
                            setValue("locationName", "", { shouldDirty: true });
                          }

                          if (t.key === "city") {
                            setValue("locationAddress", "", {
                              shouldDirty: true,
                            });
                            setValue("locationName", "", { shouldDirty: true });
                          }
                        }}
                        className={clsx(
                          "rounded-full px-3.5 py-1.5 text-sm transition",
                          active
                            ? "bg-primary-900/50 text-neutral-0 ring-1 ring-primary-500/70"
                            : "text-neutral-300 hover:text-neutral-0"
                        )}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>

                {/* Fields area */}
                <div className="space-y-4 rounded-lg border border-white/10 bg-neutral-950/60 p-4">
                  {showCity ? (
                    <div className="space-y-2">
                      <FieldLabel required>City</FieldLabel>
                      <LabelledInput
                        noLabel
                        aria-label="City"
                        placeholder="Enter city"
                        {...register("locationCity")}
                        size="md"
                        variant="transparent"
                        className={clsx(errors.locationCity && errorRing)}
                      />
                      {errors.locationCity?.message ? (
                        <p className="text-xs text-error-300">
                          {String(errors.locationCity.message)}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {showSpecific ? (
                    <>
                      <div className="space-y-2">
                        <FieldLabel required>Address</FieldLabel>
                        <Controller
                          control={control}
                          name="locationAddress"
                          render={({ field }) => (
                            <PlacesAddressInput
                              value={field.value ?? ""}
                              onChange={(v) => field.onChange(v)}
                              placeholder="Type to search address"
                              error={!!errors.locationAddress}
                            />
                          )}
                        />
                        {errors.locationAddress?.message ? (
                          <p className="text-xs text-error-300">
                            {String(errors.locationAddress.message)}
                          </p>
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        <FieldLabel>Location Name</FieldLabel>
                        <LabelledInput
                          noLabel
                          aria-label="Location Name"
                          placeholder="Venue name (optional)"
                          {...register("locationName")}
                          size="md"
                          variant="transparent"
                        />
                        <p className="text-xs text-neutral-400">
                          Optional — helps attendees recognize the venue faster.
                        </p>
                      </div>
                    </>
                  ) : null}

                  {!showCity && !showSpecific ? (
                    <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
                      <div className="mt-[2px] grid h-7 w-7 place-items-center rounded-md bg-primary-900/50 ring-1 ring-primary-500">
                        <MapPin className="h-4 w-4 text-primary-300" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-neutral-0">
                          Location will be shown as:{" "}
                          <span className="text-neutral-200">
                            {locationMode === "tbd"
                              ? "TBD"
                              : locationMode === "tba"
                                ? "TBA"
                                : "It’s a secret"}
                          </span>
                        </p>
                        <p className="mt-1 text-sm text-neutral-300">
                          You can update this later before publishing (or
                          anytime if you allow edits).
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* small helper preview */}
                <p className="text-sm text-neutral-300">
                  Preview:{" "}
                  <span className="font-medium text-neutral-0">
                    {derivedLocationLabel || "Location TBA"}
                  </span>
                </p>
              </div>
            </div>
          </Section>

          <Section
            title="Organizer & Artists"
            desc="Event is tied to the organization you’re currently managing. You can optionally showcase who’s performing."
            icon={<UsersIcon className="h-5 w-5 text-primary-300" />}
          >
            <div className="space-y-6">
              <div className="space-y-2">
                <FieldLabel>Organization</FieldLabel>

                {/* Selected organization card */}
                <div className="rounded-lg border border-white/10 bg-neutral-950/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-white/5 ring-1 ring-white/10">
                        {selectedOrgImage ? (
                          <Image
                            src={selectedOrgImage}
                            alt={
                              selectedOrgName
                                ? `${selectedOrgName} logo`
                                : "Organization logo"
                            }
                            fill
                            sizes="40px"
                            className="object-cover"
                            priority={false}
                          />
                        ) : (
                          <UsersIcon className="h-5 w-5 text-neutral-200" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-neutral-0">
                          {orgLoading
                            ? "Loading organization…"
                            : selectedOrgName || "Selected organization"}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                          <span className="truncate">ID: {orgIdFromRoute}</span>
                          {orgInfo?.slug ? (
                            <>
                              <span className="opacity-30">•</span>
                              <span className="truncate">{orgInfo.slug}</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-primary-300 font-medium">
                      Selected
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-neutral-300">
                    This event will be created under the selected organization.
                  </p>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-base font-semibold">Artists Attending</h3>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => addArtist({ name: "" })}
                  >
                    <Plus className="h-4 w-4" />
                    Add artist
                  </Button>
                </div>

                <div className="space-y-3 w-full">
                  {artistFields.map((field, idx) => {
                    const artistNameErr = (
                      errors.artists as unknown as Array<
                        { name?: { message?: string } } | undefined
                      >
                    )?.[idx]?.name?.message;

                    return (
                      <div
                        key={field.id}
                        className="flex items-end gap-3 rounded-lg border border-white/10 bg-neutral-950/60 p-4 w-full relative"
                      >
                        <div className="flex items-center gap-2 w-full">
                          <div className="max-w-sm">
                            <Controller
                              control={control}
                              name={`artists.${idx}.image`}
                              render={({ field }) => (
                                <ImageUpload
                                  value={field.value}
                                  onChange={field.onChange}
                                  publicId={`temp/artists/${uuid()}`}
                                  sizing="small"
                                />
                              )}
                            />
                          </div>

                          <div className="space-y-1 w-full">
                            <LabelledInput
                              noLabel
                              aria-label="Artist name"
                              placeholder="Artist"
                              {...register(`artists.${idx}.name` as const)}
                              size="md"
                              variant="transparent"
                              className={clsx(artistNameErr && errorRing)}
                            />
                            {artistNameErr ? (
                              <p className="text-xs text-error-300">
                                {String(artistNameErr)}
                              </p>
                            ) : null}
                          </div>

                          <div className="flex">
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
                      </div>
                    );
                  })}

                  {artistFields.length === 0 && (
                    <p className="text-sm text-neutral-400">
                      Optional — add performers to improve discovery.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Section>

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

          <Section
            title="Event Description"
            desc="Help people understand what they’re signing up for — lineup, vibe, schedule, and any important notes."
            icon={<FileText className="h-5 w-5 text-primary-300" />}
          >
            <div className="space-y-2">
              <FieldLabel>Details</FieldLabel>
              <TextArea
                aria-label="Event description"
                placeholder="Example: Doors at 7PM. Live set starts at 9PM. 18+ with ID. Dress code: smart casual..."
                rows={6}
                {...register("description")}
              />
              <p className="text-xs text-neutral-400">
                Tip: Keep it scannable — short paragraphs and key info first.
              </p>
            </div>
          </Section>

          <div className="flex flex-wrap justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/dashboard/events")}
            >
              Cancel
            </Button>
            <div className="flex gap-3 flex-wrap">
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
            </div>
          </div>
        </div>

        {/* ------------------------- Sidebar -------------------------- */}
        <aside className="md:col-span-5 lg:col-span-4">
          <div className="md:sticky md:top-20 space-y-6">
            <div className="rounded-lg border border-white/10 bg-neutral-950/70 p-5">
              <h3 className="mb-3 text-sm font-semibold">Live Preview</h3>
              <EventCard {...preview} clickable={false} />
              <div className="mt-3 flex items-center justify-end gap-2 text-xs text-neutral-300">
                <MapPin className="h-4 w-4" />
                {preview.venue}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-neutral-950/70 p-5">
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
