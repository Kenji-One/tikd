"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import SortArrowsIcon from "@/components/ui/SortArrowsIcon";

export type MemberRow = {
  id: string;
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

const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

const initials = (full: string) =>
  full
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

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
        className="h-8 w-8 shrink-0 rounded-full ring-1 ring-white/10 object-cover"
        loading="lazy"
      />
    );
  }
  return (
    <div
      aria-hidden
      className={clsx(
        "grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-extrabold text-white/90 ring-1 ring-white/10",
        bg ?? "bg-white/10",
      )}
    >
      {(text || initials(name)).slice(0, 2)}
    </div>
  );
}

export default function MyMembersTable({
  title = "My Members",
  members,
  selectedId,
  onSelect,
  className = "",
  maxHeightClass = "max-h-[303px]",
}: {
  title?: string;
  members: MemberRow[];
  selectedId: string;
  onSelect: (id: string) => void;
  className?: string;
  /** Auto height up to this max, then scroll */
  maxHeightClass?: string;
}) {
  const [sortBy, setSortBy] = useState<SortKey>("earned");
  const [dir, setDir] = useState<SortDir>("desc");

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

  const thBase =
    "text-left font-semibold cursor-pointer select-none hover:text-white/80";

  // Cleaner header padding, and we avoid “th looks like a block” by using a subtle glass gradient.
  const thRow = "[&>th]:px-4 [&>th]:py-3";

  const thSticky =
    "sticky top-0 z-10 backdrop-blur-md border-b border-neutral-800/70 " +
    "bg-[linear-gradient(180deg,rgba(18,18,32,0.68)_0%,rgba(18,18,32,0.22)_100%)]";

  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-xl border border-neutral-800/70 bg-neutral-948/70",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background: [
            "radial-gradient(1100px 620px at 0% 0%, rgba(154,70,255,0.22), transparent 58%)",
            "radial-gradient(900px 640px at 100% 20%, rgba(167,115,255,0.10), transparent 62%)",
            "linear-gradient(180deg, rgba(18,18,32,0.72), rgba(8,8,15,0.55))",
          ].join(","),
        }}
      />

      <div className="relative">
        <div className="flex items-center justify-between gap-3 border-b border-neutral-800/70 px-4 py-3">
          <div className="text-base font-bold tracking-[-0.03em] text-neutral-50">
            {title}
          </div>
          <div className="text-[12px] font-semibold text-neutral-400">
            Click a member to view details
          </div>
        </div>

        {/* Horizontal scroll only if needed */}
        <div className="relative w-full overflow-x-auto">
          {/* Auto height, capped by maxHeight; vertical scroll appears only when needed */}
          <div
            className={clsx(
              "min-w-[820px] overflow-y-auto",
              maxHeightClass,
              "tikd-scrollbar",
            )}
            // IMPORTANT: prevents reserved scrollbar space when there is no scrollbar
            style={{ scrollbarGutter: "auto" }}
          >
            <table className="w-full table-fixed border-collapse font-medium leading-tight">
              <colgroup>
                <col style={{ width: "31%" }} />
                <col style={{ width: "23%" }} />
                <col style={{ width: "23%" }} />
                <col style={{ width: "23%" }} />
              </colgroup>

              <thead className="text-neutral-400">
                <tr className={thRow}>
                  <th
                    className={clsx(thBase, thSticky)}
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
                    className={clsx(thBase + " text-center", thSticky)}
                    onClick={() => toggleSort("tickets")}
                    aria-sort={
                      sortBy === "tickets"
                        ? dir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <div className="inline-flex w-full items-center justify-center">
                      Tickets Sold
                      <SortArrowsIcon
                        direction={sortBy === "tickets" ? dir : null}
                        className="ml-2 -translate-y-[1px]"
                      />
                    </div>
                  </th>

                  <th
                    className={clsx(thBase + " text-center", thSticky)}
                    onClick={() => toggleSort("views")}
                    aria-sort={
                      sortBy === "views"
                        ? dir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <div className="inline-flex w-full items-center justify-center">
                      Views
                      <SortArrowsIcon
                        direction={sortBy === "views" ? dir : null}
                        className="ml-2 -translate-y-[1px]"
                      />
                    </div>
                  </th>

                  <th
                    className={clsx(thBase + " text-center", thSticky)}
                    onClick={() => toggleSort("earned")}
                    aria-sort={
                      sortBy === "earned"
                        ? dir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <div className="inline-flex w-full items-center justify-center">
                      Revenue
                      <SortArrowsIcon
                        direction={sortBy === "earned" ? dir : null}
                        className="ml-2 -translate-y-[1px]"
                      />
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody className="text-white">
                {sorted.map((m, i) => {
                  const active = m.id === selectedId;

                  return (
                    <tr
                      key={m.id}
                      onClick={() => onSelect(m.id)}
                      className={clsx(
                        "border-t border-neutral-800/60 cursor-pointer",
                        "transition-[background-color,box-shadow] duration-200",
                        !active &&
                          (i % 2 === 0
                            ? "bg-neutral-950/10"
                            : "bg-transparent"),
                        active
                          ? [
                              // Warmer, lighter gradient (not a full purple slab)
                              "bg-[linear-gradient(90deg,rgba(154,70,255,0.18)_0%,rgba(255,123,69,0.10)_55%,rgba(8,8,15,0.00)_100%)]",
                              "hover:bg-[linear-gradient(90deg,rgba(154,70,255,0.22)_0%,rgba(255,123,69,0.12)_55%,rgba(8,8,15,0.00)_100%)]",
                              // Clear but elegant focus ring
                              "shadow-[inset_0_0_0_1px_rgba(154,70,255,0.30)]",
                            ].join(" ")
                          : "hover:bg-neutral-900/25",
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="relative flex min-w-0 items-center gap-3">
                          {/* Selected row accent bar (warm gradient) */}
                          {active && (
                            <span className="absolute -left-4 top-[-12px] bottom-[-12px] w-[3px] rounded-full bg-[linear-gradient(180deg,rgba(154,70,255,0.95),rgba(255,123,69,0.75))] shadow-[0_0_22px_rgba(154,70,255,0.28)]" />
                          )}

                          <Avatar
                            name={m.name}
                            url={m.avatarUrl}
                            bg={m.avatarBg}
                            text={m.avatarText}
                          />
                          <div className="min-w-0">
                            <div
                              className={clsx(
                                "truncate text-[13px] font-semibold",
                                active ? "text-neutral-0" : "text-neutral-100",
                              )}
                            >
                              {m.name}
                            </div>
                            <div className="mt-1 text-[12px] text-neutral-400">
                              Member ID:{" "}
                              <span className="tabular-nums">{m.id}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div
                          className={clsx(
                            "text-[13px] font-semibold tabular-nums",
                            active ? "text-neutral-0" : "text-neutral-100",
                          )}
                        >
                          {m.tickets.toLocaleString()}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div
                          className={clsx(
                            "text-[13px] font-semibold tabular-nums",
                            active ? "text-neutral-0" : "text-neutral-100",
                          )}
                        >
                          {m.views.toLocaleString()}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="text-[13px] font-extrabold tabular-nums text-success-400">
                          {fmtUsd(m.earned)}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!sorted.length && (
                  <tr className="border-t border-neutral-800/60">
                    <td
                      colSpan={4}
                      className="px-4 py-10 text-center text-[13px] text-neutral-400"
                    >
                      No members found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
