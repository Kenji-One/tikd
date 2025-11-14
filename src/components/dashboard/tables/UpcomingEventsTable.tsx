/* ------------------------------------------------------------------ */
/*  src/components/dashboard/tables/UpcomingEventsTable.tsx           */
/* ------------------------------------------------------------------ */
"use client";

import Image from "next/image";
import Link from "next/link";

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

export default function UpcomingEventsTable() {
  return (
    <div className="relative rounded-card border border-neutral-700 bg-neutral-900 p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold uppercase tracking-wide text-neutral-200/90">
          Upcoming Events
        </h3>

        {/* Sort pill (visual only for now) */}
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#1A1C29] px-3 py-2 text-xs text-white/80 hover:border-primary-700/40 hover:text-white"
        >
          Revenue
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            className="opacity-70"
            aria-hidden="true"
          >
            <path
              d="M7 10l5 5 5-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* List */}
      <ul className="space-y-3">
        {rows.map((r, idx) => {
          const slug = toSlug(r.title);
          const isFirst = idx === 0;

          return (
            <li key={slug} className="relative">
              <Link
                href={`/events/${slug}`} // adjust if your route is different (e.g., /dashboard/events/[slug])
                className={[
                  "group block cursor-pointer",
                  // padding/sizing
                  "p-2 pr-6",
                  "hover:bg-neutral-800 focus:outline-none rounded-md",
                ].join(" ")}
                aria-label={`Open event ${r.title}`}
              >
                <div className="flex items-center gap-3">
                  {/* Poster (you said sizing is already correct; keeping 64x80) */}
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
                      <div className="truncate text-xs font-medium text-primary-951">
                        {r.date}
                      </div>
                    </div>

                    {/* Revenue */}
                    <div className="flex items-center sm:justify-end">
                      <div className="text-right">
                        <div className="font-extrabold">{r.revenue}</div>
                        <div className="text-xs text-neutral-400 mt-1.5">
                          Revenue
                        </div>
                      </div>
                    </div>

                    {/* Tickets Sold */}
                    <div className="flex items-center sm:justify-end">
                      <div className="text-right">
                        <div className="font-extrabold">{r.tickets}</div>
                        <div className="text-xs text-neutral-400 mt-1.5">
                          Tickets Sold
                        </div>
                      </div>
                    </div>

                    {/* Event Date */}
                    <div className="flex items-center sm:justify-end">
                      <div className="text-right">
                        <div className="font-extrabold uppercase">
                          {r.eventDate}
                        </div>
                        <div className="text-xs text-neutral-400 mt-1.5">
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
          className="pointer-events-auto rounded-full border border-neutral-500 bg-neutral-700 px-4 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm transition hover:bg-white/15 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          View All
        </Link>
      </div>
    </div>
  );
}
