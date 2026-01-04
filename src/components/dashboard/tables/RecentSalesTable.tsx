/* ------------------------------------------------------------------ */
/*  src/components/dashboard/tables/RecentSalesTable.tsx              */
/* ------------------------------------------------------------------ */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import SortArrowsIcon from "@/components/ui/SortArrowsIcon";

/* ------------------------------ Types ------------------------------ */
type Sale = {
  id: string;
  name: string;
  event: string;
  date: string;
  total: number;
  avatarBg?: string;
  avatarText?: string;
};

type SortKey = "id" | "name" | "event" | "date" | "total";
type SortDir = "asc" | "desc";

/* ---------------------------- Mock Data ---------------------------- */
const SALES: Sale[] = [
  {
    id: "#2935",
    name: "Dennis Valentine",
    event: "Valentines Gala",
    date: "Sep 19, 2025",
    total: 3692.79,
    avatarBg: "bg-gradient-to-br from-indigo-500 to-cyan-400",
    avatarText: "DV",
  },
  {
    id: "#2935",
    name: "Dennis Collis",
    event: "Valentines Gala",
    date: "Sep 16, 2025",
    total: 9000.07,
    avatarBg: "bg-gradient-to-br from-fuchsia-500 to-rose-500",
    avatarText: "DC",
  },
  {
    id: "#2935",
    name: "Dennis F.",
    event: "Valentines Gala",
    date: "Sep 2, 2025",
    total: 447.24,
    avatarBg: "bg-gradient-to-br from-slate-500 to-slate-700",
    avatarText: "DF",
  },
  {
    id: "#2935",
    name: "Dennis R.",
    event: "Valentines Gala",
    date: "Aug 29, 2025",
    total: 545.23,
    avatarBg: "bg-gradient-to-br from-zinc-500 to-neutral-700",
    avatarText: "DR",
  },
  {
    id: "#2935",
    name: "Dennis S.",
    event: "Valentines Gala",
    date: "Aug 27, 2025",
    total: 7800.57,
    avatarBg: "bg-gradient-to-br from-orange-500 to-amber-500",
    avatarText: "DS",
  },
  {
    id: "#2935",
    name: "Dennis K.",
    event: "Valentines Gala",
    date: "Sep 9, 2025",
    total: 9608.33,
    avatarBg: "bg-gradient-to-br from-teal-500 to-emerald-500",
    avatarText: "DK",
  },
  {
    id: "#2935",
    name: "Denise P.",
    event: "Valentines Gala",
    date: "Sep 4, 2025",
    total: 9731.58,
    avatarBg: "bg-gradient-to-br from-cyan-500 to-blue-500",
    avatarText: "DP",
  },
  {
    id: "#2935",
    name: "Dennis W.",
    event: "Valentines Gala",
    date: "Sep 15, 2025",
    total: 2930.93,
    avatarBg: "bg-gradient-to-br from-primary-500 to-purple-500",
    avatarText: "DW",
  },
  {
    id: "#2935",
    name: "Dennis Y.",
    event: "Valentines Gala",
    date: "Dec 21",
    total: 232.2,
    avatarBg: "bg-gradient-to-br from-gray-500 to-gray-700",
    avatarText: "DY",
  },
];

/* --------------------------- Utilities ----------------------------- */
const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

const firstWordEllip = (s: string) => {
  const first = s.trim().split(/\s+/)[0] ?? s;
  return `${first}…`;
};

function Avatar({ text, bg }: { text: string; bg?: string }) {
  return (
    <div
      aria-hidden
      className={clsx(
        "grid h-5 w-5 place-items-center rounded-sm text-[10px] font-semibold text-white/90",
        bg ?? "bg-white/10"
      )}
    >
      {text}
    </div>
  );
}

/** Parse "Sep 19, 2025" / "Dec 21" into a timestamp for sorting */
function dateToMs(label: string) {
  const withYear = /\d{4}/.test(label) ? label : `${label}, 2025`;
  const ms = Date.parse(withYear);
  return Number.isFinite(ms) ? ms : 0;
}

/* ---------------------------- Component ---------------------------- */
export default function RecentSalesTable() {
  const clipRef = useRef<HTMLDivElement | null>(null);
  const [isClamped, setIsClamped] = useState(false);
  const MAX = 458;

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
      const A = a[sortBy];
      const B = b[sortBy];

      // numeric column
      if (sortBy === "total") {
        return dir === "asc" ? a.total - b.total : b.total - a.total;
      }

      // date column
      if (sortBy === "date") {
        const ams = dateToMs(a.date);
        const bms = dateToMs(b.date);
        return dir === "asc" ? ams - bms : bms - ams;
      }

      // strings
      const aStr = String(A);
      const bStr = String(B);
      return dir === "asc"
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
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

  const thRow = "[&>th]:pb-3 [&>th]:pt-1 [&>th]:px-2";
  const thBase =
    "text-left font-semibold cursor-pointer select-none hover:text-white/80";
  const thBaseRight =
    "text-right font-semibold cursor-pointer select-none hover:text-white/80";

  return (
    <div className="relative rounded-lg border border-neutral-700 bg-neutral-900 pt-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between px-4">
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
              <th
                className={thBase}
                onClick={() => toggleSort("id")}
                aria-sort={
                  sortBy === "id"
                    ? dir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <div className="inline-flex items-center">
                  Order
                  <SortArrowsIcon
                    direction={sortBy === "id" ? dir : null}
                    className="ml-2 -translate-y-[1px]"
                  />
                </div>
              </th>

              <th
                className={thBase + " !pl-0"}
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

              <th
                className={clsx(thBase, "truncate !pl-0")}
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

              <th
                className={thBase}
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

              <th
                className={thBaseRight}
                onClick={() => toggleSort("total")}
                aria-sort={
                  sortBy === "total"
                    ? dir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <div className="inline-flex items-center justify-end">
                  Total
                  <SortArrowsIcon
                    direction={sortBy === "total" ? dir : null}
                    className="ml-2 -translate-y-[1px]"
                  />
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="text-white">
            {sorted.map((s, i) => (
              <tr
                key={`${s.id}-${i}`}
                className={clsx(
                  i % 2 === 0 ? "bg-neutral-800" : "bg-transparent"
                )}
              >
                <td className="pl-2 py-2 align-middle text-neutral-200">
                  {s.id}
                </td>

                <td className="py-2">
                  <div className="flex min-w-0 items-center gap-1">
                    <Avatar
                      text={(s.avatarText ?? "NA").slice(0, 2)}
                      bg={s.avatarBg}
                    />
                    <span className="truncate" title={s.name}>
                      {firstWordEllip(s.name)}
                    </span>
                  </div>
                </td>

                <td className="pr-2 py-2">
                  <span className="block truncate" title={s.event}>
                    {firstWordEllip(s.event)}
                  </span>
                </td>

                <td className="px-2 py-2">{s.date}</td>

                <td className="px-2 py-2 text-right font-medium text-success-500">
                  {fmtUsd(s.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(0deg,#181828_0%,rgba(24,24,40,0)_100%)]" />
      </div>

      {/* Bottom center pill */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
        <button
          type="button"
          className="pointer-events-auto rounded-full border border-neutral-500 bg-neutral-700 px-3 py-2 text-xs font-medium text-white transition duration-200 hover:border-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          See All
        </button>
      </div>
    </div>
  );
}
