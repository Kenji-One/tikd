/* ------------------------------------------------------------------ */
/*  src/components/dashboard/tables/RecentSalesTable.tsx                     */
/*  Tikd Dashboard – Recent Sales (368px column width in grid)        */
/* ------------------------------------------------------------------ */
"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

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
    avatarBg: "bg-gradient-to-br from-violet-500 to-purple-500",
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

/* ------------------------------ UI -------------------------------- */
function SortGlyph() {
  return (
    <span className="ml-1 inline-flex flex-col leading-none opacity-40">
      <svg width="8" height="8" viewBox="0 0 10 10" className="-mb-0.5">
        <path d="M5 2l3 3H2l3-3z" fill="currentColor" />
      </svg>
      <svg width="8" height="8" viewBox="0 0 10 10" className="-mt-0.5">
        <path d="M5 8L2 5h6L5 8z" fill="currentColor" />
      </svg>
    </span>
  );
}

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

/* ---------------------------- Component ---------------------------- */
export default function RecentSalesTable() {
  const clipRef = useRef<HTMLDivElement | null>(null);
  const [isClamped, setIsClamped] = useState(false);
  const MAX = 458;

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

  return (
    /* FIX: prevent grid stretch + cap height on the ROOT */
    <div className="relative self-start max-h-[458px] rounded-lg border border-neutral-700 bg-neutral-900 pt-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between px-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-white/80">
          Recent Sales
        </h3>
        <button
          type="button"
          className="text-xs text-white/60 transition-colors hover:text-white/80"
        >
          See All
        </button>
      </div>

      {/* Clipping wrapper */}
      <div
        ref={clipRef}
        className="relative overflow-hidden rounded-lg"
        style={{ height: isClamped ? `${MAX}px` : "auto" }}
      >
        <table className="w-full border-collapse text-xs font-medium leading-tight">
          <thead className="text-neutral-400">
            <tr className="[&>th]:pb-3 [&>th]:pt-1 [&>th]:px-2">
              <th className="text-left font-medium">Order</th>
              <th className="text-left font-medium">Name</th>
              <th className="truncate text-left font-medium">Event</th>
              <th className="text-left font-medium">Date</th>
              <th className="text-right font-medium">Total</th>
            </tr>
          </thead>

          <tbody className="text-white">
            {SALES.map((s, i) => (
              <tr
                key={`${s.id}-${i}`}
                className={clsx(
                  "",
                  i % 2 === 0 ? "bg-neutral-800" : "bg-transparent"
                )}
              >
                <td className="pl-2 pr-1 py-2 align-middle text-neutral-200">
                  {s.id}
                </td>
                <td className="px-1 py-2">
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
                <td className="px-1 py-2">
                  <span className="block truncate" title={s.event}>
                    {firstWordEllip(s.event)}
                  </span>
                </td>
                <td className="px-1 py-2">{s.date}</td>
                <td className="px-1 py-2 text-right font-medium text-success-500">
                  {fmtUsd(s.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(0deg,#181828_0%,rgba(24,24,40,0)_100%)]" />
      </div>

      {/* Bottom center pill (unchanged) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
        <button
          type="button"
          className="pointer-events-auto rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm transition hover:bg-white/15"
        >
          See All
        </button>
      </div>
    </div>
  );
}
