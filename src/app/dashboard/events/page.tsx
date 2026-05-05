/* ------------------------------------------------------------------ */
/*  src/app/dashboard/events/page.tsx                                  */
/* ------------------------------------------------------------------ */
"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import {
  CalendarPlus,
  ChevronDown,
  X,
  CheckCircle2,
  Plus,
  Search,
  ChevronRight,
  Eye,
  Ticket,
  DollarSign,
  Building2,
} from "lucide-react";

import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { EventCard } from "@/components/ui/EventCard";
import { EVENT_CARD_DEFAULT_POSTER } from "@/components/ui/EventCard";
import GridListToggle, {
  type GridListValue,
} from "@/components/ui/GridListToggle";
import SortControl from "@/components/ui/SortControl";

/* ------------------------------ Types ------------------------------ */
type Org = {
  _id: string;
  name: string;
  logo?: string;
  website?: string;
};

type MyEvent = {
  _id: string;
  title: string;
  image?: string;
  date: string; // ISO string
  location: string;
  category?: string;
  status?: "draft" | "published";
  pinned?: boolean;

  // Optional dashboard stats (safe: backend can add later)
  revenue?: number;
  revenueTotal?: number;
  grossRevenue?: number;
  ticketsSold?: number;
  sold?: number;

  // Optional: clients requested sort options
  pageViews?: number;
  views?: number;

  // Optional org payloads (different backends name these differently)
  organization?: Org;
  org?: Org;
  organizationId?: string;
};

type EventViewId = "upcoming" | "past" | "drafts";

type SortField =
  | "title"
  | "pageViews"
  | "ticketsSold"
  | "revenue"
  | "eventDate";
type SortDir = "asc" | "desc";

type PageViewsTotalsResponse = {
  totals?: {
    pageViews?: number;
  };
};

type TicketsSoldTotalsResponse = {
  totals?: {
    ticketsSold?: number;
  };
};

type RevenueTotalsResponse = {
  totals?: {
    revenue?: number;
  };
};

type EventLiveStats = {
  pageViews: number;
  ticketsSold: number;
  revenue: number;
};

type EventLiveStatsMap = Record<string, EventLiveStats>;

/* ---------------------------- Helpers ------------------------------ */
async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

type JsonBody = Record<string, unknown> | unknown[] | null;

async function fetchJSONWithBody<T>(
  url: string,
  init: Omit<RequestInit, "body"> & { body?: JsonBody | string },
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    body:
      init.body === undefined
        ? undefined
        : typeof init.body === "string"
          ? init.body
          : JSON.stringify(init.body),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(
      `Request failed: ${res.status} ${res.statusText}${txt ? ` — ${txt}` : ""}`,
    );
  }
  return (await res.json()) as T;
}

function domainFromUrl(url?: string) {
  if (!url) return "";
  try {
    const clean = url.startsWith("http") ? url : `https://${url}`;
    const u = new URL(clean);
    return u.host.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, "");
  }
}

function money(n: number) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `$${Math.round(n).toLocaleString()}`;
  }
}

function formatEventDate(iso: string) {
  const d = new Date(iso);
  const day = d.getDate();
  const mon = d.toLocaleString(undefined, { month: "short" }).toUpperCase();
  const year = d.getFullYear();
  return `${day} ${mon}, ${year}`;
}

function formatDateLine(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function revenueOf(e: MyEvent) {
  const raw = e.revenue ?? e.revenueTotal ?? e.grossRevenue ?? 0;
  return typeof raw === "number" ? raw : 0;
}

function ticketsOf(e: MyEvent) {
  const raw = e.ticketsSold ?? e.sold ?? 0;
  return typeof raw === "number" ? raw : 0;
}

function viewsOf(e: MyEvent) {
  const raw = e.pageViews ?? e.views ?? 0;
  return typeof raw === "number" ? raw : 0;
}

function pinnedFirst(list: MyEvent[], pinnedIds: Set<string>) {
  if (!pinnedIds.size) return list;
  const pinned: MyEvent[] = [];
  const rest: MyEvent[] = [];
  for (const e of list) {
    if (pinnedIds.has(String(e._id))) pinned.push(e);
    else rest.push(e);
  }
  return [...pinned, ...rest];
}

function clampText(input: string, maxChars: number) {
  const clean = String(input || "")
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

function matchesEventQuery(e: MyEvent, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const hay =
    `${e.title ?? ""} ${e.location ?? ""} ${e.category ?? ""}`.toLowerCase();
  return hay.includes(q);
}

function sortEvents(args: {
  list: MyEvent[];
  view: EventViewId;
  sortField: SortField | null;
  sortDir: SortDir;
  pinnedIds?: Set<string>;
}) {
  const { list, view, sortField, sortDir, pinnedIds } = args;
  const arr = [...list];

  const dirMul = sortDir === "asc" ? 1 : -1;

  // Default (no sort) behavior: Upcoming by date asc (with pinned first),
  // Past/Drafts by date desc.
  if (!sortField) {
    if (view === "upcoming") {
      const base = arr.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      return pinnedIds ? pinnedFirst(base, pinnedIds) : base;
    }

    return arr.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  switch (sortField) {
    case "title": {
      const base = arr.sort((a, b) => a.title.localeCompare(b.title) * dirMul);
      return view === "upcoming" && pinnedIds
        ? pinnedFirst(base, pinnedIds)
        : base;
    }
    case "pageViews": {
      const base = arr.sort((a, b) => (viewsOf(a) - viewsOf(b)) * dirMul);
      return view === "upcoming" && pinnedIds
        ? pinnedFirst(base, pinnedIds)
        : base;
    }
    case "ticketsSold": {
      const base = arr.sort((a, b) => (ticketsOf(a) - ticketsOf(b)) * dirMul);
      return view === "upcoming" && pinnedIds
        ? pinnedFirst(base, pinnedIds)
        : base;
    }
    case "revenue": {
      const base = arr.sort((a, b) => (revenueOf(a) - revenueOf(b)) * dirMul);
      return view === "upcoming" && pinnedIds
        ? pinnedFirst(base, pinnedIds)
        : base;
    }
    case "eventDate": {
      const base = arr.sort(
        (a, b) =>
          (new Date(a.date).getTime() - new Date(b.date).getTime()) * dirMul,
      );
      return view === "upcoming" && pinnedIds
        ? pinnedFirst(base, pinnedIds)
        : base;
    }
    default:
      return arr;
  }
}

const ANALYTICS_RANGE_START_ISO = "2000-01-01T00:00:00.000Z";

async function fetchEventLiveStats(
  eventId: string,
): Promise<[string, EventLiveStats]> {
  const endIso = new Date().toISOString();

  const pageViewsUrl =
    `/api/analytics/page-views?eventId=${encodeURIComponent(eventId)}` +
    `&from=${encodeURIComponent(ANALYTICS_RANGE_START_ISO)}` +
    `&to=${encodeURIComponent(endIso)}`;

  const ticketsSoldUrl =
    `/api/analytics/tickets-sold?eventId=${encodeURIComponent(eventId)}` +
    `&start=${encodeURIComponent(ANALYTICS_RANGE_START_ISO)}` +
    `&end=${encodeURIComponent(endIso)}`;

  const revenueUrl =
    `/api/analytics/revenue?eventId=${encodeURIComponent(eventId)}` +
    `&from=${encodeURIComponent(ANALYTICS_RANGE_START_ISO)}` +
    `&to=${encodeURIComponent(endIso)}`;

  const [pageViewsResult, ticketsResult, revenueResult] =
    await Promise.allSettled([
      fetchJSON<PageViewsTotalsResponse>(pageViewsUrl, { cache: "no-store" }),
      fetchJSON<TicketsSoldTotalsResponse>(ticketsSoldUrl, {
        cache: "no-store",
      }),
      fetchJSON<RevenueTotalsResponse>(revenueUrl, { cache: "no-store" }),
    ]);

  const pageViews =
    pageViewsResult.status === "fulfilled"
      ? Number(pageViewsResult.value?.totals?.pageViews ?? 0)
      : 0;

  const ticketsSold =
    ticketsResult.status === "fulfilled"
      ? Number(ticketsResult.value?.totals?.ticketsSold ?? 0)
      : 0;

  const revenue =
    revenueResult.status === "fulfilled"
      ? Number(revenueResult.value?.totals?.revenue ?? 0)
      : 0;

  return [
    eventId,
    {
      pageViews: Number.isFinite(pageViews) ? pageViews : 0,
      ticketsSold: Number.isFinite(ticketsSold) ? ticketsSold : 0,
      revenue: Number.isFinite(revenue) ? revenue : 0,
    },
  ];
}

async function fetchEventsLiveStats(
  events: MyEvent[],
): Promise<EventLiveStatsMap> {
  const realEvents = events.filter((event) => event.status !== "draft");
  if (!realEvents.length) return {};

  const entries = await Promise.all(
    realEvents.map((event) => fetchEventLiveStats(String(event._id))),
  );

  return Object.fromEntries(entries);
}

/* ---------------------- Compact dropdown (Tikd style) -------------- */
function MiniSelect<T extends string>({
  value,
  onChange,
  options,
  btnClassName,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { key: T; label: string }[];
  btnClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const label =
    options.find((o) => o.key === value)?.label ?? options[0]?.label;

  return (
    <div ref={wrapRef} className="relative w-full sm:w-auto">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "inline-flex w-full items-center justify-between gap-2 rounded-full border border-white/10",
          "bg-[#12141f] px-3 py-2 font-medium text-neutral-200",
          "transition hover:bg-white/8 hover:text-neutral-0",
          "focus:outline-none hover:border-primary-500 focus-visible:border-primary-500 cursor-pointer",
          "sm:w-auto sm:justify-center",
          btnClassName,
        )}
      >
        {label}
        <ChevronDown
          className={clsx(
            "h-4 w-4 shrink-0 transition-transform",
            open ? "rotate-180 text-neutral-100" : "text-neutral-400",
          )}
        />
      </button>

      {open && (
        <div
          className={clsx(
            "absolute right-0 z-30 mt-2 w-full overflow-hidden rounded-2xl",
            "border border-white/10 bg-neutral-950/95 shadow-xl backdrop-blur",
          )}
        >
          {options.map((opt) => {
            const active = opt.key === value;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  onChange(opt.key);
                  setOpen(false);
                }}
                className={clsx(
                  "flex w-full items-center justify-between px-3 py-2 text-left text-xs",
                  active
                    ? "bg-primary-700/20 text-neutral-0"
                    : "text-neutral-200 hover:bg-white/5",
                )}
              >
                <span>{opt.label}</span>
                {active ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary-300" />
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------------- Info Tooltip (NEW) ------------------------- */

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="geometricPrecision"
      textRendering="geometricPrecision"
      imageRendering="optimizeQuality"
      fillRule="evenodd"
      clipRule="evenodd"
      viewBox="0 0 512 512"
      className={clsx("h-[15px] w-[15px]", className)}
    >
      <path
        fillRule="nonzero"
        fill="currentColor"
        d="M256 0c70.69 0 134.69 28.66 181.02 74.98C483.34 121.3 512 185.31 512 256c0 70.69-28.66 134.7-74.98 181.02C390.69 483.34 326.69 512 256 512c-70.69 0-134.69-28.66-181.02-74.98C28.66 390.69 0 326.69 0 256c0-70.69 28.66-134.69 74.98-181.02C121.31 28.66 185.31 0 256 0zm-9.96 161.03c0-4.28.76-8.26 2.27-11.91 1.5-3.63 3.77-6.94 6.79-9.91 3-2.95 6.29-5.2 9.84-6.7 3.57-1.5 7.41-2.28 11.52-2.28 4.12 0 7.96.78 11.49 2.27 3.54 1.51 6.78 3.76 9.75 6.73 2.95 2.97 5.16 6.26 6.64 9.91 1.49 3.63 2.22 7.61 2.22 11.89 0 4.17-.73 8.08-2.21 11.69-1.48 3.6-3.68 6.94-6.65 9.97-2.94 3.03-6.18 5.32-9.72 6.84-3.54 1.51-7.38 2.29-11.52 2.29-4.22 0-8.14-.76-11.75-2.26-3.58-1.51-6.86-3.79-9.83-6.79-2.94-3.02-5.16-6.34-6.63-9.97-1.48-3.62-2.21-7.54-2.21-11.77zm13.4 178.16c-1.11 3.97-3.35 11.76 3.3 11.76 1.44 0 3.27-.81 5.46-2.4 2.37-1.71 5.09-4.31 8.13-7.75 3.09-3.5 6.32-7.65 9.67-12.42 3.33-4.76 6.84-10.22 10.49-16.31.37-.65 1.23-.87 1.89-.48l12.36 9.18c.6.43.73 1.25.35 1.86-5.69 9.88-11.44 18.51-17.26 25.88-5.85 7.41-11.79 13.57-17.8 18.43l-.1.06c-6.02 4.88-12.19 8.55-18.51 11.01-17.58 6.81-45.36 5.7-53.32-14.83-5.02-12.96-.9-27.69 3.06-40.37l19.96-60.44c1.28-4.58 2.89-9.62 3.47-14.33.97-7.87-2.49-12.96-11.06-12.96h-17.45c-.76 0-1.38-.62-1.38-1.38l.08-.48 4.58-16.68c.16-.62.73-1.04 1.35-1.02l89.12-2.79c.76-.03 1.41.57 1.44 1.33l-.07.43-37.76 124.7zm158.3-244.93c-41.39-41.39-98.58-67-161.74-67-63.16 0-120.35 25.61-161.74 67-41.39 41.39-67 98.58-67 161.74 0 63.16 25.61 120.35 67 161.74 41.39 41.39 98.58 67 161.74 67 63.16 0 120.35-25.61 161.74-67 41.39-41.39 67-98.58 67-161.74 0-63.16-25.61-120.35-67-161.74z"
      />
    </svg>
  );
}

function StatChip({
  label,
  value,
  icon,
  divider = false,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  divider?: boolean;
}) {
  return (
    <div
      title={label}
      aria-label={`${label}: ${value}`}
      className={clsx(
        "group relative flex min-w-0 flex-1 items-center justify-center px-1 py-2",
        "transition-colors duration-150 hover:bg-white/[0.03]",
        divider &&
          "after:pointer-events-none after:absolute after:right-0 after:top-2 after:bottom-2 after:w-px after:bg-white/10",
      )}
    >
      <div className="inline-flex items-center gap-2">
        <span
          className={clsx(
            "grid h-6 w-6 place-items-center rounded-[4px]",
            "bg-white/[0.03] text-primary-200",
            "ring-1 ring-inset ring-white/10",
            "shadow-[0_10px_18px_rgba(0,0,0,0.22),0_0_16px_rgba(154,70,255,0.10)]",
            "transition-transform duration-150 group-hover:scale-[1.02]",
          )}
          aria-hidden="true"
        >
          {icon}
        </span>

        <span className="truncate text-[13px] font-semibold leading-[1.2] text-white">
          {value}
        </span>

        <span className="sr-only">{label}</span>
      </div>
    </div>
  );
}

function EventInfoTooltip({ ev }: { ev: MyEvent }) {
  const org = ev.organization ?? ev.org;
  const orgName = org?.name ?? "Organization";
  const orgLogo = org?.logo;

  const revenue = revenueOf(ev);
  const tickets = ticketsOf(ev);
  const views = viewsOf(ev);

  function initialsFromName(name: string) {
    const parts = String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!parts.length) return "OR";

    const a = parts[0]?.[0] ?? "";
    const b = (parts.length > 1 ? parts[1]?.[0] : parts[0]?.[1]) ?? "";
    const two = `${a}${b}`.toUpperCase();
    return two || "OR";
  }

  const btnRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);

  const trackRafRef = useRef<number | null>(null);
  const trackUntilRef = useRef<number>(0);

  const closeTimer = useRef<number | null>(null);

  const heightCacheRef = useRef<number>(170);

  const [pos, setPos] = useState<{
    top: number;
    left: number;
    placement: "top" | "bottom";
    arrowLeft: number;
  }>({ top: 0, left: 0, placement: "top", arrowLeft: 146 });

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const recalc = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;

    const r = btn.getBoundingClientRect();

    const tooltipW = 222;
    const gap = 10;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const measuredH =
      tipRef.current?.getBoundingClientRect().height ?? heightCacheRef.current;
    heightCacheRef.current = measuredH;

    const clamp = (n: number, min: number, max: number) =>
      Math.max(min, Math.min(max, n));

    const centerX = r.left + r.width / 2;

    const minCenter = 12 + tooltipW / 2;
    const maxCenter = vw - 12 - tooltipW / 2;
    const clampedCenterX = clamp(centerX, minCenter, maxCenter);

    const spaceTop = r.top;
    const spaceBottom = vh - r.bottom;

    const wantTop = spaceTop >= measuredH + gap + 12;
    const placement: "top" | "bottom" =
      wantTop || spaceTop > spaceBottom ? "top" : "bottom";

    const top = placement === "top" ? r.top - gap : r.bottom + gap;
    const left = clampedCenterX;

    const tooltipLeftEdge = left - tooltipW / 2;
    const arrowLeftRaw = centerX - tooltipLeftEdge;
    const arrowLeft = clamp(arrowLeftRaw, 18, tooltipW - 18);

    setPos({ top, left, placement, arrowLeft });
  }, []);

  const stopTracking = useCallback(() => {
    if (trackRafRef.current) {
      cancelAnimationFrame(trackRafRef.current);
      trackRafRef.current = null;
    }
  }, []);

  const startTracking = useCallback(
    (ms: number) => {
      trackUntilRef.current = performance.now() + ms;

      const tick = () => {
        if (!openRef.current) {
          trackRafRef.current = null;
          return;
        }

        recalc();

        if (performance.now() < trackUntilRef.current) {
          trackRafRef.current = requestAnimationFrame(tick);
        } else {
          trackRafRef.current = null;
        }
      };

      stopTracking();
      trackRafRef.current = requestAnimationFrame(tick);
    },
    [recalc, stopTracking],
  );

  useEffect(() => {
    if (!open) return;

    const onScrollOrResize = () => {
      recalc();
      startTracking(180);
    };

    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);

    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, recalc, startTracking]);

  const openNow = () => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }

    setOpen(true);

    requestAnimationFrame(() => {
      recalc();
      startTracking(520);
    });
  };

  const closeSoon = () => {
    stopTracking();

    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 120);
  };

  useEffect(() => {
    return () => {
      stopTracking();
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    };
  }, [stopTracking]);

  const tooltip = (
    <div
      ref={tipRef}
      onMouseEnter={openNow}
      onMouseLeave={closeSoon}
      className={clsx(
        "fixed z-[9999] w-[222px]",
        "transition-opacity duration-150 ease-out",
        open ? "opacity-100" : "pointer-events-none opacity-0",
      )}
      style={{
        top: pos.top,
        left: pos.left,
        transform:
          pos.placement === "top"
            ? "translate(-50%, -100%)"
            : "translate(-50%, 0%)",
      }}
      role="tooltip"
    >
      <div
        className={clsx(
          "transition-transform duration-150 ease-out",
          open ? "translate-y-0" : "translate-y-1",
        )}
      >
        <div
          className={clsx(
            "relative isolate rounded-[12px] p-[1px]",
            "bg-[linear-gradient(135deg,rgba(154,70,255,0.60),rgba(66,139,255,0.28),rgba(255,255,255,0.10))]",
            "shadow-[0_22px_80px_rgba(0,0,0,0.72),0_0_34px_rgba(154,70,255,0.14)]",
          )}
        >
          <div className="pointer-events-none absolute inset-0 rounded-[12px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]" />

          <div
            className={clsx(
              "relative overflow-hidden rounded-[12px]",
              "bg-[linear-gradient(135deg,rgba(18,18,32,0.92),rgba(10,10,18,0.90))]",
              "backdrop-blur-2xl",
            )}
          >
            <div
              className={clsx(
                "pointer-events-none absolute inset-0",
                "bg-[linear-gradient(90deg,rgba(154,70,255,0.18),rgba(66,139,255,0.12),rgba(154,70,255,0.10))]",
                "blur-2xl opacity-70",
              )}
            />
            <div
              className={clsx(
                "pointer-events-none absolute inset-0 opacity-95",
                "bg-[radial-gradient(280px_150px_at_18%_-10%,rgba(154,70,255,0.26),transparent_62%),radial-gradient(260px_150px_at_92%_120%,rgba(66,139,255,0.18),transparent_60%)]",
              )}
            />
            <div
              className={clsx(
                "pointer-events-none absolute inset-0",
                "bg-[linear-gradient(180deg,rgba(255,255,255,0.14),transparent_42%)]",
                "opacity-60",
              )}
            />
            <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]" />

            <div className="relative z-10 p-3.5">
              <div className="flex items-center gap-3">
                <div
                  className={clsx(
                    "relative h-9 w-9 shrink-0 overflow-hidden rounded-full",
                    "ring-1 ring-inset ring-white/12",
                    "bg-white/[0.04]",
                  )}
                >
                  {orgLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={orgLogo}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className={clsx(
                        "grid h-full w-full place-items-center",
                        "bg-[conic-gradient(from_220deg_at_50%_50%,rgba(154,70,255,0.92),rgba(102,0,183,0.90),rgba(17,24,39,0.90))]",
                      )}
                    >
                      <span className="text-[11px] font-extrabold text-white">
                        {initialsFromName(orgName)}
                      </span>
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]" />
                </div>

                <div className="min-w-0">
                  <div className="truncate text-[12px] font-semibold text-white">
                    {orgName}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-white/55">
                    {clampText(ev.title ?? "", 40)}
                  </div>
                </div>
              </div>

              <div
                className={clsx(
                  "mt-3 overflow-hidden rounded-[8px]",
                  "border border-white/10",
                  "bg-white/[0.03]",
                  "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]",
                )}
              >
                <div className="flex">
                  <StatChip
                    label="Tickets"
                    value={tickets.toLocaleString()}
                    icon={<Ticket className="h-3.5 w-3.5" />}
                    divider
                  />
                  <StatChip
                    label="Views"
                    value={views.toLocaleString()}
                    icon={<Eye className="h-3.5 w-3.5" />}
                    divider
                  />
                  <StatChip
                    label="Revenue"
                    value={money(revenue)}
                    icon={<DollarSign className="h-3.5 w-3.5" />}
                  />
                </div>
              </div>
            </div>
          </div>

          <div
            className={clsx(
              "pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 rotate-45",
              "shadow-[0_14px_28px_rgba(0,0,0,0.55)]",
              pos.placement === "top" ? "bottom-[-7px]" : "top-[-7px]",
            )}
            style={{ left: pos.arrowLeft }}
          >
            <div
              className={clsx(
                "absolute inset-0 rounded-[2px]",
                "bg-[linear-gradient(135deg,rgba(154,70,255,0.60),rgba(66,139,255,0.28),rgba(255,255,255,0.10))]",
              )}
            />
            <div
              className={clsx(
                "absolute inset-[1px] rounded-[2px]",
                "bg-[linear-gradient(135deg,rgba(18,18,32,0.92),rgba(10,10,18,0.90))]",
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative inline-block">
      <button
        ref={btnRef}
        type="button"
        onMouseEnter={openNow}
        onMouseLeave={closeSoon}
        onFocus={openNow}
        onBlur={closeSoon}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (open) setOpen(false);
          else openNow();
        }}
        className={clsx(
          "group/info-btn relative z-10",
          "inline-flex h-8 w-8 items-center justify-center rounded-lg",
          "border border-white/10 bg-neutral-950/45 backdrop-blur-md",
          "text-neutral-200",
          "shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_10px_22px_rgba(0,0,0,0.40)]",
          "transition-[background-color,border-color,transform,color] duration-150",
          "hover:bg-white/8 hover:border-primary-500/45 hover:text-primary-200",
          "active:scale-[0.97]",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
          "cursor-pointer",
        )}
        aria-label="Event information"
        aria-expanded={open}
      >
        <InfoIcon />
      </button>

      {mounted && open ? createPortal(tooltip, document.body) : null}
    </div>
  );
}

/* ---------------------- Org Picker Modal -------------------------- */
type OrgPickerModalProps = {
  open: boolean;
  orgs: Org[];
  loading: boolean;
  selectedOrgId: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
  onConfirm: () => void;
};

function OrgPickerModal({
  open,
  orgs,
  loading,
  selectedOrgId,
  onSelect,
  onClose,
  onConfirm,
}: OrgPickerModalProps) {
  const [query, setQuery] = useState("");

  const filteredOrgs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orgs;

    return orgs.filter((o) => {
      const name = (o.name ?? "").toLowerCase();
      const site = domainFromUrl(o.website ?? "").toLowerCase();
      return name.includes(q) || site.includes(q);
    });
  }, [orgs, query]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollBarGap =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollBarGap > 0) {
      document.body.style.paddingRight = `${scrollBarGap}px`;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const canConfirm = orgs.length > 0 && !!selectedOrgId && !loading;

  const handleOverlayClick = () => onClose();

  const handleCardClick = (e: ReactMouseEvent<HTMLDivElement>, id: string) => {
    e.stopPropagation();
    onSelect(id);
  };

  const handlePanelClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-md sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0"
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      <div
        className={clsx(
          "relative z-10 flex w-full max-w-[480px] flex-col",
          "rounded-t-[24px] border border-white/12 border-b-0",
          "bg-neutral-950/95 shadow-[0_28px_80px_rgba(0,0,0,0.85)]",
          "h-[min(88svh,720px)] max-h-[88svh]",
          "px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:h-[min(578px,80vh)] sm:max-h-[80vh] sm:rounded-2xl sm:border sm:p-6",
        )}
        onClick={handlePanelClick}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-neutral-0">
                Choose an organization
              </h2>

              <p className="mt-1 text-xs leading-5 text-neutral-300">
                Events operate under an organization. Pick which one this new
                event belongs to, or create a new organization first.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-300 transition hover:border-primary-500 hover:text-neutral-0"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search organizations..."
              variant="full"
              shape="pill"
              size="md"
              icon={<Search className="h-4 w-4 text-neutral-400" />}
              aria-label="Search organizations"
              className={clsx(
                "focus-visible:!ring-primary-500",
                "!text-[13px] placeholder:!text-neutral-500",
                "!min-h-[46px] w-full",
              )}
            />
          </div>

          <div className="mt-4 min-h-0 flex-1">
            {loading ? (
              <div className="tikd-scrollbar h-full overflow-y-auto pr-1 sm:pr-2">
                <div className="space-y-3">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-[74px] rounded-2xl" />
                  ))}
                </div>
              </div>
            ) : orgs.length > 0 ? (
              <>
                {filteredOrgs.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/12 bg-neutral-948/90 px-4 py-4 text-sm text-neutral-200">
                    <p className="font-medium text-neutral-0">
                      No organizations match your search.
                    </p>
                    <p className="mt-1 text-xs text-neutral-400">
                      Try a different keyword.
                    </p>
                  </div>
                ) : (
                  <div className="tikd-scrollbar h-full overflow-y-auto pr-1 sm:pr-2">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {filteredOrgs.map((org) => {
                        const selected = org._id === selectedOrgId;

                        return (
                          <div
                            key={org._id}
                            className={clsx(
                              "group relative w-full cursor-pointer rounded-xl border px-4 py-3 text-left transition-all",
                              "bg-neutral-948/90 border-white/10 hover:border-primary-500/70 hover:bg-neutral-900/90",
                              selected &&
                                "border-primary-500 bg-neutral-948/95 ring-1 ring-inset ring-primary-500/80",
                            )}
                            onClick={(e) => handleCardClick(e, org._id)}
                          >
                            <div className="flex h-full flex-col items-center justify-between">
                              <div className="flex w-full flex-col items-center gap-3 pt-1">
                                <div
                                  className={clsx(
                                    "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md",
                                    "bg-neutral-900 ring-1 ring-inset ring-white/10",
                                    selected && "ring-primary-500/80",
                                  )}
                                >
                                  {org.logo ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={org.logo}
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-sm font-semibold text-neutral-0">
                                      {org.name?.[0]?.toUpperCase() ?? "O"}
                                    </span>
                                  )}
                                </div>

                                <div className="min-w-0 text-center">
                                  <p className="truncate text-[13px] font-semibold text-neutral-0">
                                    {org.name}
                                  </p>
                                  {org.website && (
                                    <p className="mt-0.5 truncate text-[11px] text-neutral-400">
                                      {domainFromUrl(org.website)}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="mt-3 h-6 pb-1">
                                {selected ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary-900/90 via-primary-700/90 to-primary-500/90 px-2.5 py-1 text-[11px] font-medium text-neutral-0 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Selected
                                  </span>
                                ) : (
                                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/12 bg-white/5 text-[10px] text-neutral-300 group-hover:border-primary-400/80 group-hover:text-primary-200">
                                    <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 group-hover:bg-primary-300" />
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-white/12 bg-neutral-948/90 px-4 py-4 text-sm text-neutral-200">
                <p className="font-medium text-neutral-0">
                  You don&apos;t have any organizations yet.
                </p>
                <p className="mt-1 text-xs leading-5 text-neutral-400">
                  Create an organization first, then you can launch events under
                  that brand.
                </p>
                <Link
                  href="/dashboard/organizations/new"
                  className="mt-4 inline-flex items-center text-xs font-medium text-primary-300 hover:text-primary-200"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Create organization
                </Link>
              </div>
            )}
          </div>

          {orgs.length > 0 ? (
            <div className="mt-4 border-t border-white/10 pt-4">
              <div className="flex justify-end">
                <div className="w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="primary"
                    disabled={!canConfirm}
                    onClick={onConfirm}
                    className="w-full justify-center"
                  >
                    <CalendarPlus className="h-4 w-4" />
                    Continue
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* -------------------- Shared sort fields --------------------------- */
const SORT_FIELDS: { key: SortField; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "pageViews", label: "Page Views" },
  { key: "ticketsSold", label: "Tickets Sold" },
  { key: "revenue", label: "Revenue" },
  { key: "eventDate", label: "Event Date" },
];

function PinGlyph({
  active,
  className,
}: {
  active: boolean;
  className?: string;
}) {
  const accent = "rgb(179, 139, 255)";
  const idleStroke = "rgba(255,255,255,0.72)";

  const stroke = active ? accent : idleStroke;
  const fill = active ? accent : "none";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill={fill}
      viewBox="0 0 75 100"
      className={clsx("h-[15px] w-[15px] rotate-[35deg]", className)}
      aria-hidden="true"
    >
      <line strokeWidth="12" stroke={stroke} y2="100" x2="37" y1="64" x1="37" />
      <path
        strokeWidth="10"
        stroke={stroke}
        d="M16.5 36V4.5H58.5V36V53.75V54.9752L59.1862 55.9903L66.9674 67.5H8.03256L15.8138 55.9903L16.5 54.9752V53.75V36Z"
      />
    </svg>
  );
}

function PinOverlayButton({
  pinned,
  onToggle,
}: {
  pinned: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className={clsx(
        "z-20",
        "inline-flex items-center gap-2 cursor-pointer",
        pinned
          ? clsx(
              "h-8 w-8 rounded-lg flex items-center justify-center",
              "border border-primary-500/35",
              "bg-neutral-950/55 backdrop-blur-md",
              "shadow-[0_0_0_1px_rgba(255,255,255,0.07),0_10px_24px_rgba(0,0,0,0.45)]",
              "text-[12px] font-semibold text-neutral-50",
              "transition hover:bg-neutral-950/70 hover:border-primary-500/55",
              "active:scale-[0.97]",
            )
          : clsx(
              "h-8 w-8 justify-center rounded-lg",
              "border border-white/10 bg-neutral-950/45 backdrop-blur-md",
              "text-neutral-200",
              "shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_10px_22px_rgba(0,0,0,0.40)]",
              "transition hover:bg-white/8 hover:border-primary-500/45",
              "active:scale-[0.97]",
            ),
      )}
      aria-label={pinned ? "Unpin event" : "Pin event"}
      title={pinned ? "Unpin" : "Pin"}
    >
      <PinGlyph active={pinned} />
    </button>
  );
}

function MobileMetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className={clsx(
        "rounded-[12px] border border-white/10 bg-white/[0.04] px-2.5 py-2.5 text-center",
        "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]",
      )}
    >
      <p className="truncate text-[12px] font-semibold leading-tight text-neutral-0">
        {value}
      </p>
      <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-neutral-500">
        {label}
      </p>
    </div>
  );
}

/* ------------------------ Row card (List) -------------------------- */
function EventRowCard({
  ev,
  pinned,
  onTogglePin,
}: {
  ev: MyEvent;
  pinned: boolean;
  onTogglePin: () => void;
}) {
  const rowImg =
    ev.image && ev.image.trim() ? ev.image.trim() : EVENT_CARD_DEFAULT_POSTER;

  const org = ev.organization ?? ev.org;
  const orgName = org?.name ?? "—";

  const revenue = revenueOf(ev);
  const tickets = ticketsOf(ev);
  const views = viewsOf(ev);

  function MobileChip({
    label,
    value,
    icon,
  }: {
    label: string;
    value: string;
    icon: React.ReactNode;
  }) {
    return (
      <span
        className={clsx(
          "inline-flex items-center gap-1.5 rounded-full",
          "border border-white/10 bg-white/[0.04] px-2.5 py-1.5",
          "text-[11px] font-medium text-neutral-200",
          "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]",
        )}
      >
        <span className="text-primary-200" aria-hidden="true">
          {icon}
        </span>
        <span className="tabular-nums text-neutral-0">{value}</span>
        <span className="text-neutral-400">{label}</span>
      </span>
    );
  }

  function MetricCell({
    label,
    value,
    icon,
    align = "center",
    divider = false,
  }: {
    label: string;
    value: string;
    icon: React.ReactNode;
    align?: "left" | "center";
    divider?: boolean;
  }) {
    return (
      <div
        className={clsx(
          "min-w-0",
          align === "center" ? "text-center" : "text-left",
          divider &&
            "relative pl-6 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-px before:bg-white/10",
        )}
      >
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          {label}
        </div>

        <div
          className={clsx(
            "mt-1 flex items-center gap-2",
            align === "center" ? "justify-center" : "justify-start",
          )}
        >
          <span className="text-primary-200" aria-hidden="true">
            {icon}
          </span>
          <span className="truncate text-[13px] font-semibold text-neutral-0 tabular-nums">
            {value}
          </span>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={`/dashboard/events/${ev._id}`}
      className={clsx(
        "group relative flex w-full flex-col gap-3",
        "rounded-[16px] border border-white/10",
        "bg-white/[0.04] px-4 py-4",
        "shadow-[0_18px_55px_rgba(0,0,0,0.35)]",
        "transition-colors",
        "hover:border-primary-500/55 hover:bg-white/[0.06]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
        "md:flex-row md:items-center md:gap-4 md:rounded-[14px] md:px-4 md:py-3.5",
      )}
    >
      <div className="flex min-w-0 items-start gap-3 md:items-center">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[12px] bg-white/5 ring-1 ring-white/10 md:h-11 md:w-11">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={rowImg}
            alt=""
            className="h-full w-full object-cover"
            onError={(e) => {
              const img = e.currentTarget;
              if (img.src !== EVENT_CARD_DEFAULT_POSTER) {
                img.onerror = null;
                img.src = EVENT_CARD_DEFAULT_POSTER;
              }
            }}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <div className="truncate text-[14px] font-semibold text-neutral-50 sm:text-[15px]">
              {ev.title}
            </div>
          </div>

          <div className="mt-0.5 truncate text-[12px] leading-5 text-neutral-400">
            {clampText(`${formatDateLine(ev.date)} • ${ev.location ?? ""}`, 72)}
          </div>

          <div className="mt-1 truncate text-[11px] text-neutral-500 md:hidden">
            {orgName}
          </div>

          <div className="mt-2 flex flex-wrap gap-2 md:hidden">
            <MobileChip
              label="Sold"
              value={tickets.toLocaleString()}
              icon={<Ticket className="h-3.5 w-3.5" />}
            />
            <MobileChip
              label="Views"
              value={views.toLocaleString()}
              icon={<Eye className="h-3.5 w-3.5" />}
            />
            <MobileChip
              label="Revenue"
              value={money(revenue)}
              icon={<DollarSign className="h-3.5 w-3.5" />}
            />
          </div>
        </div>
      </div>

      <div
        className={clsx(
          "hidden md:grid md:flex-1 md:items-center",
          "grid-cols-[minmax(220px,1fr)_110px_110px_140px]",
          "gap-6 px-2",
        )}
      >
        <MetricCell
          label="Host"
          value={orgName}
          icon={<Building2 className="h-4 w-4" />}
          align="left"
        />
        <MetricCell
          label="Sold"
          value={tickets.toLocaleString()}
          icon={<Ticket className="h-4 w-4" />}
          divider
        />
        <MetricCell
          label="Views"
          value={views.toLocaleString()}
          icon={<Eye className="h-4 w-4" />}
          divider
        />
        <MetricCell
          label="Revenue"
          value={money(revenue)}
          icon={<DollarSign className="h-4 w-4" />}
          divider
        />
      </div>

      <div className="flex w-full items-center justify-between pt-1 md:ml-auto md:w-auto md:justify-end md:pt-0">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onTogglePin();
          }}
          className={clsx(
            "inline-flex h-9 w-9 items-center justify-center rounded-lg",
            pinned
              ? "border border-primary-500/45 bg-primary-500/10 text-neutral-0"
              : "border border-white/10 bg-white/5 text-neutral-200",
            "shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_10px_22px_rgba(0,0,0,0.35)]",
            "transition",
            "hover:border-primary-500/60 hover:bg-white/10",
            "active:scale-[0.97]",
          )}
          aria-label={pinned ? "Unpin event" : "Pin event"}
          title={pinned ? "Unpin" : "Pin"}
        >
          <PinGlyph active={pinned} className="h-[14px] w-[14px]" />
        </button>

        <div className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-neutral-200 group-hover:bg-white/10">
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}

/* ----------------------------- Page -------------------------------- */
export default function DashboardEventsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const [view, setView] = useState<EventViewId>("upcoming");

  const [layout, setLayout] = useState<GridListValue>("grid");

  const [lastUpcomingLayout, setLastUpcomingLayout] =
    useState<GridListValue>("grid");

  const prevViewRef = useRef<EventViewId>("upcoming");

  const [eventsQuery, setEventsQuery] = useState("");

  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [showOrgPicker, setShowOrgPicker] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  const { data: orgs, isLoading: orgsLoading } = useQuery<Org[]>({
    queryKey: ["orgs", "connections-events"],
    queryFn: () => fetchJSON<Org[]>("/api/organizations"),
    enabled: !!session,
  });

  const { data: allEvents, isLoading: eventsLoading } = useQuery<MyEvent[]>({
    queryKey: ["myEvents", "connections-events"],
    queryFn: () => fetchJSON<MyEvent[]>("/api/events?owned=1"),
    enabled: !!session,
  });

  const { data: pinnedIdsResp } = useQuery<{ ids: string[] }>({
    queryKey: ["eventPins"],
    queryFn: () =>
      fetchJSON<{ ids: string[] }>("/api/events/pins", { cache: "no-store" }),
    enabled: !!session,
  });

  const pinnedIds = useMemo(
    () => new Set((pinnedIdsResp?.ids ?? []).map(String)),
    [pinnedIdsResp],
  );

  const pinMutation = useMutation({
    mutationFn: async (vars: { id: string; pinned: boolean }) => {
      return fetchJSONWithBody<{ ok: true; pinned: boolean }>(
        `/api/events/${vars.id}/pin`,
        { method: "PUT", body: { pinned: vars.pinned } },
      );
    },
    onMutate: async ({ id, pinned }) => {
      await queryClient.cancelQueries({ queryKey: ["eventPins"] });

      const prev = queryClient.getQueryData<{ ids: string[] }>(["eventPins"]);
      const prevIds = (prev?.ids ?? []).map(String);

      const nextIds = new Set(prevIds);
      if (pinned) nextIds.add(String(id));
      else nextIds.delete(String(id));

      queryClient.setQueryData(["eventPins"], { ids: Array.from(nextIds) });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["eventPins"], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["eventPins"] });
    },
  });

  function togglePin(id: string, nextPinned: boolean) {
    pinMutation.mutate({ id, pinned: nextPinned });
  }

  const orgsList = useMemo<Org[]>(() => orgs ?? [], [orgs]);

  const events = useMemo<MyEvent[]>(() => {
    const list = (allEvents ?? []) as MyEvent[];
    if (!list.length) return list;
    if (!orgsList.length) return list;

    const byId = new Map<string, Org>();
    for (const o of orgsList) byId.set(String(o._id), o);

    return list.map((e) => {
      if (e.organization || e.org) return e;
      const org = e.organizationId
        ? byId.get(String(e.organizationId))
        : undefined;
      return org ? { ...e, organization: org } : e;
    });
  }, [allEvents, orgsList]);

  const liveStatsQuery = useQuery({
    queryKey: [
      "dashboard-events-live-stats",
      events.map((e) => e._id).join(","),
    ],
    queryFn: () => fetchEventsLiveStats(events),
    enabled: !!session && events.length > 0,
    staleTime: 30_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const liveStatsMap = liveStatsQuery.data ?? {};

  const eventsWithLiveStats = useMemo<MyEvent[]>(() => {
    return events.map((event) => {
      const live = liveStatsMap[String(event._id)];
      if (!live) return event;

      return {
        ...event,
        pageViews: live.pageViews,
        views: live.pageViews,
        ticketsSold: live.ticketsSold,
        sold: live.ticketsSold,
        revenue: live.revenue,
        revenueTotal: live.revenue,
        grossRevenue: live.revenue,
      };
    });
  }, [events, liveStatsMap]);

  const now = useMemo(() => Date.now(), []);

  const upcomingBase = useMemo(
    () =>
      eventsWithLiveStats.filter(
        (e) => new Date(e.date).getTime() >= now && e.status !== "draft",
      ),
    [eventsWithLiveStats, now],
  );
  const pastBase = useMemo(
    () =>
      eventsWithLiveStats.filter(
        (e) => new Date(e.date).getTime() < now && e.status !== "draft",
      ),
    [eventsWithLiveStats, now],
  );
  const draftsBase = useMemo(
    () => eventsWithLiveStats.filter((e) => e.status === "draft"),
    [eventsWithLiveStats],
  );

  useEffect(() => {
    const prev = prevViewRef.current;

    if (prev === "upcoming" && view !== "upcoming") {
      setLastUpcomingLayout(layout);
      setLayout("list");
    }

    if (prev !== "upcoming" && view === "upcoming") {
      setLayout(lastUpcomingLayout);
    }

    prevViewRef.current = view;
  }, [view, layout, lastUpcomingLayout]);

  const defaultDirFor = useMemo(() => {
    return (field: SortField): SortDir => {
      if (field === "title") return "asc";
      if (field === "eventDate") return view === "upcoming" ? "asc" : "desc";
      return "desc";
    };
  }, [view]);

  useEffect(() => {
    if (!sortField) return;
    setSortDir((prev) => {
      const ideal = defaultDirFor(sortField);
      if (sortField === "eventDate") return ideal;
      return prev;
    });
  }, [view, sortField, defaultDirFor]);

  const viewOptions: { key: EventViewId; label: string }[] = [
    { key: "upcoming", label: "Upcoming" },
    { key: "past", label: "Past" },
    { key: "drafts", label: "Drafts" },
  ];

  function openOrgPicker() {
    if (orgsList.length > 0) setSelectedOrgId(orgsList[0]._id);
    else setSelectedOrgId(null);
    setShowOrgPicker(true);
  }

  function handleOrgPickerConfirm() {
    if (!selectedOrgId) return;
    setShowOrgPicker(false);
    router.push(`/dashboard/organizations/${selectedOrgId}/events/create`);
  }

  const upcomingFiltered = useMemo(
    () => upcomingBase.filter((e) => matchesEventQuery(e, eventsQuery)),
    [upcomingBase, eventsQuery],
  );
  const pastFiltered = useMemo(
    () => pastBase.filter((e) => matchesEventQuery(e, eventsQuery)),
    [pastBase, eventsQuery],
  );
  const draftsFiltered = useMemo(
    () => draftsBase.filter((e) => matchesEventQuery(e, eventsQuery)),
    [draftsBase, eventsQuery],
  );

  const upcomingSorted = useMemo(
    () =>
      sortEvents({
        list: upcomingFiltered,
        view: "upcoming",
        sortField,
        sortDir,
        pinnedIds,
      }),
    [upcomingFiltered, sortField, sortDir, pinnedIds],
  );

  const pastSorted = useMemo(
    () =>
      sortEvents({
        list: pastFiltered,
        view: "past",
        sortField,
        sortDir,
      }),
    [pastFiltered, sortField, sortDir],
  );

  const draftsSorted = useMemo(
    () =>
      sortEvents({
        list: draftsFiltered,
        view: "drafts",
        sortField,
        sortDir,
      }),
    [draftsFiltered, sortField, sortDir],
  );

  const gridCols =
    "grid-cols-1 justify-items-center gap-4 " +
    "sm:grid-cols-[repeat(auto-fill,minmax(190px,190px))] sm:justify-start sm:gap-3 " +
    "md:grid-cols-[repeat(auto-fill,minmax(200px,200px))] " +
    "lg:grid-cols-[repeat(auto-fill,minmax(210px,210px))]";

  return (
    <div className="relative overflow-hidden bg-neutral-950 text-neutral-0">
      <section className="pb-16">
        <section
          className={clsx(
            "mt-4 overflow-hidden rounded-2xl border border-white/10",
            "bg-neutral-950/70 shadow-[0_18px_60px_rgba(0,0,0,0.55)]",
          )}
        >
          <div
            className={clsx(
              "relative p-4 md:p-5",
              "bg-[radial-gradient(900px_320px_at_25%_0%,rgba(154,70,255,0.10),transparent_60%),radial-gradient(900px_320px_at_90%_110%,rgba(66,139,255,0.08),transparent_55%)]",
            )}
          >
            <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <div className="text-base font-semibold tracking-[0.18em] text-neutral-300">
                  EVENTS
                </div>
                <div className="mt-1 text-sm leading-6 text-neutral-400">
                  Track performance, manage drafts, and jump into event setup.
                </div>
              </div>

              <div className="flex w-full min-w-0 flex-col gap-3 xl:w-auto xl:flex-row xl:items-center">
                <div
                  className={clsx(
                    "relative h-12 w-full min-w-0 sm:h-10 xl:w-[420px]",
                    "rounded-[22px] border border-white/10 bg-[#12141f] sm:rounded-lg",
                  )}
                >
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-300" />
                  <input
                    value={eventsQuery}
                    onChange={(e) => setEventsQuery(e.target.value)}
                    placeholder="Search here"
                    className={clsx(
                      "h-12 w-full rounded-[22px] bg-transparent sm:h-10 sm:rounded-lg",
                      "pl-10 pr-4 text-[14px] text-neutral-100 sm:text-[12px]",
                      "placeholder:text-neutral-500",
                      "outline-none border-none focus:ring-1 focus:ring-primary-500",
                    )}
                    aria-label="Search events"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:hidden">
                  <MiniSelect
                    value={view}
                    onChange={setView}
                    options={viewOptions}
                    btnClassName="h-12 w-full px-4 text-[15px]"
                  />

                  <div className="flex items-center gap-3">
                    <div className="shrink-0">
                      <GridListToggle
                        value={layout}
                        onChange={setLayout}
                        disabled={view !== "upcoming"}
                        ariaLabel="Layout view toggle"
                      />
                    </div>

                    <div className="shrink-0">
                      <SortControl
                        options={SORT_FIELDS}
                        sortField={sortField}
                        sortDir={sortDir}
                        setSortField={setSortField}
                        setSortDir={setSortDir}
                        defaultDirFor={defaultDirFor}
                        dropdownWidthClass="w-[min(18rem,calc(100vw-2.5rem))]"
                      />
                    </div>
                  </div>

                  <div className="w-full pt-1">
                    <Button
                      onClick={openOrgPicker}
                      type="button"
                      variant="primary"
                      icon={<CalendarPlus className="h-4 w-4" />}
                      animation
                      className="w-full justify-center"
                    >
                      Create Event
                    </Button>
                  </div>
                </div>

                <div className="hidden sm:flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center xl:flex-nowrap">
                  <div className="flex flex-wrap items-center gap-2">
                    <GridListToggle
                      value={layout}
                      onChange={setLayout}
                      disabled={view !== "upcoming"}
                      ariaLabel="Layout view toggle"
                    />

                    <SortControl
                      options={SORT_FIELDS}
                      sortField={sortField}
                      sortDir={sortDir}
                      setSortField={setSortField}
                      setSortDir={setSortDir}
                      defaultDirFor={defaultDirFor}
                      dropdownWidthClass="w-[min(18rem,calc(100vw-2.5rem))] sm:w-[220px]"
                    />

                    <MiniSelect
                      value={view}
                      onChange={setView}
                      options={viewOptions}
                      btnClassName="h-10 w-full sm:w-auto"
                    />
                  </div>

                  <div className="w-full sm:w-auto">
                    <Button
                      onClick={openOrgPicker}
                      type="button"
                      variant="primary"
                      icon={<CalendarPlus className="h-4 w-4" />}
                      animation
                    >
                      Create Event
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4">
              {view === "upcoming" ? (
                eventsLoading ? (
                  layout === "grid" ? (
                    <div className={clsx("grid content-start", gridCols)}>
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-full max-w-[280px] sm:w-full sm:max-w-none"
                        >
                          <Skeleton className="aspect-[71/114] w-full rounded-lg" />
                          <div className="mt-2 space-y-1">
                            <Skeleton className="h-4 w-3/4 rounded-md" />
                            <Skeleton className="h-3 w-1/2 rounded-md" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton
                          key={`up-row-skel-${i}`}
                          className="h-[110px] w-full rounded-[16px] md:h-[92px] md:rounded-[12px]"
                        />
                      ))}
                    </div>
                  )
                ) : upcomingSorted.length === 0 ? (
                  <div className="w-full rounded-2xl border border-dashed border-white/15 bg-transparent p-8 text-center sm:p-10">
                    <p className="text-sm font-medium text-neutral-0">
                      No upcoming events yet
                    </p>
                    <p className="mt-2 text-[12px] leading-5 text-neutral-400">
                      Create an event and it will appear here once scheduled.
                    </p>
                  </div>
                ) : layout === "grid" ? (
                  <div className={clsx("grid content-start", gridCols)}>
                    {upcomingSorted.map((ev) => {
                      const isPinned = pinnedIds.has(String(ev._id));

                      return (
                        <div
                          key={ev._id}
                          className="relative group w-full max-w-[280px] sm:w-full sm:max-w-none"
                        >
                          <EventCard
                            id={ev._id}
                            title={ev.title}
                            dateLabel={formatEventDate(ev.date)}
                            venue={ev.location ?? ""}
                            category={ev.category ?? ""}
                            img={ev.image ?? ""}
                            href={`/dashboard/events/${ev._id}`}
                            className="w-full"
                            topLeftOverlay={<EventInfoTooltip ev={ev} />}
                            topLeftOverlayClassName={clsx(
                              "opacity-100 transition-opacity duration-200",
                              "sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
                            )}
                            topRightOverlay={
                              <PinOverlayButton
                                pinned={isPinned}
                                onToggle={() =>
                                  togglePin(String(ev._id), !isPinned)
                                }
                              />
                            }
                            topRightOverlayClassName={clsx(
                              "transition-opacity duration-200",
                              isPinned
                                ? "opacity-100 pointer-events-auto"
                                : clsx(
                                    "opacity-100 pointer-events-auto",
                                    "sm:opacity-0 sm:pointer-events-none",
                                    "sm:group-hover:opacity-100 sm:group-hover:pointer-events-auto",
                                    "sm:group-focus-within:opacity-100 sm:group-focus-within:pointer-events-auto",
                                  ),
                            )}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingSorted.map((ev) => {
                      const isPinned = pinnedIds.has(String(ev._id));
                      return (
                        <EventRowCard
                          key={ev._id}
                          ev={ev}
                          pinned={isPinned}
                          onTogglePin={() =>
                            togglePin(String(ev._id), !isPinned)
                          }
                        />
                      );
                    })}
                  </div>
                )
              ) : null}

              {view === "past" ? (
                eventsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-[116px] rounded-[16px] md:h-[92px] md:rounded-2xl" />
                    <Skeleton className="h-[116px] rounded-[16px] md:h-[92px] md:rounded-2xl" />
                    <Skeleton className="h-[116px] rounded-[16px] md:h-[92px] md:rounded-2xl" />
                  </div>
                ) : pastSorted.length === 0 ? (
                  <div className="w-full rounded-2xl border border-dashed border-white/15 bg-transparent p-8 text-center sm:p-10">
                    <p className="text-sm font-medium text-neutral-0">
                      No past events yet
                    </p>
                    <p className="mt-2 text-[12px] leading-5 text-neutral-400">
                      Once you’ve hosted events, they’ll show up here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-2">
                    {pastSorted.map((ev, idx) => {
                      const revenue = revenueOf(ev);
                      const ticketsSold = ticketsOf(ev);

                      const activeRow = idx === 0;

                      const rowImg =
                        ev.image && ev.image.trim()
                          ? ev.image.trim()
                          : EVENT_CARD_DEFAULT_POSTER;

                      return (
                        <Link
                          key={ev._id}
                          href={`/dashboard/events/${ev._id}`}
                          className={clsx(
                            "group relative block rounded-[16px] border border-white/10 bg-white/[0.04] shadow-[0_18px_55px_rgba(0,0,0,0.30)] transition-colors duration-200 ease-out",
                            "hover:border-primary-500/35 hover:bg-white/[0.06]",
                            "md:shadow-none md:rounded-lg",
                            activeRow
                              ? "md:border-white/10 md:bg-neutral-948/10"
                              : "md:border-transparent md:bg-transparent md:hover:bg-white/4",
                          )}
                        >
                          <span
                            className={clsx(
                              "pointer-events-none absolute inset-0 z-0 rounded-[16px] md:rounded-lg",
                              "opacity-0 transition-opacity duration-250 ease-out",
                              "group-hover:opacity-100",
                              "bg-[radial-gradient(900px_220px_at_20%_0%,rgba(154,70,255,0.10),transparent_55%),radial-gradient(700px_220px_at_95%_120%,rgba(66,139,255,0.08),transparent_55%)]",
                            )}
                          />
                          <span
                            className={clsx(
                              "pointer-events-none absolute inset-0 z-0 rounded-[16px] md:rounded-lg",
                              "opacity-0 transition-opacity duration-250 ease-out",
                              "group-hover:opacity-100",
                              "shadow-[0_0_0_1px_rgba(154,70,255,0.22),0_0_22px_rgba(154,70,255,0.14)]",
                            )}
                          />

                          <div className="relative z-10 flex flex-col gap-3 p-4 md:flex-row md:items-center md:gap-4 md:p-4">
                            <div className="flex min-w-0 items-start gap-3 md:items-center">
                              <div className="h-[58px] w-[58px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-neutral-900 md:h-[54px] md:w-[54px] md:rounded-lg">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={rowImg}
                                  alt=""
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    const img = e.currentTarget;
                                    if (img.src !== EVENT_CARD_DEFAULT_POSTER) {
                                      img.onerror = null;
                                      img.src = EVENT_CARD_DEFAULT_POSTER;
                                    }
                                  }}
                                />
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[15px] font-semibold text-neutral-0">
                                  {ev.title}
                                </p>
                                <p className="mt-1 truncate text-xs text-primary-500">
                                  {formatDateLine(ev.date)}
                                </p>
                                <p className="mt-1 truncate text-[11px] text-neutral-500 md:hidden">
                                  {ev.location}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 md:hidden">
                              <MobileMetricCard
                                label="Revenue"
                                value={money(revenue)}
                              />
                              <MobileMetricCard
                                label="Sold"
                                value={ticketsSold.toLocaleString()}
                              />
                              <MobileMetricCard
                                label="Date"
                                value={formatEventDate(ev.date)}
                              />
                            </div>

                            <div className="hidden flex-1 grid-cols-1 gap-3 text-left sm:grid-cols-3 sm:text-center md:grid">
                              <div>
                                <p className="text-base font-semibold text-neutral-0">
                                  {money(revenue)}
                                </p>
                                <p className="mt-1 text-neutral-400">Revenue</p>
                              </div>

                              <div>
                                <p className="text-base font-semibold text-neutral-0">
                                  {ticketsSold.toLocaleString()}
                                </p>
                                <p className="mt-1 text-neutral-400">
                                  Tickets Sold
                                </p>
                              </div>

                              <div>
                                <p className="text-base font-semibold text-neutral-0">
                                  {formatEventDate(ev.date)}
                                </p>
                                <p className="mt-1 text-neutral-400">
                                  Event Date
                                </p>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )
              ) : null}

              {view === "drafts" ? (
                eventsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-[108px] rounded-[16px] md:h-[92px] md:rounded-2xl" />
                    <Skeleton className="h-[108px] rounded-[16px] md:h-[92px] md:rounded-2xl" />
                    <Skeleton className="h-[108px] rounded-[16px] md:h-[92px] md:rounded-2xl" />
                  </div>
                ) : draftsSorted.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-neutral-950/50 p-8 text-center sm:p-10">
                    <p className="text-sm font-medium text-neutral-0">
                      No drafts yet
                    </p>
                    <p className="mt-1 text-xs leading-5 text-neutral-300">
                      Start creating an event and save it as a draft to keep
                      building it later.
                    </p>
                    <button
                      type="button"
                      onClick={openOrgPicker}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-4 py-3 text-xs font-medium text-white transition hover:bg-primary-600 cursor-pointer"
                    >
                      <CalendarPlus className="h-4 w-4" />
                      Create Event
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-2">
                    {draftsSorted.map((ev, idx) => {
                      const activeRow = idx === 0;

                      const rowImg =
                        ev.image && ev.image.trim()
                          ? ev.image.trim()
                          : EVENT_CARD_DEFAULT_POSTER;

                      return (
                        <Link
                          key={ev._id}
                          href={`/dashboard/events/${ev._id}`}
                          className={clsx(
                            "group relative block rounded-[16px] border border-white/10 bg-white/[0.04] shadow-[0_18px_55px_rgba(0,0,0,0.30)] transition-colors duration-200 ease-out",
                            "hover:border-primary-500/35 hover:bg-white/[0.06]",
                            "md:shadow-none md:rounded-lg",
                            activeRow
                              ? "md:border-white/10 md:bg-neutral-948/10"
                              : "md:border-transparent md:bg-transparent md:hover:bg-white/4",
                          )}
                        >
                          <span
                            className={clsx(
                              "pointer-events-none absolute inset-0 z-0 rounded-[16px] md:rounded-lg",
                              "opacity-0 transition-opacity duration-250 ease-out",
                              "group-hover:opacity-100",
                              "bg-[radial-gradient(900px_220px_at_20%_0%,rgba(154,70,255,0.10),transparent_55%),radial-gradient(700px_220px_at_95%_120%,rgba(66,139,255,0.08),transparent_55%)]",
                            )}
                          />
                          <span
                            className={clsx(
                              "pointer-events-none absolute inset-0 z-0 rounded-[16px] md:rounded-lg",
                              "opacity-0 transition-opacity duration-250 ease-out",
                              "group-hover:opacity-100",
                              "shadow-[0_0_0_1px_rgba(154,70,255,0.22),0_0_22px_rgba(154,70,255,0.14)]",
                            )}
                          />

                          <div className="relative z-10 flex flex-col gap-3 p-4 md:flex-row md:items-center md:gap-4 md:p-4">
                            <div className="flex min-w-0 items-start gap-3 md:items-center">
                              <div className="h-[58px] w-[58px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-neutral-900 md:h-[54px] md:w-[54px] md:rounded-lg">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={rowImg}
                                  alt=""
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    const img = e.currentTarget;
                                    if (img.src !== EVENT_CARD_DEFAULT_POSTER) {
                                      img.onerror = null;
                                      img.src = EVENT_CARD_DEFAULT_POSTER;
                                    }
                                  }}
                                />
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[15px] font-semibold text-neutral-0">
                                  {ev.title}
                                </p>
                                <p className="mt-1 truncate text-xs text-primary-500">
                                  {formatDateLine(ev.date)}
                                </p>
                                <div className="mt-2 flex flex-wrap items-center gap-2 md:hidden">
                                  <span className="inline-flex items-center rounded-full border border-primary-500/30 bg-primary-500/10 px-3 py-1 text-[11px] font-semibold text-primary-200">
                                    Draft
                                  </span>
                                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-neutral-300">
                                    Saved
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="hidden flex-1 items-center justify-start sm:justify-end md:flex">
                              <div className="text-left sm:text-center">
                                <p className="text-sm font-semibold text-neutral-0">
                                  Draft
                                </p>
                                <p className="mt-1 text-xs text-neutral-400">
                                  Status
                                </p>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )
              ) : null}
            </div>
          </div>
        </section>
      </section>

      <OrgPickerModal
        open={showOrgPicker}
        orgs={orgsList}
        loading={orgsLoading}
        selectedOrgId={selectedOrgId}
        onSelect={setSelectedOrgId}
        onClose={() => setShowOrgPicker(false)}
        onConfirm={handleOrgPickerConfirm}
      />
    </div>
  );
}
