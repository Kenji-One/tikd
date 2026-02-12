/* ------------------------------------------------------------------ */
/*  src/components/dashboard/tables/RecentSalesTable.tsx              */
/* ------------------------------------------------------------------ */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Instagram } from "lucide-react";
import SortArrowsIcon from "@/components/ui/SortArrowsIcon";
import { Button } from "@/components/ui/Button";

/* ------------------------------ Types ------------------------------ */
type Sale = {
  id: string;
  name: string;
  event: string;

  /**
   * Purchase datetime label (must include time, e.g. "Sep 19, 2025 3:24 PM")
   * In real data, you can also store ISO and format here — but we keep the
   * existing shape and make it time-aware.
   */
  date: string;

  /** Renamed from "total" -> "amount" */
  amount: number;

  /** User's Instagram profile photo URL (or already-resolved avatar URL) */
  instagramAvatarUrl?: string;

  /** Instagram follower count (displayed on-chip under avatar) */
  instagramFollowers?: number;

  /** Small event poster thumbnail URL */
  eventPosterUrl?: string;
};

type SortKey = "name" | "event" | "date" | "amount";
type SortDir = "asc" | "desc";

/* ---------------------------- Mock Data ---------------------------- */
const SALES: Sale[] = [
  {
    id: "#2935",
    name: "Dennis V.",
    event: "Valentines Gala",
    date: "Sep 19, 2025 3:24 PM",
    amount: 3692.79,
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

function initialsFromName(name: string) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const a = (parts[0]?.[0] ?? "").toUpperCase();
  const b = (parts[1]?.[0] ?? "").toUpperCase();
  const c = (parts[0]?.[1] ?? "").toUpperCase();

  // If we only have one word, take first 2 letters
  return parts.length >= 2 ? `${a}${b}` : `${a}${c}`.trim() || "NA";
}

/** Parse "Sep 19, 2025 3:24 PM" into a timestamp for sorting */
function dateToMs(label: string) {
  const ms = Date.parse(String(label || ""));
  return Number.isFinite(ms) ? ms : 0;
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
    className || "h-8 w-8 rounded-full object-cover ring-1 ring-white/10"; // default bigger than before

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

/**
 * Match reference:
 * - chip sits “attached” under the avatar (slight overlap)
 * - use Tikd chip primary styling (same purple gradient feel)
 * - IG icon in a small rounded square, then the number
 */
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
        className="h-7 w-7 rounded-md bg-white/10 ring-1 ring-white/10"
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      className="h-7 w-7 rounded-md object-cover ring-1 ring-white/10"
      onError={(e) => {
        const el = e.currentTarget;
        el.style.display = "none";
      }}
    />
  );
}

/* ---------------------------- Component ---------------------------- */
export default function RecentSalesTable() {
  const router = useRouter();

  const clipRef = useRef<HTMLDivElement | null>(null);
  const [isClamped, setIsClamped] = useState(false);
  const MAX = 519;

  // ✅ sort state (same behavior as MyTeamTable)
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [dir, setDir] = useState<SortDir>("desc");

  const toggleSort = (key: SortKey) => {
    if (key === sortBy) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setDir("desc");
    }
  };

  const sorted = useMemo(() => {
    const arr = [...SALES];
    arr.sort((a, b) => {
      if (sortBy === "amount") {
        return dir === "asc" ? a.amount - b.amount : b.amount - a.amount;
      }

      if (sortBy === "date") {
        const ams = dateToMs(a.date);
        const bms = dateToMs(b.date);
        return dir === "asc" ? ams - bms : bms - ams;
      }

      const A = String(a[sortBy] ?? "");
      const B = String(b[sortBy] ?? "");
      return dir === "asc" ? A.localeCompare(B) : B.localeCompare(A);
    });

    return arr;
  }, [sortBy, dir]);

  useEffect(() => {
    if (!clipRef.current) return;
    const el = clipRef.current;
    const recompute = () => setIsClamped(el.scrollHeight > MAX + 0.5);
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    const onResize = () => recompute();
    window.addEventListener("resize", onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const thRow = "[&>th]:pb-3 [&>th]:pt-1";
  const thBase =
    "text-left font-semibold cursor-pointer select-none hover:text-white/80";
  const thBaseRight =
    "text-right font-semibold cursor-pointer select-none hover:text-white/80";
  const separatorLine =
    "bg-[linear-gradient(90deg,rgba(154,70,255,0)_0%,rgba(154,70,255,0.18)_30%,rgba(255,255,255,0.08)_50%,rgba(154,70,255,0.18)_70%,rgba(154,70,255,0)_100%)]";

  // ✅ tighten the spacing between Name and Event (reduce the “gap”)
  const thNamePad = "pl-4 pr-2";
  const thEventPad = "pl-2 pr-4";
  const thOtherPad = "px-4";

  const tdNamePad = "pl-4 pr-2";
  const tdEventPad = "pl-2 pr-4";
  const tdOtherPad = "px-4";

  return (
    <div className="relative overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 pt-3">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between border-b border-neutral-700 px-4 pb-3">
        <h3 className="font-bold uppercase text-neutral-400">Recent Sales</h3>
      </div>

      {/* Clipping wrapper */}
      <div
        ref={clipRef}
        className="relative overflow-hidden rounded-lg"
        style={{ height: isClamped ? `${MAX}px` : "auto" }}
      >
        <table className="w-full border-collapse text-xs font-medium leading-tight">
          <thead className="text-neutral-400">
            <tr className={thRow}>
              {/* Name */}
              <th
                className={clsx(thBase, thNamePad)}
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
                  Name
                  <SortArrowsIcon
                    direction={sortBy === "name" ? dir : null}
                    className="ml-2 -translate-y-[1px]"
                  />
                </div>
              </th>

              {/* Event */}
              <th
                className={clsx(thBase, thEventPad, "truncate")}
                onClick={() => toggleSort("event")}
                aria-sort={
                  sortBy === "event"
                    ? dir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <div className="inline-flex items-center">
                  Event
                  <SortArrowsIcon
                    direction={sortBy === "event" ? dir : null}
                    className="ml-2 -translate-y-[1px]"
                  />
                </div>
              </th>

              {/* Date */}
              <th
                className={clsx(thBase, thOtherPad)}
                onClick={() => toggleSort("date")}
                aria-sort={
                  sortBy === "date"
                    ? dir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <div className="inline-flex items-center">
                  Date
                  <SortArrowsIcon
                    direction={sortBy === "date" ? dir : null}
                    className="ml-2 -translate-y-[1px]"
                  />
                </div>
              </th>

              {/* Amount */}
              <th
                className={clsx(thBaseRight, thOtherPad)}
                onClick={() => toggleSort("amount")}
                aria-sort={
                  sortBy === "amount"
                    ? dir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <div className="inline-flex items-center justify-end">
                  Amount
                  <SortArrowsIcon
                    direction={sortBy === "amount" ? dir : null}
                    className="ml-2 -translate-y-[1px]"
                  />
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="text-white">
            {sorted.flatMap((s, i) => {
              const isLast = i === sorted.length - 1;
              const rowBg = i % 2 === 0 ? "bg-neutral-948" : "bg-neutral-900";
              const dt = formatDateParts(s.date);

              const dataRow = (
                <tr
                  key={`${s.id}-${i}`}
                  className={clsx("transition-colors", rowBg)}
                >
                  {/* Name */}
                  <td className={clsx(tdNamePad, "py-2.5 align-middle")}>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <AvatarWithInstagramFollowers
                        name={s.name}
                        src={s.instagramAvatarUrl}
                        followers={s.instagramFollowers}
                      />

                      <span className="min-w-0 truncate" title={s.name}>
                        {s.name}
                      </span>
                    </div>
                  </td>

                  {/* Event */}
                  <td className={clsx(tdEventPad, "py-2.5 align-middle")}>
                    <div className="flex min-w-0 items-center gap-2">
                      <PosterThumb alt={s.event} src={s.eventPosterUrl} />
                      <span className="min-w-0 truncate" title={s.event}>
                        {s.event}
                      </span>
                    </div>
                  </td>

                  {/* Date (date + time) */}
                  <td className={clsx(tdOtherPad, "py-2.5 align-middle")}>
                    <div className="flex flex-col leading-tight">
                      <span className="text-white/90">{dt.date}</span>
                      <span className="text-[11px] text-neutral-400">
                        {dt.time || "—"}
                      </span>
                    </div>
                  </td>

                  {/* Amount */}
                  <td
                    className={clsx(
                      tdOtherPad,
                      "py-2.5 align-middle text-right font-medium text-success-500",
                    )}
                  >
                    <span className="mr-3">{fmtUsd(s.amount)}</span>
                  </td>
                </tr>
              );

              const separatorRow = !isLast ? (
                <tr key={`${s.id}-sep`} aria-hidden className="bg-neutral-900">
                  <td colSpan={4} className="p-0">
                    <div className={clsx("mx-4 h-px", separatorLine)} />
                  </td>
                </tr>
              ) : null;

              return separatorRow ? [dataRow, separatorRow] : [dataRow];
            })}
          </tbody>
        </table>

        {/* Fade */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(0deg,#181828_0%,rgba(24,24,40,0)_100%)]" />
      </div>

      {/* Bottom center pill */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-1 flex justify-center">
        <div className="pointer-events-auto">
          <Button
            type="button"
            onClick={() => router.push("/dashboard/sales")}
            variant="viewAction"
            size="sm"
          >
            View All
          </Button>
        </div>
      </div>
    </div>
  );
}
