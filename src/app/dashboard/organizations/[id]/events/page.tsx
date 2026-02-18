/* ------------------------------------------------------------------ */
/*  src/app/dashboard/organizations/[id]/events/page.tsx               */
/* ------------------------------------------------------------------ */
"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import {
  CalendarPlus,
  ChevronDown,
  ChevronRight,
  Eye,
  Ticket,
  DollarSign,
  Building2,
} from "lucide-react";

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

  // Optional org payloads
  organization?: Org;
  org?: Org;
  organizationId?: string;
};

type OrgWithEvents = Org & {
  events?: MyEvent[];
};

type EventViewId = "upcoming" | "past" | "drafts";

type SortField =
  | "title"
  | "pageViews"
  | "ticketsSold"
  | "revenue"
  | "eventDate";
type SortDir = "asc" | "desc";

/* ---------------------------- Helpers ------------------------------ */
async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(
      `Request failed: ${res.status} ${res.statusText}${txt ? ` — ${txt}` : ""}`,
    );
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
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "inline-flex items-center gap-2 rounded-full border border-white/10",
          // ✅ match main Events page controls color
          "bg-[#12141f] px-3 py-2 font-medium text-neutral-200",
          "transition hover:bg-white/8 hover:text-neutral-0",
          "focus:outline-none hover:border-primary-500 focus-visible:border-primary-500 cursor-pointer",
          btnClassName,
        )}
      >
        {label}
        <ChevronDown
          className={clsx(
            "h-4 w-4 transition-transform",
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

/* ---------------------- Info Tooltip (same as Events) -------------- */
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

/* ------------------------ Row card (List) -------------------------- */
function EventRowCard({
  ev,
  pinned,
  onTogglePin,
  href,
}: {
  ev: MyEvent;
  pinned: boolean;
  onTogglePin: () => void;
  href: string;
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
          "border border-white/10 bg-white/[0.04] px-2.5 py-1",
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
      href={href}
      className={clsx(
        "group relative flex w-full items-center gap-4",
        "rounded-[14px] border border-white/10",
        "bg-white/[0.04] px-4 py-3.5",
        "shadow-[0_18px_55px_rgba(0,0,0,0.35)]",
        "transition-colors",
        "hover:border-primary-500/55 hover:bg-white/[0.06]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[12px] bg-white/5 ring-1 ring-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={rowImg}
            alt=""
            className="h-11 w-11 object-cover"
            onError={(e) => {
              const img = e.currentTarget;
              if (img.src !== EVENT_CARD_DEFAULT_POSTER) {
                img.onerror = null;
                img.src = EVENT_CARD_DEFAULT_POSTER;
              }
            }}
          />
        </div>

        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <div className="truncate text-[14px] font-semibold text-neutral-50">
              {ev.title}
            </div>
          </div>

          <div className="mt-0.5 truncate text-[12px] text-neutral-400">
            {clampText(`${formatDateLine(ev.date)} • ${ev.location ?? ""}`, 68)}
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
          "hidden md:grid flex-1 items-center",
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

      <div className="ml-auto flex shrink-0 items-center gap-2">
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
export default function OrgEventsPage() {
  const router = useRouter();
  const params = useParams() as { id?: string };
  const orgId = params?.id ?? "";

  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const [view, setView] = useState<EventViewId>("upcoming");

  // layout view (grid/list) like main Events page
  const [layout, setLayout] = useState<GridListValue>("grid");
  const [lastUpcomingLayout, setLastUpcomingLayout] =
    useState<GridListValue>("grid");
  const prevViewRef = useRef<EventViewId>("upcoming");

  // header search (events)
  const [eventsQuery, setEventsQuery] = useState("");

  // header sort (match main Events page)
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // org + events (org-scoped only)
  const { data: orgPayload, isLoading: eventsLoading } =
    useQuery<OrgWithEvents>({
      queryKey: ["orgEvents", orgId],
      queryFn: () =>
        fetchJSON<OrgWithEvents>(
          `/api/organizations/${orgId}?include=events&status=all`,
        ),
      enabled: !!orgId && !!session,
    });

  const org: Org | null = useMemo(() => {
    if (!orgPayload?._id) return null;
    return {
      _id: orgPayload._id,
      name: orgPayload.name,
      logo: orgPayload.logo,
      website: orgPayload.website,
    };
  }, [orgPayload]);

  const events = useMemo<MyEvent[]>(() => {
    const list = (orgPayload?.events ?? []) as MyEvent[];
    if (!list.length) return [];
    if (!org) return list;

    // attach org info so tooltip renders identically
    return list.map((e) => ({
      ...e,
      organization: org,
      organizationId: org._id,
    }));
  }, [orgPayload, org]);

  // pins (same system, still useful inside org scope)
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

  const now = useMemo(() => Date.now(), []);

  const upcomingBase = useMemo(
    () =>
      events.filter(
        (e) => new Date(e.date).getTime() >= now && e.status !== "draft",
      ),
    [events, now],
  );
  const pastBase = useMemo(
    () =>
      events.filter(
        (e) => new Date(e.date).getTime() < now && e.status !== "draft",
      ),
    [events, now],
  );
  const draftsBase = useMemo(
    () => events.filter((e) => e.status === "draft"),
    [events],
  );

  // Match main Events behavior: Upcoming can be grid/list, Past+Drafts forced list.
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

  // Reset to page-appropriate default sort direction when choosing a new field.
  const defaultDirFor = useMemo(() => {
    return (field: SortField): SortDir => {
      if (field === "title") return "asc";
      if (field === "eventDate") return view === "upcoming" ? "asc" : "desc";
      return "desc";
    };
  }, [view]);

  // Keep sortDir in sync when view changes and sortField is eventDate.
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

  // Create event goes straight to org creation (NO org picker modal)
  function handleCreateEvent() {
    if (!orgId) return;
    router.push(`/dashboard/organizations/${orgId}/events/create`);
  }

  // Apply header search to whichever view is active
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

  // Keep EventCard sizes EXACTLY as main page
  const gridCols =
    "grid-cols-[repeat(auto-fill,minmax(170px,170px))] " +
    "sm:grid-cols-[repeat(auto-fill,minmax(190px,190px))] " +
    "md:grid-cols-[repeat(auto-fill,minmax(200px,200px))] " +
    "lg:grid-cols-[repeat(auto-fill,minmax(210px,210px))]";

  // Org-scoped event “detail” route (keeps you inside org dashboard)
  const eventHref = useCallback(
    (eventId: string) =>
      `/dashboard/organizations/${orgId}/events/${eventId}/summary`,
    [orgId],
  );

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
            {/* Header layout EXACTLY like main Events page */}
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-base font-semibold tracking-[0.18em] text-neutral-300">
                  EVENTS
                </div>
                <div className="mt-1 text-neutral-400">
                  Track performance, manage drafts, and jump into event setup.
                </div>
                {org?.name ? (
                  <div className="mt-1 text-[12px] text-white/45">
                    {org.name}
                  </div>
                ) : null}
              </div>

              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
                {/* Search bar */}
                <div
                  className={clsx(
                    "relative w-full sm:w-[420px]",
                    // ✅ match main Events page controls color
                    "rounded-lg border border-white/10 bg-[#12141f] h-10",
                  )}
                >
                  <svg
                    className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-300"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M16.5 16.5 21 21"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>

                  <input
                    value={eventsQuery}
                    onChange={(e) => setEventsQuery(e.target.value)}
                    placeholder="Search here"
                    className={clsx(
                      "h-10 w-full rounded-lg bg-transparent",
                      "pl-10 pr-4 text-[12px] text-neutral-100",
                      "placeholder:text-neutral-500",
                      "outline-none border-none focus:ring-1 focus:ring-primary-500",
                    )}
                    aria-label="Search events"
                  />
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2">
                  <GridListToggle
                    value={layout}
                    onChange={setLayout}
                    disabled={view !== "upcoming"}
                    ariaLabel="Layout view toggle"
                  />

                  {/* ✅ use the same SortControl as main Events page */}
                  <SortControl
                    options={SORT_FIELDS}
                    sortField={sortField}
                    sortDir={sortDir}
                    setSortField={setSortField}
                    setSortDir={setSortDir}
                    defaultDirFor={defaultDirFor}
                    dropdownWidthClass="w-[220px]"
                  />

                  <MiniSelect
                    value={view}
                    onChange={setView}
                    options={viewOptions}
                    btnClassName="h-10"
                  />

                  <Button
                    onClick={handleCreateEvent}
                    type="button"
                    variant="primary"
                    icon={<CalendarPlus className="h-4 w-4" />}
                    animation
                    disabled={!orgId}
                  >
                    Create Event
                  </Button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="mt-4">
              {/* UPCOMING */}
              {view === "upcoming" ? (
                eventsLoading ? (
                  layout === "grid" ? (
                    <div
                      className={clsx("grid gap-3", gridCols, "justify-start")}
                    >
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="w-full">
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
                          className="h-[56px] w-full rounded-[12px]"
                        />
                      ))}
                    </div>
                  )
                ) : upcomingSorted.length === 0 ? (
                  <div className="w-full rounded-2xl border border-dashed border-white/15 bg-transparent p-10 text-center">
                    <p className="text-sm font-medium text-neutral-0">
                      No upcoming events yet
                    </p>
                    <p className="mt-2 text-[12px] text-neutral-400">
                      Create an event and it will appear here once scheduled.
                    </p>
                  </div>
                ) : layout === "grid" ? (
                  <div
                    className={clsx(
                      "grid gap-3",
                      gridCols,
                      "justify-start content-start",
                    )}
                  >
                    {upcomingSorted.map((ev) => {
                      const isPinned = pinnedIds.has(String(ev._id));

                      return (
                        <div key={ev._id} className="relative group">
                          <EventCard
                            id={ev._id}
                            title={ev.title}
                            dateLabel={formatEventDate(ev.date)}
                            venue={ev.location ?? ""}
                            category={ev.category ?? ""}
                            img={ev.image ?? ""}
                            href={eventHref(String(ev._id))}
                            className="w-full"
                          />

                          <div
                            className={clsx(
                              "absolute left-3 top-3 z-30",
                              "opacity-0 transition-opacity duration-200",
                              "group-hover:opacity-100 group-focus-within:opacity-100",
                            )}
                          >
                            <EventInfoTooltip ev={ev} />
                          </div>

                          <div
                            className={clsx(
                              "absolute right-3 top-3 z-30",
                              "transition-opacity duration-200",
                              isPinned
                                ? "opacity-100 pointer-events-auto"
                                : clsx(
                                    "opacity-0 pointer-events-none",
                                    "[@media(hover:hover)]:group-hover:opacity-100",
                                    "[@media(hover:hover)]:group-hover:pointer-events-auto",
                                    "[@media(hover:hover)]:group-focus-within:opacity-100",
                                    "[@media(hover:hover)]:group-focus-within:pointer-events-auto",
                                  ),
                            )}
                          >
                            <PinOverlayButton
                              pinned={isPinned}
                              onToggle={() =>
                                togglePin(String(ev._id), !isPinned)
                              }
                            />
                          </div>
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
                          href={eventHref(String(ev._id))}
                          onTogglePin={() =>
                            togglePin(String(ev._id), !isPinned)
                          }
                        />
                      );
                    })}
                  </div>
                )
              ) : null}

              {/* PAST */}
              {view === "past" ? (
                eventsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-[92px] rounded-2xl" />
                    <Skeleton className="h-[92px] rounded-2xl" />
                    <Skeleton className="h-[92px] rounded-2xl" />
                  </div>
                ) : pastSorted.length === 0 ? (
                  <div className="w-full rounded-2xl border border-dashed border-white/15 bg-transparent p-10 text-center">
                    <p className="text-sm font-medium text-neutral-0">
                      No past events yet
                    </p>
                    <p className="mt-2 text-[12px] text-neutral-400">
                      Once you’ve hosted events, they’ll show up here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pastSorted.map((ev, idx) => {
                      const revenue = revenueOf(ev) || 123_382;
                      const ticketsSold = ticketsOf(ev) || 328;

                      const activeRow = idx === 0;

                      const rowImg =
                        ev.image && ev.image.trim()
                          ? ev.image.trim()
                          : EVENT_CARD_DEFAULT_POSTER;

                      return (
                        <Link
                          key={ev._id}
                          href={eventHref(String(ev._id))}
                          className={clsx(
                            "group relative block rounded-lg border transition-colors duration-200 ease-out",
                            activeRow
                              ? "border-white/10 bg-neutral-948/10"
                              : "border-transparent bg-transparent hover:bg-white/4",
                          )}
                        >
                          <span
                            className={clsx(
                              "pointer-events-none absolute inset-0 z-0 rounded-lg",
                              "opacity-0 transition-opacity duration-250 ease-out",
                              "group-hover:opacity-100",
                              "bg-[radial-gradient(900px_220px_at_20%_0%,rgba(154,70,255,0.10),transparent_55%),radial-gradient(700px_220px_at_95%_120%,rgba(66,139,255,0.08),transparent_55%)]",
                            )}
                          />
                          <span
                            className={clsx(
                              "pointer-events-none absolute inset-0 z-0 rounded-lg",
                              "opacity-0 transition-opacity duration-250 ease-out",
                              "group-hover:opacity-100",
                              "shadow-[0_0_0_1px_rgba(154,70,255,0.22),0_0_22px_rgba(154,70,255,0.14)]",
                            )}
                          />

                          <div className="relative z-10 flex flex-col gap-3 p-3 md:flex-row md:items-center md:gap-4 md:p-4">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="h-[54px] w-[54px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-neutral-900">
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

                              <div className="min-w-0">
                                <p className="truncate text-[15px] font-semibold text-neutral-0">
                                  {ev.title}
                                </p>
                                <p className="mt-1 truncate text-xs text-primary-500">
                                  {formatDateLine(ev.date)}
                                </p>
                              </div>
                            </div>

                            <div className="grid flex-1 grid-cols-1 gap-3 text-left sm:grid-cols-3 sm:text-center">
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

              {/* DRAFTS */}
              {view === "drafts" ? (
                eventsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-[92px] rounded-2xl" />
                    <Skeleton className="h-[92px] rounded-2xl" />
                    <Skeleton className="h-[92px] rounded-2xl" />
                  </div>
                ) : draftsSorted.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-neutral-950/50 p-10 text-center">
                    <p className="text-sm font-medium text-neutral-0">
                      No drafts yet
                    </p>
                    <p className="mt-1 text-xs text-neutral-300">
                      Start creating an event and save it as a draft to keep
                      building it later.
                    </p>
                    <button
                      type="button"
                      onClick={handleCreateEvent}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-4 py-3 text-xs font-medium text-white transition hover:bg-primary-600 cursor-pointer"
                    >
                      <CalendarPlus className="h-4 w-4" />
                      Create Event
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {draftsSorted.map((ev, idx) => {
                      const activeRow = idx === 0;

                      const rowImg =
                        ev.image && ev.image.trim()
                          ? ev.image.trim()
                          : EVENT_CARD_DEFAULT_POSTER;

                      return (
                        <Link
                          key={ev._id}
                          href={eventHref(String(ev._id))}
                          className={clsx(
                            "group relative block rounded-lg border transition-colors duration-200 ease-out",
                            activeRow
                              ? "border-white/10 bg-neutral-948/10"
                              : "border-transparent bg-transparent hover:bg-white/4",
                          )}
                        >
                          <span
                            className={clsx(
                              "pointer-events-none absolute inset-0 z-0 rounded-lg",
                              "opacity-0 transition-opacity duration-250 ease-out",
                              "group-hover:opacity-100",
                              "bg-[radial-gradient(900px_220px_at_20%_0%,rgba(154,70,255,0.10),transparent_55%),radial-gradient(700px_220px_at_95%_120%,rgba(66,139,255,0.08),transparent_55%)]",
                            )}
                          />
                          <span
                            className={clsx(
                              "pointer-events-none absolute inset-0 z-0 rounded-lg",
                              "opacity-0 transition-opacity duration-250 ease-out",
                              "group-hover:opacity-100",
                              "shadow-[0_0_0_1px_rgba(154,70,255,0.22),0_0_22px_rgba(154,70,255,0.14)]",
                            )}
                          />

                          <div className="relative z-10 flex flex-col gap-3 p-3 md:flex-row md:items-center md:gap-4 md:p-4">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="h-[54px] w-[54px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-neutral-900">
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

                              <div className="min-w-0">
                                <p className="truncate text-[15px] font-semibold text-neutral-0">
                                  {ev.title}
                                </p>
                                <p className="mt-1 truncate text-xs text-primary-500">
                                  {formatDateLine(ev.date)}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-1 items-center justify-start sm:justify-end">
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
    </div>
  );
}
