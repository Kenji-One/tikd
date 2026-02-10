// src/app/dashboard/organizations/[id]/events/create/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type LocationMode = "specific" | "city" | "tbd" | "tba" | "secret" | "other";

/* ----------------------------- Schema ----------------------------- */

const timeHHMMOrEmpty = z.union([
  z.literal(""),
  z.string().regex(/^([0-1]\d|2[0-3]):([0-5]\d)$/, "Use HH:MM (e.g. 18:10)"),
]);

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

    startTime: timeHHMMOrEmpty,
    endTime: timeHHMMOrEmpty,

    /** Derived ISO (sent to API) */
    date: z.string().optional(),
    endDate: z.string().optional(),

    /** Meta */
    minAge: z.coerce.number().int().min(0).max(99).optional(),
    image: z.string().url().optional(),

    /** Location (new UI fields) */
    locationMode: z
      .enum(["specific", "city", "tbd", "tba", "secret", "other"])
      .default("specific"),
    locationCity: z.string().trim().optional(),
    locationAddress: z.string().trim().optional(),
    locationName: z.string().trim().optional(),
    locationOther: z.string().trim().optional(),

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
        }),
      )
      .default([]),

    /** Status
     *  ✅ IMPORTANT: new events must start as NOT published.
     *  We use "draft" as the internal state for "Unpublished".
     */
    status: z.enum(["published", "draft"]).default("draft"),
  })
  .superRefine((v, ctx) => {
    // ✅ Require times (but still allow empty initial UI state)
    if (!v.startTime) {
      ctx.addIssue({
        code: "custom",
        path: ["startTime"],
        message: "Start time is required",
      });
    }
    if (!v.endTime) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "End time is required",
      });
    }

    // Location validation
    const cityNeeded = v.locationMode === "city";
    const addressNeeded = v.locationMode === "specific";
    const otherNeeded = v.locationMode === "other";

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

    if (otherNeeded) {
      if (!v.locationOther || v.locationOther.trim().length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["locationOther"],
          message: "Please enter a location",
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
    case "other":
      return (v.locationOther || "").trim();
    case "specific": {
      const name = (v.locationName || "").trim();
      const addr = (v.locationAddress || "").trim();
      const city = (v.locationCity || "").trim();

      const parts = [name, addr].filter(Boolean);
      let out = parts.join(" · ");

      if (!out) out = city;

      return out;
    }
    default:
      return "";
  }
}

function buildLocationDisplayString(
  v: Pick<
    FormValues,
    | "locationMode"
    | "locationCity"
    | "locationAddress"
    | "locationName"
    | "locationOther"
  >,
) {
  switch (v.locationMode) {
    case "tbd":
      return "To Be Determined";
    case "tba":
      return "To Be Announced";
    case "secret":
      return "It’s a secret";
    case "city":
      return (v.locationCity || "").trim();
    case "other":
      return (v.locationOther || "").trim();
    case "specific": {
      const name = (v.locationName || "").trim();
      const addr = (v.locationAddress || "").trim();
      const city = (v.locationCity || "").trim();

      const parts = [name, addr].filter(Boolean);
      let out = parts.join(" · ");

      if (!out) out = city;

      return out;
    }
    default:
      return "";
  }
}

const TIXSY_MOCK_POSTER = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1280" viewBox="0 0 900 1280">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#08080f"/>
      <stop offset="0.6" stop-color="#120a24"/>
      <stop offset="1" stop-color="#08080f"/>
    </linearGradient>
    <radialGradient id="glow" cx="30%" cy="18%" r="70%">
      <stop offset="0" stop-color="#9a46ff" stop-opacity="0.30"/>
      <stop offset="1" stop-color="#9a46ff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="wm" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.10"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0.02"/>
    </linearGradient>
    <linearGradient id="zoneFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.06"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0.02"/>
    </linearGradient>
  </defs>

  <rect width="900" height="1280" fill="url(#bg)"/>
  <rect width="900" height="1280" fill="url(#glow)"/>

  <g opacity="0.16">
    <text x="-360" y="1188"
      font-family="Arial, Helvetica, sans-serif"
      font-size="126"
      font-weight="900"
      letter-spacing="3"
      fill="url(#wm)"
      transform="rotate(-18 450 640)">
      TIXSY PREVIEW • TIXSY PREVIEW • TIXSY PREVIEW
    </text>
  </g>

  <rect x="110" y="150" width="680" height="980" rx="36"
    fill="url(#zoneFill)"
    stroke="#ffffff" stroke-opacity="0.22" stroke-width="2"
    stroke-dasharray="18 14"/>

  <g transform="translate(450 215) translate(-118 0) scale(4.2)" opacity="0.95">
    <svg width="56" height="24" viewBox="0 0 56 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clip-path="url(#clip0_1413_879)">
        <path d="M0 1.06954H13.4088V6.00978H9.23434V18.8952H4.17443V6.00978H0V1.06954Z" fill="white"/>
        <path d="M17.806 4.43094C17.3 4.94025 16.7012 5.1949 16.0097 5.1949C15.3182 5.1949 14.7025 4.94025 14.1628 4.43094C13.6568 3.88769 13.4038 3.27652 13.4038 2.59745C13.4038 1.9014 13.6568 1.29872 14.1628 0.789421C14.6857 0.26314 15.3013 0 16.0097 0C16.7012 0 17.3 0.26314 17.806 0.789421C18.3288 1.29872 18.5902 1.9014 18.5902 2.59745C18.5902 3.2935 18.3288 3.90466 17.806 4.43094ZM18.3372 18.8952H13.6568V6.16258H18.3372V18.8952Z" fill="white"/>
        <path d="M28.1446 12.3761L32.7491 18.8952H27.5627L25.5387 16.0431L23.5148 18.8952H18.3284L22.9582 12.3761L18.5307 6.16258H23.7172L25.5387 8.73456L27.3603 6.16258H32.5467L28.1446 12.3761Z" fill="white"/>
        <path d="M36.5197 9.90596C36.5197 10.1436 36.7306 10.3219 37.1522 10.4407C37.5907 10.5596 38.122 10.6784 38.7461 10.7972C39.3701 10.9161 39.9942 11.0943 40.6183 11.332C41.2423 11.5527 41.7652 11.9602 42.1868 12.5543C42.6254 13.1485 42.8446 13.9125 42.8446 14.8462C42.8446 15.6441 42.6675 16.3571 42.3133 16.9853C41.9591 17.5964 41.4784 18.0548 40.8713 18.3604C39.7075 18.9546 38.4678 19.2517 37.1522 19.2517C34.0994 19.2517 32.126 18.2416 31.2321 16.2213L35.3053 14.3878C35.6427 15.2536 36.2414 15.6866 37.1016 15.6866C37.6751 15.6866 37.9618 15.4998 37.9618 15.1263C37.9618 14.9396 37.7931 14.7783 37.4558 14.6425C37.1185 14.5067 36.5703 14.3539 35.8113 14.1841C33.1633 13.5899 31.8477 12.2572 31.8646 10.1861C31.8646 8.79398 32.3875 7.71595 33.4332 6.952C34.4958 6.18804 35.7186 5.80606 37.1016 5.80606C39.8846 5.80606 41.7146 6.88409 42.5916 9.04014L38.7208 10.4407C38.4172 9.7277 37.9449 9.37119 37.304 9.37119C36.7812 9.37119 36.5197 9.54945 36.5197 9.90596Z" fill="#BD99FF"/>
        <path d="M49.1438 12.9618L50.6871 6.16258H56L51.6991 18.8697C51.075 20.7202 50.1052 22.0529 48.7896 22.8677C47.474 23.6996 45.7368 24.0731 43.5779 23.9882V19.5318C44.455 19.5318 45.1128 19.4639 45.5513 19.3281C46.0067 19.2092 46.3693 18.9801 46.6392 18.6405L41.5792 6.16258H46.8922L49.1438 12.9618Z" fill="#BD99FF"/>
      </g>
      <defs>
        <clipPath id="clip0_1413_879">
          <rect width="56" height="24" fill="white"/>
        </clipPath>
      </defs>
    </svg>
  </g>

  <g font-family="Arial, Helvetica, sans-serif" text-anchor="middle">
    <rect x="402" y="610" width="96" height="96" rx="24"
      fill="#ffffff" fill-opacity="0.06"
      stroke="#ffffff" stroke-opacity="0.12" />

    <path d="M450 640 v32" stroke="#ffffff" stroke-opacity="0.86" stroke-width="4" stroke-linecap="round"/>
    <path d="M432 654 l18-18 18 18" fill="none" stroke="#ffffff" stroke-opacity="0.86" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M418 704 h64" stroke="#ffffff" stroke-opacity="0.22" stroke-width="4" stroke-linecap="round"/>

    <text x="450" y="800" font-size="46" font-weight="900" fill="#ffffff" opacity="0.94">
      Upload your poster
    </text>
    <text x="450" y="854" font-size="22" font-weight="700" fill="#cfcfe6" opacity="0.72">
      Mock preview — not a real event poster
    </text>
  </g>
</svg>
`)}`;

/* ------------------------------ Page ------------------------------ */
export default function NewEventPage() {
  const router = useRouter();
  const params = useParams() as { id?: string };
  const orgIdFromRoute = params?.id ?? "";

  const minSelectableDate = useMemo(() => clampToDay(new Date()), []);

  const posterUploadRef = useRef<HTMLDivElement | null>(null);
  const openPosterPicker = () => {
    const root = posterUploadRef.current;
    if (!root) return;
    const input = root.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement | null;
    input?.click();
  };

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
      startTime: "",
      endTime: "",
      categories: [],
      promoters: [],
      artists: [],
      // ✅ default to "draft" (Unpublished)
      status: "draft",
      locationMode: "specific",
      locationCity: "",
      locationAddress: "",
      locationName: "",
      locationOther: "",
    },
    mode: "onBlur",
  });

  /** Safe watcher with a default for optional array fields coming from z.input */
  const watchArr = <K extends keyof FormInput>(
    key: K,
    fallback: NonNullable<FormInput[K]>,
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
  const startTime = watch("startTime") ?? "";
  const endTime = watch("endTime") ?? "";

  const { startISO, endISO } = useMemo(() => {
    const sDay = dateRange.start ? clampToDay(dateRange.start) : null;
    const eDay = dateRange.end ? clampToDay(dateRange.end) : sDay;

    if (!sDay || !eDay) return { startISO: "", endISO: "" };
    if (!startTime || !endTime) return { startISO: "", endISO: "" };

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
  const locationOther = watch("locationOther") ?? "";

  const derivedLocationLabel = useMemo(() => {
    const v = {
      locationMode,
      locationCity,
      locationAddress,
      locationName,
      locationOther,
    } as Pick<
      FormValues,
      | "locationMode"
      | "locationCity"
      | "locationAddress"
      | "locationName"
      | "locationOther"
    >;

    return buildLocationDisplayString(v) || "Location TBA";
  }, [
    locationMode,
    locationCity,
    locationAddress,
    locationName,
    locationOther,
  ]);

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
        const { _id } = await res.json();
        router.push(`/dashboard/events/${_id}`);
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
      img: image || TIXSY_MOCK_POSTER,
      category: "Shows",
    }),
    [title, startISO, endISO, derivedLocationLabel, image],
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
    { key: "other", label: "Other" },
  ];

  const showCity = locationMode === "city";
  const showSpecific = locationMode === "specific";
  const showOther = locationMode === "other";

  return (
    <main className="relative bg-neutral-950 text-neutral-0 ">
      <style jsx global>{`
        .poster-uploader > * {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
        .poster-uploader img,
        .poster-uploader video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      `}</style>

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

      {/* ✅ IMPORTANT: default submit creates a DRAFT (Unpublished) */}
      <form
        onSubmit={handleSubmit(submitImpl("draft"))}
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
                          minDate={minSelectableDate}
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
                      placeholder="Select Start Time"
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
                      placeholder="Select End Time"
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
                          dateRange.end ?? dateRange.start,
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
                            : "border-white/10 text-neutral-300 hover:text-neutral-0 hover:border-primary-500",
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

              {/* -------- LOCATION SECTION (selector + inputs) -------- */}
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
                            setValue("locationOther", "", {
                              shouldDirty: true,
                            });
                          }

                          if (t.key === "city") {
                            setValue("locationAddress", "", {
                              shouldDirty: true,
                            });
                            setValue("locationName", "", { shouldDirty: true });
                            setValue("locationOther", "", {
                              shouldDirty: true,
                            });
                          }

                          if (t.key === "specific") {
                            setValue("locationOther", "", {
                              shouldDirty: true,
                            });
                          }

                          if (t.key === "other") {
                            setValue("locationCity", "", { shouldDirty: true });
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
                            : "text-neutral-300 hover:text-neutral-0",
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

                  {showOther ? (
                    <div className="space-y-2">
                      <FieldLabel required>Location</FieldLabel>
                      <LabelledInput
                        noLabel
                        aria-label="Other location"
                        placeholder="Type any location (e.g. Online, Your house, Secret rooftop...)"
                        {...register("locationOther")}
                        size="md"
                        variant="transparent"
                        className={clsx(errors.locationOther && errorRing)}
                      />
                      {errors.locationOther?.message ? (
                        <p className="text-xs text-error-300">
                          {String(errors.locationOther.message)}
                        </p>
                      ) : null}
                      <p className="text-xs text-neutral-400">
                        This will be shown exactly as typed.
                      </p>
                    </div>
                  ) : null}

                  {!showCity && !showSpecific && !showOther ? (
                    <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
                      <div className="mt-[2px] grid h-7 w-7 place-items-center rounded-md bg-primary-900/50 ring-1 ring-primary-500">
                        <MapPin className="h-4 w-4 text-primary-300" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-neutral-0">
                          Location will be shown as:{" "}
                          <span className="text-neutral-200">
                            {locationMode === "tbd"
                              ? "To Be Determined"
                              : locationMode === "tba"
                                ? "To Be Announced"
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
            <div className="mt-3 flex justify-center pb-6">
              <div
                ref={posterUploadRef}
                className="poster-uploader flex relative w-full max-w-[224px] max-h-[309px] rounded-2xl aspect-[4/6]"
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
                      sizing="full"
                    />
                  )}
                />
              </div>
            </div>
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

            <div className="">
              <Button
                type="submit"
                variant="primary"
                loading={isSubmitting}
                animation
              >
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
              <div className="relative group">
                <EventCard {...preview} clickable={false} />

                {/* Click poster (preview) to change it */}
                <button
                  type="button"
                  onClick={openPosterPicker}
                  aria-label="Change event poster"
                  className={[
                    "absolute inset-0 rounded-[14px]",
                    "cursor-pointer",
                    "ring-1 ring-transparent",
                    "",
                    "outline-none",
                  ].join(" ")}
                >
                  <span className="sr-only">Change event poster</span>
                </button>

                {/* tiny hint chip (subtle, only on hover) */}
                <div className="pointer-events-none absolute left-3 top-3 opacity-0 translate-y-[-2px] transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-neutral-950/70 px-3 py-1.5 text-xs text-neutral-200">
                    <ImagePlus className="h-4 w-4 text-primary-300" />
                    Click poster to change
                  </div>
                </div>
              </div>
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
