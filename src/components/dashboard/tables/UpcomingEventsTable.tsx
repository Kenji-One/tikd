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
  revenue: string; // "$123,382"
  tickets: number; // 328
  eventDate: string; // "24 JUN, 2026"
  img: string;
};

const rows: Row[] = [
  {
    title: "AFTER PROM RSVP - MEPHAM",
    date: "May 21, 2025 6:00 PM",
    revenue: "$123,382",
    tickets: 328,
    eventDate: "24 JUN, 2026",
    img: "/dummy/event-1.png",
  },
  {
    title: "Summer Solstice Cruise",
    date: "May 25, 2025 8:30 PM",
    revenue: "$98,540",
    tickets: 292,
    eventDate: "08 JUL, 2026",
    img: "/dummy/event-2.png",
  },
  {
    title: "Open Air Electronic",
    date: "Jun 01, 2025 9:00 PM",
    revenue: "$81,204",
    tickets: 245,
    eventDate: "15 JUL, 2026",
    img: "/dummy/event-3.png",
  },
  {
    title: "Karaoke Night Yacht",
    date: "Jun 07, 2025 7:00 PM",
    revenue: "$63,120",
    tickets: 181,
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

function startDateToMs(label: string) {
  // "May 21, 2025 6:00 PM" -> ms
  const ms = Date.parse(label);
  return Number.isFinite(ms) ? ms : 0;
}

function eventDateToMs(label: string) {
  // "24 JUN, 2026" -> ms (make it parseable)
  // Convert to "24 Jun 2026"
  const cleaned = label.replace(",", "").trim();
  const ms = Date.parse(cleaned);
  return Number.isFinite(ms) ? ms : 0;
}

type SortKey =
  | "revenue_desc"
  | "revenue_asc"
  | "tickets_desc"
  | "tickets_asc"
  | "eventDate_asc"
  | "eventDate_desc"
  | "start_asc"
  | "start_desc"
  | "title_asc"
  | "title_desc";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "revenue_desc", label: "Revenue (High → Low)" },
  { key: "revenue_asc", label: "Revenue (Low → High)" },
  { key: "tickets_desc", label: "Tickets Sold (High → Low)" },
  { key: "tickets_asc", label: "Tickets Sold (Low → High)" },
  { key: "eventDate_asc", label: "Event Date (Soonest)" },
  { key: "eventDate_desc", label: "Event Date (Latest)" },
  { key: "start_asc", label: "Start Time (Soonest)" },
  { key: "start_desc", label: "Start Time (Latest)" },
  { key: "title_asc", label: "Title (A → Z)" },
  { key: "title_desc", label: "Title (Z → A)" },
];

export default function UpcomingEventsTable() {
  const [sortBy, setSortBy] = useState<SortKey>("revenue_desc");
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement | null>(null);

  const sortLabel = useMemo(() => {
    return (
      SORT_OPTIONS.find((o) => o.key === sortBy)?.label ??
      "Revenue (High → Low)"
    );
  }, [sortBy]);

  const sortedRows = useMemo(() => {
    const arr = [...rows];

    arr.sort((a, b) => {
      switch (sortBy) {
        case "revenue_desc":
          return revenueToNumber(b.revenue) - revenueToNumber(a.revenue);
        case "revenue_asc":
          return revenueToNumber(a.revenue) - revenueToNumber(b.revenue);

        case "tickets_desc":
          return b.tickets - a.tickets;
        case "tickets_asc":
          return a.tickets - b.tickets;

        case "eventDate_asc":
          return eventDateToMs(a.eventDate) - eventDateToMs(b.eventDate);
        case "eventDate_desc":
          return eventDateToMs(b.eventDate) - eventDateToMs(a.eventDate);

        case "start_asc":
          return startDateToMs(a.date) - startDateToMs(b.date);
        case "start_desc":
          return startDateToMs(b.date) - startDateToMs(a.date);

        case "title_asc":
          return a.title.localeCompare(b.title);
        case "title_desc":
          return b.title.localeCompare(a.title);

        default:
          return 0;
      }
    });

    return arr;
  }, [sortBy]);

  const applySort = (key: SortKey) => {
    setSortBy(key);
    setSortOpen(false);
  };

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
    <div className="relative rounded-lg border border-neutral-700 bg-neutral-900 p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-bold uppercase text-neutral-400">
          Upcoming Events
        </h3>

        {/* Sort selector (functional) */}
        <div ref={sortRef} className="relative w-full max-w-[190px]">
          <button
            type="button"
            onClick={() => setSortOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={sortOpen}
            className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-neutral-700 px-3 py-[9px] text-left text-xs text-white/80 outline-none hover:border-primary-500 hover:text-white focus-visible:border-primary-500 cursor-pointer"
          >
            <span className="truncate">Sort by: {sortLabel}</span>
            <ChevronDown
              className={`h-4 w-4 opacity-70 transition-transform ${
                sortOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {sortOpen && (
            <div className="absolute right-0 z-50 mt-2 w-full">
              <div className="relative">
                {/* caret */}
                <span className="pointer-events-none absolute -top-2 right-6 h-3 w-3 rotate-45 border border-white/10 border-b-0 border-r-0 bg-[#121420]" />

                <div
                  role="listbox"
                  aria-label="Sort by"
                  className="overflow-hidden rounded-xl border border-white/10 bg-[#121420] backdrop-blur"
                >
                  <div className="p-1.5">
                    {SORT_OPTIONS.map((opt) => {
                      const active = opt.key === sortBy;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          role="option"
                          aria-selected={active}
                          onClick={() => applySort(opt.key)}
                          className={`flex w-full items-center justify-between rounded-lg px-3.5 py-2 text-left text-sm outline-none hover:bg-white/5 focus:bg-white/5 ${
                            active ? "bg-white/5 text-white" : "text-white/90"
                          }`}
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
      </div>

      {/* List */}
      <ul className="space-y-3">
        {sortedRows.map((r) => {
          const slug = toSlug(r.title);

          return (
            <li key={slug} className="relative">
              <Link
                href={`/events/${slug}`} // adjust if your route is different (e.g., /dashboard/events/[slug])
                className={[
                  "group block cursor-pointer",
                  "p-2",
                  "hover:bg-neutral-800 focus:outline-none rounded-md",
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
                  <div className="grid grow items-center gap-2 sm:grid-cols-[minmax(0,1fr)_180px_140px_170px]">
                    {/* Title + datetime (left) */}
                    <div className="min-w-0">
                      <div className="text-base uppercase truncate font-extrabold text-white group-hover:text-white">
                        {r.title}
                      </div>
                      <div className="truncate text-xs text-primary-951 font-medium mt-1">
                        {r.date}
                      </div>
                    </div>

                    {/* Revenue */}
                    <div className="flex items-center sm:justify-end">
                      <div className="text-right">
                        <div className="text-base font-extrabold">
                          {r.revenue}
                        </div>
                        <div className="text-xs text-neutral-400 mt-1">
                          Revenue
                        </div>
                      </div>
                    </div>

                    {/* Tickets Sold */}
                    <div className="flex items-center sm:justify-end">
                      <div className="text-right">
                        <div className="text-base font-extrabold">
                          {r.tickets}
                        </div>
                        <div className="text-xs text-neutral-400 mt-1">
                          Tickets Sold
                        </div>
                      </div>
                    </div>

                    {/* Event Date */}
                    <div className="flex items-center sm:justify-end">
                      <div className="text-right">
                        <div className="text-base font-extrabold uppercase">
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

      {/* View All – pill bottom-right */}
      <div className="pointer-events-none w-full flex justify-end mt-4">
        <Link
          href="/events"
          className="pointer-events-auto rounded-full border border-neutral-500 bg-neutral-700 px-3 py-2 text-xs font-medium text-white transition duration-200 hover:border-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          View All
        </Link>
      </div>
    </div>
  );
}
