/* ------------------------------------------------------------------ */
/*  src/components/dashboard/tables/MyTeamTable.tsx                    */
/* ------------------------------------------------------------------ */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Eye, ChevronDown } from "lucide-react";
import SortArrowsIcon from "@/components/ui/SortArrowsIcon";

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
  const MAX = 383;

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

  const thBase =
    "text-left font-semibold cursor-pointer select-none hover:text-white/80";
  const thRow = "[&>th]:pb-3 [&>th]:pt-1 [&>th]:px-4";

  return (
    <div
      className={clsx(
        "relative rounded-lg border border-neutral-700 bg-neutral-900 pt-3",
        className
      )}
    >
      {/* Header */}
      <div className="mb-2 pb-3 border-b border-neutral-700 flex items-center justify-between px-4">
        <h3 className="font-bold uppercase text-neutral-400">{title}</h3>
      </div>

      {/* Table */}
      <div
        ref={clipRef}
        className="relative overflow-hidden rounded-lg"
        style={{ maxHeight: `${MAX}px` }}
      >
        <table className="w-full border-collapse text-xs font-medium">
          <thead className="text-neutral-400">
            <tr className={thRow}>
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
                  Member
                  <SortArrowsIcon
                    direction={sortBy === "name" ? dir : null}
                    className="ml-2 -translate-y-[1px]"
                  />
                </div>
              </th>

              <th
                className={thBase + " text-right"}
                onClick={() => toggleSort("tickets")}
                aria-sort={
                  sortBy === "tickets"
                    ? dir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <div className="inline-flex items-center">
                  Tickets Sold
                  <SortArrowsIcon
                    direction={sortBy === "tickets" ? dir : null}
                    className="ml-2 -translate-y-[1px]"
                  />
                </div>
              </th>

              <th
                className={thBase + " text-right"}
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
                <div className="inline-flex items-center justify-end">
                  Earned
                  <SortArrowsIcon
                    direction={sortBy === "earned" ? dir : null}
                    className="ml-2 -translate-y-[1px]"
                  />
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="text-white">
            {sorted.map((m, i) => (
              <tr
                key={m.id ?? m.name}
                className={clsx(
                  i % 2 === 0 ? "bg-neutral-800" : "bg-transparent"
                )}
              >
                {/* Member */}
                <td className="px-4 py-2">
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
                <td className="px-4 py-2 text-right">
                  <div className="inline-flex items-center gap-1.5 mr-5">
                    <span className="tabular-nums">{m.tickets}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M7.00413 9.5015L7.00713 8.5C7.00713 8.36706 7.05994 8.23957 7.15394 8.14556C7.24794 8.05156 7.37544 7.99875 7.50838 7.99875C7.64132 7.99875 7.76881 8.05156 7.86281 8.14556C7.95682 8.23957 8.00963 8.36706 8.00963 8.5V9.4885C8.00963 9.729 8.00963 9.8495 8.08663 9.9235C8.16413 9.997 8.28163 9.992 8.51813 9.982C9.44963 9.9425 10.0221 9.817 10.4251 9.414C10.8301 9.011 10.9556 8.4385 10.9951 7.5055C11.0026 7.3205 11.0066 7.2275 10.9721 7.166C10.9371 7.1045 10.7996 7.0275 10.5236 6.873C10.3682 6.78633 10.2387 6.65971 10.1485 6.50624C10.0584 6.35276 10.0108 6.17799 10.0108 6C10.0108 5.82201 10.0584 5.64724 10.1485 5.49376C10.2387 5.34029 10.3682 5.21367 10.5236 5.127C10.7996 4.973 10.9376 4.8955 10.9721 4.834C11.0066 4.7725 11.0026 4.68 10.9946 4.4945C10.9556 3.5615 10.8296 2.9895 10.4251 2.586C9.98663 2.148 9.34763 2.0375 8.26413 2.0095C8.23095 2.00863 8.19794 2.01442 8.16703 2.02652C8.13613 2.03862 8.10796 2.05678 8.08419 2.07995C8.06043 2.10311 8.04154 2.1308 8.02865 2.16138C8.01575 2.19196 8.00912 2.22481 8.00913 2.258V3.5C8.00913 3.63294 7.95632 3.76043 7.86232 3.85444C7.76831 3.94844 7.64082 4.00125 7.50788 4.00125C7.37494 4.00125 7.24744 3.94844 7.15344 3.85444C7.05944 3.76043 7.00663 3.63294 7.00663 3.5L7.00313 2.2495C7.003 2.18328 6.9766 2.11982 6.92973 2.07305C6.88286 2.02627 6.81934 2 6.75313 2H4.99713C3.10713 2 2.16213 2 1.57463 2.586C1.16963 2.989 1.04413 3.5615 1.00463 4.4945C0.997127 4.6795 0.993127 4.7725 1.02763 4.834C1.06263 4.8955 1.20013 4.973 1.47613 5.127C1.63159 5.21367 1.7611 5.34029 1.85125 5.49376C1.9414 5.64724 1.98893 5.82201 1.98893 6C1.98893 6.17799 1.9414 6.35276 1.85125 6.50624C1.7611 6.65971 1.63159 6.78633 1.47613 6.873C1.20013 7.0275 1.06213 7.1045 1.02763 7.166C0.993127 7.2275 0.997127 7.32 1.00513 7.505C1.04413 8.4385 1.17013 9.011 1.57463 9.414C2.16213 10 3.10713 10 4.99763 10H6.50263C6.73863 10 6.85613 10 6.92963 9.927C7.00313 9.854 7.00363 9.737 7.00413 9.5015ZM8.00913 6.5V5.5C8.00913 5.36706 7.95632 5.23957 7.86232 5.14556C7.76831 5.05156 7.64082 4.99875 7.50788 4.99875C7.37494 4.99875 7.24744 5.05156 7.15344 5.14556C7.05944 5.23957 7.00663 5.36706 7.00663 5.5V6.5C7.00663 6.63301 7.05946 6.76056 7.15351 6.85461C7.24756 6.94866 7.37512 7.0015 7.50813 7.0015C7.64113 7.0015 7.76869 6.94866 7.86274 6.85461C7.95679 6.76056 8.00913 6.63301 8.00913 6.5Z"
                        fill="#A7A7BC"
                      />
                    </svg>
                  </div>
                </td>

                {/* Views */}
                <td className="px-4 py-2 text-right">
                  <div className="inline-flex items-center gap-1.5 mr-1">
                    <span className="tabular-nums">{m.views}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M10.8749 6.00001L11.1862 5.84401V5.84251L11.1839 5.84026L11.1794 5.83126L11.1637 5.80126L11.1037 5.69326C11.0304 5.56696 10.9526 5.44338 10.8704 5.32276C10.596 4.91997 10.2806 4.54673 9.92916 4.20901C9.08467 3.39901 7.78491 2.57251 5.99992 2.57251C4.21642 2.57251 2.91592 3.39826 2.07142 4.20901C1.72001 4.54673 1.40457 4.91997 1.13017 5.32276C1.01882 5.48704 0.915692 5.65675 0.821166 5.83126L0.816666 5.84026L0.815166 5.84251V5.84326C0.815166 5.84326 0.814416 5.84401 1.12567 6.00001L0.814416 5.84326C0.790351 5.89188 0.777832 5.94539 0.777832 5.99963C0.777832 6.05388 0.790351 6.10739 0.814416 6.15601L0.813666 6.15751L0.815916 6.15976L0.820416 6.16876C0.843802 6.21562 0.868817 6.26165 0.895416 6.30676C1.21836 6.85232 1.61343 7.35182 2.06992 7.79176C2.91517 8.60176 4.21492 9.42676 5.99992 9.42676C7.78416 9.42676 9.08466 8.60176 9.92991 7.79101C10.2807 7.45289 10.5958 7.07969 10.8704 6.67726C10.9756 6.52242 11.0734 6.36275 11.1637 6.19876L11.1794 6.16876L11.1839 6.15976L11.1854 6.15751V6.15676C11.1854 6.15676 11.1862 6.15601 10.8749 6.00001ZM10.8749 6.00001L11.1862 6.15676C11.2102 6.10814 11.2227 6.05463 11.2227 6.00038C11.2227 5.94614 11.2102 5.89262 11.1862 5.84401L10.8749 6.00001ZM5.95492 4.84801C5.64939 4.84801 5.35637 4.96938 5.14033 5.18542C4.92429 5.40146 4.80292 5.69448 4.80292 6.00001C4.80292 6.30554 4.92429 6.59855 5.14033 6.8146C5.35637 7.03064 5.64939 7.15201 5.95492 7.15201C6.26044 7.15201 6.55346 7.03064 6.7695 6.8146C6.98554 6.59855 7.10691 6.30554 7.10691 6.00001C7.10691 5.69448 6.98554 5.40146 6.7695 5.18542C6.55346 4.96938 6.26044 4.84801 5.95492 4.84801ZM4.10842 6.00001C4.10842 5.50989 4.30311 5.03984 4.64968 4.69328C4.99625 4.34671 5.4663 4.15201 5.95642 4.15201C6.44654 4.15201 6.91658 4.34671 7.26315 4.69328C7.60972 5.03984 7.80442 5.50989 7.80442 6.00001C7.80442 6.49013 7.60972 6.96018 7.26315 7.30674C6.91658 7.65331 6.44654 7.84801 5.95642 7.84801C5.4663 7.84801 4.99625 7.65331 4.64968 7.30674C4.30311 6.96018 4.10842 6.49013 4.10842 6.00001Z"
                        fill="#A7A7BC"
                      />
                    </svg>
                  </div>
                </td>

                {/* Earned */}
                <td className="px-4 py-2 text-right font-medium text-success-500">
                  {fmtUsd(m.earned)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Fade */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(0deg,#181828_0%,rgba(24,24,40,0)_100%)]" />
      </div>

      {/* Bottom pill */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
        <button
          type="button"
          onClick={onDetailedView}
          className="pointer-events-auto rounded-full border border-neutral-500 bg-neutral-700 px-3 py-2 text-xs font-medium text-white transition duration-200 hover:border-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
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
    name: "Jake Mora",
    tickets: 900,
    views: 980,
    earned: 16806.81,
    avatarText: "JM",
  },
  {
    name: "Mike Tyson",
    tickets: 9,
    views: 98,
    earned: 6806.81,
    avatarText: "MT",
  },
  {
    name: "Paul Moraga",
    tickets: 19,
    views: 98,
    earned: 8806.81,
    avatarText: "PM",
  },
  {
    name: "Paula Kora",
    tickets: 9,
    views: 98,
    earned: 4806.81,
    avatarText: "PK",
  },
  {
    name: "Thousend Kora",
    tickets: 9,
    views: 98,
    earned: 4806.81,
    avatarText: "TK",
  },
  {
    name: "Morgan Foden",
    tickets: 9,
    views: 98,
    earned: 4806.81,
    avatarText: "MF",
  },
];
