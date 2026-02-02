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
  ArrowDownNarrowWide,
  ArrowDownWideNarrow,
  ChevronRight,
  Eye,
  Ticket,
  DollarSign,
} from "lucide-react";

import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { EventCard } from "@/components/ui/EventCard";
import { EVENT_CARD_DEFAULT_POSTER } from "@/components/ui/EventCard";
import GridListToggle, {
  type GridListValue,
} from "@/components/ui/GridListToggle";

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
          "bg-neutral-900 px-3 py-2 font-medium text-neutral-200",
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

/* ---------------------- Sort Controls (MERGED) ---------------------- */
function SortControls({
  options,
  sortField,
  sortDir,
  setSortField,
  setSortDir,
  defaultDirFor,
  dropdownWidthClass = "w-[200px]",
}: {
  options: { key: SortField; label: string }[];
  sortField: SortField | null;
  sortDir: SortDir;
  setSortField: (v: SortField | null) => void;
  setSortDir: (v: SortDir) => void;
  defaultDirFor: (f: SortField) => SortDir;
  dropdownWidthClass?: string;
}) {
  const [open, setOpen] = useState(false);

  // wrapper still holds the button (used for outside click)
  const ref = useRef<HTMLDivElement>(null);

  // portal panel ref (because it won't be inside `ref` anymore)
  const panelRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const sortLabel = useMemo(() => {
    if (!sortField) return "";
    return options.find((o) => o.key === sortField)?.label ?? "Sort";
  }, [options, sortField]);

  const [pos, setPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  const inferWidthFallback = useCallback(() => {
    // best-effort parse: "w-[220px]" => 220
    const m = /w-\[(\d+)px\]/.exec(dropdownWidthClass);
    const n = m?.[1] ? Number(m[1]) : NaN;
    return Number.isFinite(n) ? n : 220;
  }, [dropdownWidthClass]);

  const recalc = useCallback(() => {
    const btnEl = ref.current;
    if (!btnEl) return;

    // button is the first child inside wrapper
    const button = btnEl.querySelector("button");
    if (!button) return;

    const r = button.getBoundingClientRect();
    const vw = window.innerWidth;

    const panelW =
      panelRef.current?.getBoundingClientRect().width ?? inferWidthFallback();

    // align dropdown to the button's right edge (like before)
    let left = r.right - panelW;
    const top = r.bottom + 8;

    // clamp into viewport so it never goes off-screen
    left = Math.max(12, Math.min(left, vw - 12 - panelW));

    setPos({ top, left });
  }, [inferWidthFallback]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;

      const inButton = !!ref.current?.contains(t);
      const inPanel = !!panelRef.current?.contains(t);

      if (!inButton && !inPanel) setOpen(false);
    }

    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    // position immediately + after the panel measures itself
    recalc();
    const raf = requestAnimationFrame(recalc);

    const onScrollOrResize = () => recalc();

    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, recalc]);

  function apply(field: SortField) {
    // Clicking the active option again clears sorting (back to default state)
    if (sortField === field) {
      setSortField(null);
      return;
    }

    setSortField(field);
    setSortDir(defaultDirFor(field));
  }

  function setDir(dir: SortDir) {
    if (!sortField) return;
    setSortDir(dir);
  }

  const DirIcon = sortDir === "asc" ? ArrowDownNarrowWide : ArrowDownWideNarrow;

  const dropdown = (
    <div
      ref={panelRef}
      className="fixed z-[99999]"
      style={{ top: pos.top, left: pos.left }}
    >
      <div className="relative">
        <span className="pointer-events-none absolute -top-1 right-4 h-3 w-3 rotate-45 border border-white/10 border-b-0 border-r-0 bg-[#121420]" />
        <div
          className={clsx(
            "overflow-hidden rounded-2xl border border-white/10",
            "bg-[#121420] backdrop-blur",
            "shadow-[0_18px_40px_rgba(0,0,0,0.45)]",
            dropdownWidthClass,
          )}
        >
          <div role="listbox" aria-label="Sort" className="p-2">
            {options.map((opt) => {
              const active = opt.key === sortField;
              return (
                <button
                  key={opt.key}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => apply(opt.key)}
                  title={active ? "Click again to clear sort" : undefined}
                  className={clsx(
                    "flex w-full items-center justify-between",
                    "rounded-lg px-3 py-2.5",
                    "text-left text-sm outline-none",
                    "hover:bg-white/5 focus:bg-white/5",
                    active ? "bg-white/5 text-white" : "text-white/90",
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {active ? (
                    <span className="text-xs font-semibold text-white/80">
                      ✓
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="h-px w-full bg-white/10" />

          <div className="p-2">
            <div
              className={clsx(
                "grid grid-cols-2 overflow-hidden rounded-xl border border-white/10 bg-neutral-950/35",
                !sortField && "opacity-60",
              )}
            >
              <button
                type="button"
                onClick={() => setDir("asc")}
                disabled={!sortField}
                className={clsx(
                  "flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium",
                  "outline-none transition",
                  "hover:bg-white/6 focus-visible:bg-white/6",
                  sortField && sortDir === "asc"
                    ? "bg-white/8 text-white"
                    : "text-white/80",
                  "disabled:cursor-not-allowed",
                )}
                aria-label="Ascending"
              >
                <ArrowDownNarrowWide className="h-4 w-4 opacity-90" />
                Asc
              </button>

              <button
                type="button"
                onClick={() => setDir("desc")}
                disabled={!sortField}
                className={clsx(
                  "flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium",
                  "outline-none transition",
                  "hover:bg-white/6 focus-visible:bg-white/6",
                  sortField && sortDir === "desc"
                    ? "bg-white/8 text-white"
                    : "text-white/80",
                  "disabled:cursor-not-allowed",
                )}
                aria-label="Descending"
              >
                <ArrowDownWideNarrow className="h-4 w-4 opacity-90" />
                Desc
              </button>
            </div>

            {!sortField ? (
              <p className="mt-2 px-1 text-[11px] text-white/45">
                Select a sort type first
              </p>
            ) : null}

            {sortField ? (
              <div className="mt-2 flex items-center justify-between rounded-xl border border-white/10 bg-neutral-950/25 px-3 py-2">
                <p className="truncate text-[11px] text-white/70">
                  <span className="text-white/45">Sorting:</span> {sortLabel}
                </p>
                <DirIcon className="h-4 w-4 text-white/70" />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={
          !sortField
            ? "Sort"
            : `Sort by ${sortLabel} ${
                sortDir === "asc" ? "ascending" : "descending"
              }`
        }
        data-open={open ? "1" : "0"}
        data-active={sortField ? "1" : "0"}
        className={clsx(
          "tikd-sort-btn group inline-flex select-none items-center justify-center",
          "h-9.5 w-9.5 rounded-[4px] border border-white/10",
          "bg-neutral-700/90 text-neutral-100",
          "shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_14px_28px_rgba(0,0,0,0.45)]",
          "transition-[transform,box-shadow,border-color,background-color] duration-150",
          "hover:bg-neutral-700 hover:border-white/14",
          "active:scale-[0.985]",
          "focus:outline-none focus-visible:border-primary-500",
          "focus-visible:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_14px_28px_rgba(0,0,0,0.45),0_0_0_2px_rgba(154,81,255,0.35)]",
          open && "border-primary-500/70",
          "cursor-pointer",
        )}
      >
        <span className="tikd-sort-bars" aria-hidden="true">
          <span className="tikd-sort-bar tikd-sort-bar1">
            <span className="tikd-sort-dot" />
          </span>
          <span className="tikd-sort-bar tikd-sort-bar2">
            <span className="tikd-sort-dot" />
          </span>
          <span className="tikd-sort-bar tikd-sort-bar1">
            <span className="tikd-sort-dot" />
          </span>
        </span>

        {sortField ? (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-white/20 bg-neutral-500 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
          />
        ) : null}
      </button>

      {/* ✅ Portal dropdown so parent overflow can’t clip it */}
      {mounted && open ? createPortal(dropdown, document.body) : null}

      <style jsx>{`
        .tikd-sort-bars {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .tikd-sort-bar {
          width: 50%;
          height: 1.5px;
          background: rgba(229, 229, 229, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          border-radius: 2px;
        }

        .tikd-sort-dot {
          width: 4px;
          height: 4px;
          position: absolute;
          border-radius: 999px;
          border: 1.5px solid rgba(255, 255, 255, 0.92);
          background: rgba(140, 140, 166, 0.95);
          box-shadow: 0 0 6px rgba(255, 255, 255, 0.28);
          transition: transform 0.3s ease;
        }

        .tikd-sort-bar1 .tikd-sort-dot {
          transform: translateX(-4px);
        }
        .tikd-sort-bar2 .tikd-sort-dot {
          transform: translateX(4px);
        }

        .tikd-sort-btn:hover .tikd-sort-bar1 .tikd-sort-dot {
          transform: translateX(4px);
        }
        .tikd-sort-btn:hover .tikd-sort-bar2 .tikd-sort-dot {
          transform: translateX(-4px);
        }

        @media (prefers-reduced-motion: reduce) {
          .tikd-sort-dot {
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ---------------------- Info Tooltip (NEW) ------------------------- */

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={clsx(
        "h-[15px] w-[15px]",
        "duration-500 will-change-transform",
        "group-hover/info-btn:rotate-[360deg] group-hover/info-btn:scale-110",
        className,
      )}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22c-5.518 0-10-4.482-10-10s4.482-10 10-10 10 4.482 10 10-4.482 10-10 10zm-1-16h2v6h-2zm0 8h2v2h-2z"
        fill="currentColor"
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

        <span className="truncate text-[13px] font-semibold leading-none text-white">
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

  // track for hover/tilt motion
  const trackRafRef = useRef<number | null>(null);
  const trackUntilRef = useRef<number>(0);

  const closeTimer = useRef<number | null>(null);

  // cache tooltip height just to decide top/bottom (NOT for positioning)
  const heightCacheRef = useRef<number>(170);

  const [pos, setPos] = useState<{
    top: number;
    left: number;
    placement: "top" | "bottom";
    arrowLeft: number; // px inside tooltip
  }>({ top: 0, left: 0, placement: "top", arrowLeft: 146 });

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const recalc = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;

    const r = btn.getBoundingClientRect();

    const tooltipW = 222; // keep as-is
    const gap = 10; // a touch more breathing room (tweak if you want)
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // update cached height when we can (only used to choose top/bottom)
    const measuredH =
      tipRef.current?.getBoundingClientRect().height ?? heightCacheRef.current;
    heightCacheRef.current = measuredH;

    const clamp = (n: number, min: number, max: number) =>
      Math.max(min, Math.min(max, n));

    const centerX = r.left + r.width / 2;

    // clamp CENTER, because we will use translateX(-50%)
    const minCenter = 12 + tooltipW / 2;
    const maxCenter = vw - 12 - tooltipW / 2;
    const clampedCenterX = clamp(centerX, minCenter, maxCenter);

    // decide top/bottom (only decision uses height; position does NOT)
    const spaceTop = r.top;
    const spaceBottom = vh - r.bottom;

    const wantTop = spaceTop >= measuredH + gap + 12;
    const placement: "top" | "bottom" =
      wantTop || spaceTop > spaceBottom ? "top" : "bottom";

    // KEY FIX:
    // We anchor the tooltip to the icon and let CSS transform handle "above"
    const top = placement === "top" ? r.top - gap : r.bottom + gap;
    const left = clampedCenterX;

    // arrow inside tooltip should point to the REAL icon center,
    // even if the tooltip is clamped horizontally.
    // tooltip left edge (because transformX(-50%)) = left - tooltipW/2
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

    // do a couple of immediate syncs: first frame + a bit of tracking
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
      // ✅ Anchor to icon and pull above using transform — no height math.
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
      {/* We animate a tiny inner nudge, WITHOUT touching the outer transform */}
      <div
        className={clsx(
          "transition-transform duration-150 ease-out",
          open ? "translate-y-0" : "translate-y-1",
        )}
      >
        {/* Border / shell */}
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

          {/* Arrow */}
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
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
          "relative z-10 w-[92vw] max-w-[480px]",
          "rounded-2xl border border-white/12",
          "bg-neutral-950/95 shadow-[0_28px_80px_rgba(0,0,0,0.85)]",
          " max-h-[680px]",
          "p-5 sm:p-6",
        )}
        onClick={handlePanelClick}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-neutral-0">
                Choose an organization
              </h2>

              <p className="mt-1 text-xs text-neutral-300">
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
                "!min-h-[44px] w-full",
              )}
            />
          </div>
          <div className="mt-4 flex-1 overflow-hidden">
            {loading ? (
              <div className="h-full space-y-3 overflow-y-auto pr-1">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-[74px] rounded-2xl" />
                ))}
              </div>
            ) : orgs.length > 0 ? (
              <div className="h-full space-y-3 overflow-y-auto pr-1">
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
                  <div className="grid grid-cols-2 gap-3">
                    {filteredOrgs.map((org) => {
                      const selected = org._id === selectedOrgId;

                      return (
                        <div
                          key={org._id}
                          className={clsx(
                            "group relative flex flex-col w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                            "bg-neutral-948/90 border-white/10 hover:border-primary-500/70 hover:bg-neutral-900/90",
                            selected &&
                              "border-primary-500 bg-neutral-948/95 ring-1 ring-inset ring-primary-500/80",
                          )}
                          onClick={(e) => handleCardClick(e, org._id)}
                        >
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

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold text-neutral-0">
                              {org.name}
                            </p>
                            {org.website && (
                              <p className="mt-0.5 truncate text-[11px] text-neutral-400">
                                {domainFromUrl(org.website)}
                              </p>
                            )}
                          </div>

                          <div className="ml-2 shrink-0">
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
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/12 bg-neutral-948/90 px-4 py-4 text-sm text-neutral-200">
                <p className="font-medium text-neutral-0">
                  You don&apos;t have any organizations yet.
                </p>
                <p className="mt-1 text-xs text-neutral-400">
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
            <div className="pt-8">
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="primary"
                  disabled={!canConfirm}
                  onClick={onConfirm}
                >
                  <CalendarPlus className="h-4 w-4" />
                  Continue
                </Button>
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
  // Uiverse colors (kept true to reference)
  const accent = "rgb(179, 139, 255)";

  // Inactive stroke tuned for dark UI while keeping the same SVG shape
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
        // ✅ critical: prevent EventCard/Link navigation
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className={clsx(
        "z-20",
        "inline-flex items-center gap-2 cursor-pointer",
        pinned
          ? clsx(
              // “Pinned” pill (matches your screenshot vibe)
              "h-8 w-8 rounded-lg flex items-center justify-center",
              "border border-primary-500/35",
              "bg-neutral-950/55 backdrop-blur-md",
              "shadow-[0_0_0_1px_rgba(255,255,255,0.07),0_10px_24px_rgba(0,0,0,0.45)]",
              "text-[12px] font-semibold text-neutral-50",
              "transition hover:bg-neutral-950/70 hover:border-primary-500/55",
              "active:scale-[0.97]",
            )
          : clsx(
              // Unpinned = compact icon button
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
}: {
  ev: MyEvent;
  pinned: boolean;
  onTogglePin: () => void;
}) {
  const rowImg =
    ev.image && ev.image.trim() ? ev.image.trim() : EVENT_CARD_DEFAULT_POSTER;

  return (
    <Link
      href={`/dashboard/events/${ev._id}`}
      className={clsx(
        "group relative flex w-full items-center justify-between gap-4",
        "rounded-[12px] border border-white/10 bg-white/5 px-4 py-3",
        "hover:border-primary-500 hover:bg-white/7 transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
      )}
    >
      {/* Left */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[10px] bg-white/5 ring-1 ring-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={rowImg}
            alt=""
            className="h-10 w-10 object-cover"
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
          <div className="truncate text-[13px] font-semibold text-neutral-50">
            {ev.title}
          </div>
          <div className="mt-0.5 truncate text-[12px] text-neutral-400">
            {clampText(`${formatDateLine(ev.date)} • ${ev.location ?? ""}`, 64)}
          </div>
        </div>
      </div>

      {/* Center (true centered like org rows, desktop only) */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:flex items-center gap-6">
        <div className="text-[12px] text-neutral-300">
          {ev.category ? clampText(ev.category, 22) : "—"}
        </div>
        <div className="text-[12px] text-neutral-400">
          {formatEventDate(ev.date)}
        </div>
      </div>

      {/* Right */}
      <div className="flex shrink-0 items-center gap-2">
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
              ? "border-primary-500/45 bg-primary-500/10 text-neutral-0"
              : "border border-white/10 bg-white/5 text-neutral-200",
            "hover:border-primary-500 hover:bg-white/10 transition",
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

  // ✅ layout view (grid/list) like Organizations page
  const [layout, setLayout] = useState<GridListValue>("grid");

  // ✅ remember what the user last chose for Upcoming view
  const [lastUpcomingLayout, setLastUpcomingLayout] =
    useState<GridListValue>("grid");

  // ✅ track transitions between tabs
  const prevViewRef = useRef<EventViewId>("upcoming");

  // ✅ header search (events)
  const [eventsQuery, setEventsQuery] = useState("");

  // ✅ header sort (reused existing SortControls, moved next to GridListToggle)
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
    // ✅ prevent browser/proxy caching from returning stale `{ ids: [] }`
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

  // Defensive fallback: if API doesn't send `organization/org`, attach it from orgsList via organizationId
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

  useEffect(() => {
    const prev = prevViewRef.current;

    // Leaving Upcoming → remember the user's chosen layout, then force list for Past/Drafts
    if (prev === "upcoming" && view !== "upcoming") {
      setLastUpcomingLayout(layout);
      setLayout("list");
    }

    // Returning to Upcoming → restore the user's previous layout (grid/list)
    if (prev !== "upcoming" && view === "upcoming") {
      setLayout(lastUpcomingLayout);
    }

    prevViewRef.current = view;
  }, [view, layout, lastUpcomingLayout]);

  // ✅ Reset to page-appropriate default sort direction when choosing a new field.
  const defaultDirFor = useMemo(() => {
    return (field: SortField): SortDir => {
      if (field === "title") return "asc";
      if (field === "eventDate") return view === "upcoming" ? "asc" : "desc";
      return "desc";
    };
  }, [view]);

  // Keep sortDir in sync when view changes and sortField is eventDate (so “Upcoming” feels natural).
  useEffect(() => {
    if (!sortField) return;
    setSortDir((prev) => {
      const ideal = defaultDirFor(sortField);
      // only auto-adjust for eventDate; leave other fields as user last picked
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

  // ✅ Apply header search to whichever view is active
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

  // ✅ Keep EventCard sizes EXACTLY as-is
  const gridCols =
    "grid-cols-[repeat(auto-fill,minmax(170px,170px))] " +
    "sm:grid-cols-[repeat(auto-fill,minmax(190px,190px))] " +
    "md:grid-cols-[repeat(auto-fill,minmax(200px,200px))] " +
    "lg:grid-cols-[repeat(auto-fill,minmax(210px,210px))]";

  return (
    <div className="relative overflow-hidden bg-neutral-950 text-neutral-0">
      <section className="pb-16">
        {/* ✅ Match Organizations page structure: one main card wrapper */}
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
            {/* ✅ Header layout */}
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-base font-semibold tracking-[0.18em] text-neutral-300">
                  EVENTS
                </div>
                <div className="mt-1 text-neutral-400">
                  Track performance, manage drafts, and jump into event setup.
                </div>
              </div>

              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
                {/* Search bar */}
                <div
                  className={clsx(
                    "relative w-full sm:w-[420px]",
                    "rounded-lg border border-white/10 bg-white/5 h-10",
                  )}
                >
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-300" />
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

                  <SortControls
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
                            href={`/dashboard/events/${ev._id}`}
                            className="w-full"
                          />

                          {/* ✅ Info icon appears ONLY when hovering the card */}
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
                          href={`/dashboard/events/${ev._id}`}
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
                      onClick={openOrgPicker}
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
                          href={`/dashboard/events/${ev._id}`}
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
