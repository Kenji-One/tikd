/* ------------------------------------------------------------------ */
/*  src/app/dashboard/organizations/[id]/events/create/page.tsx        */
/* ------------------------------------------------------------------ */
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Image from "next/image";
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
  Film,
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
import ImagePositionEditorModal from "@/components/ui/ImagePositionEditorModal";

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

type EventMediaType = "image" | "video";

type PosterEditorState = {
  open: boolean;
  src: string;
  title: string;
  publicId: string;
} | null;

/* ----------------------------- Schema ----------------------------- */

const timeHHMMOrEmpty = z.union([
  z.literal(""),
  z.string().regex(/^([0-1]\d|2[0-3]):([0-5]\d)$/, "Use HH:MM (e.g. 18:10)"),
]);

const mediaItemSchema = z.object({
  url: z.string().url(),
  type: z.enum(["image", "video"]),
  caption: z.string().max(120).optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

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

    /** ✅ Event media (gallery) */
    media: z.array(mediaItemSchema).max(30).default([]),

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

    /** Status */
    status: z.enum(["published", "draft"]).default("draft"),
  })
  .superRefine((v, ctx) => {
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

  if (!endISO) return `${fmtDateShort(a)} • ${fmtTimeFromISO(startISO)}`;

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

function isCloudinaryImageDeliveryUrl(u: string) {
  // supports: https://res.cloudinary.com/<cloud>/image/upload/...
  // reject videos (poster can be video upload too)
  return (
    typeof u === "string" &&
    u.startsWith("https://res.cloudinary.com/") &&
    u.includes("/image/upload/")
  );
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

  // ✅ stable Cloudinary publicId for poster (so crop commits consistently)
  const posterPublicId = useMemo(() => uuid(), []);

  // ✅ remember original (no query/hash) for repeated re-crops
  const posterOriginalRef = useRef<string | null>(null);

  // ✅ global “cache-bust” nonce used to force fresh Cloudinary/Next fetches
  const [previewNonce, setPreviewNonce] = useState<number>(() => Date.now());

  const [posterEditor, setPosterEditor] = useState<PosterEditorState>(null);

  // ✅ separate drag states (so styles apply ONLY to the box being targeted)
  const [posterDragActive, setPosterDragActive] = useState(false);
  const [previewPosterDragActive, setPreviewPosterDragActive] = useState(false);

  const getPosterFileInput = useCallback((): HTMLInputElement | null => {
    const root = posterUploadRef.current;
    if (!root) return null;
    return root.querySelector('input[type="file"]') as HTMLInputElement | null;
  }, []);

  const pushFileToPosterInput = useCallback(
    (file: File) => {
      const input = getPosterFileInput();
      if (!input) return;

      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;

      input.dispatchEvent(new Event("change", { bubbles: true }));
    },
    [getPosterFileInput],
  );

  const handlePosterDropFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const file = files[0];
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (!isImage && !isVideo) {
        alert("Please drop an image or a video file (JPG/PNG/MP4).");
        return;
      }

      const maxBytes = 50 * 1024 * 1024; // 50MB
      if (file.size > maxBytes) {
        alert("File is too large. Max size is 50MB.");
        return;
      }

      pushFileToPosterInput(file);
    },
    [pushFileToPosterInput],
  );

  // ✅ generic drag handlers (scoped per zone)
  const makeDragHandlers = useCallback(
    (setActive: (v: boolean) => void) => ({
      onDragEnter: (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setActive(true);
      },
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
        setActive(true);
      },
      onDragLeave: (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const next = e.relatedTarget as Node | null;
        if (next && e.currentTarget.contains(next)) return;

        setActive(false);
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setActive(false);
        handlePosterDropFiles(e.dataTransfer?.files ?? null);
      },
    }),
    [handlePosterDropFiles],
  );

  const posterDnD = useMemo(
    () => makeDragHandlers(setPosterDragActive),
    [makeDragHandlers],
  );
  const previewDnD = useMemo(
    () => makeDragHandlers(setPreviewPosterDragActive),
    [makeDragHandlers],
  );

  const openPosterPicker = () => {
    const input = getPosterFileInput();
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
    trigger,
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
      media: [],
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

  /* ---------- Field arrays (media) -------------------------------- */
  const {
    fields: mediaFields,
    append: addMedia,
    remove: removeMedia,
    move: moveMedia,
  } = useFieldArray<FormInput, "media">({ control, name: "media" });

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

      const cleanedMedia = (data.media ?? [])
        .filter(
          (m) => m && typeof m.url === "string" && m.url.trim().length > 0,
        )
        .map((m, i) => ({
          url: m.url,
          type: m.type,
          caption: m.caption?.trim() || undefined,
          sortOrder: i,
        }));

      // ✅ strip cache-busters before saving
      const cleanPoster = data.image?.trim()
        ? stripQueryAndHash(data.image)
        : undefined;

      const payload = {
        ...data,
        status,
        date: sISO,
        endDate: eISO,
        location,
        media: cleanedMedia,
        image: cleanPoster,
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
  const posterValueRaw = (watch("image") ?? "").trim(); // field value (may include cb)
  const hasPoster = posterValueRaw.length > 0;

  // ✅ always show cache-busted URL in UI so overwrites/crops reflect instantly
  const uiPoster = useMemo(() => {
    const v = posterValueRaw ? posterValueRaw : "";
    return v ? withCacheBust(v, previewNonce) : "";
  }, [posterValueRaw, previewNonce]);

  const preview = useMemo(
    () => ({
      id: "preview",
      title: title || "Untitled Event",
      dateLabel: startISO ? fmtDateTimeLabel(startISO, endISO) : "Date TBA",
      venue: derivedLocationLabel || "Location TBA",
      img: uiPoster || TIXSY_MOCK_POSTER,
      category: "Shows",
    }),
    [title, startISO, endISO, derivedLocationLabel, uiPoster],
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

  // ✅ Live preview: measure the REAL poster box inside EventCard
  const previewWrapRef = useRef<HTMLDivElement | null>(null);
  const [previewPosterRect, setPreviewPosterRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
    radius: number;
  } | null>(null);

  useEffect(() => {
    const wrap = previewWrapRef.current;
    if (!wrap) return;

    let raf = 0;

    const compute = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const poster = wrap.querySelector(
          '[data-tikd-eventcard-poster="true"]',
        ) as HTMLElement | null;

        if (!poster) {
          setPreviewPosterRect(null);
          return;
        }

        const w = wrap.getBoundingClientRect();
        const p = poster.getBoundingClientRect();

        const cs = window.getComputedStyle(poster);
        const radius = Number.parseFloat(cs.borderTopLeftRadius || "12") || 12;

        setPreviewPosterRect({
          top: p.top - w.top,
          left: p.left - w.left,
          width: p.width,
          height: p.height,
          radius,
        });
      });
    };

    compute();

    const ro = new ResizeObserver(() => compute());
    ro.observe(wrap);

    window.addEventListener("resize", compute);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, [preview.img, preview.title, preview.dateLabel, preview.venue]);

  function openAdjustPoster() {
    const current = (watch("image") ?? "").trim();
    if (!current) return;

    // we only support cropping for Cloudinary image delivery URLs
    const clean = posterOriginalRef.current || stripQueryAndHash(current);
    if (!clean || !isCloudinaryImageDeliveryUrl(clean)) return;

    setPosterEditor({
      open: true,
      src: clean,
      title: "Adjust poster",
      publicId: `temp/events/posters/${posterPublicId}`,
    });
  }

  const canAdjustPoster = useMemo(() => {
    const current = (watch("image") ?? "").trim();
    if (!current) return false;
    const clean = posterOriginalRef.current || stripQueryAndHash(current);
    return !!clean && isCloudinaryImageDeliveryUrl(clean);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch("image")]);

  return (
    <main className="relative bg-neutral-950 text-neutral-0 ">
      <style jsx global>{`
        /* ---------------------------------------------
           ✅ Poster upload: fix "Click to upload" height
           We do NOT touch ImageUpload internals.
           We just force its root wrapper to be 100% height
           inside the poster drop box, so the button can fill.
        ---------------------------------------------- */
        .tikdPosterFill > div {
          height: 100%;
        }

        /* ---------------------------------------------
           ✅ FIX #2: poster uploader dashed-frame corners
           We add a clean dashed frame overlay (rounded),
           and we suppress any inner dashed borders ONLY
           inside this poster box to prevent double borders.
        ---------------------------------------------- */
        .tikdPosterEmptyFrame {
          position: absolute;
          inset: 14px;
          border-radius: 18px;
          border: 1px dashed rgba(231, 222, 255, 0.32);
          box-shadow: inset 0 0 0 1px rgba(154, 70, 255, 0.12);
          opacity: 0.55;
          pointer-events: none;
        }

        /* prevent "cut" corners / weird clipping artifacts for dashed borders inside the poster box */
        .tikd-posterBox .tikdPosterFill [class*="border-dashed"] {
          border-color: transparent !important;
        }

        /* ---------------------------------------------
           ✅ Drop overlay: simple, stylish, scoped
           (no layout impact)
        ---------------------------------------------- */
        .tikd-dropOverlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0;
          transition:
            opacity 140ms ease,
            transform 140ms ease;
          transform: scale(0.9);
          border-radius: inherit;
        }

        .tikd-dropOverlay[data-active="true"] {
          opacity: 1;
          transform: scale(1);
        }

        .tikd-dropOverlay__backdrop {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background:
            radial-gradient(
              560px 260px at 30% 20%,
              rgba(154, 70, 255, 0.22),
              transparent 62%
            ),
            rgba(5, 5, 10, 0.34);
          backdrop-filter: blur(12px);
          box-shadow:
            0 18px 60px rgba(154, 70, 255, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }

        .tikd-dropOverlay__frame {
          position: absolute;
          inset: 10px;
          border-radius: calc(var(--tikd-drop-r, 16px) - 10px);
          border: 1px dashed rgba(231, 222, 255, 0.42);
          box-shadow: inset 0 0 0 1px rgba(154, 70, 255, 0.18);
        }

        .tikd-dropOverlay__content {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
        }

        .tikd-dropOverlay__pill {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(0, 0, 0, 0.28);
          box-shadow:
            0 10px 32px rgba(0, 0, 0, 0.35),
            0 0 0 1px rgba(154, 70, 255, 0.16);
          color: rgba(255, 255, 255, 0.92);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.2px;
        }

        .tikd-dropOverlay__pill svg {
          filter: drop-shadow(0 10px 18px rgba(154, 70, 255, 0.28));
        }

        /* ---------------------------------------------------
           ✅ Creation page ONLY: kill Steam card interactions
           (no hover tilt / float / opacity tricks)
        --------------------------------------------------- */
        .tikd-createPreviewCard .tikd-steamCard,
        .tikd-createPreviewCard .tikd-steamCard * {
          transform: none !important;
          transition: none !important;
        }

        .tikd-createPreviewCard .tikd-steamCard {
          opacity: 1 !important;
        }
      `}</style>

      {posterEditor?.open ? (
        <ImagePositionEditorModal
          open={posterEditor.open}
          mode="poster"
          src={posterEditor.src}
          title={posterEditor.title}
          onClose={() => setPosterEditor(null)}
          onApply={async ({ cropUrl }) => {
            const secureUrl = await commitCloudinaryCrop({
              publicId: posterEditor.publicId,
              cropUrl,
            });

            const nonce = Date.now();
            setPreviewNonce(nonce);

            const clean = stripQueryAndHash(secureUrl);
            posterOriginalRef.current = clean;

            setValue("image", withCacheBust(secureUrl, nonce), {
              shouldDirty: true,
              shouldValidate: true,
              shouldTouch: true,
            });

            void trigger("image");
            setPosterEditor(null);
          }}
          out={{ w: 900, h: 1350, ratio: 2 / 3 }}
          maxZoom={3.2}
        />
      ) : null}

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
        onSubmit={handleSubmit(submitImpl("draft"))}
        className="grid grid-cols-1 gap-6 pt-6 pb-14 md:grid-cols-12 max-w-7xl mx-auto"
        noValidate
      >
        <input type="hidden" {...register("organizationId")} />

        {/* ------------------------- Main form ----------------------- */}
        <div className="md:col-span-7 lg:col-span-8 space-y-6">
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
                          buttonClassName="cursor-pointer"
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
                          "rounded-full border px-4 py-2 text-sm transition-colors ",
                          active
                            ? "border-white/20 bg-primary-900/50 text-neutral-0"
                            : "border-white/10 text-neutral-300 hover:text-neutral-0 hover:border-primary-500 cursor-pointer",
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
                          "rounded-full px-3.5 py-1.5 text-sm transition ",
                          active
                            ? "bg-primary-900/50 text-neutral-0 ring-1 ring-primary-500/70"
                            : "text-neutral-300 hover:text-neutral-0 cursor-pointer",
                        )}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>

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
                                  accept="image/*"
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

              {/* promoters list unchanged (you had it elsewhere) */}
              {membersLoading ? null : members.length > 0 ? (
                <div className="space-y-2">
                  <FieldLabel>Promoters</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {members.map((m) => {
                      const active = (promoters as string[]).includes(m.email);
                      return (
                        <button
                          key={m._id}
                          type="button"
                          onClick={() => togglePromoter(m.email)}
                          className={clsx(
                            "rounded-full border px-3 py-1.5 text-xs transition-colors",
                            active
                              ? "border-white/20 bg-primary-900/50 text-neutral-0"
                              : "border-white/10 text-neutral-300 hover:text-neutral-0 hover:border-primary-500",
                          )}
                        >
                          {m.name || m.email}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
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
                className={clsx(
                  "tikd-posterBox relative w-full max-w-[224px] rounded-2xl aspect-[4/6] overflow-hidden cursor-pointer",
                  posterDragActive &&
                    "ring-2 ring-primary-500/70 shadow-[0_0_0_1px_rgba(154,70,255,0.18),0_22px_70px_rgba(154,70,255,0.14)]",
                )}
                style={
                  {
                    ["--tikd-drop-r" as unknown as string]: "24px",
                  } as React.CSSProperties
                }
                {...posterDnD}
              >
                {!hasPoster && !posterDragActive ? (
                  <div
                    className="tikdPosterEmptyFrame cursor-pointer"
                    aria-hidden
                  />
                ) : null}

                <div
                  className="tikd-dropOverlay cursor-pointer"
                  data-active={posterDragActive ? "true" : "false"}
                  aria-hidden
                >
                  <div className="tikd-dropOverlay__backdrop" />
                  <div className="tikd-dropOverlay__frame" />
                  <div className="tikd-dropOverlay__content">
                    <span className="tikd-dropOverlay__pill">
                      <ImagePlus className="h-4 w-4 text-primary-300" />
                      Drop to upload poster
                    </span>
                  </div>
                </div>

                <div
                  className={clsx(
                    "tikdPosterFill absolute inset-0 transition-opacity duration-150 cursor-pointer",
                    posterDragActive && "opacity-30",
                  )}
                >
                  <Controller
                    control={control}
                    name="image"
                    render={({ field }) => (
                      <ImageUpload
                        value={uiPoster || ""}
                        onChange={(next) => {
                          const nonce = Date.now();
                          setPreviewNonce(nonce);

                          const clean = stripQueryAndHash(next);
                          if (clean) posterOriginalRef.current = clean;

                          field.onChange(withCacheBust(next, nonce));
                        }}
                        publicId={`temp/events/posters/${posterPublicId}`}
                        sizing="full"
                        accept="image/*,video/*"
                        maxSizeMB={50}
                        className="h-full cursor-pointer"
                      />
                    )}
                  />
                </div>
              </div>
            </div>

            {hasPoster ? (
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={openAdjustPoster}
                  disabled={!canAdjustPoster}
                  title={
                    canAdjustPoster
                      ? "Adjust poster"
                      : "Poster adjust is available for image uploads only (not videos)."
                  }
                >
                  Adjust poster
                </Button>
              </div>
            ) : null}

            <p className="text-xs text-neutral-400 text-center mt-3">
              You can{" "}
              <span className="text-neutral-200 font-medium">drag & drop</span>{" "}
              a file onto the poster area (or the Live Preview) to upload.
            </p>
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

          <Section
            title="Event Media"
            desc="Upload additional photos/videos for your event page gallery. JPG/PNG/MP4 up to 50MB each."
            icon={<Film className="h-5 w-5 text-primary-300" />}
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-neutral-300">
                  {mediaFields.length === 0
                    ? "Optional — add a gallery to make your event page richer."
                    : `${mediaFields.length} item(s) added`}
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    addMedia({
                      url: "",
                      type: "image" as EventMediaType,
                      caption: "",
                      sortOrder: mediaFields.length,
                    })
                  }
                  disabled={mediaFields.length >= 30}
                >
                  <Plus className="h-4 w-4" />
                  Add media
                </Button>
              </div>

              {mediaFields.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {mediaFields.map((field, idx) => {
                    const urlName = `media.${idx}.url` as const;
                    const typeName = `media.${idx}.type` as const;

                    return (
                      <div
                        key={field.id}
                        className="rounded-xl border border-white/10 bg-neutral-950/60 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold">
                            Media #{idx + 1}
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              aria-label="Move up"
                              disabled={idx === 0}
                              onClick={() => moveMedia(idx, idx - 1)}
                              title="Move up"
                            >
                              ↑
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              aria-label="Move down"
                              disabled={idx === mediaFields.length - 1}
                              onClick={() => moveMedia(idx, idx + 1)}
                              title="Move down"
                            >
                              ↓
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              aria-label="Remove media"
                              onClick={() => removeMedia(idx)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <input type="hidden" {...register(typeName)} />

                        <div className="mt-3">
                          <Controller
                            control={control}
                            name={urlName}
                            render={({ field }) => (
                              <ImageUpload
                                value={field.value}
                                onChange={field.onChange}
                                onUploaded={(info) => {
                                  const nextType: EventMediaType =
                                    info.resourceType === "video"
                                      ? "video"
                                      : "image";
                                  setValue(typeName, nextType, {
                                    shouldDirty: true,
                                  });
                                }}
                                publicId={`temp/events/media/${uuid()}`}
                                sizing="tile"
                                accept="image/*,video/*"
                                maxSizeMB={50}
                                videoControls
                              />
                            )}
                          />
                        </div>

                        <div className="mt-3 space-y-2">
                          <FieldLabel>Caption (optional)</FieldLabel>
                          <LabelledInput
                            noLabel
                            placeholder="Short caption (shows under the media)"
                            {...register(`media.${idx}.caption` as const)}
                            size="md"
                            variant="transparent"
                          />
                          <p className="text-xs text-neutral-400">
                            Helps accessibility and context (optional).
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
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

              <div
                ref={previewWrapRef}
                className="tikd-createPreviewCard relative overflow-hidden"
              >
                <EventCard {...preview} clickable={false} steam={false} />

                {previewPosterRect ? (
                  <div
                    className="absolute z-30 overflow-hidden"
                    style={
                      {
                        top: previewPosterRect.top,
                        left: previewPosterRect.left,
                        width: previewPosterRect.width,
                        height: previewPosterRect.height,
                        borderRadius: previewPosterRect.radius,
                        ["--tikd-drop-r" as unknown as string]: `${previewPosterRect.radius}px`,
                      } as React.CSSProperties
                    }
                    {...previewDnD}
                  >
                    <button
                      type="button"
                      onClick={openPosterPicker}
                      aria-label="Change event poster"
                      className="absolute inset-0 cursor-pointer outline-none"
                      style={{ borderRadius: previewPosterRect.radius }}
                    >
                      <span className="sr-only">Change event poster</span>
                    </button>

                    <div
                      className="tikd-dropOverlay"
                      data-active={previewPosterDragActive ? "true" : "false"}
                      aria-hidden
                    >
                      <div className="tikd-dropOverlay__backdrop" />
                      <div className="tikd-dropOverlay__frame" />
                      <div className="tikd-dropOverlay__content">
                        <span className="tikd-dropOverlay__pill">
                          <ImagePlus className="h-4 w-4 text-primary-300" />
                          Drop to update poster
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-3 flex items-center justify-end gap-2 text-xs text-neutral-300">
                <MapPin className="h-4 w-4" />
                {preview.venue}
              </div>

              {hasPoster ? (
                <div className="mt-3 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={openAdjustPoster}
                    disabled={!canAdjustPoster}
                  >
                    Adjust poster
                  </Button>
                </div>
              ) : null}
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
