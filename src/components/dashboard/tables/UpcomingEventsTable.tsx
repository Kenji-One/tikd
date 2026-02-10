/* ------------------------------------------------------------------ */
/*  src/components/dashboard/tables/UpcomingEventsTable.tsx           */
/* ------------------------------------------------------------------ */
"use client";

import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { ArrowDownNarrowWide, ArrowDownWideNarrow } from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import { EVENT_CARD_DEFAULT_POSTER } from "@/components/ui/EventCard";

type Row = {
  id: string;

  title: string;

  /** Pretty label for the left subtitle, e.g. "May 21, 2025 6:00 PM" */
  dateLabel: string;

  /** Numeric values */
  pageViews: number;
  tickets: number;

  /** Pretty currency label, e.g. "$123,382" */
  revenue: string;

  /** Pretty label for the right-most date, e.g. "24 JUN, 2026" */
  eventDateLabel: string;

  /** Used for sorting eventDate reliably */
  eventDateMs: number;

  /** Image url */
  img: string | null;
};

type ApiResponse = {
  rows: Row[];
};

type SortField = "title" | "pageViews" | "tickets" | "revenue" | "eventDate";
type SortDir = "asc" | "desc";

/**
 * Dropdown options: only the field (no direction).
 * Direction is controlled INSIDE the new single sort control.
 */
const SORT_FIELDS: { key: SortField; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "pageViews", label: "Page Views" },
  { key: "tickets", label: "Tickets Sold" },
  { key: "revenue", label: "Revenue" },
  { key: "eventDate", label: "Event Date" },
];

/* --------------------------- Sort helpers -------------------------- */
function revenueToNumber(rev: string) {
  // "$123,382" -> 123382
  const n = Number(String(rev).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/* -------------------------- Data fetching -------------------------- */
async function fetchUpcomingEvents(): Promise<ApiResponse> {
  const res = await fetch("/api/dashboard/upcoming-events?limit=4", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to load upcoming events");
  }

  return res.json();
}

/* --------------------------- Poster cell --------------------------- */
function TablePoster({ src, title }: { src: string | null; title: string }) {
  const initialSrc = useMemo(() => {
    const s = (src ?? "").trim();
    return s ? s : EVENT_CARD_DEFAULT_POSTER;
  }, [src]);

  const [imgSrc, setImgSrc] = useState<string>(initialSrc);

  useEffect(() => {
    setImgSrc(initialSrc);
  }, [initialSrc]);

  const isDefault = imgSrc === EVENT_CARD_DEFAULT_POSTER;

  return (
    <Image
      src={imgSrc}
      fill
      alt={title}
      sizes="64px"
      className={[
        "object-cover object-center",
        isDefault ? "brightness-[1.06] contrast-[1.04] saturate-[1.05]" : "",
      ].join(" ")}
      onError={() => {
        if (imgSrc !== EVENT_CARD_DEFAULT_POSTER) {
          setImgSrc(EVENT_CARD_DEFAULT_POSTER);
        }
      }}
    />
  );
}

/* ---------------------- Sort Controls (SINGLE) ---------------------- */
/** Matches the “Events” page singular sort button (icon + portal dropdown). */
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
    const wrap = ref.current;
    if (!wrap) return;

    // button is the first child inside wrapper
    const button = wrap.querySelector("button");
    if (!button) return;

    const r = button.getBoundingClientRect();
    const vw = window.innerWidth;

    const panelW =
      panelRef.current?.getBoundingClientRect().width ?? inferWidthFallback();

    // align dropdown to the button's right edge
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
          "h-8 w-8 rounded-[4px] border border-white/10",
          "bg-neutral-700/90 text-neutral-100",
          "transition-[transform,box-shadow,border-color,background-color] duration-150",
          "hover:bg-neutral-700 hover:border-white/14",
          "active:scale-[0.985]",
          "focus:outline-none focus-visible:border-primary-500",
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
          gap: 5px;
        }

        .tikd-sort-bar {
          width: 52%;
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

export default function UpcomingEventsTable() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard-upcoming-events"],
    queryFn: fetchUpcomingEvents,
    staleTime: 20_000,
    placeholderData: keepPreviousData,
  });

  const rows = data?.rows ?? [];

  // ✅ On page load: not auto-selected on any option
  const [sortField, setSortField] = useState<SortField | null>(null);

  // ✅ Default direction (only used when sortField is chosen)
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const defaultDirFor = useCallback((field: SortField): SortDir => {
    // keep behavior identical to previous table:
    // title defaults ASC, everything else defaults DESC
    if (field === "title") return "asc";
    return "desc";
  }, []);

  const sortedRows = useMemo(() => {
    // If no field chosen, keep original order
    if (!sortField) return rows;

    const arr = [...rows];

    arr.sort((a, b) => {
      let cmp = 0;

      switch (sortField) {
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
        case "pageViews":
          cmp = a.pageViews - b.pageViews;
          break;
        case "tickets":
          cmp = a.tickets - b.tickets;
          break;
        case "revenue":
          cmp = revenueToNumber(a.revenue) - revenueToNumber(b.revenue);
          break;
        case "eventDate":
          cmp = a.eventDateMs - b.eventDateMs;
          break;
        default:
          cmp = 0;
      }

      return sortDir === "asc" ? cmp : -cmp;
    });

    return arr;
  }, [rows, sortField, sortDir]);

  return (
    <div className="relative overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 py-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-neutral-700 px-4 pb-2">
        <h3 className="text-base font-bold uppercase text-neutral-400">
          Upcoming Events
        </h3>

        {/* ✅ NEW: single sort button (same as Events page) */}
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

      {/* Body */}
      <div>
        {/* Loading / Error / Empty states */}
        {isLoading ? (
          <div className="px-4 py-6 text-sm text-white/70">Loading…</div>
        ) : isError ? (
          <div className="px-4 py-6 text-sm text-red-200">
            Couldn’t load upcoming events.
          </div>
        ) : sortedRows.length === 0 ? (
          <div className="px-4 py-6 text-sm text-white/60">
            No upcoming events yet.
          </div>
        ) : (
          <ul>
            {sortedRows.map((r) => {
              return (
                <li
                  key={r.id}
                  className={[
                    "relative",
                    "after:pointer-events-none after:absolute after:bottom-0 after:left-4 after:right-4 after:h-px",
                    "after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent",
                    "after:opacity-70",
                    "last:after:hidden",
                  ].join(" ")}
                >
                  <Link
                    href={`/dashboard/events/${r.id}`}
                    className={[
                      "group block cursor-pointer",
                      "px-4 py-2",
                      "hover:bg-neutral-800 focus:outline-none",
                    ].join(" ")}
                    aria-label={`Open event ${r.title}`}
                  >
                    <div
                      className={[
                        "grid items-center",
                        "gap-y-3",
                        "sm:grid-cols-[2fr_1fr_1fr_1fr_1fr]",
                        "sm:gap-x-8",
                      ].join(" ")}
                    >
                      {/* Col 1: Event */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          {/* Poster (uses same placeholder as EventCard) */}
                          <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-md bg-white/5">
                            <TablePoster src={r.img} title={r.title} />
                          </div>

                          {/* Title + Date */}
                          <div className="min-w-0">
                            <div className="truncate text-base font-extrabold uppercase text-white group-hover:text-white">
                              {r.title}
                            </div>
                            <div className="mt-1 truncate text-xs font-medium text-primary-951">
                              {r.dateLabel}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Page Views */}
                      <div className="justify-self-stretch">
                        <div className="flex w-full flex-col items-center text-center">
                          <div className="flex items-center justify-center gap-1.5 text-base font-extrabold">
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
                            <span className="tabular-nums">{r.pageViews}</span>
                          </div>
                          <div className="mt-1 text-xs text-neutral-400">
                            Page Views
                          </div>
                        </div>
                      </div>

                      {/* Tickets Sold */}
                      <div className="justify-self-stretch">
                        <div className="flex w-full flex-col items-center text-center">
                          <div className="flex items-center justify-center gap-1.5 text-base font-extrabold">
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
                            <span className="tabular-nums">{r.tickets}</span>
                          </div>
                          <div className="mt-1 text-xs text-neutral-400">
                            Tickets Sold
                          </div>
                        </div>
                      </div>

                      {/* Revenue */}
                      <div className="justify-self-stretch">
                        <div className="flex w-full flex-col items-center text-center">
                          <div className="text-base font-extrabold tabular-nums">
                            {r.revenue}
                          </div>
                          <div className="mt-1 text-xs text-neutral-400">
                            Revenue
                          </div>
                        </div>
                      </div>

                      {/* Event Date */}
                      <div className="justify-self-stretch">
                        <div className="flex w-full flex-col items-center text-center">
                          <div className="text-base font-extrabold uppercase tabular-nums">
                            {r.eventDateLabel}
                          </div>
                          <div className="mt-1 text-xs text-neutral-400">
                            Event Date
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {/* Fade */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(0deg,#181828_0%,rgba(24,24,40,0)_100%)]" />
      </div>

      {/* ✅ FIX: keep wrapper non-interactive but allow the button itself to receive clicks */}
      <div className="pointer-events-none absolute inset-x-0 bottom-2.5 z-10 flex justify-center">
        <Button
          asChild
          variant="viewAction"
          size="sm"
          className="pointer-events-auto"
        >
          <Link href="/dashboard/events">View All</Link>
        </Button>
      </div>
    </div>
  );
}
