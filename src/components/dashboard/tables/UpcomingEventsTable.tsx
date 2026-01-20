/* ------------------------------------------------------------------ */
/*  src/components/dashboard/tables/UpcomingEventsTable.tsx           */
/* ------------------------------------------------------------------ */
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

/* If your app already has ids/slugs, replace the rows below and the
   toSlug() usage with your real event ids/slugs. */
type Row = {
  title: string;
  date: string; // "May 21, 2025 6:00 PM"
  pageViews: number; // 400
  tickets: number; // 328
  revenue: string; // "$123,382"
  eventDate: string; // "24 JUN, 2026"
  img: string;
};

const rows: Row[] = [
  {
    title: "AFTER PROM RSVP - MEPHAM",
    date: "May 21, 2025 6:00 PM",
    pageViews: 612,
    tickets: 328,
    revenue: "$123,382",
    eventDate: "24 JUN, 2026",
    img: "/dummy/event-1.png",
  },
  {
    title: "Summer Solstice Cruise",
    date: "May 25, 2025 8:30 PM",
    pageViews: 487,
    tickets: 292,
    revenue: "$98,540",
    eventDate: "08 JUL, 2026",
    img: "/dummy/event-2.png",
  },
  {
    title: "Open Air Electronic",
    date: "Jun 01, 2025 9:00 PM",
    pageViews: 421,
    tickets: 245,
    revenue: "$81,204",
    eventDate: "15 JUL, 2026",
    img: "/dummy/event-3.png",
  },
  {
    title: "Karaoke Night Yacht",
    date: "Jun 07, 2025 7:00 PM",
    pageViews: 318,
    tickets: 181,
    revenue: "$63,120",
    eventDate: "21 JUL, 2026",
    img: "/dummy/event-4.png",
  },
];

function toSlug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/* --------------------------- Sort helpers -------------------------- */
function revenueToNumber(rev: string) {
  // "$123,382" -> 123382
  const n = Number(String(rev).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function eventDateToMs(label: string) {
  // "24 JUN, 2026" -> ms (make it parseable)
  // Convert to "24 Jun 2026"
  const cleaned = label.replace(",", "").trim();
  const ms = Date.parse(cleaned);
  return Number.isFinite(ms) ? ms : 0;
}

type SortField = "title" | "pageViews" | "tickets" | "revenue" | "eventDate";
type SortDir = "asc" | "desc";

/**
 * Dropdown options: only the field (no direction).
 * Direction is controlled by the separate arrows button.
 */
const SORT_FIELDS: { key: SortField; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "pageViews", label: "Page Views" },
  { key: "tickets", label: "Tickets Sold" },
  { key: "revenue", label: "Revenue" },
  { key: "eventDate", label: "Event Date" },
];

export default function UpcomingEventsTable() {
  // ✅ On page load: not auto-selected on any option
  const [sortField, setSortField] = useState<SortField | null>(null);

  // ✅ Default direction (only used when sortField is chosen)
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement | null>(null);

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
          cmp = eventDateToMs(a.eventDate) - eventDateToMs(b.eventDate);
          break;
        default:
          cmp = 0;
      }

      return sortDir === "asc" ? cmp : -cmp;
    });

    return arr;
  }, [sortField, sortDir]);

  const applySortField = (key: SortField) => {
    setSortField(key);
    setSortOpen(false);

    // Smart default: title -> A→Z, numbers/dates -> High→Low
    if (key === "title") setSortDir("asc");
    else setSortDir("desc");
  };

  const toggleDir = () => setSortDir((d) => (d === "asc" ? "desc" : "asc"));

  // Close on outside click + ESC (best UX)
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!sortOpen) return;
      const t = e.target as Node | null;
      if (!t) return;
      if (sortRef.current && !sortRef.current.contains(t)) setSortOpen(false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (!sortOpen) return;
      if (e.key === "Escape") setSortOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [sortOpen]);

  return (
    <div className="relative rounded-lg border border-neutral-700 bg-neutral-900 py-2 overflow-hidden">
      {/* Header */}
      <div className="pb-2 border-b border-neutral-700 flex items-center justify-between gap-3 px-4">
        <h3 className="text-base font-bold uppercase text-neutral-400">
          Upcoming Events
        </h3>

        {/* Sort controls */}
        <div className="flex items-center gap-2">
          {/* Sort dropdown */}
          <div ref={sortRef} className="relative">
            <button
              type="button"
              onClick={() => setSortOpen((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={sortOpen}
              className={[
                "flex items-center justify-between gap-3",
                "rounded-md border border-white/10 bg-neutral-700",
                "px-3 py-[6.8px]",
                "text-left text-xs text-white/80 outline-none",
                "hover:border-primary-500 hover:text-white focus-visible:border-primary-500",
                "cursor-pointer",
                // ✅ don’t let it shrink into a tiny pill
                "min-w-[96px] sm:min-w-[110px]",
              ].join(" ")}
            >
              <span className="truncate">
                {sortField
                  ? (SORT_FIELDS.find((f) => f.key === sortField)?.label ??
                    "Sort")
                  : "Sort"}
              </span>
              <ChevronDown
                className={`h-4 w-4 opacity-70 transition-transform ${
                  sortOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {sortOpen && (
              <div className="absolute right-0 z-50 mt-2">
                <div className="relative">
                  {/* caret (centered-ish under the button) */}
                  <span className="pointer-events-none absolute -top-2 right-8 h-3 w-3 rotate-45 border border-white/10 border-b-0 border-r-0 bg-[#121420]" />

                  {/* ✅ wider dropdown like your reference */}
                  <div
                    role="listbox"
                    aria-label="Sort"
                    className={[
                      "overflow-hidden rounded-2xl border border-white/10",
                      "bg-[#121420] backdrop-blur",
                      "shadow-[0_18px_40px_rgba(0,0,0,0.45)]",
                      "w-[137px]",
                    ].join(" ")}
                  >
                    <div className="p-2">
                      {SORT_FIELDS.map((opt) => {
                        const active = opt.key === sortField;

                        return (
                          <button
                            key={opt.key}
                            type="button"
                            role="option"
                            aria-selected={active}
                            onClick={() => applySortField(opt.key)}
                            className={[
                              "flex w-full items-center justify-between",
                              "rounded-lg px-3 py-2.5",
                              "text-left text-sm outline-none",
                              "hover:bg-white/5 focus:bg-white/5",
                              active
                                ? "bg-white/5 text-white"
                                : "text-white/90",
                            ].join(" ")}
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
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Direction button (separate, correct icon like reference) */}
          <button
            type="button"
            onClick={toggleDir}
            disabled={!sortField}
            aria-label={
              !sortField
                ? "Select a sort type first"
                : sortDir === "asc"
                  ? "Sort direction ascending"
                  : "Sort direction descending"
            }
            className={[
              "grid h-[30px] w-[38px] place-items-center rounded-md",
              "border border-white/10 bg-neutral-700",
              "text-white/80 outline-none",
              "hover:border-primary-500 hover:text-white focus-visible:border-primary-500",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "cursor-pointer",
            ].join(" ")}
          >
            {/* ✅ correct “up/down arrows” filter icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              className="opacity-90"
            >
              <path
                d="M5 3v10"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <path
                d="M3 5l2-2 2 2"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M11 13V3"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <path
                d="M13 11l-2 2-2-2"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* List */}
      <div className="">
        <ul className="">
          {sortedRows.map((r) => {
            const slug = toSlug(r.title);

            return (
              <li
                key={slug}
                className={[
                  "relative",
                  // gradient divider (hidden on last row)
                  "after:pointer-events-none after:absolute after:bottom-0 after:left-4 after:right-4 after:h-px",
                  "after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent",
                  "after:opacity-70",
                  "last:after:hidden",
                ].join(" ")}
              >
                <Link
                  href={`/events/${slug}`} // adjust if your route is different (e.g., /dashboard/events/[slug])
                  className={[
                    "group block cursor-pointer",
                    "px-4 py-2",
                    "hover:bg-neutral-800 focus:outline-none",
                  ].join(" ")}
                  aria-label={`Open event ${r.title}`}
                >
                  <div className="flex items-center gap-3">
                    {/* Poster */}
                    <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-md">
                      <Image
                        src={r.img}
                        width={64}
                        height={80}
                        alt=""
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    </div>

                    {/* Content grid */}
                    {/* Order requested:
                        Event details | Page Views | Tickets Sold | Revenue | Event Date */}
                    <div className="grid grow items-center gap-2 sm:grid-cols-[minmax(0,1fr)_140px_150px_170px_170px]">
                      {/* Event details (left) */}
                      <div className="min-w-0">
                        <div className="text-base uppercase truncate font-extrabold text-white group-hover:text-white">
                          {r.title}
                        </div>
                        <div className="truncate text-xs text-primary-951 font-medium mt-1">
                          {r.date}
                        </div>
                      </div>

                      {/* Page Views */}
                      <div className="flex items-center sm:justify-end">
                        <div className="text-right">
                          <div className="flex items-center justify-end gap-1.5 text-base font-extrabold">
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
                          <div className="text-xs text-neutral-400 mt-1">
                            Page Views
                          </div>
                        </div>
                      </div>

                      {/* Tickets Sold */}
                      <div className="flex items-center sm:justify-end">
                        <div className="text-right">
                          <div className="flex items-center justify-end gap-1.5 text-base font-extrabold">
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
                          <div className="text-xs text-neutral-400 mt-1">
                            Tickets Sold
                          </div>
                        </div>
                      </div>

                      {/* Revenue */}
                      <div className="flex items-center sm:justify-end">
                        <div className="text-right">
                          <div className="text-base font-extrabold tabular-nums">
                            {r.revenue}
                          </div>
                          <div className="text-xs text-neutral-400 mt-1">
                            Revenue
                          </div>
                        </div>
                      </div>

                      {/* Event Date (right) */}
                      <div className="flex items-center sm:justify-end">
                        <div className="text-right">
                          <div className="text-base font-extrabold uppercase tabular-nums">
                            {r.eventDate}
                          </div>
                          <div className="text-xs text-neutral-400 mt-1">
                            Event Date
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Fade */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(0deg,#181828_0%,rgba(24,24,40,0)_100%)]" />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-2.5 flex justify-center">
        <Link
          href="/dashboard/events"
          className="pointer-events-auto rounded-full border border-neutral-500 bg-neutral-700 px-3 py-2 text-xs font-medium text-white transition duration-200 hover:border-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          View All
        </Link>
      </div>
    </div>
  );
}
