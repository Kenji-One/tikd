/* ------------------------------------------------------------------ */
/*  src/components/dashboard/tables/MyTeamTable.tsx                   */
/*  Tikd Dashboard – My Team (uses RecentSalesTable sizing/colors)    */
/* ------------------------------------------------------------------ */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Eye, ChevronDown } from "lucide-react";

/* ------------------------------ Types ------------------------------ */
export type TeamMember = {
  id?: string;
  name: string;
  avatarUrl?: string | null;
  avatarBg?: string;
  avatarText?: string;
  tickets: number;
  views: number;
  earned: number; // USD
};

type SortKey = "earned" | "tickets" | "views" | "name";
type SortDir = "asc" | "desc";

type Props = {
  title?: string;
  members: TeamMember[];
  defaultSortBy?: SortKey;
  defaultDirection?: SortDir;
  onDetailedView?: () => void;
  className?: string;
};

/* --------------------------- Utilities ----------------------------- */
const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

const initials = (full: string) =>
  full
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

function TicketIcon({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={clsx("opacity-80", className)}
    >
      <path
        fill="currentColor"
        d="M5 6a2 2 0 0 1 2-2h7l4 4v3a2 2 0 1 0 0 4v3l-4 4H7a2 2 0 0 1-2-2V6z"
      />
    </svg>
  );
}

/* ----------------------------- UI --------------------------------- */
function Avatar({
  name,
  url,
  bg,
  text,
}: {
  name: string;
  url?: string | null;
  bg?: string;
  text?: string;
}) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="h-5 w-5 shrink-0 rounded-sm ring-1 ring-white/10 object-cover"
        loading="lazy"
      />
    );
  }
  return (
    <div
      aria-hidden
      className={clsx(
        "grid h-5 w-5 shrink-0 place-items-center rounded-sm text-[10px] font-semibold text-white/90 ring-1 ring-white/10",
        bg ?? "bg-white/10"
      )}
    >
      {(text || initials(name)).slice(0, 2)}
    </div>
  );
}

/* ---------------------------- Component ---------------------------- */
export default function MyTeamTable({
  title = "My Team",
  members,
  defaultSortBy = "earned",
  defaultDirection = "desc",
  onDetailedView,
  className = "",
}: Props) {
  const [sortBy, setSortBy] = useState<SortKey>(defaultSortBy);
  const [dir, setDir] = useState<SortDir>(defaultDirection);

  const sorted = useMemo(() => {
    const arr = [...members];
    arr.sort((a, b) => {
      const A = a[sortBy];
      const B = b[sortBy];
      if (typeof A === "number" && typeof B === "number") {
        return dir === "asc" ? A - B : B - A;
      }
      return dir === "asc"
        ? String(A).localeCompare(String(B))
        : String(B).localeCompare(String(A));
    });
    return arr;
  }, [members, sortBy, dir]);

  const toggleSort = (key: SortKey) => {
    if (key === sortBy) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setDir("desc");
    }
  };

  const headerSortLabel =
    sortBy === "earned"
      ? "Revenue"
      : sortBy === "tickets"
        ? "Tickets"
        : sortBy === "views"
          ? "Views"
          : "Name";

  /* Clamp + fade like RecentSalesTable */
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
    <div
      className={clsx(
        "relative self-start max-h-[458px] rounded-lg border border-neutral-700 bg-neutral-900 pt-4",
        className
      )}
    >
      {/* Header (keep your design, adopt font sizing/colors) */}
      <div className="mb-3 flex items-center justify-between px-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-white/80">
          {title}
        </h3>

        <button
          type="button"
          onClick={() =>
            setSortBy((prev) =>
              prev === "earned"
                ? "tickets"
                : prev === "tickets"
                  ? "views"
                  : prev === "views"
                    ? "name"
                    : "earned"
            )
          }
          title="Change sort column"
          className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/70 hover:bg-white/10"
        >
          {headerSortLabel}
          <ChevronDown size={14} className="opacity-70" />
        </button>
      </div>

      {/* Table (same paddings/sizing/colors as RecentSalesTable) */}
      <div
        ref={clipRef}
        className="relative overflow-hidden rounded-lg"
        style={{ height: isClamped ? `${MAX}px` : "auto" }}
      >
        <table className="w-full border-collapse text-xs font-medium leading-tight">
          <thead className="text-neutral-400">
            <tr className="[&>th]:pb-3 [&>th]:pt-1 [&>th]:px-2">
              <th className="text-left font-medium">Member</th>
              <th
                className="text-left font-medium cursor-pointer select-none hover:text-white/80"
                onClick={() => toggleSort("tickets")}
                aria-sort={
                  sortBy === "tickets"
                    ? dir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <div className="inline-flex items-center gap-1">
                  Tickets Sold <TicketIcon />
                </div>
              </th>
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
              <th
                className="text-right font-medium cursor-pointer select-none hover:text-white/80"
                onClick={() => toggleSort("earned")}
                aria-sort={
                  sortBy === "earned"
                    ? dir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                Earned
              </th>
            </tr>
          </thead>

          <tbody className="text-white">
            {sorted.map((m, i) => (
              <tr
                key={m.id ?? m.name}
                className={clsx(
                  "",
                  i % 2 === 0 ? "bg-neutral-800" : "bg-transparent"
                )}
              >
                {/* Member */}
                <td className="px-2 py-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <Avatar
                      name={m.name}
                      url={m.avatarUrl}
                      bg={m.avatarBg}
                      text={m.avatarText}
                    />
                    <span className="truncate" title={m.name}>
                      {m.name}
                    </span>
                  </div>
                </td>

                {/* Tickets */}
                <td className="px-2 py-2">
                  <div className="inline-flex items-center gap-1.5">
                    <span className="tabular-nums">{m.tickets}</span>
                    <TicketIcon />
                  </div>
                </td>

                {/* Views */}
                <td className="px-2 py-2">
                  <div className="inline-flex items-center gap-1.5">
                    <span className="tabular-nums">{m.views}</span>
                    <Eye size={14} className="opacity-80" aria-hidden />
                  </div>
                </td>

                {/* Earned */}
                <td className="px-2 py-2 text-right font-medium text-success-500">
                  {fmtUsd(m.earned)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Same fade as RecentSalesTable */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(0deg,#181828_0%,rgba(24,24,40,0)_100%)]" />
      </div>

      {/* Keep your bottom-right pill */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
        <button
          type="button"
          onClick={onDetailedView}
          className="pointer-events-auto rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm transition hover:bg-white/15"
        >
          Detailed View
        </button>
      </div>
    </div>
  );
}

/* --------------------- Demo data (optional) ---------------------- */
export const DEMO_MY_TEAM: TeamMember[] = [
  {
    name: "Stephanie Nicol",
    tickets: 9,
    views: 98,
    earned: 510.17,
    avatarText: "SN",
  },
  {
    name: "Dennis Callis",
    tickets: 9,
    views: 98,
    earned: 7678.6,
    avatarText: "DC",
  },
  {
    name: "Daniel Hamilton",
    tickets: 9,
    views: 98,
    earned: 4668.37,
    avatarText: "DH",
  },
  {
    name: "John Dukes",
    tickets: 9,
    views: 98,
    earned: 2348.89,
    avatarText: "JD",
  },
  {
    name: "Paula Mora",
    tickets: 9,
    views: 98,
    earned: 6806.81,
    avatarText: "PM",
  },
];
