/* ------------------------------------------------------------------ */
/*  src/app/dashboard/sales/SalesHistoryClient.tsx                     */
/* ------------------------------------------------------------------ */
"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  Instagram,
  Search,
  ArrowDownNarrowWide,
  ArrowDownWideNarrow,
  Filter,
  ChevronRight,
} from "lucide-react";

import DateRangePicker, {
  type DateRangeValue,
} from "@/components/ui/DateRangePicker";

/* ------------------------------ Types ------------------------------ */
type SaleStatus = "Completed" | "Pending" | "Refunded" | "Failed";

type Sale = {
  id: string;
  name: string;
  event: string;
  date: string;
  amount: number;

  status: SaleStatus;

  instagramAvatarUrl?: string;
  instagramFollowers?: number;
  eventPosterUrl?: string;
};

type SortField = "id" | "name" | "event" | "date" | "amount" | "status";
type SortDir = "asc" | "desc";

const SORT_FIELDS: { key: SortField; label: string }[] = [
  { key: "id", label: "#" },
  { key: "name", label: "Name" },
  { key: "event", label: "Event" },
  { key: "date", label: "Date" },
  { key: "amount", label: "Amount" },
  { key: "status", label: "Status" },
];

/* ---------------------------- Mock Data ---------------------------- */
const SALES: Sale[] = [
  {
    id: "#2935",
    name: "Dennis V.",
    event: "Valentines Gala",
    date: "Sep 19, 2025 3:24 PM",
    amount: 3692.79,
    status: "Completed",
    instagramAvatarUrl: "https://i.pravatar.cc/80?img=12",
    instagramFollowers: 131,
    eventPosterUrl: "https://picsum.photos/seed/tikd-ev-1/80/80",
  },
  {
    id: "#2936",
    name: "Dennis C.",
    event: "Valentines Gala",
    date: "Sep 16, 2025 11:02 AM",
    amount: 9000.07,
    status: "Pending",
    instagramAvatarUrl: "https://i.pravatar.cc/80?img=32",
    instagramFollowers: 842,
    eventPosterUrl: "https://picsum.photos/seed/tikd-ev-2/80/80",
  },
  {
    id: "#2937",
    name: "Dennis F.",
    event: "Valentines Gala",
    date: "Sep 2, 2025 6:41 PM",
    amount: 447.24,
    status: "Completed",
    instagramAvatarUrl: "https://i.pravatar.cc/80?img=8",
    instagramFollowers: 59,
    eventPosterUrl: "https://picsum.photos/seed/tikd-ev-3/80/80",
  },
  {
    id: "#2938",
    name: "Dennis R.",
    event: "Valentines Gala",
    date: "Aug 29, 2025 9:15 AM",
    amount: 545.23,
    status: "Refunded",
    instagramAvatarUrl: "https://i.pravatar.cc/80?img=18",
    instagramFollowers: 214,
    eventPosterUrl: "https://picsum.photos/seed/tikd-ev-4/80/80",
  },
  {
    id: "#2939",
    name: "Dennis S.",
    event: "Valentines Gala",
    date: "Aug 27, 2025 1:07 PM",
    amount: 7800.57,
    status: "Completed",
    instagramAvatarUrl: "https://i.pravatar.cc/80?img=45",
    instagramFollowers: 1203,
    eventPosterUrl: "https://picsum.photos/seed/tikd-ev-5/80/80",
  },
  {
    id: "#2940",
    name: "Dennis K.",
    event: "Valentines Gala",
    date: "Sep 9, 2025 8:33 PM",
    amount: 9608.33,
    status: "Completed",
    instagramAvatarUrl: "https://i.pravatar.cc/80?img=5",
    instagramFollowers: 77,
    eventPosterUrl: "https://picsum.photos/seed/tikd-ev-6/80/80",
  },
  {
    id: "#2941",
    name: "Denise P.",
    event: "Valentines Gala",
    date: "Sep 4, 2025 10:58 AM",
    amount: 9731.58,
    status: "Failed",
    instagramAvatarUrl: "https://i.pravatar.cc/80?img=25",
    instagramFollowers: 430,
    eventPosterUrl: "https://picsum.photos/seed/tikd-ev-7/80/80",
  },
  {
    id: "#2942",
    name: "Dennis W.",
    event: "Valentines Gala",
    date: "Sep 15, 2025 5:12 PM",
    amount: 2930.93,
    status: "Completed",
    instagramAvatarUrl: "https://i.pravatar.cc/80?img=15",
    instagramFollowers: 998,
    eventPosterUrl: "https://picsum.photos/seed/tikd-ev-8/80/80",
  },
  {
    id: "#2943",
    name: "Goga G.",
    event: "Valentines Gala",
    date: "Dec 21, 2025 2:09 PM",
    amount: 232.2,
    status: "Completed",
    instagramAvatarUrl: "https://i.pravatar.cc/80?img=50",
    instagramFollowers: 16,
    eventPosterUrl: "https://picsum.photos/seed/tikd-ev-9/80/80",
  },
  {
    id: "#2944",
    name: "Dennis Y.",
    event: "Valentines Gala",
    date: "Dec 21, 2025 4:44 PM",
    amount: 232.2,
    status: "Pending",
    instagramAvatarUrl: "https://i.pravatar.cc/80?img=52",
    instagramFollowers: 64,
    eventPosterUrl: "https://picsum.photos/seed/tikd-ev-10/80/80",
  },
  {
    id: "#2945",
    name: "Jake P.",
    event: "Valentines Gala",
    date: "Dec 23, 2025 12:00 PM",
    amount: 232.2,
    status: "Completed",
    instagramAvatarUrl: "https://i.pravatar.cc/80?img=11",
    instagramFollowers: 305,
    eventPosterUrl: "https://picsum.photos/seed/tikd-ev-11/80/80",
  },
  {
    id: "#2946",
    name: "Mike T.",
    event: "Valentines Gala",
    date: "Dec 26, 2025 9:30 AM",
    amount: 232.2,
    status: "Completed",
    instagramAvatarUrl: "https://i.pravatar.cc/80?img=29",
    instagramFollowers: 480,
    eventPosterUrl: "https://picsum.photos/seed/tikd-ev-12/80/80",
  },
  {
    id: "#2947",
    name: "John M.",
    event: "Valentines Gala",
    date: "Dec 27, 2025 7:21 PM",
    amount: 232.2,
    status: "Refunded",
    instagramAvatarUrl: "https://i.pravatar.cc/80?img=3",
    instagramFollowers: 12,
    eventPosterUrl: "https://picsum.photos/seed/tikd-ev-13/80/80",
  },
  {
    id: "#2948",
    name: "John Y.",
    event: "Valentines Gala",
    date: "Dec 27, 2025 7:29 PM",
    amount: 232.2,
    status: "Completed",
    instagramAvatarUrl: "https://i.pravatar.cc/80?img=6",
    instagramFollowers: 45,
    eventPosterUrl: "https://picsum.photos/seed/tikd-ev-14/80/80",
  },
  {
    id: "#2949",
    name: "John W.",
    event: "Valentines Gala",
    date: "Dec 27, 2025 8:10 PM",
    amount: 232.2,
    status: "Pending",
    instagramAvatarUrl: "https://i.pravatar.cc/80?img=7",
    instagramFollowers: 28,
    eventPosterUrl: "https://picsum.photos/seed/tikd-ev-15/80/80",
  },
  {
    id: "#2950",
    name: "John B.",
    event: "Valentines Gala",
    date: "Dec 27, 2025 8:35 PM",
    amount: 232.2,
    status: "Completed",
    instagramAvatarUrl: "https://i.pravatar.cc/80?img=10",
    instagramFollowers: 73,
    eventPosterUrl: "https://picsum.photos/seed/tikd-ev-16/80/80",
  },
];

/* --------------------------- Utilities ----------------------------- */
const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

function dateToMs(label: string) {
  const ms = Date.parse(String(label || ""));
  return Number.isFinite(ms) ? ms : 0;
}

function clampToDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function inRangeMs(ms: number, start: Date, end: Date) {
  const s = clampToDay(start).getTime();
  const e = clampToDay(end).getTime() + 24 * 60 * 60 * 1000 - 1;
  return ms >= s && ms <= e;
}

function formatDateParts(label: string) {
  const ms = dateToMs(label);
  if (!ms) return { date: label, time: "" };

  const d = new Date(ms);
  const date = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(d);

  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(d);

  return { date, time };
}

function initialsFromName(name: string) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const a = (parts[0]?.[0] ?? "").toUpperCase();
  const b = (parts[1]?.[0] ?? "").toUpperCase();
  const c = (parts[0]?.[1] ?? "").toUpperCase();

  return parts.length >= 2 ? `${a}${b}` : `${a}${c}`.trim() || "NA";
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Dashboard event page exists, but these are mock events.
 * Sending a non-existent eventId will naturally land on the 404 flow.
 */
function eventDashboardHref(sale: Pick<Sale, "id">) {
  const raw =
    String(sale.id || "")
      .replace("#", "")
      .trim() || "unknown";
  const fakeEventId = `mock-${raw}`;
  return `/dashboard/events/${encodeURIComponent(fakeEventId)}`;
}

function statusPill(status: SaleStatus) {
  switch (status) {
    case "Completed":
      return clsx(
        "border-success-500/18 text-success-200",
        "bg-success-900/26",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
      );
    case "Pending":
      return clsx(
        "border-warning-500/18 text-warning-200",
        "bg-warning-900/22",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
      );
    case "Refunded":
      return clsx(
        "border-primary-500/18 text-primary-200",
        "bg-primary-900/20",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
      );
    case "Failed":
      return clsx(
        "border-error-500/18 text-error-200",
        "bg-error-900/22",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
      );
    default:
      return "bg-white/8 text-white/80 border-white/10";
  }
}

/* ---------------------- Sort Controls (SINGLE) ---------------------- */
/** Same single sort button pattern as Events page (portal dropdown). */
function SortControls({
  options,
  sortField,
  sortDir,
  setSortField,
  setSortDir,
  defaultDirFor,
  dropdownWidthClass = "w-[220px]",
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

  const ref = useRef<HTMLDivElement>(null);
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
    const m = /w-\[(\d+)px\]/.exec(dropdownWidthClass);
    const n = m?.[1] ? Number(m[1]) : NaN;
    return Number.isFinite(n) ? n : 220;
  }, [dropdownWidthClass]);

  const recalc = useCallback(() => {
    const wrap = ref.current;
    if (!wrap) return;

    const button = wrap.querySelector("button");
    if (!button) return;

    const r = button.getBoundingClientRect();
    const vw = window.innerWidth;

    const panelW =
      panelRef.current?.getBoundingClientRect().width ?? inferWidthFallback();

    let left = r.right - panelW;
    const top = r.bottom + 8;

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

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    if (open) {
      document.addEventListener("mousedown", onDoc);
      window.addEventListener("keydown", onKey);
    }

    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

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
            : `Sort by ${sortLabel} ${sortDir === "asc" ? "ascending" : "descending"}`
        }
        data-open={open ? "1" : "0"}
        data-active={sortField ? "1" : "0"}
        className={clsx(
          "tikd-sort-btn group inline-flex select-none items-center justify-center",
          "h-10 w-10 rounded-[10px] border border-white/10",
          "bg-white/5 text-neutral-100",
          "shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_14px_28px_rgba(0,0,0,0.45)]",
          "transition-[transform,box-shadow,border-color,background-color] duration-150",
          "hover:bg-white/7 hover:border-white/14",
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
            className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-white/20 bg-neutral-500 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
          />
        ) : null}
      </button>

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
          width: 54%;
          height: 1.25px;
          background: rgba(229, 229, 229, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          border-radius: 2px;
        }

        .tikd-sort-dot {
          width: 3.5px;
          height: 3.5px;
          position: absolute;
          border-radius: 999px;
          border: 1.5px solid rgba(255, 255, 255, 0.92);
          background: rgba(140, 140, 166, 0.95);
          box-shadow: 0 0 6px rgba(255, 255, 255, 0.28);
          transition: transform 0.3s ease;
        }

        .tikd-sort-bar1 .tikd-sort-dot {
          transform: translateX(-3px);
        }
        .tikd-sort-bar2 .tikd-sort-dot {
          transform: translateX(3px);
        }

        .tikd-sort-btn:hover .tikd-sort-bar1 .tikd-sort-dot {
          transform: translateX(3px);
        }
        .tikd-sort-btn:hover .tikd-sort-bar2 .tikd-sort-dot {
          transform: translateX(-3px);
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

/* ---------------------- Basic Filter (SINGLE) ----------------------- */
function FilterControls({
  value,
  onChange,
}: {
  value: "all" | SaleStatus;
  onChange: (v: "all" | SaleStatus) => void;
}) {
  const [open, setOpen] = useState(false);

  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [pos, setPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  const recalc = useCallback(() => {
    const wrap = ref.current;
    if (!wrap) return;

    const button = wrap.querySelector("button");
    if (!button) return;

    const r = button.getBoundingClientRect();
    const vw = window.innerWidth;

    const panelW = panelRef.current?.getBoundingClientRect().width ?? 240;

    let left = r.right - panelW;
    const top = r.bottom + 8;

    left = Math.max(12, Math.min(left, vw - 12 - panelW));
    setPos({ top, left });
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;

      const inButton = !!ref.current?.contains(t);
      const inPanel = !!panelRef.current?.contains(t);

      if (!inButton && !inPanel) setOpen(false);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    if (open) {
      document.addEventListener("mousedown", onDoc);
      window.addEventListener("keydown", onKey);
    }

    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

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

  const opts: { key: "all" | SaleStatus; label: string }[] = [
    { key: "all", label: "All statuses" },
    { key: "Completed", label: "Completed" },
    { key: "Pending", label: "Pending" },
    { key: "Refunded", label: "Refunded" },
    { key: "Failed", label: "Failed" },
  ];

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
            "w-[240px] overflow-hidden rounded-2xl border border-white/10",
            "bg-[#121420] backdrop-blur",
            "shadow-[0_18px_40px_rgba(0,0,0,0.45)]",
          )}
        >
          <div className="flex items-center justify-between px-3 py-2.5">
            <div className="text-xs font-semibold text-white/80">Filter</div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white/80 hover:bg-white/8"
            >
              Close
            </button>
          </div>
          <div className="h-px w-full bg-white/10" />
          <div role="listbox" aria-label="Status filter" className="p-2">
            {opts.map((o) => {
              const active = o.key === value;
              return (
                <button
                  key={o.key}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(o.key);
                    setOpen(false);
                  }}
                  className={clsx(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm outline-none",
                    "hover:bg-white/5 focus:bg-white/5",
                    active ? "bg-white/5 text-white" : "text-white/90",
                  )}
                >
                  <span className="truncate">{o.label}</span>
                  {active ? (
                    <span className="text-xs font-semibold text-white/80">
                      ✓
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  const hasActive = value !== "all";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Filter"
        className={clsx(
          "group inline-flex h-10 w-10 items-center justify-center rounded-[10px]",
          "border border-white/10 bg-white/5 text-neutral-100",
          "shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_14px_28px_rgba(0,0,0,0.45)]",
          "transition-[transform,box-shadow,border-color,background-color] duration-150",
          "hover:bg-white/7 hover:border-white/14",
          "active:scale-[0.985]",
          "focus:outline-none focus-visible:border-primary-500",
          "focus-visible:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_14px_28px_rgba(0,0,0,0.45),0_0_0_2px_rgba(154,81,255,0.35)]",
          open && "border-primary-500/70",
        )}
      >
        <Filter className="h-[18px] w-[18px] text-white/85" />
        {hasActive ? (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-white/20 bg-primary-500 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
          />
        ) : null}
      </button>

      {mounted && open ? createPortal(dropdown, document.body) : null}
    </div>
  );
}

/* ------------------------- Pagination (Teams) ------------------------ */
function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  const visible = useMemo(() => {
    const max = Math.min(totalPages, 4);
    return Array.from({ length: max }).map((_, i) => i + 1);
  }, [totalPages]);

  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-1">
      <button
        type="button"
        onClick={() => onPage(clamp(page - 1, 1, totalPages))}
        disabled={page <= 1}
        className={clsx(
          "inline-flex h-8 w-8 items-center justify-center rounded-md",
          "border border-white/10 bg-white/5 text-neutral-100",
          "hover:border-primary-500 disabled:opacity-40 disabled:hover:bg-white/5",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
        )}
        aria-label="Previous page"
      >
        ‹
      </button>

      {visible.map((p) => {
        const active = p === page;
        return (
          <button
            key={p}
            type="button"
            onClick={() => onPage(p)}
            className={clsx(
              "inline-flex h-8 w-8 items-center justify-center rounded-md text-[12px] font-semibold",
              "transition-colors",
              active
                ? "bg-primary-500 text-neutral-0"
                : "bg-white/0 text-neutral-200 hover:bg-white/10 hover:border-white/20",
            )}
            aria-current={active ? "page" : undefined}
          >
            {p}
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => onPage(clamp(page + 1, 1, totalPages))}
        disabled={page >= totalPages}
        className={clsx(
          "inline-flex h-8 w-8 items-center justify-center rounded-md",
          "border border-white/10 bg-white/5 text-neutral-100",
          "hover:border-primary-500 disabled:opacity-40 disabled:hover:bg-white/5",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
        )}
        aria-label="Next page"
      >
        ›
      </button>
    </div>
  );
}

/* --------------------------- Small UI bits -------------------------- */
function CircularAvatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  const fallback = initialsFromName(name);
  const cls =
    className || "h-8 w-8 rounded-full object-cover ring-1 ring-white/10";

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        className={cls}
        onError={(e) => {
          const el = e.currentTarget;
          el.style.display = "none";
        }}
      />
    );
  }

  return (
    <div
      aria-hidden
      className={clsx(
        "grid place-items-center rounded-full bg-white/10 text-[10px] font-semibold text-white/85 ring-1 ring-white/10",
        className ? className : "h-8 w-8",
      )}
    >
      {fallback.slice(0, 2)}
    </div>
  );
}

function AvatarWithInstagramFollowers({
  name,
  src,
  followers,
}: {
  name: string;
  src?: string | null;
  followers?: number | null;
}) {
  const has = followers != null;

  return (
    <div className="relative h-9 w-9 shrink-0">
      <CircularAvatar
        name={name}
        src={src}
        className="h-9 w-9 rounded-full object-cover ring-1 ring-white/10"
      />

      {has ? (
        <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-[8px]">
          <span
            className={clsx(
              "tikd-chip tikd-chip-primary rounded-md",
              "px-1 py-[3px] text-[9px] font-semibold leading-none",
              "gap-1",
            )}
            title={`${Number(followers).toLocaleString("en-US")} Instagram followers`}
          >
            <Instagram className="h-2.5 w-2.5 text-primary-200" />
            <span className="tabular-nums text-neutral-0/95">
              {Number(followers).toLocaleString("en-US")}
            </span>
          </span>
        </div>
      ) : null}
    </div>
  );
}

function PosterThumb({ alt, src }: { alt: string; src?: string | null }) {
  if (!src) {
    return (
      <div
        aria-hidden
        className="h-7 w-7 rounded-md bg-white/10 ring-1 ring-white/10 transition-[box-shadow] duration-150 group-hover:ring-primary-500/70"
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      className="h-7 w-7 rounded-md object-cover ring-1 ring-white/10 transition-[box-shadow] duration-150 group-hover:ring-primary-500/70"
      onError={(e) => {
        const el = e.currentTarget;
        el.style.display = "none";
      }}
    />
  );
}

/* ---------------------------- Component ---------------------------- */
export default function SalesHistoryClient() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const [dateRange, setDateRange] = useState<DateRangeValue>({
    start: null,
    end: null,
  });

  const [statusFilter, setStatusFilter] = useState<"all" | SaleStatus>("all");

  // ✅ match Events behavior: no auto-selected sort on load
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const defaultDirFor = useCallback((field: SortField): SortDir => {
    if (field === "name" || field === "event") return "asc";
    if (field === "status") return "asc";
    return "desc";
  }, []);

  const pageSize = 10;

  const hasChosenRange = !!dateRange.start && !!dateRange.end;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return SALES.filter((s) => {
      const matchesQ =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.event.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q);

      if (!matchesQ) return false;

      if (statusFilter !== "all" && s.status !== statusFilter) return false;

      if (!hasChosenRange) return true;

      const ms = dateToMs(s.date);
      if (!ms) return false;

      return inRangeMs(ms, dateRange.start as Date, dateRange.end as Date);
    });
  }, [query, hasChosenRange, dateRange.start, dateRange.end, statusFilter]);

  const sorted = useMemo(() => {
    if (!sortField) return filtered;

    const arr = [...filtered];

    arr.sort((a, b) => {
      let cmp = 0;

      switch (sortField) {
        case "id":
          cmp = a.id.localeCompare(b.id);
          break;
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "event":
          cmp = a.event.localeCompare(b.event);
          break;
        case "date":
          cmp = dateToMs(a.date) - dateToMs(b.date);
          break;
        case "amount":
          cmp = a.amount - b.amount;
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
        default:
          cmp = 0;
      }

      return sortDir === "asc" ? cmp : -cmp;
    });

    return arr;
  }, [filtered, sortField, sortDir]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(
    () => setPage(1),
    [
      query,
      hasChosenRange,
      dateRange.start,
      dateRange.end,
      sortField,
      sortDir,
      statusFilter,
    ],
  );

  useEffect(() => {
    setPage((p) => clamp(p, 1, totalPages));
  }, [totalPages]);

  const pageSafe = clamp(page, 1, totalPages);

  const slice = useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, pageSafe]);

  const showingLabel = useMemo(() => {
    if (!total) return "Showing 0-0 from 0 data";
    const start = (pageSafe - 1) * pageSize + 1;
    const end = Math.min(total, start + pageSize - 1);
    return `Showing ${start}-${end} from ${total} data`;
  }, [total, pageSafe]);

  const thRow = "[&>th]:pb-3 [&>th]:pt-1";
  const thBase =
    "text-center font-semibold select-none text-neutral-400 text-[12px]";

  // ✅ bring first two columns tight to the left, and last column tight to the right
  const tdStart = "pl-4 pr-1 py-2.5 align-middle text-left";
  const tdName = "pl-1 pr-3 py-2.5 align-middle text-left";
  const tdCenter = "px-3 py-2.5 align-middle text-center";
  const tdLeft = "px-0 py-2.5 align-middle text-left";
  const tdEnd = "pl-3 pr-4 py-2.5 align-middle text-right";

  const separatorLine =
    "bg-[linear-gradient(90deg,rgba(154,70,255,0)_0%,rgba(154,70,255,0.18)_30%,rgba(255,255,255,0.08)_50%,rgba(154,70,255,0.18)_70%,rgba(154,70,255,0)_100%)]";

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
            {/* Header */}
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-base font-semibold tracking-[0.18em] text-neutral-300">
                  SALES HISTORY
                </div>
                <div className="mt-1 text-neutral-400">
                  Review your transactions and ticket revenue
                </div>
              </div>

              {/* Controls row */}
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
                {/* Search */}
                <div
                  className={clsx(
                    "relative w-full sm:w-[420px]",
                    "h-10 rounded-[10px] border border-white/10 bg-white/5",
                  )}
                >
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-300" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search here"
                    className={clsx(
                      "h-10 w-full rounded-[10px] bg-transparent",
                      "pl-10 pr-4 text-[12px] text-neutral-100",
                      "placeholder:text-neutral-500",
                      "outline-none border-none focus:ring-1 focus:ring-primary-500",
                    )}
                  />
                </div>

                {/* Date Range */}
                <div className="w-full sm:w-[210px]">
                  <DateRangePicker
                    value={dateRange}
                    onChange={setDateRange}
                    variant="compact"
                    buttonClassName={clsx(
                      "h-10 rounded-[10px]",
                      "border border-white/10 bg-white/5",
                      "px-3 py-0 text-[12px] font-semibold",
                      "text-neutral-100",
                      "hover:bg-white/7 hover:border-white/14",
                      "focus-visible:ring-2 focus-visible:ring-primary-500/40",
                    )}
                  />
                </div>

                <div className="flex items-center justify-end">
                  <FilterControls
                    value={statusFilter}
                    onChange={setStatusFilter}
                  />
                </div>

                <div className="flex items-center justify-end">
                  <SortControls
                    options={SORT_FIELDS}
                    sortField={sortField}
                    sortDir={sortDir}
                    setSortField={setSortField}
                    setSortDir={setSortDir}
                    defaultDirFor={defaultDirFor}
                    dropdownWidthClass="w-[220px]"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="relative overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 pt-3">
              <div className="relative overflow-hidden">
                <table className="w-full table-fixed border-collapse text-xs font-medium leading-tight">
                  {/* ✅ # + Name tight at the start
                      ✅ remaining columns have equal widths (same “gap” feel)
                      ✅ View column hugs the right edge */}
                  <colgroup>
                    <col style={{ width: "4%" }} /> {/* # */}
                    <col style={{ width: "20%" }} /> {/* Name */}
                    <col style={{ width: "16%" }} /> {/* Event */}
                    <col style={{ width: "12%" }} /> {/* Date */}
                    <col style={{ width: "28%" }} /> {/* Amount */}
                    <col style={{ width: "10%" }} /> {/* Status */}
                    <col style={{ width: "10%" }} /> {/* View Detail */}
                  </colgroup>

                  <thead className="text-neutral-400">
                    <tr className={thRow}>
                      <th className={clsx(thBase, "pl-1 text-center")}>#</th>
                      <th className={clsx(thBase, "pl-1 text-left")}>Name</th>
                      <th className={clsx(thBase, "text-left")}>Event</th>
                      <th className={thBase}>Date</th>
                      <th className={thBase}>Amount</th>
                      <th className={clsx(thBase, "text-left")}>Status</th>
                      <th className={clsx(thBase, "pr-10 text-right")}>
                        View Detail
                      </th>
                    </tr>
                  </thead>

                  <tbody className="text-white">
                    {slice.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-10">
                          <div className="rounded-2xl border border-dashed border-white/15 bg-transparent p-10 text-center">
                            <p className="text-sm font-medium text-neutral-0">
                              No sales found.
                            </p>
                            <p className="mt-2 text-[12px] text-neutral-400">
                              Try changing the date range, status filter, or
                              search text.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      slice.flatMap((s, i) => {
                        const isLast = i === slice.length - 1;
                        const rowBg =
                          i % 2 === 0 ? "bg-neutral-948" : "bg-neutral-900";
                        const dt = formatDateParts(s.date);

                        const dataRow = (
                          <tr
                            key={`${s.id}-${i}`}
                            className={clsx(
                              "transition-colors hover:bg-white/[0.05]",
                              rowBg,
                            )}
                          >
                            {/* # */}
                            <td className={clsx(tdStart, "text-white/70")}>
                              <span className="tabular-nums">{s.id}</span>
                            </td>

                            {/* Name */}
                            <td className={clsx(tdName, "text-white/90")}>
                              <div className="flex min-w-0 items-center gap-2.5">
                                <AvatarWithInstagramFollowers
                                  name={s.name}
                                  src={s.instagramAvatarUrl}
                                  followers={s.instagramFollowers}
                                />
                                <span
                                  className="min-w-0 truncate"
                                  title={s.name}
                                >
                                  {s.name}
                                </span>
                              </div>
                            </td>

                            {/* Event (poster + title clickable -> Event Dashboard -> 404 for mock) */}
                            <td className={tdLeft}>
                              <Link
                                href={eventDashboardHref(s)}
                                className={clsx(
                                  "group flex min-w-0 items-center justify-start gap-2",
                                  "rounded-md outline-none",
                                  "focus-visible:ring-2 focus-visible:ring-primary-500/35",
                                )}
                                title={`Open "${s.event}" dashboard`}
                                aria-label={`Open ${s.event} dashboard`}
                              >
                                <PosterThumb
                                  alt={s.event}
                                  src={s.eventPosterUrl}
                                />
                                <span
                                  className={clsx(
                                    "min-w-0 truncate",
                                    "text-white/90",
                                    "group-hover:text-white group-hover:underline group-hover:decoration-primary-500",
                                    "underline-offset-2",
                                  )}
                                  title={s.event}
                                >
                                  {s.event}
                                </span>
                              </Link>
                            </td>

                            {/* Date */}
                            <td className={tdCenter}>
                              <div className="flex flex-col items-center leading-tight">
                                <span className="text-white/90">{dt.date}</span>
                                <span className="text-[11px] text-neutral-400">
                                  {dt.time || "—"}
                                </span>
                              </div>
                            </td>

                            {/* Amount */}
                            <td className={tdCenter}>
                              <span className="tabular-nums font-medium text-success-500">
                                {fmtUsd(s.amount)}
                              </span>
                            </td>

                            {/* Status */}
                            <td className={tdLeft}>
                              <span
                                className={clsx(
                                  "inline-flex items-center gap-2 border",
                                  "rounded-lg px-2.5 py-1.5",
                                  "text-[11px] font-semibold",
                                  "backdrop-blur",
                                  statusPill(s.status),
                                )}
                              >
                                <span
                                  className={clsx(
                                    "h-2 w-2 rounded-full",
                                    "bg-current opacity-80",
                                    "ring-1 ring-white/25",
                                    "shadow-[0_0_0_2px_rgba(0,0,0,0.25),0_0_10px_rgba(255,255,255,0.12)]",
                                  )}
                                />
                                {s.status}
                              </span>
                            </td>

                            {/* View Detail (right edge + better button) */}
                            <td className={tdEnd}>
                              <Link
                                href={`/dashboard/sales/${encodeURIComponent(
                                  s.id.replace("#", ""),
                                )}`}
                                className={clsx(
                                  "group inline-flex items-center justify-center gap-1.5",
                                  "whitespace-nowrap rounded-md px-2.5 py-1.5",
                                  "border border-white/12 bg-white/5",
                                  "text-[12px] font-semibold text-white/90",
                                  "transition-[transform,box-shadow,border-color,background-color] duration-150",
                                  "hover:bg-white/7 hover:border-primary-500/75",
                                  "active:scale-[0.985]",
                                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/35",
                                )}
                              >
                                <span className="text-white/90">
                                  View Detail
                                </span>
                                <ChevronRight className="h-3.5 w-3.5 opacity-85 transition-transform duration-150 group-hover:translate-x-[2px]" />
                              </Link>
                            </td>
                          </tr>
                        );

                        const separatorRow = !isLast ? (
                          <tr
                            key={`${s.id}-sep`}
                            aria-hidden
                            className="bg-neutral-900"
                          >
                            <td colSpan={7} className="p-0">
                              <div
                                className={clsx("mx-3 h-px", separatorLine)}
                              />
                            </td>
                          </tr>
                        ) : null;

                        return separatorRow
                          ? [dataRow, separatorRow]
                          : [dataRow];
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-[12px] text-neutral-300">{showingLabel}</div>

              <Pagination
                page={pageSafe}
                totalPages={totalPages}
                onPage={setPage}
              />
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
