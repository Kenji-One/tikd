/* ------------------------------------------------------------------ */
/*  src/components/dashboard/tables/TrackingLinksTable.tsx            */
/* ------------------------------------------------------------------ */
"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  ChevronDown,
  Check,
  Plus,
  Pencil,
  X,
  Search,
  Ban,
  Calendar,
  Building2,
  Ticket,
} from "lucide-react";
import SortArrowsIcon from "@/components/ui/SortArrowsIcon";
import CopyButton from "@/components/ui/CopyButton";
import LabelledInput from "@/components/ui/LabelledInput";
import { Button } from "@/components/ui/Button";
import Image from "next/image";
import { titleInitial } from "@/lib/utils";

/* ------------------------------- Types ------------------------------ */
type DestinationKind = "Event" | "Organization";
type Status = "Active" | "Paused" | "Disabled";

type TrackingLinksScope = "all" | "organization" | "event";

type TrackingLinksTableProps = {
  scope?: TrackingLinksScope;
  organizationId?: string;
  eventId?: string;
  showViewAll?: boolean;
  viewAllHref?: string;
  headerLeftAction?: ReactNode;
  currentEventMeta?: {
    title: string;
    image: string | null;
    date: string | null;
    orgName: string | null;
  } | null;
};

type PresetIconKey =
  | "instagram"
  | "facebook"
  | "x"
  | "linkedin"
  | "google"
  | "youtube"
  | "snapchat"
  | "reddit"
  | "tiktok"
  | "telegram";

type Row = {
  id: string;
  name: string;

  // ✅ NEW: owning org of this tracking link
  organizationId: string;

  destinationKind: DestinationKind;
  destinationId: string;
  destinationTitle: string;

  url: string;

  iconKey?: PresetIconKey | null;
  iconUrl?: string | null;

  views: number;
  ticketsSold: number;
  revenue: number;
  status: Status;
  created: string;
};

/* ----------------------------- Helpers ----------------------------- */
type ApiSearchItemEvent = {
  id: string;
  type: "event";
  title: string;
  subtitle: string;
  orgName: string | null;
  date: string | null;
  image: string | null;
  href: string;
};

type ApiSearchItemOrg = {
  id: string;
  type: "org";
  title: string;
  subtitle: string;
  image: string | null;
  href: string;
};

type ApiSearchPayload = {
  success: boolean;
  results?: {
    events?: ApiSearchItemEvent[];
    orgs?: ApiSearchItemOrg[];
    teams?: unknown[];
    friends?: unknown[];
  };
};

// ✅ ADD (near other fetch helpers)

/** Best-effort extraction of org display fields (logo/title) */
function pickOrgBasicsFromResponse(json: unknown): {
  title: string | null;
  image: string | null;
} {
  if (!json || typeof json !== "object") return { title: null, image: null };
  const r = json as Record<string, unknown>;

  const org =
    (r.organization && typeof r.organization === "object"
      ? (r.organization as Record<string, unknown>)
      : null) ||
    (r.org && typeof r.org === "object"
      ? (r.org as Record<string, unknown>)
      : null) ||
    r;

  const title =
    (typeof org.title === "string" && org.title.trim()
      ? org.title.trim()
      : null) ||
    (typeof org.name === "string" && org.name.trim() ? org.name.trim() : null);

  const image =
    (typeof org.image === "string" && org.image.trim()
      ? org.image.trim()
      : null) ||
    (typeof org.logo === "string" && org.logo.trim()
      ? org.logo.trim()
      : null) ||
    (typeof org.logoUrl === "string" && org.logoUrl.trim()
      ? org.logoUrl.trim()
      : null) ||
    (typeof org.avatar === "string" && org.avatar.trim()
      ? org.avatar.trim()
      : null) ||
    (typeof org.avatarUrl === "string" && org.avatarUrl.trim()
      ? org.avatarUrl.trim()
      : null);

  return { title, image };
}

/** Best-effort extraction of event display fields (poster/title/date/orgName) */
function pickEventBasicsFromResponse(json: unknown): {
  title: string | null;
  image: string | null;
  date: string | null;
  orgName: string | null;
} {
  if (!json || typeof json !== "object")
    return { title: null, image: null, date: null, orgName: null };

  const r = json as Record<string, unknown>;
  const evt =
    (r.event && typeof r.event === "object"
      ? (r.event as Record<string, unknown>)
      : null) ||
    (r.data && typeof r.data === "object"
      ? (r.data as Record<string, unknown>)
      : null) ||
    r;

  const title =
    (typeof evt.title === "string" && evt.title.trim()
      ? evt.title.trim()
      : null) ||
    (typeof evt.name === "string" && evt.name.trim() ? evt.name.trim() : null);

  const image =
    (typeof evt.image === "string" && evt.image.trim()
      ? evt.image.trim()
      : null) ||
    (typeof evt.poster === "string" && evt.poster.trim()
      ? evt.poster.trim()
      : null) ||
    (typeof evt.posterUrl === "string" && evt.posterUrl.trim()
      ? evt.posterUrl.trim()
      : null) ||
    (typeof evt.coverImage === "string" && evt.coverImage.trim()
      ? evt.coverImage.trim()
      : null) ||
    (typeof evt.coverImageUrl === "string" && evt.coverImageUrl.trim()
      ? evt.coverImageUrl.trim()
      : null);

  const date =
    (typeof evt.date === "string" && evt.date.trim()
      ? evt.date.trim()
      : null) ||
    (typeof evt.startsAt === "string" && evt.startsAt.trim()
      ? evt.startsAt.trim()
      : null) ||
    (typeof evt.startDate === "string" && evt.startDate.trim()
      ? evt.startDate.trim()
      : null) ||
    (typeof evt.startTime === "string" && evt.startTime.trim()
      ? evt.startTime.trim()
      : null);

  let orgName: string | null =
    (typeof evt.orgName === "string" && evt.orgName.trim()
      ? evt.orgName.trim()
      : null) ||
    (typeof evt.organizationName === "string" && evt.organizationName.trim()
      ? evt.organizationName.trim()
      : null);

  if (!orgName && evt.organization && typeof evt.organization === "object") {
    const o = evt.organization as Record<string, unknown>;
    orgName =
      (typeof o.name === "string" && o.name.trim() ? o.name.trim() : null) ||
      (typeof o.title === "string" && o.title.trim() ? o.title.trim() : null);
  }

  return { title, image, date, orgName };
}

/**
 * ✅ Hydrate the "selected destination" card in EDIT mode so it uses the same
 * styling as freshly-selected items (poster/logo instead of letter).
 */
async function fetchDestinationMetaById(opts: {
  kind: DestinationKind;
  id: string;
  titleHint?: string;
  signal?: AbortSignal;
}): Promise<DestinationResult | null> {
  const { kind, id, titleHint, signal } = opts;

  // 1) Prefer direct resource endpoints (most reliable)
  if (kind === "Organization") {
    try {
      const res = await fetch(`/api/organizations/${encodeURIComponent(id)}`, {
        method: "GET",
        cache: "no-store",
        signal,
      });
      if (res.ok) {
        const json = (await res.json().catch(() => null)) as unknown;
        const basics = pickOrgBasicsFromResponse(json);
        return {
          kind: "Organization",
          id,
          title: basics.title ?? titleHint ?? "Organization",
          subtitle: "Organization",
          image: basics.image ?? null,
          date: null,
          orgName: null,
        };
      }
    } catch {
      // ignore -> fallback
    }
  } else {
    // Event
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(id)}`, {
        method: "GET",
        cache: "no-store",
        signal,
      });
      if (res.ok) {
        const json = (await res.json().catch(() => null)) as unknown;
        const basics = pickEventBasicsFromResponse(json);
        return {
          kind: "Event",
          id,
          title: basics.title ?? titleHint ?? "Event",
          subtitle: "Event",
          image: basics.image ?? null,
          date: basics.date ?? null,
          orgName: basics.orgName ?? null,
        };
      }
    } catch {
      // ignore -> fallback
    }
  }

  // 2) Fallback: search by titleHint and then match by id (works even if direct endpoint differs)
  const q = (titleHint || "").trim();
  if (!q) return null;

  try {
    const list = await fetchDestinations(q, signal);
    const found = list.find((x) => x.kind === kind && x.id === id);
    return found ?? null;
  } catch {
    return null;
  }
}

async function fetchDestinations(q: string, signal?: AbortSignal) {
  // Use the global search API because it already returns:
  // - events[].image (event poster)
  // - orgs[].image (org logo)
  // - events[].orgName + events[].date (nice subtitle row)
  const res = await fetch(
    `/api/search?q=${encodeURIComponent(q || "")}&type=all&limit=8`,
    { method: "GET", signal },
  );
  if (!res.ok) return [];

  const json = (await res.json()) as ApiSearchPayload;
  const events = Array.isArray(json.results?.events)
    ? json.results!.events!
    : [];
  const orgs = Array.isArray(json.results?.orgs) ? json.results!.orgs! : [];

  const mappedEvents: DestinationResult[] = events.map((e) => ({
    kind: "Event",
    id: e.id,
    title: e.title,
    subtitle: "Event",
    image: e.image ?? null,
    date: e.date ?? null,
    orgName: e.orgName ?? null,
  }));

  const mappedOrgs: DestinationResult[] = orgs.map((o) => ({
    kind: "Organization",
    id: o.id,
    title: o.title,
    subtitle: "Organization",
    image: o.image ?? null, // org logo
    date: null,
    orgName: null,
  }));

  // Events first, then orgs (matches how users think when searching)
  return [...mappedEvents, ...mappedOrgs];
}

type DestinationsApiResponse = {
  results: DestinationResult[];
};

async function fetchOrgScopedDestinations(
  organizationId: string,
  signal?: AbortSignal,
) {
  const res = await fetch(
    `/api/tracking-links/destinations?scope=organization&organizationId=${encodeURIComponent(
      organizationId,
    )}`,
    { method: "GET", signal },
  );
  if (!res.ok) return [];
  const json = (await res.json()) as DestinationsApiResponse;
  return Array.isArray(json.results) ? json.results : [];
}

type ApiRow = {
  id: string;
  name: string;

  // ✅ NEW (backend now returns it)
  organizationId: string;

  destinationKind: DestinationKind;
  destinationId: string;
  destinationTitle: string;

  url: string;

  iconKey?: PresetIconKey | null;
  iconUrl?: string | null;

  views: number;
  ticketsSold: number;
  revenue: number;
  status: Status;
  created: string;
};

async function fetchTrackingLinks(opts?: {
  scope?: TrackingLinksScope;
  organizationId?: string;
  eventId?: string;
  signal?: AbortSignal;
}) {
  const params = new URLSearchParams();

  if (opts?.scope === "organization" && opts.organizationId) {
    params.set("scope", "organization");
    params.set("organizationId", opts.organizationId);
  } else if (opts?.scope === "event" && opts.eventId) {
    params.set("scope", "event");
    params.set("eventId", opts.eventId);
  }

  const qs = params.toString();
  const url = qs ? `/api/tracking-links?${qs}` : "/api/tracking-links";

  const res = await fetch(url, { signal: opts?.signal, cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch tracking links (${res.status})`);
  }

  const json = (await res.json().catch(() => null)) as {
    rows?: ApiRow[];
    data?: ApiRow[];
    trackingLinks?: ApiRow[];
    links?: ApiRow[];
  } | null;

  const rows =
    (Array.isArray(json?.rows) ? json?.rows : null) ??
    (Array.isArray(json?.data) ? json?.data : null) ??
    (Array.isArray(json?.trackingLinks) ? json?.trackingLinks : null) ??
    (Array.isArray(json?.links) ? json?.links : null) ??
    [];

  return rows;
}

async function createTrackingLink(payload: {
  name: string;
  destinationKind: DestinationKind;
  destinationId: string;
  status: Status;
  iconKey?: PresetIconKey | null;
  iconUrl?: string | null;
}): Promise<ApiRow> {
  const res = await fetch("/api/tracking-links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || "Failed to create tracking link");
  }
  const json = (await res.json()) as { row?: ApiRow };
  if (!json.row) throw new Error("Invalid create response");
  return json.row;
}

async function updateTrackingLink(
  id: string,
  payload: Partial<{
    name: string;
    destinationKind: DestinationKind;
    destinationId: string;
    status: Status;
    iconKey?: PresetIconKey | null;
    iconUrl?: string | null;
  }>,
): Promise<void> {
  const res = await fetch(`/api/tracking-links/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || "Failed to update tracking link");
  }
}

async function archiveTrackingLink(id: string): Promise<void> {
  const res = await fetch(`/api/tracking-links/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || "Failed to archive tracking link");
  }
}

type SortKey =
  | "views"
  | "ticketsSold"
  | "revenue"
  | "created"
  | "name"
  | "status";
type SortDir = "asc" | "desc";

const parseDate = (d: string) => Date.parse(d) || 0;

function formatCreatedParts(label: string) {
  const ms = Date.parse(String(label || ""));
  if (!Number.isFinite(ms)) return { date: label, time: "" };
  const d = new Date(ms);
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return { date, time };
}

function formatShortDate(isoOrNull: string | null) {
  if (!isoOrNull) return "";
  const ms = Date.parse(isoOrNull);
  if (!Number.isFinite(ms)) return "";
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusRank(s: Status) {
  // Asc: Active < Paused < Disabled
  if (s === "Active") return 1;
  if (s === "Paused") return 2;
  return 3;
}

function formatMoneyUSD(amount: number) {
  const n = Number.isFinite(amount) ? amount : 0;
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function fullTrackingUrl(pathOnly: string) {
  if (!pathOnly) return "";
  return `${typeof window !== "undefined" ? window.location.origin : ""}${pathOnly}`;
}

function useEscapeToClose(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
}

/* ----------------------------- Icons ------------------------------ */
function PresetIcon({
  iconKey,
  className = "h-5 w-5",
}: {
  iconKey: PresetIconKey;
  className?: string;
}) {
  const src = `/icons/social/${iconKey}.svg`;

  return (
    <span
      className={clsx(
        "relative inline-flex items-center justify-center",
        className,
      )}
      aria-hidden
    >
      <Image
        src={src}
        alt=""
        fill
        sizes="24px"
        className={clsx(
          "object-contain opacity-90",
          "[filter:brightness(0)_saturate(100%)_invert(78%)_sepia(9%)_saturate(375%)_hue-rotate(200deg)_brightness(92%)_contrast(90%)]",
        )}
        draggable={false}
      />
    </span>
  );
}

function TrackingIcon({
  iconKey,
  iconUrl,
  className = "h-5 w-5",
}: {
  iconKey?: PresetIconKey | null;
  iconUrl?: string | null;
  className?: string;
}) {
  if (iconUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={iconUrl}
        alt=""
        className={clsx("rounded-[6px] object-cover", className, "opacity-80")}
      />
    );
  }
  if (iconKey) return <PresetIcon iconKey={iconKey} className={className} />;
  return null;
}

function TikdEditIcon() {
  return (
    <svg
      className="tikdEditSvg"
      height="1em"
      viewBox="0 0 512 512"
      aria-hidden="true"
    >
      <path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z"></path>
    </svg>
  );
}

function TikdTrashIcon() {
  return (
    <span className="tikdTrashWrap" aria-hidden="true">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 69 14"
        className="svgIcon bin-top"
      >
        <g clipPath="url(#clip0_35_24)">
          <path
            fill="black"
            d="M20.8232 2.62734L19.9948 4.21304C19.8224 4.54309 19.4808 4.75 19.1085 4.75H4.92857C2.20246 4.75 0 6.87266 0 9.5C0 12.1273 2.20246 14.25 4.92857 14.25H64.0714C66.7975 14.25 69 12.1273 69 9.5C69 6.87266 66.7975 4.75 64.0714 4.75H49.8915C49.5192 4.75 49.1776 4.54309 49.0052 4.21305L48.1768 2.62734C47.3451 1.00938 45.6355 0 43.7719 0H25.2281C23.3645 0 21.6549 1.00938 20.8232 2.62734ZM64.0023 20.0648C64.0397 19.4882 63.5822 19 63.0044 19H5.99556C5.4178 19 4.96025 19.4882 4.99766 20.0648L8.19375 69.3203C8.44018 73.0758 11.6746 76 15.5712 76H53.4288C57.3254 76 60.5598 73.0758 60.8062 69.3203L64.0023 20.0648Z"
          ></path>
        </g>
        <defs>
          <clipPath id="clip0_35_24">
            <rect fill="white" height="14" width="69"></rect>
          </clipPath>
        </defs>
      </svg>

      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 69 57"
        className="svgIcon bin-bottom"
      >
        <g clipPath="url(#clip0_35_22)">
          <path
            fill="black"
            d="M20.8232 -16.3727L19.9948 -14.787C19.8224 -14.4569 19.4808 -14.25 19.1085 -14.25H4.92857C2.20246 -14.25 0 -12.1273 0 -9.5C0 -6.8727 2.20246 -4.75 4.92857 -4.75H64.0714C66.7975 -4.75 69 -6.8727 69 -9.5C69 -12.1273 66.7975 -14.25 64.0714 -14.25H49.8915C49.5192 -14.25 49.1776 -14.4569 49.0052 -14.787L48.1768 -16.3727C47.3451 -17.9906 45.6355 -19 43.7719 -19H25.2281C23.3645 -19 21.6549 -17.9906 20.8232 -16.3727ZM64.0023 1.0648C64.0397 0.4882 63.5822 0 63.0044 0H5.99556C5.4178 0 4.96025 0.4882 4.99766 1.0648L8.19375 50.3203C8.44018 54.0758 11.6746 57 15.5712 57H53.4288C57.3254 57 60.5598 54.0758 60.8062 50.3203L64.0023 1.0648Z"
          ></path>
        </g>
        <defs>
          <clipPath id="clip0_35_22">
            <rect fill="white" height="57" width="69"></rect>
          </clipPath>
        </defs>
      </svg>
    </span>
  );
}

function Chip({
  children,
  color = "primary",
}: {
  children: ReactNode;
  color?: "primary" | "success" | "warning";
}) {
  const cls =
    color === "success"
      ? "bg-success-800 text-success-200 border-1 border-success-500"
      : color === "warning"
        ? "bg-warning-800 text-warning-200 border-1 border-warning-500"
        : "bg-primary-800 text-primary-200 border-1 border-primary-500";

  return (
    <span
      className={clsx(
        "rounded-md px-3 py-1.5 text-xs font-semibold leading-[100%] flex items-center justify-center",
        cls,
      )}
    >
      {children}
    </span>
  );
}

function safeHexToRgb(hex: string) {
  const raw = hex.replace("#", "").trim();
  if (raw.length !== 6) return null;
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  if (![r, g, b].every((n) => Number.isFinite(n))) return null;
  return { r, g, b };
}

function DestinationPill({
  kind,
  accentColor,
}: {
  kind: DestinationKind;
  accentColor?: string | null;
}) {
  const defaultEventHex = "#9A46FF";
  const defaultOrgHex = "#A670FF";

  const hex =
    kind === "Organization" &&
    typeof accentColor === "string" &&
    accentColor.trim()
      ? accentColor.trim()
      : kind === "Event"
        ? defaultEventHex
        : defaultOrgHex;

  const rgb = safeHexToRgb(hex);
  const soft =
    rgb != null
      ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.14)`
      : "rgba(154,70,255,0.14)";
  const ring =
    rgb != null
      ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.26)`
      : "rgba(154,70,255,0.26)";
  const text =
    rgb != null
      ? `rgba(${Math.min(255, rgb.r + 120)},${Math.min(
          255,
          rgb.g + 120,
        )},${Math.min(255, rgb.b + 120)},0.98)`
      : "rgba(231,222,255,0.98)";

  const Icon = kind === "Event" ? Ticket : Building2;

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-md px-2.5 pl-2 py-1.5",
        "text-[13px] font-semibold ring-1 ring-inset",
      )}
      style={{
        background: soft,
        color: text,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
        borderColor: ring,
      }}
      aria-label={`Destination: ${kind}`}
      title={kind}
    >
      <span className="inline-flex items-center justify-center">
        <Icon className="h-4 w-4" />
      </span>
      <span className="leading-none">{kind}</span>
    </span>
  );
}

function StatusPill({ status }: { status: Status }) {
  // Always use semantic status colors (NEVER org accent)
  const baseHex =
    status === "Active"
      ? "#22C55E" // green
      : status === "Paused"
        ? "#F59E0B" // yellow/amber
        : "#A3A3A3"; // gray

  const rgb = safeHexToRgb(baseHex);

  // Keep your "lighter pill" styling
  const alpha = status === "Active" ? 0.26 : status === "Paused" ? 0.18 : 0.1;
  const ringAlpha =
    status === "Active" ? 0.32 : status === "Paused" ? 0.26 : 0.18;

  const soft =
    rgb != null
      ? `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`
      : `rgba(163,163,163,${alpha})`;

  const ring =
    rgb != null
      ? `rgba(${rgb.r},${rgb.g},${rgb.b},${ringAlpha})`
      : `rgba(163,163,163,${ringAlpha})`;

  const text =
    rgb != null
      ? `rgba(${Math.min(255, rgb.r + 120)},${Math.min(
          255,
          rgb.g + 120,
        )},${Math.min(255, rgb.b + 120)},0.98)`
      : "rgba(231,231,231,0.98)";

  return (
    <span
      className={clsx(
        "inline-flex items-center justify-center",
        "h-7 rounded-md px-3",
        "text-[13px] font-semibold ring-1 ring-inset",
      )}
      style={{
        background: soft,
        color: text,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
        borderColor: ring,
        opacity: status === "Disabled" ? 0.85 : 1,
      }}
      aria-label={`Status: ${status}`}
      title={status}
    >
      {status}
    </span>
  );
}

// --- Accent color fetch helpers (safe + strict) ---
function pickAccentFromOrgResponse(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;

  // common shapes:
  // { accentColor: "..." }
  // { organization: { accentColor: "..." } }
  // { org: { accentColor: "..." } }
  const asRecord = json as Record<string, unknown>;

  const direct = asRecord.accentColor;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  const orgA = asRecord.organization;
  if (orgA && typeof orgA === "object") {
    const v = (orgA as Record<string, unknown>).accentColor;
    if (typeof v === "string" && v.trim()) return v.trim();
  }

  const orgB = asRecord.org;
  if (orgB && typeof orgB === "object") {
    const v = (orgB as Record<string, unknown>).accentColor;
    if (typeof v === "string" && v.trim()) return v.trim();
  }

  return null;
}

/* ----------------------------- Dialogs ---------------------------- */
function ArchiveLinkDialog({
  open,
  row,
  onClose,
  onConfirm,
  loading,
}: {
  open: boolean;
  row: Row | null;
  onClose: () => void;
  onConfirm: (row: Row) => void;
  loading?: boolean;
}) {
  useEscapeToClose(open, onClose);
  if (!open || !row) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={loading ? undefined : onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={clsx(
          "relative mx-4 w-full max-w-[700px] overflow-hidden rounded-xl",
          "border border-white/10 bg-neutral-900",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pb-7 pt-10 md:px-12 md:pb-10">
          <h2 className="text-center text-3xl font-semibold tracking-[-0.48px] text-neutral-0">
            Archive Link
          </h2>
          <p className="mt-2.5 text-center text-base text-neutral-400 tracking-[-0.32px]">
            Are you sure you want to Archive “{row.name}”?
          </p>

          <div
            className={clsx(
              "mt-5 rounded-lg border border-error-500 bg-neutral-800 p-4",
            )}
          >
            <div className="flex flex-col items-start gap-0.5">
              <div className="items-center flex-shrink-0 gap-1 inline-flex">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="w-4 h-4 flex-shrink-0"
                >
                  <path
                    d="M14.5067 10.6133L10.24 2.93333C9.66665 1.9 8.87332 1.33333 7.99998 1.33333C7.12665 1.33333 6.33332 1.9 5.75998 2.93333L1.49332 10.6133C0.953318 11.5933 0.893318 12.5333 1.32665 13.2733C1.75999 14.0133 2.61332 14.42 3.73332 14.42H12.2667C13.3867 14.42 14.24 14.0133 14.6733 13.2733C15.1067 12.5333 15.0467 11.5867 14.5067 10.6133ZM7.49998 6C7.49998 5.72666 7.72665 5.5 7.99998 5.5C8.27332 5.5 8.49998 5.72666 8.49998 6V9.33333C8.49998 9.60666 8.27332 9.83333 7.99998 9.83333C7.72665 9.83333 7.49998 9.60666 7.49998 9.33333V6ZM8.47332 11.8067C8.43998 11.8333 8.40665 11.86 8.37332 11.8867C8.33332 11.9133 8.29332 11.9333 8.25332 11.9467C8.21332 11.9667 8.17332 11.98 8.12665 11.9867C8.08665 11.9933 8.03998 12 7.99998 12C7.95998 12 7.91332 11.9933 7.86665 11.9867C7.82665 11.98 7.78665 11.9667 7.74665 11.9467C7.70665 11.9333 7.66665 11.9133 7.62665 11.8867C7.59332 11.86 7.55998 11.8333 7.52665 11.8067C7.40665 11.68 7.33332 11.5067 7.33332 11.3333C7.33332 11.16 7.40665 10.9867 7.52665 10.86C7.55998 10.8333 7.59332 10.8067 7.62665 10.78C7.66665 10.7533 7.70665 10.7333 7.74665 10.72C7.78665 10.7 7.82665 10.6867 7.86665 10.68C7.95332 10.66 8.04665 10.66 8.12665 10.68C8.17332 10.6867 8.21332 10.7 8.25332 10.72C8.29332 10.7333 8.33332 10.7533 8.37332 10.78C8.40665 10.8067 8.43998 10.8333 8.47332 10.86C8.59332 10.9867 8.66665 11.16 8.66665 11.3333C8.66665 11.5067 8.59332 11.68 8.47332 11.8067Z"
                    fill="#FF454A"
                  />
                </svg>
                <p className="text-base font-medium uppercase text-error-500 tracking-[-0.32px]">
                  Reminder
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-base text-neutral-0">
                  Links cannot be deleted as this may cause issues with your
                  records. Instead, they’ll be safely moved to your
                  <a
                    href="/dashboard/tracking/archives"
                    className="text-primary-500 underline decoration-primary-500 underline-offset-4 hover:text-primary-500 ml-1"
                    onClick={(e) => {
                      e.preventDefault();
                      onClose();
                      window.location.href = "/dashboard/tracking/archives";
                    }}
                  >
                    Archives Folder
                  </a>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className={clsx(
                "rounded-full",
                "border border-white/40 bg-transparent py-3 px-6 text-base font-medium text-neutral-0 leading-[100%]",
                "transition hover:border-white/60 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => onConfirm(row)}
              disabled={loading}
              className={clsx(
                "rounded-full px-6 py-3",
                "bg-error-500 text-base font-semibold text-white leading-[100%]",
                "transition hover:bg-error-400 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              <span className="inline-flex items-center justify-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M14.0467 3.48666C12.9733 3.38 11.9 3.3 10.82 3.24V3.23333L10.6733 2.36666C10.5733 1.75333 10.4267 0.833328 8.86667 0.833328H7.12C5.56667 0.833328 5.42 1.71333 5.31334 2.35999L5.17334 3.21333C4.55334 3.25333 3.93334 3.29333 3.31334 3.35333L1.95334 3.48666C1.67334 3.51333 1.47334 3.76 1.5 4.03333C1.52667 4.30666 1.76667 4.50666 2.04667 4.47999L3.40667 4.34666C6.9 3.99999 10.42 4.13333 13.9533 4.48666C13.9733 4.48666 13.9867 4.48666 14.0067 4.48666C14.26 4.48666 14.48 4.29333 14.5067 4.03333C14.5267 3.76 14.3267 3.51333 14.0467 3.48666Z"
                    fill="white"
                  />
                  <path
                    d="M12.82 5.42666C12.66 5.26 12.44 5.16666 12.2133 5.16666H3.78667C3.56001 5.16666 3.33334 5.26 3.18001 5.42666C3.02667 5.59333 2.94001 5.82 2.95334 6.05333L3.36667 12.8933C3.44001 13.9067 3.53334 15.1733 5.86001 15.1733H10.14C12.4667 15.1733 12.56 13.9133 12.6333 12.8933L13.0467 6.06C13.06 5.82 12.9733 5.59333 12.82 5.42666ZM9.10667 11.8333H6.88667C6.61334 11.8333 6.38667 11.6067 6.38667 11.3333C6.38667 11.06 6.61334 10.8333 6.88667 10.8333H9.10667C9.38001 10.8333 9.60667 11.06 9.60667 11.3333C9.60667 11.6067 9.38001 11.8333 9.10667 11.8333ZM9.66667 9.16666H6.33334C6.06001 9.16666 5.83334 8.94 5.83334 8.66666C5.83334 8.39333 6.06001 8.16666 6.33334 8.16666H9.66667C9.94001 8.16666 10.1667 8.39333 10.1667 8.66666C10.1667 8.94 9.94001 9.16666 9.66667 9.16666Z"
                    fill="white"
                  />
                </svg>
                {loading ? "Archiving..." : "Archive"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QrDialog({
  open,
  row,
  onClose,
}: {
  open: boolean;
  row: Row | null;
  onClose: () => void;
}) {
  useEscapeToClose(open, onClose);
  if (!open || !row) return null;

  const qrValue = fullTrackingUrl(row.url) || row.url;
  const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=520x520&data=${encodeURIComponent(
    qrValue,
  )}`;

  const handleShare = async () => {
    try {
      if (typeof navigator !== "undefined" && "share" in navigator) {
        await navigator.share({ title: row.name, text: qrValue, url: qrValue });
        return;
      }
    } catch {
      // ignore
    }

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(qrValue);
      }
    } catch {
      // ignore
    }
  };

  const handleSave = async () => {
    try {
      const a = document.createElement("a");
      a.href = qrImg;
      a.download = `${row.name || "qr"}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={clsx(
          "relative mx-4 w-full max-w-[487px] overflow-hidden rounded-xl",
          "border border-white/10 bg-neutral-900 ",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-8 pb-4 pt-10 md:px-12">
          <div className="mx-auto flex w-full max-w-[360px] flex-col items-center">
            <div
              className={clsx(
                "relative w-full max-w-[170px] overflow-hidden rounded-lg bg-white p-2",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrImg} alt="QR Code" className="h-auto w-full" />
            </div>

            <p className="mt-6 text-center text-neutral-400">
              {row.name.toUpperCase()}
            </p>

            <p className="mt-1 text-center text-3xl font-semibold uppercase tracking-[-0.48px] text-neutral-0 ">
              {row.url.replaceAll("/", " ").trim() || "TRACKING LINK"}
            </p>

            <div className="mt-6 flex w-full items-center justify-center gap-4">
              <button
                type="button"
                onClick={handleShare}
                className={clsx(
                  "rounded-full",
                  "border border-white/40 bg-transparent py-3 px-6 text-base font-medium text-neutral-0",
                  "transition hover:border-white/60 cursor-pointer",
                )}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      d="M10.76 1.97333L4.74002 3.97333C0.693351 5.32666 0.693351 7.53333 4.74002 8.88L6.52668 9.47333L7.12002 11.26C8.46668 15.3067 10.68 15.3067 12.0267 11.26L14.0333 5.24666C14.9267 2.54666 13.46 1.07333 10.76 1.97333ZM10.9733 5.56L8.44002 8.10666C8.34002 8.20667 8.21335 8.25333 8.08668 8.25333C7.96002 8.25333 7.83335 8.20667 7.73335 8.10666C7.54002 7.91333 7.54002 7.59333 7.73335 7.4L10.2667 4.85333C10.46 4.66 10.78 4.66 10.9733 4.85333C11.1667 5.04666 11.1667 5.36666 10.9733 5.56Z"
                      fill="white"
                    />
                  </svg>
                  Share
                </span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                className={clsx(
                  "rounded-full px-6 py-3",
                  "bg-primary-500 text-base font-semibold text-white",
                  "transition hover:bg-primary-400 cursor-pointer",
                )}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      d="M13.6667 6.79334H11.74C10.16 6.79334 8.87335 5.50667 8.87335 3.92667V2C8.87335 1.63334 8.57335 1.33334 8.20669 1.33334H5.38002C3.32669 1.33334 1.66669 2.66667 1.66669 5.04667V10.9533C1.66669 13.3333 3.32669 14.6667 5.38002 14.6667H10.62C12.6734 14.6667 14.3334 13.3333 14.3334 10.9533V7.46C14.3334 7.09334 14.0334 6.79334 13.6667 6.79334ZM8.18669 10.52L6.85335 11.8533C6.80669 11.9 6.74669 11.94 6.68669 11.96C6.62669 11.9867 6.56669 12 6.50002 12C6.43335 12 6.37335 11.9867 6.31335 11.96C6.26002 11.94 6.20669 11.9 6.16669 11.86C6.16002 11.8533 6.15335 11.8533 6.15335 11.8467L4.82002 10.5133C4.62669 10.32 4.62669 10 4.82002 9.80667C5.01335 9.61334 5.33335 9.61334 5.52669 9.80667L6.00002 10.2933V7.5C6.00002 7.22667 6.22669 7 6.50002 7C6.77335 7 7.00002 7.22667 7.00002 7.5V10.2933L7.48002 9.81334C7.67335 9.62 7.99335 9.62 8.18669 9.81334C8.38002 10.0067 8.38002 10.3267 8.18669 10.52Z"
                      fill="white"
                    />
                    <path
                      d="M11.62 5.87333C12.2533 5.88 13.1333 5.88 13.8867 5.88C14.2667 5.88 14.4667 5.43333 14.2 5.16667C13.24 4.2 11.52 2.46 10.5333 1.47333C10.26 1.2 9.78668 1.38667 9.78668 1.76667V4.09333C9.78668 5.06667 10.6133 5.87333 11.62 5.87333Z"
                      fill="white"
                    />
                  </svg>
                  Save
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-10 text-sm font-medium text-neutral-500 hover:text-neutral-0 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type TrackingLinkDraft = {
  name: string;

  destinationKind: DestinationKind | null;
  destinationId: string;
  destinationTitle: string;

  status: Status;

  iconKey?: PresetIconKey | null;
  iconUrl?: string | null;
};

type DestinationResult = {
  kind: DestinationKind;
  id: string;
  title: string;
  subtitle: string;
  image: string | null;
  date: string | null;
  orgName: string | null;
};

function DestinationThumb({
  kind,
  image,
  title,
}: {
  kind: DestinationKind;
  image: string | null;
  title: string;
}) {
  if (image) {
    return (
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5">
        <Image
          src={image}
          alt={title || ""}
          fill
          sizes="48px"
          className="object-cover"
          draggable={false}
        />
      </div>
    );
  }

  const Icon = kind === "Event" ? Ticket : Building2;

  return (
    <div
      className={clsx(
        "relative h-12 w-12 shrink-0 overflow-hidden rounded-xl",
        "border border-white/10 bg-[radial-gradient(120%_120%_at_10%_0%,rgba(154,70,255,0.20)_0%,rgba(255,255,255,0.06)_45%,rgba(255,255,255,0.03)_100%)]",
        "flex items-center justify-center",
      )}
      aria-hidden
      title={title}
    >
      {titleInitial(title)}
    </div>
  );
}

// ✅ Replace your existing KindBadge with this one
function KindBadge({ kind }: { kind: DestinationKind }) {
  const isEvent = kind === "Event";
  const Icon = isEvent ? Ticket : Building2;
  const label = isEvent ? "EVENT" : "ORG";

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5",
        "h-8.5 rounded-md px-2",
        "border border-white/10 bg-neutral-950/40",
        "text-[12px] font-semibold tracking-[0.14em] text-white/70",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
      )}
    >
      <Icon className="h-4 w-4 text-white/55" />
      {label}
    </span>
  );
}

function SelectedDestinationCard({
  dest,
  disabled,
  onClear,
  loading,
}: {
  dest: DestinationResult;
  disabled?: boolean;
  onClear: () => void;
  loading?: boolean;
}) {
  return (
    <div
      className={clsx(
        "rounded-lg border",
        "border-primary-500/55 bg-primary-500/12",
      )}
    >
      <div className="flex items-center gap-3 px-3 py-3">
        {/* Thumb */}
        {loading ? (
          <div
            className={clsx(
              "h-12 w-12 shrink-0 rounded-xl border border-white/10 bg-white/5",
              "animate-pulse",
            )}
            aria-hidden
          />
        ) : (
          <DestinationThumb
            kind={dest.kind}
            image={dest.image}
            title={dest.title}
          />
        )}

        {/* Title + subtitle */}
        <div className="min-w-0 flex-1">
          {loading ? (
            <>
              <div className="h-4 w-[62%] rounded-md bg-white/10 animate-pulse" />
              <div className="mt-2 h-3 w-[46%] rounded-md bg-white/10 animate-pulse" />
            </>
          ) : (
            <>
              <p className="truncate text-[15px] font-semibold text-neutral-0 tracking-[-0.2px]">
                {dest.title}
              </p>

              <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-neutral-400">
                {dest.kind === "Event" ? (
                  <>
                    {dest.orgName ? (
                      <>
                        <span className="truncate">{dest.orgName}</span>
                        {dest.date ? (
                          <>
                            <span className="text-neutral-600">•</span>
                            <span className="inline-flex items-center gap-1 text-neutral-400">
                              <Calendar className="h-3.5 w-3.5 text-neutral-500" />
                              <span>{formatShortDate(dest.date)}</span>
                            </span>
                          </>
                        ) : null}
                      </>
                    ) : dest.date ? (
                      <span className="inline-flex items-center gap-1 text-neutral-400">
                        <Calendar className="h-3.5 w-3.5 text-neutral-500" />
                        <span>{formatShortDate(dest.date)}</span>
                      </span>
                    ) : (
                      <span className="truncate">Event</span>
                    )}
                  </>
                ) : (
                  <span className="truncate">{dest.subtitle}</span>
                )}
              </p>
            </>
          )}
        </div>

        {/* Right side pills + clear */}
        <div className="shrink-0 flex items-center gap-2">
          <DestinationPill kind={dest.kind} />

          {!disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClear();
              }}
              disabled={disabled}
              className={clsx(
                "inline-flex h-8 w-8 items-center justify-center rounded-md border cursor-pointer",
                "transition",
                disabled
                  ? "border-white/10 bg-white/5 text-white/30 cursor-not-allowed"
                  : "border-primary-500/30 bg-primary-500/15 text-primary-200 hover:bg-primary-500/22",
                "focus:outline-none focus:ring-1 focus:ring-primary-500/35",
              )}
              title={disabled ? "Locked" : "Clear selection"}
              aria-label="Clear selection"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TrackingLinkDialog({
  open,
  mode,
  initial,
  onClose,
  onSave,
  saving,
  scope,
  organizationId,
  eventId,
  currentEventMeta,
}: {
  open: boolean;
  mode: "create" | "edit";
  initial?: Row | null;
  onClose: () => void;
  onSave: (draft: TrackingLinkDraft) => void;
  saving?: boolean;

  scope: TrackingLinksScope;
  organizationId?: string;
  eventId?: string;
  currentEventMeta?: {
    title: string;
    image: string | null;
    date: string | null;
    orgName: string | null;
  } | null;
}) {
  useEscapeToClose(open, onClose);

  const isEventScope = scope === "event" && !!eventId;
  const isOrgScope = scope === "organization" && !!organizationId;

  const [draft, setDraft] = useState<TrackingLinkDraft>({
    name: "",
    destinationKind: null,
    destinationId: "",
    destinationTitle: "",
    status: "Active",
    iconKey: null,
    iconUrl: null,
  });

  const [touched, setTouched] = useState(false);

  // Destination search UI state
  const [destQuery, setDestQuery] = useState("");
  const [destOpen, setDestOpen] = useState(false);
  const [destLoading, setDestLoading] = useState(false);
  const [destError, setDestError] = useState<string | null>(null);
  const [destResults, setDestResults] = useState<DestinationResult[]>([]);
  const [selectedDestMeta, setSelectedDestMeta] =
    useState<DestinationResult | null>(null);
  const [hydratingSelectedDest, setHydratingSelectedDest] = useState(false);

  const destWrapRef = useRef<HTMLDivElement | null>(null);
  const destInputRef = useRef<HTMLInputElement | null>(null);
  const destAbortRef = useRef<AbortController | null>(null);
  const destDebounceRef = useRef<number | null>(null);
  const hydrateAbortRef = useRef<AbortController | null>(null);

  const [destOrgAccentById, setDestOrgAccentById] = useState<
    Record<string, string>
  >({});

  // Org-scope preloaded list (org + its events)
  const [orgScopeList, setOrgScopeList] = useState<DestinationResult[] | null>(
    null,
  );
  const [orgScopeLoading, setOrgScopeLoading] = useState(false);
  const [orgScopeError, setOrgScopeError] = useState<string | null>(null);
  const orgScopeAbortRef = useRef<AbortController | null>(null);

  // Status dropdown state
  const [statusOpen, setStatusOpen] = useState(false);
  const statusWrapRef = useRef<HTMLDivElement | null>(null);

  // Icon search state
  const [iconQuery, setIconQuery] = useState("");

  // Custom icon upload (preview only unless you pass a real URL)
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastObjectUrlRef = useRef<string | null>(null);

  const dropdownPanelOverlayCls = clsx(
    "absolute left-0 right-0 z-[90] mt-2 overflow-hidden rounded-xl",
    "border border-white/10 bg-neutral-900",
    "shadow-[0_22px_70px_rgba(0,0,0,0.55)]",
  );

  const dropdownPanelFlowCls = clsx(
    "relative z-[90] mt-2 overflow-hidden rounded-xl",
    "border border-white/10 bg-neutral-900",
    "shadow-[0_22px_70px_rgba(0,0,0,0.55)]",
  );

  const clearDestination = useCallback(() => {
    setDraft((prev) => ({
      ...prev,
      destinationKind: null,
      destinationId: "",
      destinationTitle: "",
    }));
    setSelectedDestMeta(null);
    setDestQuery("");
    setDestError(null);
    setDestResults([]);
    setDestOpen(true);

    window.setTimeout(() => {
      destInputRef.current?.focus();
    }, 0);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (!isOrgScope || !organizationId) return;

    if (orgScopeAbortRef.current) {
      orgScopeAbortRef.current.abort();
      orgScopeAbortRef.current = null;
    }

    const ac = new AbortController();
    orgScopeAbortRef.current = ac;

    setOrgScopeLoading(true);
    setOrgScopeError(null);

    fetchOrgScopedDestinations(organizationId, ac.signal)
      .then((list) => {
        if (ac.signal.aborted) return;
        setOrgScopeList(list);
        setOrgScopeLoading(false);
        setOrgScopeError(null);
      })
      .catch((e) => {
        if (ac.signal.aborted) return;
        setOrgScopeList([]);
        setOrgScopeLoading(false);
        setOrgScopeError(getErrorMessage(e, "Failed to load destinations."));
      });

    return () => {
      ac.abort();
    };
  }, [open, isOrgScope, organizationId]);

  useEffect(() => {
    if (!open) return;

    if (destDebounceRef.current) {
      window.clearTimeout(destDebounceRef.current);
      destDebounceRef.current = null;
    }
    if (destAbortRef.current) {
      destAbortRef.current.abort();
      destAbortRef.current = null;
    }

    setTouched(false);
    setDestOpen(false);
    setDestLoading(false);
    setDestError(null);
    setDestResults([]);
    setStatusOpen(false);
    setIconQuery("");
    setHydratingSelectedDest(false);

    if (lastObjectUrlRef.current) {
      URL.revokeObjectURL(lastObjectUrlRef.current);
      lastObjectUrlRef.current = null;
    }

    if (mode === "edit" && initial) {
      setDraft({
        name: initial.name || "",
        destinationKind: initial.destinationKind,
        destinationId: initial.destinationId,
        destinationTitle: initial.destinationTitle,
        status: initial.status,
        iconKey: initial.iconKey ?? null,
        iconUrl: initial.iconUrl ?? null,
      });

      const meta: DestinationResult = {
        kind: initial.destinationKind,
        id: initial.destinationId,
        title: initial.destinationTitle,
        subtitle:
          initial.destinationKind === "Event" ? "Event" : "Organization",
        image: null,
        date: null,
        orgName: null,
      };

      setSelectedDestMeta(meta);
      setDestQuery("");
    } else {
      setDraft({
        name: "",
        destinationKind: null,
        destinationId: "",
        destinationTitle: "",
        status: "Active",
        iconKey: null,
        iconUrl: null,
      });
      setSelectedDestMeta(null);
      setDestQuery("");
    }

    if (isEventScope && eventId) {
      const lockedTitle =
        (mode === "edit" && initial?.destinationTitle
          ? initial.destinationTitle
          : null) ||
        currentEventMeta?.title ||
        "Current Event";

      setDraft((prev) => ({
        ...prev,
        destinationKind: "Event",
        destinationId: eventId,
        destinationTitle: lockedTitle,
      }));

      setSelectedDestMeta({
        kind: "Event",
        id: eventId,
        title: lockedTitle,
        subtitle: "Event",
        image: currentEventMeta?.image ?? null,
        date: currentEventMeta?.date ?? null,
        orgName: currentEventMeta?.orgName ?? null,
      });

      setDestQuery("");
    }

    const t = window.setTimeout(() => {
      const el = document.getElementById("tracking-link-name");
      if (el && "focus" in el) (el as HTMLInputElement).focus();
    }, 0);

    return () => {
      window.clearTimeout(t);

      // ✅ add this
      if (hydrateAbortRef.current) {
        hydrateAbortRef.current.abort();
        hydrateAbortRef.current = null;
      }
    };
  }, [open, mode, initial, isEventScope, eventId, currentEventMeta]);

  useEffect(() => {
    if (!open) return;
    if (mode !== "create") return;
    if (!isOrgScope) return;
    if (isEventScope) return;
    if (!orgScopeList) return;
    if (orgScopeLoading) return;
    if (orgScopeList.length !== 1) return;

    const only = orgScopeList[0];

    setDraft((prev) => {
      if (prev.destinationId) return prev;
      return {
        ...prev,
        destinationKind: only.kind,
        destinationId: only.id,
        destinationTitle: only.title,
      };
    });

    setSelectedDestMeta((prev) => prev ?? only);
  }, [open, mode, isOrgScope, isEventScope, orgScopeList, orgScopeLoading]);

  useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;

      const inDest = !!destWrapRef.current?.contains(target);
      const inStatus = !!statusWrapRef.current?.contains(target);

      if (!inDest) setDestOpen(false);
      if (!inStatus) setStatusOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) return;
    if (lastObjectUrlRef.current) {
      URL.revokeObjectURL(lastObjectUrlRef.current);
      lastObjectUrlRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!destOpen) return;
    if (isEventScope) return;

    const q = destQuery.trim();

    if (destDebounceRef.current) {
      window.clearTimeout(destDebounceRef.current);
      destDebounceRef.current = null;
    }
    if (destAbortRef.current) {
      destAbortRef.current.abort();
      destAbortRef.current = null;
    }

    if (!q) {
      if (isOrgScope) {
        setDestLoading(orgScopeLoading);
        setDestError(orgScopeError);
        setDestResults(orgScopeList ?? []);
        return;
      }

      setDestLoading(false);
      setDestError(null);
      setDestResults([]);
      return;
    }

    setDestLoading(true);
    setDestError(null);

    const ac = new AbortController();
    destAbortRef.current = ac;

    destDebounceRef.current = window.setTimeout(() => {
      fetchDestinations(q, ac.signal)
        .then((list) => {
          if (ac.signal.aborted) return;
          setDestResults(list);
          setDestLoading(false);
          setDestError(null);
        })
        .catch((e) => {
          if (ac.signal.aborted) return;
          setDestLoading(false);
          setDestResults([]);
          setDestError(getErrorMessage(e, "Search failed. Try again."));
        });
    }, 220);

    return () => {
      if (destDebounceRef.current) {
        window.clearTimeout(destDebounceRef.current);
        destDebounceRef.current = null;
      }
      if (destAbortRef.current) {
        destAbortRef.current.abort();
        destAbortRef.current = null;
      }
    };
  }, [
    open,
    destOpen,
    destQuery,
    isEventScope,
    isOrgScope,
    orgScopeList,
    orgScopeLoading,
    orgScopeError,
  ]);

  useEffect(() => {
    if (!open) return;

    const orgIds = Array.from(
      new Set(
        (destResults ?? [])
          .filter((d) => d.kind === "Organization")
          .map((d) => d.id)
          .filter(Boolean),
      ),
    );

    const missing = orgIds.filter((id) => !destOrgAccentById[id]);
    if (missing.length === 0) return;

    let alive = true;

    (async () => {
      try {
        const pairs = await Promise.all(
          missing.map(async (id) => {
            try {
              const res = await fetch(
                `/api/organizations/${encodeURIComponent(id)}`,
                {
                  method: "GET",
                  cache: "no-store",
                },
              );
              if (!res.ok) return [id, null] as const;

              const json = (await res.json().catch(() => null)) as unknown;
              const accent = pickAccentFromOrgResponse(json);
              return [id, accent] as const;
            } catch {
              return [id, null] as const;
            }
          }),
        );

        if (!alive) return;

        const next: Record<string, string> = {};
        for (const [id, accent] of pairs) {
          if (typeof accent === "string" && accent.trim()) {
            next[id] = accent.trim();
          }
        }

        if (Object.keys(next).length > 0) {
          setDestOrgAccentById((prev) => ({ ...prev, ...next }));
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      alive = false;
    };
  }, [open, destResults, destOrgAccentById]);

  useEffect(() => {
    if (!open) return;
    if (mode !== "edit") return;
    if (!initial) return;
    if (isEventScope) return; // event-scope already uses currentEventMeta

    const kind = initial.destinationKind;
    const id = initial.destinationId;
    if (!kind || !id) return;

    // If we already have an image (or useful meta), don't waste a fetch
    const needsHydration =
      !selectedDestMeta ||
      selectedDestMeta.kind !== kind ||
      selectedDestMeta.id !== id ||
      (selectedDestMeta.image == null &&
        (kind === "Organization" || kind === "Event"));

    if (!needsHydration) return;

    if (hydrateAbortRef.current) {
      hydrateAbortRef.current.abort();
      hydrateAbortRef.current = null;
    }

    const ac = new AbortController();
    hydrateAbortRef.current = ac;
    setHydratingSelectedDest(true);

    (async () => {
      const hydrated = await fetchDestinationMetaById({
        kind,
        id,
        titleHint: initial.destinationTitle,
        signal: ac.signal,
      });

      if (ac.signal.aborted) return;
      if (!hydrated) {
        setHydratingSelectedDest(false);
        return;
      }

      // Only apply if we're still editing the same row
      setSelectedDestMeta((prev) => {
        if (
          prev &&
          prev.kind === initial.destinationKind &&
          prev.id === initial.destinationId &&
          prev.image // already hydrated meanwhile
        ) {
          return prev;
        }
        return hydrated;
      });

      // Keep title in sync (optional but nice)
      setDraft((prev) => {
        if (
          prev.destinationKind === kind &&
          prev.destinationId === id &&
          (prev.destinationTitle || "").trim() ===
            (initial.destinationTitle || "").trim()
        ) {
          return {
            ...prev,
            destinationTitle: hydrated.title,
          };
        }
        return prev;
      });
      setHydratingSelectedDest(false);
    })();

    return () => {
      ac.abort();
      setHydratingSelectedDest(false);
    };
  }, [open, mode, initial, isEventScope, selectedDestMeta]);

  const title =
    mode === "create" ? "Create Tracking Link" : "Edit Tracking Link";

  const statusOptions: { value: Status; label: string; desc?: string }[] = [
    { value: "Active", label: "Active", desc: "Enabled and collecting views" },
    { value: "Paused", label: "Paused", desc: "Temporarily disabled" },
    { value: "Disabled", label: "Disabled", desc: "Fully disabled" },
  ];

  const presetIcons: Array<{ key: PresetIconKey; label: string }> = [
    { key: "instagram", label: "Instagram" },
    { key: "facebook", label: "Facebook" },
    { key: "x", label: "X" },
    { key: "linkedin", label: "LinkedIn" },
    { key: "google", label: "Google" },
    { key: "youtube", label: "YouTube" },
    { key: "snapchat", label: "Snapchat" },
    { key: "reddit", label: "Reddit" },
    { key: "tiktok", label: "TikTok" },
    { key: "telegram", label: "Telegram" },
  ];

  const filteredPresetIcons = useMemo(() => {
    const q = iconQuery.trim().toLowerCase();
    if (!q) return presetIcons;
    return presetIcons.filter((p) => p.label.toLowerCase().includes(q));
  }, [iconQuery]);

  const handlePickDestination = (d: DestinationResult) => {
    setDraft((prev) => ({
      ...prev,
      destinationKind: d.kind,
      destinationId: d.id,
      destinationTitle: d.title,
    }));
    setSelectedDestMeta(d);

    setDestQuery("");
    setDestError(null);
    setDestOpen(false);
  };

  const handleUploadIcon = (file: File | null) => {
    if (!file) return;

    if (lastObjectUrlRef.current) {
      URL.revokeObjectURL(lastObjectUrlRef.current);
      lastObjectUrlRef.current = null;
    }

    const url = URL.createObjectURL(file);
    lastObjectUrlRef.current = url;

    setDraft((prev) => ({
      ...prev,
      iconUrl: url,
      iconKey: null,
    }));
  };

  const clearCustomIcon = () => {
    if (lastObjectUrlRef.current) {
      URL.revokeObjectURL(lastObjectUrlRef.current);
      lastObjectUrlRef.current = null;
    }
    setDraft((prev) => ({ ...prev, iconUrl: null }));
  };

  if (!open) return null;

  const destinationOk = !!draft.destinationKind && !!draft.destinationId;
  const nameOk = draft.name.trim().length >= 2;
  const statusOk = !!draft.status;

  const canSave = nameOk && destinationOk && statusOk && !saving;

  const errName = !nameOk && touched;
  const errDest = !destinationOk && touched;

  const hasNoIcon = !draft.iconKey && !draft.iconUrl;

  return (
    // ✅ NO page scroll. Dialog is capped to viewport and scrolls internally.
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={saving ? undefined : onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        className={clsx(
          "relative mx-4 w-full max-w-[720px] rounded-xl",
          "border border-white/10 bg-neutral-900",
          "max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)]",
          "overflow-hidden flex flex-col",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (fixed) */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 md:px-8">
          <div className="min-w-0">
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.48px] text-neutral-0">
              {title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-white/10 p-2 text-white/70 hover:text-white hover:border-white/20 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body (scrolls) */}
        <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8 tikdHideScrollbar">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Name */}
            <div className="md:col-span-2">
              <LabelledInput
                id="tracking-link-name"
                label="Tracking Link Name"
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, name: e.target.value }))
                }
                onBlur={() => setTouched(true)}
                placeholder="Enter name."
                size="lg"
                variant="full"
                disabled={saving}
                error={
                  errName
                    ? "Please enter a name (at least 2 characters)."
                    : null
                }
                className={clsx(
                  "bg-neutral-900 border-white/10",
                  errName
                    ? "border-error-500 focus:border-error-400"
                    : "focus:border-primary-600/50",
                )}
              />
            </div>

            {/* Icon selector (optional) */}
            <div className="md:col-span-2">
              <label className="block leading-[90%] font-normal text-white mb-2">
                Icon (optional)
              </label>

              <div className="rounded-lg border border-white/10 bg-neutral-900 p-3">
                <div
                  className={clsx(
                    "relative w-full",
                    "rounded-lg border border-white/10 bg-white/5 h-11",
                  )}
                >
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input
                    value={iconQuery}
                    onChange={(e) => setIconQuery(e.target.value)}
                    placeholder="Search icons..."
                    disabled={saving}
                    className={clsx(
                      "h-11 w-full rounded-lg bg-transparent",
                      "pl-10 pr-4 text-[12px] text-neutral-100",
                      "placeholder:text-neutral-500",
                      "outline-none border-none focus:ring-1 focus:ring-primary-500",
                      "disabled:opacity-60 disabled:cursor-not-allowed",
                    )}
                  />
                </div>

                <div className={clsx("mt-3 flex gap-3", "flex-wrap")}>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      clearCustomIcon();
                      setDraft((d) => ({ ...d, iconKey: null, iconUrl: null }));
                    }}
                    aria-label="No icon"
                    aria-pressed={hasNoIcon}
                    title="No icon"
                    className={clsx(
                      "group inline-flex items-center justify-center shrink-0",
                      "h-10 w-10 md:h-11 md:w-11 rounded-md border",
                      "transition cursor-pointer",
                      "focus:outline-none focus:ring-1 focus:ring-primary-500/40",
                      "disabled:cursor-not-allowed disabled:opacity-60",
                      hasNoIcon
                        ? "border-primary-500/40 bg-primary-500/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20",
                    )}
                  >
                    <Ban
                      size={24}
                      className={clsx(
                        "transition",
                        hasNoIcon
                          ? "text-primary-300"
                          : "text-neutral-400 group-hover:text-neutral-200",
                      )}
                    />
                  </button>

                  {filteredPresetIcons.map((p) => {
                    const selected = draft.iconKey === p.key && !draft.iconUrl;

                    return (
                      <button
                        key={p.key}
                        type="button"
                        disabled={saving}
                        onClick={() => {
                          clearCustomIcon();
                          setDraft((d) => ({
                            ...d,
                            iconKey: p.key,
                            iconUrl: null,
                          }));
                        }}
                        aria-label={p.label}
                        aria-pressed={selected}
                        title={p.label}
                        className={clsx(
                          "group inline-flex items-center justify-center shrink-0",
                          "h-10 w-10 md:h-11 md:w-11 rounded-md border",
                          "transition cursor-pointer",
                          "focus:outline-none focus:ring-1 focus:ring-primary-500/40",
                          "disabled:cursor-not-allowed disabled:opacity-60",
                          selected
                            ? "border-primary-500/40 bg-primary-500/10"
                            : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20",
                        )}
                      >
                        <span className="text-[#A7A7BC]">
                          <PresetIcon iconKey={p.key} className="h-6 w-6" />
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      handleUploadIcon(e.target.files?.[0] ?? null)
                    }
                    disabled={saving}
                  />

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => fileInputRef.current?.click()}
                    className={clsx(
                      "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
                      "border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 transition cursor-pointer",
                      "disabled:cursor-not-allowed disabled:opacity-60",
                    )}
                    title="Upload (preview only until you wire Cloudinary)"
                  >
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-[6px] bg-white/10 text-neutral-200">
                      <Plus size={14} />
                    </span>
                    Upload custom
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={clearCustomIcon}
                    className={clsx(
                      "ml-auto inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-neutral-300 hover:bg-white/10 transition cursor-pointer",
                      "min-w-[116px] justify-center",
                      "disabled:cursor-not-allowed disabled:opacity-60",
                      draft.iconUrl ? "" : "opacity-0 pointer-events-none",
                    )}
                    title="Remove custom icon"
                    aria-hidden={!draft.iconUrl}
                    tabIndex={draft.iconUrl ? 0 : -1}
                  >
                    <X size={14} />
                    Remove
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-3 text-sm text-neutral-400 min-h-[28px]">
                  <span className="text-neutral-300">Selected:</span>

                  {draft.iconUrl ? (
                    <>
                      <TrackingIcon
                        iconUrl={draft.iconUrl}
                        className="h-6 w-6"
                      />
                      <span className="text-neutral-500">(custom preview)</span>
                    </>
                  ) : draft.iconKey ? (
                    <>
                      <span className=" flex text-[#A7A7BC]">
                        <PresetIcon
                          iconKey={draft.iconKey}
                          className="h-6 w-6"
                        />
                      </span>
                      <span className="text-neutral-500">
                        {presetIcons.find((x) => x.key === draft.iconKey)
                          ?.label ?? ""}
                      </span>
                    </>
                  ) : (
                    <span className="text-neutral-500 h-6 flex items-center">
                      None
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Destination search selector */}
            <div ref={destWrapRef} className="relative md:col-span-2">
              <label className="block leading-[90%] font-normal text-white mb-2">
                Link Path
              </label>

              <p className="text-sm text-neutral-500">
                Search and select an Event or Organization this tracking link
                will route to.
              </p>

              <div className="mt-2">
                {destinationOk && selectedDestMeta ? (
                  <SelectedDestinationCard
                    dest={selectedDestMeta}
                    disabled={saving || isEventScope}
                    onClear={clearDestination}
                    loading={mode === "edit" && hydratingSelectedDest}
                  />
                ) : (
                  <>
                    <div
                      className={clsx(
                        "relative w-full",
                        "rounded-lg border border-white/10 bg-white/5 h-12",
                        errDest && "border-error-500",
                      )}
                    >
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-300" />

                      <input
                        ref={destInputRef}
                        value={destQuery}
                        onChange={(e) => {
                          setDestQuery(e.target.value);
                          setDestOpen(true);
                        }}
                        onFocus={() => {
                          setStatusOpen(false);
                          setDestOpen(true);
                        }}
                        onBlur={() => setTouched(true)}
                        placeholder="Search events or organizations…"
                        disabled={saving || isEventScope}
                        className={clsx(
                          "h-12 w-full rounded-lg bg-transparent",
                          "pl-10 pr-10 text-[12px] text-neutral-100",
                          "placeholder:text-neutral-500",
                          "outline-none border-none focus:ring-1 focus:ring-primary-500",
                          "disabled:opacity-60 disabled:cursor-not-allowed",
                        )}
                      />

                      {destQuery.trim() && !saving && !isEventScope ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDestQuery("");
                            setDestError(null);
                            setDestOpen(true);
                            window.setTimeout(() => {
                              destInputRef.current?.focus();
                            }, 0);
                          }}
                          className={clsx(
                            "absolute right-2 top-1/2 -translate-y-1/2",
                            "inline-flex h-8 w-8 items-center justify-center",
                            "rounded-md border border-white/10 bg-white/5",
                            "text-white/60 hover:text-white hover:bg-white/10 hover:border-white/20",
                            "focus:outline-none focus:ring-1 focus:ring-primary-500/35",
                            "transition cursor-pointer",
                          )}
                          title="Clear search"
                          aria-label="Clear search"
                        >
                          <X size={14} />
                        </button>
                      ) : null}
                    </div>

                    {destOpen && !isEventScope ? (
                      <div className={dropdownPanelOverlayCls} role="listbox">
                        <div
                          className={clsx(
                            "max-h-[min(360px,60vh)] overflow-y-auto p-2 overscroll-contain",
                            "tikdHideScrollbar",
                          )}
                        >
                          {destLoading ? (
                            <div className="px-3 py-3 text-sm text-neutral-400">
                              {isOrgScope && !destQuery.trim()
                                ? "Loading destinations…"
                                : "Searching…"}
                            </div>
                          ) : destError ? (
                            <div className="px-3 py-3 text-sm text-neutral-400">
                              {destError}
                            </div>
                          ) : !destQuery.trim() && !isOrgScope ? (
                            <div className="px-3 py-3 text-sm text-neutral-500">
                              Type to search events or organizations.
                            </div>
                          ) : destResults.length === 0 ? (
                            <div className="px-3 py-3 text-sm text-neutral-400">
                              No matches.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {destResults.map((opt) => {
                                const selected =
                                  opt.id === draft.destinationId &&
                                  opt.kind === draft.destinationKind;

                                return (
                                  <button
                                    key={`${opt.kind}-${opt.id}`}
                                    type="button"
                                    role="option"
                                    aria-selected={selected}
                                    onClick={() => handlePickDestination(opt)}
                                    className={clsx(
                                      "w-full text-left",
                                      "rounded-lg border",
                                      "px-3 py-3",
                                      "transition cursor-pointer",
                                      "focus:outline-none focus:ring-1 focus:ring-primary-500/55",
                                      selected
                                        ? "border-primary-500/55 bg-primary-500/12"
                                        : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/15",
                                    )}
                                  >
                                    <div className="flex items-center gap-2">
                                      <DestinationThumb
                                        kind={opt.kind}
                                        image={opt.image}
                                        title={opt.title}
                                      />

                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="min-w-0">
                                            <p className="truncate text-[15px] font-semibold text-neutral-0 tracking-[-0.2px]">
                                              {opt.title}
                                            </p>

                                            <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-neutral-400">
                                              {opt.kind === "Event" ? (
                                                <>
                                                  <span className="truncate">
                                                    {opt.orgName || "Event"}
                                                  </span>
                                                  {opt.date ? (
                                                    <>
                                                      <span className="text-neutral-600">
                                                        •
                                                      </span>
                                                      <span className="inline-flex items-center gap-1 text-neutral-400">
                                                        <Calendar className="h-3.5 w-3.5 text-neutral-500" />
                                                        <span>
                                                          {formatShortDate(
                                                            opt.date,
                                                          )}
                                                        </span>
                                                      </span>
                                                    </>
                                                  ) : null}
                                                </>
                                              ) : (
                                                <span className="truncate">
                                                  {opt.subtitle}
                                                </span>
                                              )}
                                            </p>
                                          </div>

                                          <div className="shrink-0 pt-0.5">
                                            <DestinationPill
                                              kind={opt.kind}
                                              accentColor={
                                                opt.kind === "Organization"
                                                  ? destOrgAccentById[opt.id]
                                                  : null
                                              }
                                            />
                                          </div>
                                        </div>
                                      </div>

                                      <div className="shrink-0">
                                        {selected ? (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              clearDestination();
                                            }}
                                            className={clsx(
                                              "inline-flex h-8 w-8 items-center justify-center rounded-md border",
                                              "border-primary-500/30 bg-primary-500/15 text-primary-200",
                                              "hover:bg-primary-500/22 transition cursor-pointer",
                                              "focus:outline-none focus:ring-1 focus:ring-primary-500/35",
                                            )}
                                            title="Clear selection"
                                            aria-label="Clear selection"
                                          >
                                            <X size={14} />
                                          </button>
                                        ) : (
                                          <span
                                            className={clsx(
                                              "inline-flex h-8 w-8 items-center justify-center rounded-md border",
                                              "transition",
                                              "border-white/10 bg-white/5 text-white/20",
                                            )}
                                            aria-hidden
                                          >
                                            <Check size={14} />
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* {selected ? (
                                      <div className="mt-2 text-[12px] text-primary-200/80">
                                        Selected — click X to unselect
                                      </div>
                                    ) : null} */}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>

            {/* Status (custom select) */}
            <div ref={statusWrapRef} className="relative md:col-span-2">
              <label className="block leading-[90%] font-normal text-white mb-2">
                Status
              </label>

              <button
                type="button"
                disabled={saving}
                className={clsx(
                  "mt-2 w-full rounded-lg border bg-neutral-900 px-4 py-3 text-base text-neutral-0 outline-none",
                  "border-white/10 hover:border-white/20 focus:border-primary-500 transition cursor-pointer",
                  "flex items-center justify-between gap-3",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                )}
                aria-haspopup="listbox"
                aria-expanded={statusOpen}
                onClick={() => {
                  setDestOpen(false);
                  setStatusOpen((v) => !v);
                }}
              >
                <span className="truncate">
                  {statusOptions.find((o) => o.value === draft.status)?.label ??
                    draft.status}
                </span>
                <ChevronDown
                  size={16}
                  className={clsx(
                    "text-neutral-400 transition",
                    statusOpen && "rotate-180 text-neutral-200",
                  )}
                />
              </button>

              {statusOpen ? (
                <div className={dropdownPanelFlowCls} role="listbox">
                  <div className="max-h-64 overflow-auto">
                    {statusOptions.map((opt) => {
                      const selected = opt.value === draft.status;

                      const tint =
                        opt.value === "Active"
                          ? "bg-success-500/10 border-success-500/25"
                          : opt.value === "Paused"
                            ? "bg-warning-500/10 border-warning-500/25"
                            : "bg-white/5 border-white/10";

                      return (
                        <button
                          key={opt.value}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          className={clsx(
                            "w-full text-left px-4 py-3 transition flex items-start justify-between gap-3",
                            "hover:bg-white/5 focus:bg-white/5 focus:outline-none",
                            selected && "bg-primary-500/10",
                          )}
                          onClick={() => {
                            setDraft((d) => ({ ...d, status: opt.value }));
                            setStatusOpen(false);
                          }}
                        >
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-neutral-0">
                              {opt.label}
                            </span>
                            {opt.desc ? (
                              <span className="mt-1 block text-xs text-neutral-400">
                                {opt.desc}
                              </span>
                            ) : null}
                          </span>

                          <span
                            className={clsx(
                              "mt-0.5 inline-flex h-7 min-w-[64px] items-center justify-center rounded-md border px-2 text-xs font-semibold",
                              selected
                                ? "border-primary-500/35 bg-primary-500/15 text-primary-200"
                                : tint,
                              selected ? "" : "text-neutral-300",
                            )}
                          >
                            {selected ? (
                              <span className="inline-flex items-center gap-1">
                                <Check size={14} />
                                Selected
                              </span>
                            ) : (
                              "Choose"
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 flex flex-col items-center justify-end gap-3 sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              disabled={saving}
              className={clsx(
                "py-3 px-6 text-base font-medium leading-[100%]",
                "border-white/40 hover:border-white/60 hover:bg-transparent",
                "disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={!canSave}
              icon={
                mode === "create" ? <Plus size={16} /> : <Pencil size={16} />
              }
              onClick={() => {
                setTouched(true);
                if (!canSave) return;

                onSave({
                  name: draft.name.trim(),
                  destinationKind: draft.destinationKind,
                  destinationId: draft.destinationId,
                  destinationTitle: draft.destinationTitle,
                  status: draft.status,
                  iconKey: draft.iconKey ?? null,
                  iconUrl: draft.iconUrl ?? null,
                });
              }}
              className={clsx(
                "py-3 px-6 text-base font-semibold leading-[100%]",
                !canSave && "bg-white/10 hover:bg-white/10",
              )}
              animation
            >
              {saving
                ? mode === "create"
                  ? "Creating..."
                  : "Saving..."
                : mode === "create"
                  ? "Create"
                  : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getErrorMessage(e: unknown, fallback: string) {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  if (e && typeof e === "object" && "message" in e) {
    const msg = (e as { message?: unknown }).message;
    if (typeof msg === "string") return msg;
  }
  return fallback;
}

/* ----------------------------- Component --------------------------- */
export default function TrackingLinksTable({
  scope = "all",
  organizationId,
  eventId,
  showViewAll = true,
  headerLeftAction,
  viewAllHref,
  currentEventMeta,
}: TrackingLinksTableProps) {
  const router = useRouter();
  const [data, setData] = useState<Row[]>([]);
  const [orgAccentById, setOrgAccentById] = useState<Record<string, string>>(
    {},
  );

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<SortKey>("created");
  const [dir, setDir] = useState<SortDir>("desc");

  const [archiveOpen, setArchiveOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [activeRow, setActiveRow] = useState<Row | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const [savingCreate, setSavingCreate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingArchive, setSavingArchive] = useState(false);

  const effectiveScope: TrackingLinksScope =
    scope === "event" && eventId
      ? "event"
      : scope === "organization" && organizationId
        ? "organization"
        : "all";

  const computedViewAllHref =
    viewAllHref ??
    (effectiveScope === "event" && eventId
      ? `/dashboard/events/${eventId}/tracking-links`
      : effectiveScope === "organization" && organizationId
        ? `/dashboard/organizations/${organizationId}/tracking-links`
        : "/dashboard/tracking-links");

  const matchesScope = useCallback(
    (r: {
      destinationKind: DestinationKind;
      destinationId: string;
      organizationId: string;
    }) => {
      if (effectiveScope === "event") {
        return r.destinationKind === "Event" && r.destinationId === eventId;
      }
      if (effectiveScope === "organization") {
        return r.organizationId === organizationId;
      }
      return true;
    },
    [effectiveScope, eventId, organizationId],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const rows = await fetchTrackingLinks({
        scope: effectiveScope,
        organizationId,
        eventId,
      });

      setData(
        rows
          .filter((r) => matchesScope(r))
          .map((r) => ({
            id: r.id,
            name: r.name,

            organizationId: r.organizationId,

            destinationKind: r.destinationKind,
            destinationId: r.destinationId,
            destinationTitle: r.destinationTitle || "—",
            url: r.url,

            iconKey: r.iconKey ?? null,
            iconUrl: r.iconUrl ?? null,

            views: r.views ?? 0,
            ticketsSold: r.ticketsSold ?? 0,
            revenue: r.revenue ?? 0,
            status: r.status,
            created: r.created,
          })),
      );

      setLoading(false);
      setLoadError(null);
    } catch (e) {
      setLoading(false);
      setLoadError(getErrorMessage(e, "Failed to load data"));
    }
  }, [effectiveScope, organizationId, eventId, matchesScope]);

  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const rows = await fetchTrackingLinks({
          scope: effectiveScope,
          organizationId,
          eventId,
          signal: ac.signal,
        });

        if (ac.signal.aborted) return;

        setData(
          rows
            .filter((r) => matchesScope(r))
            .map((r) => ({
              id: r.id,
              name: r.name,

              organizationId: r.organizationId,

              destinationKind: r.destinationKind,
              destinationId: r.destinationId,
              destinationTitle: r.destinationTitle || "—",
              url: r.url,

              iconKey: r.iconKey ?? null,
              iconUrl: r.iconUrl ?? null,

              views: r.views ?? 0,
              ticketsSold: r.ticketsSold ?? 0,
              revenue: r.revenue ?? 0,
              status: r.status,
              created: r.created,
            })),
        );

        setLoading(false);
        setLoadError(null);
      } catch (e) {
        if (ac.signal.aborted) return;
        setLoading(false);
        setLoadError(getErrorMessage(e, "Failed to load data"));
      }
    })();

    return () => ac.abort();
  }, [effectiveScope, organizationId, eventId, matchesScope]);

  useEffect(() => {
    // Only needed when we display Organization badges
    const orgIds = Array.from(
      new Set(data.map((r) => r.organizationId).filter(Boolean)),
    );

    const missing = orgIds.filter((id) => !orgAccentById[id]);
    if (missing.length === 0) return;

    let alive = true;

    (async () => {
      try {
        const pairs = await Promise.all(
          missing.map(async (id) => {
            try {
              const res = await fetch(
                `/api/organizations/${encodeURIComponent(id)}`,
                {
                  method: "GET",
                  cache: "no-store",
                },
              );
              if (!res.ok) return [id, null] as const;
              const json = (await res.json().catch(() => null)) as unknown;
              const accent = pickAccentFromOrgResponse(json);
              return [id, accent] as const;
            } catch {
              return [id, null] as const;
            }
          }),
        );

        if (!alive) return;

        const next: Record<string, string> = {};
        for (const [id, accent] of pairs) {
          if (typeof accent === "string" && accent.trim()) {
            next[id] = accent.trim();
          }
        }

        if (Object.keys(next).length > 0) {
          setOrgAccentById((prev) => ({ ...prev, ...next }));
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      alive = false;
    };
  }, [data, orgAccentById]);

  const sorted = useMemo(() => {
    const arr = [...data];
    arr.sort((a, b) => {
      let A: number | string;
      let B: number | string;

      if (sortBy === "views") {
        A = a.views;
        B = b.views;
      } else if (sortBy === "ticketsSold") {
        A = a.ticketsSold;
        B = b.ticketsSold;
      } else if (sortBy === "revenue") {
        A = a.revenue;
        B = b.revenue;
      } else if (sortBy === "created") {
        A = parseDate(a.created);
        B = parseDate(b.created);
      } else if (sortBy === "status") {
        A = statusRank(a.status);
        B = statusRank(b.status);
      } else {
        A = a.name;
        B = b.name;
      }

      if (typeof A === "number" && typeof B === "number") {
        return dir === "asc" ? A - B : B - A;
      }
      return dir === "asc"
        ? String(A).localeCompare(String(B))
        : String(B).localeCompare(String(A));
    });
    return arr;
  }, [data, sortBy, dir]);

  // Show only a small preview in widgets (no scroll). Full pages can pass showViewAll={false}.
  const VISIBLE_LIMIT = 5;

  const visibleRows = useMemo(() => {
    return showViewAll ? sorted.slice(0, VISIBLE_LIMIT) : sorted;
  }, [sorted, showViewAll]);

  const toggleSort = (key: SortKey) => {
    if (key === sortBy) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setDir("desc");
    }
  };

  const openArchive = (row: Row) => {
    setActiveRow(row);
    setArchiveOpen(true);
  };

  const confirmArchive = async (row: Row) => {
    if (!row?.id) return;
    setSavingArchive(true);
    try {
      await archiveTrackingLink(row.id);
      setData((prev) => prev.filter((x) => x.id !== row.id));
      setArchiveOpen(false);
      setActiveRow(null);
    } catch {
      // keep dialog open; you can improve with a toast later
    } finally {
      setSavingArchive(false);
    }
  };

  const openQr = (row: Row) => {
    setActiveRow(row);
    setQrOpen(true);
  };

  const closeQr = () => {
    setQrOpen(false);
    setActiveRow(null);
  };

  const closeArchive = () => {
    if (savingArchive) return;
    setArchiveOpen(false);
    setActiveRow(null);
  };

  const openEdit = (row: Row) => {
    setActiveRow(row);
    setEditOpen(true);
  };

  const closeEdit = () => {
    if (savingEdit) return;
    setEditOpen(false);
    setActiveRow(null);
  };

  const openCreate = () => {
    setCreateOpen(true);
  };

  const closeCreate = () => {
    if (savingCreate) return;
    setCreateOpen(false);
  };

  const sanitizeIconUrlForApi = (iconUrl: string | null | undefined) => {
    const v = (iconUrl || "").trim();
    if (!v) return null;
    // blob: URLs are not persisted; only send real URLs
    if (v.startsWith("blob:")) return null;
    return v;
  };

  const handleCreate = async (draft: TrackingLinkDraft) => {
    const kind = draft.destinationKind;
    if (!kind) return;

    setSavingCreate(true);
    try {
      const row = await createTrackingLink({
        name: draft.name.trim(),
        destinationKind: kind, // ✅
        destinationId: draft.destinationId,
        status: draft.status,
        iconKey: draft.iconKey ?? null,
        iconUrl: sanitizeIconUrlForApi(draft.iconUrl),
      });

      if (!matchesScope(row)) {
        setCreateOpen(false);
        return;
      }

      setData((prev) => [
        {
          id: row.id,
          name: row.name,
          organizationId: row.organizationId,
          destinationKind: row.destinationKind,
          destinationId: row.destinationId,
          destinationTitle: row.destinationTitle || "—",
          url: row.url,
          iconKey: row.iconKey ?? null,
          iconUrl: row.iconUrl ?? null,
          views: row.views ?? 0,
          ticketsSold: row.ticketsSold ?? 0,
          revenue: row.revenue ?? 0,
          status: row.status,
          created: row.created,
        },
        ...prev,
      ]);

      setCreateOpen(false);
    } catch {
      // can add inline error later
    } finally {
      setSavingCreate(false);
    }
  };

  const handleEdit = async (draft: TrackingLinkDraft) => {
    if (!activeRow) return;

    const kind = draft.destinationKind; // ✅ narrow once
    if (!kind) return;

    setSavingEdit(true);
    try {
      await updateTrackingLink(activeRow.id, {
        name: draft.name.trim(),
        destinationKind: kind, // ✅ use narrowed value
        destinationId: draft.destinationId,
        status: draft.status,
        iconKey: draft.iconKey ?? null,
        iconUrl: sanitizeIconUrlForApi(draft.iconUrl),
      });

      setData((prev) => {
        const next = prev.map((r) => {
          if (r.id !== activeRow.id) return r;

          const nextOrgId =
            kind === "Organization" ? draft.destinationId : r.organizationId;

          return {
            ...r,
            name: draft.name,
            status: draft.status,
            iconKey: draft.iconKey ?? null,
            iconUrl: draft.iconUrl ?? null,
            destinationKind: kind, // ✅ not nullable anymore
            destinationId: draft.destinationId,
            destinationTitle: draft.destinationTitle || "—",
            organizationId: nextOrgId,
          };
        });

        return next.filter((r) => matchesScope(r));
      });

      setEditOpen(false);
      setActiveRow(null);
    } catch {
      // can add inline error later
    } finally {
      setSavingEdit(false);
    }
  };

  const thRow = "[&>th]:pb-3 [&>th]:pt-1 [&>th]:px-4";
  const thBase =
    "text-base font-semibold cursor-pointer select-none hover:text-white/80";

  const separatorLine =
    "bg-[linear-gradient(90deg,rgba(154,70,255,0)_0%,rgba(154,70,255,0.18)_30%,rgba(255,255,255,0.08)_50%,rgba(154,70,255,0.18)_70%,rgba(154,70,255,0)_100%)]";

  return (
    <div className="relative rounded-lg border border-neutral-700 bg-neutral-900 pt-2">
      <style jsx>{`
        /* -----------------------------------------------------------
   * Animation-only hooks (keep YOUR button box styles in JSX)
   * ----------------------------------------------------------- */

        :global(.tikdIconBtn) {
          position: relative;
          overflow: hidden;
        }

        /* ---------- Edit hover effect (EXACT Uiverse behavior) ---------- */
        :global(.tikdIconBtn--edit) {
          /* keeps z-index layering predictable inside your button */
          isolation: isolate;
        }

        :global(.tikdIconBtn--edit::before) {
          content: "";
          position: absolute;
          inset: -60%;
          border-radius: 999px;
          background: rgba(154, 70, 255, 0.22);
          filter: blur(12px);
          transform: scale(0);
          transition: transform 0.28s ease;
          z-index: 1;
          pointer-events: none;
        }

        :global(.tikdIconBtn--edit:hover::before) {
          transform: scale(1);
        }

        :global(.tikdEditMotion) {
          position: relative;
          z-index: 3;
          display: inline-flex;
          align-items: center;
          justify-content: center;

          transition: transform 0.2s;
          transform-origin: bottom;
          will-change: transform;
        }

        /* the “written line” is now anchored to the pencil */
        :global(.tikdEditMotion::after) {
          content: "";
          position: absolute;

          width: 30px;
          height: 1px;

          /* tune these 2 to match the pencil tip perfectly */
          bottom: 0px;
          right: 14px;

          background: rgba(255, 255, 255, 0.9);
          border-radius: 2px;
          pointer-events: none;

          transform: scaleX(0);
          transform-origin: right; /* grows LEFT from pencil */
          transition: transform 0.5s ease-out;
        }

        :global(.tikdIconBtn--edit:hover .tikdEditMotion) {
          transform: translateX(6px); /* move pencil + line together */
        }

        :global(.tikdIconBtn--edit:hover .tikdEditMotion::after) {
          transform: scaleX(1);
        }

        :global(.tikdIconBtn--edit .tikdEditSvg) {
          height: 15px; /* smaller icon */
          fill: rgba(255, 255, 255, 0.92);

          /* use layout nudge (NOT transform) so hover transform matches reference */
          position: relative;
          top: -1px;

          z-index: 3;
          transition: all 0.2s; /* match reference */
          transform-origin: bottom; /* match reference */
          will-change: transform;
          display: block; /* avoid baseline jiggle */
        }

        :global(.tikdIconBtn--edit:hover .tikdEditSvg) {
          transform: rotate(-15deg);
        }

        /* ---------- Trash hover effect (bin lid flip only) ---------- */
        :global(.tikdTrashWrap) {
          display: inline-flex;
          flex-direction: column;
          gap: 2px;
          position: relative;
          z-index: 2;
        }

        :global(.tikdIconBtn--trash .svgIcon) {
          width: 11px; /* smaller */
          transition: transform 0.3s ease;
        }

        :global(.tikdIconBtn--trash .svgIcon path) {
          fill: rgba(255, 255, 255, 0.9);
        }

        :global(.tikdIconBtn--trash .bin-top) {
          transform-origin: bottom right;
        }

        :global(.tikdIconBtn--trash:hover .bin-top) {
          transition-duration: 0.5s;
          transform: rotate(160deg);
        }

        :global(.tikdTrashWrap) {
          gap: 1px; /* was 2px */
        }
        /* ---------- Hide scrollbars (keep scroll) ---------- */
        :global(.tikdHideScrollbar) {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE/Edge legacy */
        }

        :global(.tikdHideScrollbar::-webkit-scrollbar) {
          width: 0;
          height: 0;
        }
      `}</style>

      {/* Header */}
      <div className="mb-2 pb-2 border-b border-neutral-700 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-bold uppercase text-neutral-400">
            Tracking Links
          </h3>

          {loading ? (
            <span className="text-xs text-neutral-500">Loading...</span>
          ) : loadError ? (
            <button
              type="button"
              onClick={() => reload()}
              className="text-xs text-error-400 hover:text-error-300 underline underline-offset-4 cursor-pointer"
              title="Retry"
            >
              Failed to load — Retry
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {headerLeftAction ? headerLeftAction : null}
          {/* + Create (top-right) */}
          <button
            type="button"
            onClick={openCreate}
            disabled={loading}
            className={clsx(
              "inline-flex items-center justify-center",
              "h-8 w-8 rounded-md",
              "border border-neutral-500 bg-neutral-700 text-white",
              "hover:text-white hover:border-white",
              "focus:outline-none",
              "cursor-pointer disabled:cursor-not-allowed disabled:opacity-60",
            )}
            title="Create Tracking Link"
            aria-label="Create Tracking Link"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Empty state */}
      {!loading && !loadError && sorted.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <p className="text-neutral-200 font-semibold">
            No tracking links yet.
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            Create your first link to start tracking traffic and sales.
          </p>
          <div className="mt-5 flex justify-center">
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={openCreate}
              icon={<Plus size={16} />}
              animation
            >
              Create Tracking Link
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Table */}
          <div
            className={clsx(
              "relative rounded-lg overflow-hidden",
              // No bottom padding — overlay must sit on top of the last row
            )}
          >
            {showViewAll && sorted.length > VISIBLE_LIMIT ? (
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-neutral-900 to-transparent"
                aria-hidden
              />
            ) : null}

            <table className="w-full table-fixed border-collapse font-medium">
              <colgroup>
                <col style={{ width: "16%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "8%" }} />
              </colgroup>

              <thead className="text-neutral-400">
                <tr className={thRow}>
                  <th
                    className={clsx(thBase, "text-left")}
                    onClick={() => toggleSort("name")}
                    aria-sort={
                      sortBy === "name"
                        ? dir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <div className="inline-flex items-center">
                      Name &amp; Link
                      <SortArrowsIcon
                        direction={sortBy === "name" ? dir : null}
                        className="ml-2 -translate-y-[1px]"
                      />
                    </div>
                  </th>

                  <th className="text-center text-base font-semibold">
                    QR Code
                  </th>

                  <th
                    className={clsx(thBase, "text-center")}
                    onClick={() => toggleSort("views")}
                    aria-sort={
                      sortBy === "views"
                        ? dir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <div className="inline-flex items-center">
                      Views
                      <SortArrowsIcon
                        direction={sortBy === "views" ? dir : null}
                        className="ml-2 -translate-y-[1px]"
                      />
                    </div>
                  </th>

                  <th
                    className={clsx(thBase, "text-center")}
                    onClick={() => toggleSort("ticketsSold")}
                    aria-sort={
                      sortBy === "ticketsSold"
                        ? dir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <div className="inline-flex items-center">
                      Tickets Sold
                      <SortArrowsIcon
                        direction={sortBy === "ticketsSold" ? dir : null}
                        className="ml-2 -translate-y-[1px]"
                      />
                    </div>
                  </th>

                  <th
                    className={clsx(thBase, "text-center")}
                    onClick={() => toggleSort("revenue")}
                    aria-sort={
                      sortBy === "revenue"
                        ? dir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <div className="inline-flex items-center">
                      Revenue
                      <SortArrowsIcon
                        direction={sortBy === "revenue" ? dir : null}
                        className="ml-2 -translate-y-[1px]"
                      />
                    </div>
                  </th>

                  <th className="text-center text-base font-semibold">
                    Destination
                  </th>

                  <th
                    className={clsx(thBase, "text-center")}
                    onClick={() => toggleSort("status")}
                    aria-sort={
                      sortBy === "status"
                        ? dir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <div className="inline-flex items-center">
                      Status
                      <SortArrowsIcon
                        direction={sortBy === "status" ? dir : null}
                        className="ml-2 -translate-y-[1px]"
                      />
                    </div>
                  </th>

                  <th
                    className={clsx(thBase, "text-center")}
                    onClick={() => toggleSort("created")}
                    aria-sort={
                      sortBy === "created"
                        ? dir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <div className="inline-flex items-center">
                      Date Created
                      <SortArrowsIcon
                        direction={sortBy === "created" ? dir : null}
                        className="ml-2 -translate-y-[1px]"
                      />
                    </div>
                  </th>

                  <th className="text-right font-semibold"> </th>
                </tr>
              </thead>

              <tbody className="text-white">
                {visibleRows.flatMap((r, i) => {
                  const isLast = i === visibleRows.length - 1;

                  const rowBg =
                    i % 2 === 0 ? "bg-neutral-948" : "bg-neutral-900";

                  const dataRow = (
                    <tr key={r.id} className={clsx("transition-colors", rowBg)}>
                      {/* Name & Link */}
                      <td className="px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-neutral-200">
                            {r.name}
                          </p>

                          <div className="mt-2 flex min-w-0 items-center gap-2 text-neutral-400">
                            {r.iconKey || r.iconUrl ? (
                              <span className="text-neutral-400">
                                <TrackingIcon
                                  iconKey={r.iconKey}
                                  iconUrl={r.iconUrl}
                                  className="h-5 w-5"
                                />
                              </span>
                            ) : null}

                            <span className="min-w-0 truncate text-neutral-300">
                              {r.url}
                            </span>

                            <CopyButton
                              text={fullTrackingUrl(r.url) || r.url}
                              title="Copy tracking link"
                              ariaLabel="Copy tracking link"
                              className="inline-flex items-center rounded-sm border border-white/10 p-1 text-white/70 hover:text-white hover:border-white/20 ml-1"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                fill="none"
                              >
                                <path
                                  d="M4.6665 6.44469C4.6665 5.97313 4.85383 5.52089 5.18727 5.18745C5.52071 4.85401 5.97295 4.66669 6.4445 4.66669H12.2218C12.4553 4.66669 12.6865 4.71268 12.9022 4.80203C13.118 4.89138 13.314 5.02235 13.4791 5.18745C13.6442 5.35255 13.7751 5.54856 13.8645 5.76428C13.9538 5.97999 13.9998 6.2112 13.9998 6.44469V12.222C13.9998 12.4555 13.9538 12.6867 13.8645 12.9024C13.7751 13.1181 13.6442 13.3142 13.4791 13.4793C13.314 13.6444 13.118 13.7753 12.9022 13.8647C12.6865 13.954 12.4553 14 12.2218 14H6.4445C6.21101 14 5.97981 13.954 5.76409 13.8647C5.54838 13.7753 5.35237 13.6444 5.18727 13.4793C5.02217 13.3142 4.8912 13.1181 4.80185 12.9024C4.71249 12.6867 4.6665 12.4555 4.6665 12.222V6.44469Z"
                                  stroke="#727293"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M2.67467 11.158C2.47 11.0417 2.29977 10.8733 2.18127 10.6699C2.06277 10.4665 2.00023 10.2354 2 10V3.33333C2 2.6 2.6 2 3.33333 2H10C10.5 2 10.772 2.25667 11 2.66667"
                                  stroke="#727293"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </CopyButton>
                          </div>
                        </div>
                      </td>

                      {/* QR Code */}
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => openQr(r)}
                          className={clsx(
                            "inline-flex items-center justify-center rounded-md p-1 mr-1",
                            "hover:bg-white/5 focus:outline-none focus:ring-1 focus:ring-primary-600/35 cursor-pointer",
                          )}
                          title="Open QR"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="22"
                            height="22"
                            viewBox="0 0 22 22"
                            fill="none"
                            className="w-7 h-7"
                          >
                            <path
                              d="M12.8333 11.9167C13.0579 11.9167 13.2746 11.9991 13.4423 12.1483C13.6101 12.2975 13.7173 12.5031 13.7436 12.7261L13.75 12.8333V18.3333C13.7497 18.567 13.6603 18.7917 13.4999 18.9616C13.3395 19.1315 13.1203 19.2337 12.8871 19.2474C12.6538 19.2611 12.4242 19.1852 12.245 19.0353C12.0658 18.8853 11.9507 18.6726 11.9231 18.4406L11.9167 18.3333V12.8333C11.9167 12.5902 12.0132 12.3571 12.1852 12.1852C12.3571 12.0132 12.5902 11.9167 12.8333 11.9167ZM15.5833 16.0417C15.8264 16.0417 16.0596 16.1382 16.2315 16.3102C16.4034 16.4821 16.5 16.7152 16.5 16.9583V18.3333C16.5 18.5764 16.4034 18.8096 16.2315 18.9815C16.0596 19.1534 15.8264 19.25 15.5833 19.25C15.3402 19.25 15.1071 19.1534 14.9352 18.9815C14.7632 18.8096 14.6667 18.5764 14.6667 18.3333V16.9583C14.6667 16.7152 14.7632 16.4821 14.9352 16.3102C15.1071 16.1382 15.3402 16.0417 15.5833 16.0417ZM18.3333 11.9167C18.5579 11.9167 18.7746 11.9991 18.9423 12.1483C19.1101 12.2975 19.2173 12.5031 19.2436 12.7261L19.25 12.8333V18.3333C19.2497 18.567 19.1603 18.7917 18.9999 18.9616C18.8395 19.1315 18.6203 19.2337 18.3871 19.2474C18.1538 19.2611 17.9242 19.1852 17.745 19.0353C17.5658 18.8853 17.4507 18.6726 17.4231 18.4406L17.4167 18.3333V12.8333C17.4167 12.5902 17.5132 12.3571 17.6852 12.1852C17.8571 12.0132 18.0902 11.9167 18.3333 11.9167ZM8.25 11.9167C8.73623 11.9167 9.20255 12.1098 9.54636 12.4536C9.89018 12.7975 10.0833 13.2638 10.0833 13.75V17.4167C10.0833 17.9029 9.89018 18.3692 9.54636 18.713C9.20255 19.0568 8.73623 19.25 8.25 19.25H4.58333C4.0971 19.25 3.63079 19.0568 3.28697 18.713C2.94315 18.3692 2.75 17.9029 2.75 17.4167V13.75C2.75 13.2638 2.94315 12.7975 3.28697 12.4536C3.63079 12.1098 4.0971 11.9167 4.58333 11.9167H8.25ZM15.5833 11.9167C15.8079 11.9167 16.0246 11.9991 16.1923 12.1483C16.3601 12.2975 16.4673 12.5031 16.4936 12.7261L16.5 12.8333V14.2083C16.4997 14.442 16.4103 14.6667 16.2499 14.8366C16.0895 15.0065 15.8703 15.1087 15.6371 15.1224C15.4038 15.1361 15.1742 15.0602 14.995 14.9103C14.8158 14.7603 14.7007 14.5476 14.6731 14.3156L14.6667 14.2083V12.8333C14.6667 12.5902 14.7632 12.3571 14.9352 12.1852C15.1071 12.0132 15.3402 11.9167 15.5833 11.9167ZM8.25 2.75C8.73623 2.75 9.20255 2.94315 9.54636 3.28697C9.89018 3.63079 10.0833 4.0971 10.0833 4.58333V8.25C10.0833 8.73623 9.89018 9.20255 9.54636 9.54636C9.20255 9.89018 8.73623 10.0833 8.25 10.0833H4.58333C4.0971 10.0833 3.63079 9.89018 3.28697 9.54636C2.94315 9.20255 2.75 8.73623 2.75 8.25V4.58333C2.75 4.0971 2.94315 3.63079 3.28697 3.28697C3.63079 2.94315 4.0971 2.75 4.58333 2.75H8.25ZM17.4167 2.75C17.9029 2.75 18.3692 2.94315 18.713 3.28697C19.0568 3.63079 19.25 4.0971 19.25 4.58333V8.25C19.25 8.73623 19.0568 9.20255 18.713 9.54636C18.3692 9.89018 17.9029 10.0833 17.4167 10.0833H13.75C13.2638 10.0833 12.7975 9.89018 12.4536 9.54636C12.1098 9.20255 11.9167 8.73623 11.9167 8.25V4.58333C11.9167 4.0971 12.1098 3.63079 12.4536 3.28697C12.7975 2.94315 13.2638 2.75 13.75 2.75H17.4167Z"
                              fill="#A7A7BC"
                            />
                          </svg>
                        </button>
                      </td>

                      {/* Views */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                            className="h-4 w-4"
                          >
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M10.8749 6.00001L11.1862 5.84401V5.84251L11.1839 5.84026L11.1794 5.83126L11.1637 5.80126L11.1037 5.69326C11.0304 5.56696 10.9526 5.44338 10.8704 5.32276C10.596 4.91997 10.2806 4.54673 9.92916 4.20901C9.08467 3.39901 7.78491 2.57251 5.99992 2.57251C4.21642 2.57251 2.91592 3.39826 2.07142 4.20901C1.72001 4.54673 1.40457 4.91997 1.13017 5.32276C1.01882 5.48704 0.915692 5.65675 0.821166 5.83126L0.816666 5.84026L0.815166 5.84251V5.84326C0.815166 5.84326 0.814416 5.84401 1.12567 6.00001L0.814416 5.84326C0.790351 5.89188 0.777832 5.94539 0.777832 5.99963C0.777832 6.05388 0.790351 6.10739 0.814416 6.15601L0.813666 6.15751L0.815916 6.15976L0.820416 6.16876C0.843802 6.21562 0.868817 6.26165 0.895416 6.30676C1.21836 6.85232 1.61343 7.35182 2.06992 7.79176C2.91517 8.60176 4.21492 9.42676 5.99992 9.42676C7.78416 9.42676 9.08466 8.60176 9.92991 7.79101C10.2807 7.45289 10.5958 7.07969 10.8704 6.67726C10.9756 6.52242 11.0734 6.36275 11.1637 6.19876L11.1794 6.16876L11.1839 6.15976L11.1854 6.15751V6.15676C11.1854 6.15676 11.1862 6.15601 10.8749 6.00001ZM10.8749 6.00001L11.1862 6.15676C11.2102 6.10814 11.2227 6.05463 11.2227 6.00038C11.2227 5.94614 11.2102 5.89262 11.1862 5.84401L10.8749 6.00001ZM5.95492 4.84801C5.64939 4.84801 5.35637 4.96938 5.14033 5.18542C4.92429 5.40146 4.80292 5.69448 4.80292 6.00001C4.80292 6.30554 4.92429 6.59855 5.14033 6.8146C5.35637 7.03064 5.64939 7.15201 5.95492 7.15201C6.26044 7.15201 6.55346 7.03064 6.7695 6.8146C6.98554 6.59855 7.10691 6.30554 7.10691 6.00001C7.10691 5.69448 6.98554 5.40146 6.7695 5.18542C6.55346 4.96938 6.26044 4.84801 5.95492 4.84801ZM4.10842 6.00001C4.10842 5.50989 4.30311 5.03984 4.64968 4.69328C4.99625 4.34671 5.4663 4.15201 5.95642 4.15201C6.44654 4.15201 6.91658 4.34671 7.26315 4.69328C7.60972 5.03984 7.80442 5.50989 7.80442 6.00001C7.80442 6.49013 7.60972 6.96018 7.26315 7.30674C6.91658 7.65331 6.44654 7.84801 5.95642 7.84801C5.4663 7.84801 4.99625 7.65331 4.64968 7.30674C4.30311 6.96018 4.10842 6.49013 4.10842 6.00001Z"
                              fill="#A7A7BC"
                            />
                          </svg>
                          <span className="tabular-nums inline-flex items-center justify-center gap-1">
                            {r.views}
                          </span>
                        </div>
                      </td>

                      {/* Tickets Sold */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                            className="h-4 w-4"
                          >
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M7.00413 9.5015L7.00713 8.5C7.00713 8.36706 7.05994 8.23957 7.15394 8.14556C7.24794 8.05156 7.37544 7.99875 7.50838 7.99875C7.64132 7.99875 7.76881 8.05156 7.86281 8.14556C7.95682 8.23957 8.00963 8.36706 8.00963 8.5V9.4885C8.00963 9.729 8.00963 9.8495 8.08663 9.9235C8.16413 9.997 8.28163 9.992 8.51813 9.982C9.44963 9.9425 10.0221 9.817 10.4251 9.414C10.8301 9.011 10.9556 8.4385 10.9951 7.5055C11.0026 7.3205 11.0066 7.2275 10.9721 7.166C10.9371 7.1045 10.7996 7.0275 10.5236 6.873C10.3682 6.78633 10.2387 6.65971 10.1485 6.50624C10.0584 6.35276 10.0108 6.17799 10.0108 6C10.0108 5.82201 10.0584 5.64724 10.1485 5.49376C10.2387 5.34029 10.3682 5.21367 10.5236 5.127C10.7996 4.973 10.9376 4.8955 10.9721 4.834C11.0066 4.7725 11.0026 4.68 10.9946 4.4945C10.9556 3.5615 10.8296 2.9895 10.4251 2.586C9.98663 2.148 9.34763 2.0375 8.26413 2.0095C8.23095 2.00863 8.19794 2.01442 8.16703 2.02652C8.13613 2.03862 8.10796 2.05678 8.08419 2.07995C8.06043 2.10311 8.04154 2.1308 8.02865 2.16138C8.01575 2.19196 8.00912 2.22481 8.00913 2.258V3.5C8.00913 3.63294 7.95632 3.76043 7.86232 3.85444C7.76831 3.94844 7.64082 4.00125 7.50788 4.00125C7.37494 4.00125 7.24744 3.94844 7.15344 3.85444C7.05944 3.76043 7.00663 3.63294 7.00663 3.5L7.00313 2.2495C7.003 2.18328 6.9766 2.11982 6.92973 2.07305C6.88286 2.02627 6.81934 2 6.75313 2H4.99713C3.10713 2 2.16213 2 1.57463 2.586C1.16963 2.989 1.04413 3.5615 1.00463 4.4945C0.997127 4.6795 0.993127 4.7725 1.02763 4.834C1.06263 4.8955 1.20013 4.973 1.47613 5.127C1.63159 5.21367 1.7611 5.34029 1.85125 5.49376C1.9414 5.64724 1.98893 5.82201 1.98893 6C1.98893 6.17799 1.9414 6.35276 1.85125 6.50624C1.7611 6.65971 1.63159 6.78633 1.47613 6.873C1.20013 7.0275 1.06213 7.1045 1.02763 7.166C0.993127 7.2275 0.997127 7.32 1.00513 7.505C1.04413 8.4385 1.17013 9.011 1.57463 9.414C2.16213 10 3.10713 10 4.99763 10H6.50263C6.73863 10 6.85613 10 6.92963 9.927C7.00313 9.854 7.00363 9.737 7.00413 9.5015ZM8.00913 6.5V5.5C8.00913 5.36706 7.95632 5.23957 7.86232 5.14556C7.76831 5.05156 7.64082 4.99875 7.50788 4.99875C7.37494 4.99875 7.24744 5.05156 7.15344 5.14556C7.05944 5.23957 7.00663 5.36706 7.00663 5.5V6.5C7.00663 6.63301 7.05946 6.76056 7.15351 6.85461C7.24756 6.94866 7.37512 7.0015 7.50813 7.0015C7.64113 7.0015 7.76869 6.94866 7.86274 6.85461C7.95679 6.76056 8.00913 6.63301 8.00913 6.5Z"
                              fill="#A7A7BC"
                            />
                          </svg>
                          <span className="tabular-nums inline-flex items-center justify-center gap-1">
                            {r.ticketsSold}
                          </span>
                        </div>
                      </td>

                      {/* Revenue */}
                      <td className="px-4 py-3 text-center">
                        <span className="tabular-nums ">
                          {formatMoneyUSD(r.revenue)}
                        </span>
                      </td>

                      {/* Destination */}
                      {/* Destination */}
                      <td className="px-4 py-3 text-center">
                        <div className="inline-block">
                          <DestinationPill
                            kind={r.destinationKind}
                            accentColor={
                              orgAccentById[r.organizationId] ?? null
                            }
                          />
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <div className="inline-block">
                          <StatusPill status={r.status} />
                        </div>
                      </td>

                      {/* Date */}
                      {(() => {
                        const c = formatCreatedParts(r.created);
                        return (
                          <td className="px-4 py-3 text-center">
                            <div className="flex flex-col items-center leading-tight">
                              <span className="text-sm text-neutral-0">
                                {c.date}
                              </span>
                              <span className="text-xs text-neutral-500">
                                {c.time || "—"}
                              </span>
                            </div>
                          </td>
                        );
                      })()}

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(r)}
                            title="Edit"
                            aria-label="Edit"
                            className={clsx(
                              // ✅ your box design (keep consistent with your UI)
                              "inline-flex items-center justify-center",
                              "h-9 w-9 rounded-md border border-white/10 bg-white/5",
                              "text-white/80 hover:bg-white/10 hover:border-white/20",
                              "focus:outline-none focus:ring-1 focus:ring-primary-600/35",
                              "transition cursor-pointer",
                              // ✅ animation-only hook
                              "tikdIconBtn tikdIconBtn--edit",
                            )}
                          >
                            <span className="tikdEditMotion" aria-hidden="true">
                              <TikdEditIcon />
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openArchive(r)}
                            title="Archive"
                            aria-label="Archive"
                            className={clsx(
                              // ✅ same box design
                              "inline-flex items-center justify-center",
                              "h-9 w-9 rounded-md border border-white/10 bg-white/5",
                              "text-white/80 hover:bg-error-500/15 hover:border-error-500/35",
                              "focus:outline-none focus:ring-1 focus:ring-primary-600/35",
                              "transition cursor-pointer",
                              // ✅ animation-only hook
                              "tikdIconBtn tikdIconBtn--trash",
                            )}
                          >
                            <TikdTrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );

                  const separatorRow = !isLast ? (
                    <tr
                      key={`${r.id}-sep`}
                      aria-hidden
                      className="bg-neutral-900"
                    >
                      <td colSpan={9} className="p-0">
                        <div className={clsx("mx-4 h-px", separatorLine)} />
                      </td>
                    </tr>
                  ) : null;

                  return separatorRow ? [dataRow, separatorRow] : [dataRow];
                })}
              </tbody>
            </table>
            {showViewAll && computedViewAllHref ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
                <div className="pointer-events-auto">
                  <Button
                    type="button"
                    variant="viewAction"
                    size="sm"
                    onClick={() => router.push(computedViewAllHref)}
                    title="View all tracking links"
                    aria-label="View all tracking links"
                  >
                    View All
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </>
      )}

      <ArchiveLinkDialog
        open={archiveOpen}
        row={activeRow}
        onClose={closeArchive}
        onConfirm={confirmArchive}
        loading={savingArchive}
      />
      <QrDialog open={qrOpen} row={activeRow} onClose={closeQr} />

      {/* Create */}
      <TrackingLinkDialog
        open={createOpen}
        mode="create"
        onClose={closeCreate}
        onSave={handleCreate}
        saving={savingCreate}
        scope={effectiveScope}
        organizationId={organizationId}
        eventId={eventId}
        currentEventMeta={currentEventMeta}
      />

      {/* Edit */}
      <TrackingLinkDialog
        open={editOpen}
        mode="edit"
        initial={activeRow}
        onClose={closeEdit}
        onSave={handleEdit}
        saving={savingEdit}
        scope={effectiveScope}
        organizationId={organizationId}
        eventId={eventId}
        currentEventMeta={currentEventMeta}
      />
    </div>
  );
}
