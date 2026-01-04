/* ------------------------------------------------------------------ */
/*  src/components/dashboard/tables/TrackingLinksTable.tsx            */
/* ------------------------------------------------------------------ */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ChevronDown, Pencil, Trash2 } from "lucide-react";
import SortArrowsIcon from "@/components/ui/SortArrowsIcon";

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
  revenue: number; // USD number (kept in data but not displayed)
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
type SortKey = "views" | "created" | "name" | "status";
type SortDir = "asc" | "desc";

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
      ? "bg-success-800 text-success-200 border-1 border-success-500"
      : color === "warning"
        ? "bg-warning-800 text-warning-200 border-1 border-warning-500"
        : "bg-primary-800 text-primary-200 border-1 border-primary-500";
  return (
    <span
      className={clsx(
        "rounded-md px-3 py-1.5 text-[10px] font-semibold leading-[100%] flex items-center justify-center",
        cls
      )}
    >
      {children}
    </span>
  );
}

function statusRank(s: Status) {
  // For consistent sorting
  // Asc: Active < Paused < Disabled
  if (s === "Active") return 1;
  if (s === "Paused") return 2;
  return 3;
}

/* ----------------------------- Component --------------------------- */
export default function TrackingLinksTable() {
  const [sortBy, setSortBy] = useState<SortKey>("views");
  const [dir, setDir] = useState<SortDir>("desc");

  const headerSortLabel =
    sortBy === "views"
      ? "Views"
      : sortBy === "created"
        ? "Date"
        : sortBy === "status"
          ? "Status"
          : "Name";

  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      let A: number | string;
      let B: number | string;

      if (sortBy === "views") {
        A = a.views;
        B = b.views;
      } else if (sortBy === "created") {
        A = parseDate(a.created);
        B = parseDate(b.created);
      } else if (sortBy === "status") {
        A = statusRank(a.status);
        B = statusRank(b.status);
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

  const thRow = "[&>th]:pb-3 [&>th]:pt-1 [&>th]:px-4";
  const thBase =
    "text-left font-semibold cursor-pointer select-none hover:text-white/80";

  return (
    <div className="relative rounded-lg border border-neutral-700 bg-neutral-900 pt-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between px-4">
        <h3 className="font-bold uppercase text-neutral-400">Tracking Links</h3>

        <button
          type="button"
          onClick={() =>
            setSortBy((prev) =>
              prev === "views"
                ? "created"
                : prev === "created"
                  ? "status"
                  : prev === "status"
                    ? "name"
                    : "views"
            )
          }
          title="Change sort column"
          className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-neutral-700 px-2.5 py-1 text-xs text-white/80 outline-none hover:border-primary-500 hover:text-white cursor-pointer"
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
        <table className="w-full border-collapse text-xs font-medium">
          <thead className="text-neutral-400">
            <tr className={thRow}>
              {/* Name */}
              <th
                className={thBase}
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
                  Name &amp; Link
                  <SortArrowsIcon
                    direction={sortBy === "name" ? dir : null}
                    className="ml-2 -translate-y-[1px]"
                  />
                </div>
              </th>

              <th className="text-left font-semibold">QR Code</th>

              {/* Views */}
              <th
                className={thBase}
                onClick={() => toggleSort("views")}
                aria-sort={
                  sortBy === "views"
                    ? dir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <div className="inline-flex items-center">
                  Views
                  <SortArrowsIcon
                    direction={sortBy === "views" ? dir : null}
                    className="ml-2 -translate-y-[1px]"
                  />
                </div>
              </th>

              <th className="text-left font-semibold">Link Type</th>

              {/* Status (sortable now) */}
              <th
                className={thBase}
                onClick={() => toggleSort("status")}
                aria-sort={
                  sortBy === "status"
                    ? dir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <div className="inline-flex items-center">
                  Status
                  <SortArrowsIcon
                    direction={sortBy === "status" ? dir : null}
                    className="ml-2 -translate-y-[1px]"
                  />
                </div>
              </th>

              {/* Created (sortable) */}
              <th
                className={thBase}
                onClick={() => toggleSort("created")}
                aria-sort={
                  sortBy === "created"
                    ? dir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <div className="inline-flex items-center">
                  Date Created
                  <SortArrowsIcon
                    direction={sortBy === "created" ? dir : null}
                    className="ml-2 -translate-y-[1px]"
                  />
                </div>
              </th>

              <th className="w-[64px] text-right font-semibold"> </th>
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
                <td className="px-4 py-3">
                  <div className="min-w-0 flex items-center gap-5">
                    <p className="truncate font-medium text-neutral-200 flex items-center">
                      {r.name}
                    </p>

                    <div className="flex min-w-0 items-center gap-2 text-white/70">
                      <TwitterIcon className="h-5 w-5 opacity-70" />
                      <span className="truncate">{r.url}</span>

                      <button
                        type="button"
                        onClick={() => handleCopy(r.url)}
                        className="ml-1 inline-flex items-center rounded-sm border border-white/10 p-1 text-white/70 hover:text-white hover:border-white/20"
                        title="Copy link path"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M4.6665 6.44469C4.6665 5.97313 4.85383 5.52089 5.18727 5.18745C5.52071 4.85401 5.97295 4.66669 6.4445 4.66669H12.2218C12.4553 4.66669 12.6865 4.71268 12.9022 4.80203C13.118 4.89138 13.314 5.02235 13.4791 5.18745C13.6442 5.35255 13.7751 5.54856 13.8645 5.76428C13.9538 5.97999 13.9998 6.2112 13.9998 6.44469V12.222C13.9998 12.4555 13.9538 12.6867 13.8645 12.9024C13.7751 13.1181 13.6442 13.3142 13.4791 13.4793C13.314 13.6444 13.118 13.7753 12.9022 13.8647C12.6865 13.954 12.4553 14 12.2218 14H6.4445C6.21101 14 5.97981 13.954 5.76409 13.8647C5.54838 13.7753 5.35237 13.6444 5.18727 13.4793C5.02217 13.3142 4.8912 13.1181 4.80185 12.9024C4.71249 12.6867 4.6665 12.4555 4.6665 12.222V6.44469Z"
                            stroke="#727293"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M2.67467 11.158C2.47 11.0417 2.29977 10.8733 2.18127 10.6699C2.06277 10.4665 2.00023 10.2354 2 10V3.33333C2 2.6 2.6 2 3.33333 2H10C10.5 2 10.772 2.25667 11 2.66667"
                            stroke="#727293"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </td>

                {/* QR Code */}
                <td className="px-4 py-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="22"
                    height="22"
                    viewBox="0 0 22 22"
                    fill="none"
                    className="ml-3"
                  >
                    <path
                      d="M12.8333 11.9167C13.0579 11.9167 13.2746 11.9991 13.4423 12.1483C13.6101 12.2975 13.7173 12.5031 13.7436 12.7261L13.75 12.8333V18.3333C13.7497 18.567 13.6603 18.7917 13.4999 18.9616C13.3395 19.1315 13.1203 19.2337 12.8871 19.2474C12.6538 19.2611 12.4242 19.1852 12.245 19.0353C12.0658 18.8853 11.9507 18.6726 11.9231 18.4406L11.9167 18.3333V12.8333C11.9167 12.5902 12.0132 12.3571 12.1852 12.1852C12.3571 12.0132 12.5902 11.9167 12.8333 11.9167ZM15.5833 16.0417C15.8264 16.0417 16.0596 16.1382 16.2315 16.3102C16.4034 16.4821 16.5 16.7152 16.5 16.9583V18.3333C16.5 18.5764 16.4034 18.8096 16.2315 18.9815C16.0596 19.1534 15.8264 19.25 15.5833 19.25C15.3402 19.25 15.1071 19.1534 14.9352 18.9815C14.7632 18.8096 14.6667 18.5764 14.6667 18.3333V16.9583C14.6667 16.7152 14.7632 16.4821 14.9352 16.3102C15.1071 16.1382 15.3402 16.0417 15.5833 16.0417ZM18.3333 11.9167C18.5579 11.9167 18.7746 11.9991 18.9423 12.1483C19.1101 12.2975 19.2173 12.5031 19.2436 12.7261L19.25 12.8333V18.3333C19.2497 18.567 19.1603 18.7917 18.9999 18.9616C18.8395 19.1315 18.6203 19.2337 18.3871 19.2474C18.1538 19.2611 17.9242 19.1852 17.745 19.0353C17.5658 18.8853 17.4507 18.6726 17.4231 18.4406L17.4167 18.3333V12.8333C17.4167 12.5902 17.5132 12.3571 17.6852 12.1852C17.8571 12.0132 18.0902 11.9167 18.3333 11.9167ZM8.25 11.9167C8.73623 11.9167 9.20255 12.1098 9.54636 12.4536C9.89018 12.7975 10.0833 13.2638 10.0833 13.75V17.4167C10.0833 17.9029 9.89018 18.3692 9.54636 18.713C9.20255 19.0568 8.73623 19.25 8.25 19.25H4.58333C4.0971 19.25 3.63079 19.0568 3.28697 18.713C2.94315 18.3692 2.75 17.9029 2.75 17.4167V13.75C2.75 13.2638 2.94315 12.7975 3.28697 12.4536C3.63079 12.1098 4.0971 11.9167 4.58333 11.9167H8.25ZM15.5833 11.9167C15.8079 11.9167 16.0246 11.9991 16.1923 12.1483C16.3601 12.2975 16.4673 12.5031 16.4936 12.7261L16.5 12.8333V14.2083C16.4997 14.442 16.4103 14.6667 16.2499 14.8366C16.0895 15.0065 15.8703 15.1087 15.6371 15.1224C15.4038 15.1361 15.1742 15.0602 14.995 14.9103C14.8158 14.7603 14.7007 14.5476 14.6731 14.3156L14.6667 14.2083V12.8333C14.6667 12.5902 14.7632 12.3571 14.9352 12.1852C15.1071 12.0132 15.3402 11.9167 15.5833 11.9167ZM8.25 2.75C8.73623 2.75 9.20255 2.94315 9.54636 3.28697C9.89018 3.63079 10.0833 4.0971 10.0833 4.58333V8.25C10.0833 8.73623 9.89018 9.20255 9.54636 9.54636C9.20255 9.89018 8.73623 10.0833 8.25 10.0833H4.58333C4.0971 10.0833 3.63079 9.89018 3.28697 9.54636C2.94315 9.20255 2.75 8.73623 2.75 8.25V4.58333C2.75 4.0971 2.94315 3.63079 3.28697 3.28697C3.63079 2.94315 4.0971 2.75 4.58333 2.75H8.25ZM17.4167 2.75C17.9029 2.75 18.3692 2.94315 18.713 3.28697C19.0568 3.63079 19.25 4.0971 19.25 4.58333V8.25C19.25 8.73623 19.0568 9.20255 18.713 9.54636C18.3692 9.89018 17.9029 10.0833 17.4167 10.0833H13.75C13.2638 10.0833 12.7975 9.89018 12.4536 9.54636C12.1098 9.20255 11.9167 8.73623 11.9167 8.25V4.58333C11.9167 4.0971 12.1098 3.63079 12.4536 3.28697C12.7975 2.94315 13.2638 2.75 13.75 2.75H17.4167Z"
                      fill="#A7A7BC"
                    />
                  </svg>
                </td>

                {/* Views */}
                <td className="px-4 py-3">
                  <span className="tabular-nums">{r.views}</span>
                </td>

                {/* Link Type */}
                <td className="px-4 py-3">
                  <div className="inline-block">
                    <Chip color="primary">{r.type}</Chip>
                  </div>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <div className="inline-block">
                    {r.status === "Active" ? (
                      <Chip color="success">Active</Chip>
                    ) : r.status === "Paused" ? (
                      <Chip color="warning">Paused</Chip>
                    ) : (
                      <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] text-white/60 ring-1 ring-white/15">
                        Disabled
                      </span>
                    )}
                  </div>
                </td>

                {/* Date */}
                <td className="px-4 py-3">{r.created}</td>

                {/* Actions */}
                <td className="px-4 py-3 text-right">
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
      <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
        <Link
          href="/dashboard/tracking"
          className="pointer-events-auto rounded-full border border-neutral-500 bg-neutral-700/50 px-3 py-1 text-xs font-medium text-white transition duration-200 hover:border-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          See All
        </Link>
      </div>
    </div>
  );
}
