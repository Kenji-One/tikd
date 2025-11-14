/* ------------------------------------------------------------------ */
/*  src/components/dashboard/tables/TrackingLinksTable.tsx            */
/*  Tikd Dashboard – Tracking Links (styled like MyTeamTable)         */
/* ------------------------------------------------------------------ */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Eye, ChevronDown, Copy, Pencil, Trash2, Grid2X2 } from "lucide-react";

/* ------------------------------- Types ------------------------------ */
type Status = "Active" | "Paused" | "Disabled";
type LinkType = "Event" | "Promo" | "Other";

type Row = {
  id: string;
  name: string;
  url: string; // path-only label (e.g., "/Tweets/32u8cxjh/")
  views: number;
  type: LinkType;
  status: Status;
  created: string; // "Sep 19, 2025"
  revenue: number; // USD number
};

/* ----------------------------- Mock Data --------------------------- */
const rows: Row[] = new Array(7).fill(0).map((_, i) => ({
  id: `row-${i}`,
  name: "Tracking Link Name",
  url: `/Tweets/${(Math.random() + 1).toString(36).slice(2, 8)}/`,
  views: 2384,
  type: "Event",
  status: i % 2 ? "Active" : "Paused",
  created: "Sep 19, 2025",
  revenue: 1000 + i * 37,
}));

/* ----------------------------- Helpers ----------------------------- */
type SortKey = "revenue" | "views" | "created" | "name";
type SortDir = "asc" | "desc";

const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

const parseDate = (d: string) => Date.parse(d) || 0;

/* Tiny Twitter glyph matching table size */
function TwitterIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={clsx("opacity-80", className)}
    >
      <path
        fill="currentColor"
        d="M21.5 6.2c-.7.3-1.4.5-2.2.6.8-.5 1.4-1.2 1.7-2.1-.7.4-1.6.8-2.4.9A3.7 3.7 0 0 0 12 8.2c0 .3 0 .7.1 1A10.4 10.4 0 0 1 3.3 5a3.8 3.8 0 0 0 1.2 5 3.6 3.6 0 0 1-1.7-.5v.1c0 1.8 1.3 3.4 3 3.7a3.8 3.8 0 0 1-1.7.1 3.8 3.8 0 0 0 3.5 2.6 7.4 7.4 0 0 1-5.5 1.5A10.4 10.4 0 0 0 8.2 19c6.8 0 10.6-5.8 10.6-10.8v-.5c.7-.5 1.4-1.2 1.7-1.9z"
      />
    </svg>
  );
}

function Chip({
  children,
  color = "primary",
}: {
  children: React.ReactNode;
  color?: "primary" | "success" | "warning";
}) {
  const cls =
    color === "success"
      ? "bg-success-800 text-success-200 ring-1 ring-success-500"
      : color === "warning"
        ? "bg-warning-800 text-warning-200 ring-1 ring-warning-500"
        : "bg-primary-800 text-primary-200 ring-1 ring-primary-500";
  return (
    <span className={clsx("rounded-md px-3 py-1.5 text-[10px]", cls)}>
      {children}
    </span>
  );
}

/* ----------------------------- Component --------------------------- */
export default function TrackingLinksTable() {
  const [sortBy, setSortBy] = useState<SortKey>("revenue");
  const [dir, setDir] = useState<SortDir>("desc");

  const headerSortLabel =
    sortBy === "revenue"
      ? "Revenue"
      : sortBy === "views"
        ? "Views"
        : sortBy === "created"
          ? "Date"
          : "Name";

  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      let A: number | string;
      let B: number | string;

      if (sortBy === "revenue") {
        A = a.revenue;
        B = b.revenue;
      } else if (sortBy === "views") {
        A = a.views;
        B = b.views;
      } else if (sortBy === "created") {
        A = parseDate(a.created);
        B = parseDate(b.created);
      } else {
        A = a.name;
        B = b.name;
      }

      if (typeof A === "number" && typeof B === "number") {
        return dir === "asc" ? A - B : B - A;
      }
      return dir === "asc"
        ? String(A).localeCompare(String(B))
        : String(B).localeCompare(String(A));
    });
    return arr;
  }, [sortBy, dir]);

  const toggleSort = (key: SortKey) => {
    if (key === sortBy) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setDir("desc");
    }
  };

  /* Clamp + fade like MyTeamTable/RecentSalesTable */
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

  const handleCopy = (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  };

  return (
    <div className="relative self-start max-h-[458px] rounded-lg border border-neutral-700 bg-neutral-900 pt-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between px-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-white/80">
          Tracking Links
        </h3>

        <button
          type="button"
          onClick={() =>
            setSortBy((prev) =>
              prev === "revenue"
                ? "views"
                : prev === "views"
                  ? "created"
                  : prev === "created"
                    ? "name"
                    : "revenue"
            )
          }
          title="Change sort column"
          className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/70 hover:bg-white/10"
        >
          {headerSortLabel}
          <ChevronDown size={14} className="opacity-70" />
        </button>
      </div>

      {/* Table */}
      <div
        ref={clipRef}
        className="relative overflow-hidden rounded-lg"
        style={{ height: isClamped ? `${MAX}px` : "auto" }}
      >
        <table className="w-full border-collapse text-xs font-medium leading-tight">
          <thead className="text-neutral-400">
            <tr className="[&>th]:pb-3 [&>th]:pt-1 [&>th]:px-2">
              <th className="text-left font-medium">Name &amp; Link</th>
              <th className="text-left font-medium">QR Code</th>
              <th
                className="text-left font-medium cursor-pointer select-none hover:text-white/80"
                onClick={() => toggleSort("views")}
                aria-sort={
                  sortBy === "views"
                    ? dir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <div className="inline-flex items-center gap-1">
                  Views <Eye size={14} className="opacity-80" />
                </div>
              </th>
              <th className="text-left font-medium">Link Type</th>
              <th className="text-left font-medium">Status</th>
              <th
                className="text-left font-medium cursor-pointer select-none hover:text-white/80"
                onClick={() => toggleSort("created")}
                aria-sort={
                  sortBy === "created"
                    ? dir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                Date Created
              </th>
              <th
                className="text-right font-medium cursor-pointer select-none hover:text-white/80"
                onClick={() => toggleSort("revenue")}
                aria-sort={
                  sortBy === "revenue"
                    ? dir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                Revenue
              </th>
              <th className="w-[64px] text-right font-medium"> </th>
            </tr>
          </thead>

          <tbody className="text-white">
            {sorted.map((r, i) => (
              <tr
                key={r.id}
                className={clsx(
                  "transition-colors",
                  i % 2 === 0 ? "bg-neutral-800" : "bg-transparent"
                )}
              >
                {/* Name & Link */}
                <td className="px-2 py-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{r.name}</div>
                    <div className="mt-1 flex min-w-0 items-center gap-2 text-white/70">
                      <TwitterIcon />
                      <span className="truncate">{r.url}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(r.url)}
                        className="ml-1 inline-flex items-center rounded-sm border border-white/10 p-1 text-white/70 hover:text-white hover:border-white/20"
                        title="Copy link path"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>
                </td>

                {/* QR Code */}
                <td className="px-2 py-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 17 16"
                    fill="none"
                  >
                    <path
                      d="M9.90474 8.66667C10.068 8.66669 10.2256 8.72664 10.3477 8.83514C10.4697 8.94365 10.5476 9.09317 10.5667 9.25533L10.5714 9.33333V13.3333C10.5712 13.5033 10.5062 13.6667 10.3895 13.7902C10.2729 13.9138 10.1134 13.9882 9.94381 13.9981C9.77419 14.0081 9.60716 13.9529 9.47686 13.8438C9.34655 13.7348 9.26281 13.5801 9.24274 13.4113L9.23808 13.3333V9.33333C9.23808 9.15652 9.30832 8.98695 9.43334 8.86193C9.55836 8.73691 9.72793 8.66667 9.90474 8.66667ZM11.9047 11.6667C12.0816 11.6667 12.2511 11.7369 12.3762 11.8619C12.5012 11.987 12.5714 12.1565 12.5714 12.3333V13.3333C12.5714 13.5101 12.5012 13.6797 12.3762 13.8047C12.2511 13.9298 12.0816 14 11.9047 14C11.7279 14 11.5584 13.9298 11.4333 13.8047C11.3083 13.6797 11.2381 13.5101 11.2381 13.3333V12.3333C11.2381 12.1565 11.3083 11.987 11.4333 11.8619C11.5584 11.7369 11.7279 11.6667 11.9047 11.6667ZM13.9047 8.66667C14.068 8.66669 14.2256 8.72664 14.3477 8.83514C14.4697 8.94365 14.5476 9.09317 14.5667 9.25533L14.5714 9.33333V13.3333C14.5712 13.5033 14.5062 13.6667 14.3895 13.7902C14.2729 13.9138 14.1134 13.9882 13.9438 13.9981C13.7742 14.0081 13.6072 13.9529 13.4769 13.8438C13.3466 13.7348 13.2628 13.5801 13.2427 13.4113L13.2381 13.3333V9.33333C13.2381 9.15652 13.3083 8.98695 13.4333 8.86193C13.5584 8.73691 13.7279 8.66667 13.9047 8.66667ZM6.57141 8.66667C6.92503 8.66667 7.26417 8.80714 7.51422 9.05719C7.76427 9.30724 7.90474 9.64638 7.90474 10V12.6667C7.90474 13.0203 7.76427 13.3594 7.51422 13.6095C7.26417 13.8595 6.92503 14 6.57141 14H3.90474C3.55112 14 3.21198 13.8595 2.96194 13.6095C2.71189 13.3594 2.57141 13.0203 2.57141 12.6667V10C2.57141 9.64638 2.71189 9.30724 2.96194 9.05719C3.21198 8.80714 3.55112 8.66667 3.90474 8.66667H6.57141ZM11.9047 8.66667C12.068 8.66669 12.2256 8.72664 12.3477 8.83514C12.4697 8.94365 12.5476 9.09317 12.5667 9.25533L12.5714 9.33333V10.3333C12.5712 10.5033 12.5062 10.6667 12.3895 10.7902C12.2729 10.9138 12.1134 10.9882 11.9438 10.9981C11.7742 11.0081 11.6072 10.9529 11.4769 10.8438C11.3466 10.7348 11.2628 10.5801 11.2427 10.4113L11.2381 10.3333V9.33333C11.2381 9.15652 11.3083 8.98695 11.4333 8.86193C11.5584 8.73691 11.7279 8.66667 11.9047 8.66667ZM6.57141 2C6.92503 2 7.26417 2.14048 7.51422 2.39052C7.76427 2.64057 7.90474 2.97971 7.90474 3.33333V6C7.90474 6.35362 7.76427 6.69276 7.51422 6.94281C7.26417 7.19286 6.92503 7.33333 6.57141 7.33333H3.90474C3.55112 7.33333 3.21198 7.19286 2.96194 6.94281C2.71189 6.69276 2.57141 6.35362 2.57141 6V3.33333C2.57141 2.97971 2.71189 2.64057 2.96194 2.39052C3.21198 2.14048 3.55112 2 3.90474 2H6.57141ZM13.2381 2C13.5917 2 13.9308 2.14048 14.1809 2.39052C14.4309 2.64057 14.5714 2.97971 14.5714 3.33333V6C14.5714 6.35362 14.4309 6.69276 14.1809 6.94281C13.9308 7.19286 13.5917 7.33333 13.2381 7.33333H10.5714C10.2178 7.33333 9.87865 7.19286 9.6286 6.94281C9.37855 6.69276 9.23808 6.35362 9.23808 6V3.33333C9.23808 2.97971 9.37855 2.64057 9.6286 2.39052C9.87865 2.14048 10.2178 2 10.5714 2H13.2381Z"
                      fill="#A7A7BC"
                    />
                  </svg>
                </td>

                {/* Views */}
                <td className="px-2 py-2">
                  <div className="inline-flex items-center gap-1.5">
                    <span className="tabular-nums">{r.views}</span>
                    <Eye size={14} className="opacity-80" aria-hidden />
                  </div>
                </td>

                {/* Link Type */}
                <td className="px-2 py-2">
                  <Chip color="primary">{r.type}</Chip>
                </td>

                {/* Status */}
                <td className="px-2 py-2">
                  {r.status === "Active" ? (
                    <Chip color="success">Active</Chip>
                  ) : r.status === "Paused" ? (
                    <Chip color="warning">Paused</Chip>
                  ) : (
                    <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] text-white/60 ring-1 ring-white/15">
                      Disabled
                    </span>
                  )}
                </td>

                {/* Date */}
                <td className="px-2 py-2">{r.created}</td>

                {/* Revenue */}
                <td className="px-2 py-2 text-right font-medium text-neutral-100">
                  {fmtUsd(r.revenue)}
                </td>

                {/* Actions */}
                <td className="px-2 py-2 text-right">
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      className="rounded-md border border-white/10 p-1.5 text-white/70 hover:text-white hover:border-white/20"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-white/10 p-1.5 text-white/70 hover:text-white hover:border-white/20"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Fade like the other tables */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(0deg,#181828_0%,rgba(24,24,40,0)_100%)]" />
      </div>

      {/* Bottom-right pill */}
      <div className="pointer-events-none absolute inset-x-0 -bottom-2 flex justify-center">
        <Link
          href="/dashboard/tracking"
          className="pointer-events-auto rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm transition hover:bg-white/15"
        >
          See All
        </Link>
      </div>
    </div>
  );
}
