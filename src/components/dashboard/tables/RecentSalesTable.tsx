// src/components/dashboard/tables/RecentSalesTable.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";

import SortArrowsIcon from "@/components/ui/SortArrowsIcon";
import { Button } from "@/components/ui/Button";
import {
  fetchSales,
  type FetchSalesInput,
  type SalesListResponse,
  type SaleRow,
} from "@/lib/api/sales";

type SortKey = "name" | "event" | "date" | "amount";
type SortDir = "asc" | "desc";

type RecentSalesTableProps = {
  scope?: FetchSalesInput["scope"];
  eventId?: string | null;
  orgId?: string | null;
  teamId?: string | null;
  pageSize?: number;
  rows?: SaleRow[];
  loading?: boolean;
  error?: string | null;
  viewAllHref?: string;
  showViewAll?: boolean;
};

const DEFAULT_PAGE_SIZE = 16;
const CLAMP_HEIGHT = 519;

const fmtCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(amount);

function dateToMs(value: string) {
  const ms = Date.parse(String(value || ""));
  return Number.isFinite(ms) ? ms : 0;
}

function formatDateParts(value: string) {
  const ms = dateToMs(value);
  if (!ms) return { date: value, time: "" };

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

function initialsFromName(name: string) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const a = (parts[0]?.[0] ?? "").toUpperCase();
  const b = (parts[1]?.[0] ?? "").toUpperCase();
  const c = (parts[0]?.[1] ?? "").toUpperCase();

  return parts.length >= 2 ? `${a}${b}` : `${a}${c}`.trim() || "NA";
}

function buildDefaultViewAllHref(input: {
  scope: FetchSalesInput["scope"];
  eventId?: string | null;
  orgId?: string | null;
  teamId?: string | null;
}) {
  switch (input.scope) {
    case "event":
      return input.eventId
        ? `/dashboard/events/${encodeURIComponent(input.eventId)}/guests`
        : "/dashboard/sales";
    case "organization":
      return input.orgId
        ? `/dashboard/organizations/${encodeURIComponent(input.orgId)}/sales`
        : "/dashboard/sales";
    case "team":
      return input.teamId
        ? `/dashboard/teams/${encodeURIComponent(input.teamId)}/sales`
        : "/dashboard/sales";
    case "global":
    default:
      return "/dashboard/sales";
  }
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
    className || "h-8 w-8 rounded-full object-cover ring-1 ring-white/10";

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        className={cls}
        onError={(e) => {
          e.currentTarget.style.display = "none";
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

function AvatarOnly({ name, src }: { name: string; src?: string | null }) {
  return (
    <div className="relative h-9 w-9 shrink-0">
      <CircularAvatar
        name={name}
        src={src}
        className="h-9 w-9 rounded-full object-cover ring-1 ring-white/10"
      />
    </div>
  );
}

function PosterThumb({ alt, src }: { alt: string; src?: string | null }) {
  if (!src) {
    return (
      <div
        aria-hidden
        className="h-7 w-7 rounded-md bg-white/10 ring-1 ring-white/10 transition-[box-shadow] duration-150 group-hover:ring-primary-500/70"
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      className="h-7 w-7 rounded-md object-cover ring-1 ring-white/10 transition-[box-shadow] duration-150 group-hover:ring-primary-500/70"
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  );
}

function MobileStat({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
      <div className="text-[11px] font-medium text-neutral-400">{label}</div>
      <div
        className={clsx(
          "mt-1 text-sm font-extrabold leading-tight text-white",
          valueClassName,
        )}
      >
        {value}
      </div>
    </div>
  );
}

function EventLink({ sale }: { sale: SaleRow }) {
  const href = sale.event.id
    ? `/dashboard/events/${encodeURIComponent(sale.event.id)}`
    : null;

  if (!href) {
    return (
      <div className="group flex min-w-0 items-center gap-2">
        <PosterThumb alt={sale.event.title} src={sale.event.imageUrl} />
        <span
          className="min-w-0 truncate text-white/90"
          title={sale.event.title}
        >
          {sale.event.title}
        </span>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={clsx(
        "group flex min-w-0 items-center gap-2 rounded-md outline-none",
        "focus-visible:ring-2 focus-visible:ring-primary-500/35",
      )}
      title={`Open "${sale.event.title}" dashboard`}
      aria-label={`Open ${sale.event.title} dashboard`}
    >
      <PosterThumb alt={sale.event.title} src={sale.event.imageUrl} />
      <span
        className={clsx(
          "min-w-0 truncate text-white/90",
          "group-hover:text-white group-hover:underline group-hover:decoration-primary-500",
          "underline-offset-2",
        )}
        title={sale.event.title}
      >
        {sale.event.title}
      </span>
    </Link>
  );
}

export default function RecentSalesTable({
  scope = "global",
  eventId = null,
  orgId = null,
  teamId = null,
  pageSize = DEFAULT_PAGE_SIZE,
  rows,
  loading,
  error,
  viewAllHref,
  showViewAll = true,
}: RecentSalesTableProps) {
  const router = useRouter();

  const clipRef = useRef<HTMLDivElement | null>(null);
  const [isClamped, setIsClamped] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [dir, setDir] = useState<SortDir>("desc");

  const liveQuery = useQuery<SalesListResponse>({
    queryKey: ["recent-sales-widget", scope, eventId, orgId, teamId, pageSize],
    enabled: rows == null,
    queryFn: () =>
      fetchSales({
        scope,
        eventId,
        orgId,
        teamId,
        status: "paid",
        page: 1,
        pageSize,
        sortBy: "createdAt",
        sortDir: "desc",
      }),
    staleTime: 30_000,
  });

  const baseRows = rows ?? liveQuery.data?.rows ?? [];
  const isLoading = loading ?? liveQuery.isLoading;
  const errorMessage =
    error ??
    (liveQuery.error instanceof Error ? liveQuery.error.message : null);

  const toggleSort = (key: SortKey) => {
    if (key === sortBy) {
      setDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortBy(key);
    setDir(key === "name" || key === "event" ? "asc" : "desc");
  };

  const sorted = useMemo(() => {
    const arr = [...baseRows];

    arr.sort((a, b) => {
      let cmp = 0;

      switch (sortBy) {
        case "name":
          cmp = a.buyer.name.localeCompare(b.buyer.name);
          break;
        case "event":
          cmp = a.event.title.localeCompare(b.event.title);
          break;
        case "date":
          cmp = dateToMs(a.createdAt) - dateToMs(b.createdAt);
          break;
        case "amount":
          cmp = a.amount - b.amount;
          break;
      }

      return dir === "asc" ? cmp : -cmp;
    });

    return arr;
  }, [baseRows, dir, sortBy]);

  useEffect(() => {
    if (!clipRef.current) return;
    const el = clipRef.current;
    const recompute = () => setIsClamped(el.scrollHeight > CLAMP_HEIGHT + 0.5);

    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    window.addEventListener("resize", recompute);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, [sorted.length, isLoading, errorMessage]);

  const actualViewAllHref =
    viewAllHref || buildDefaultViewAllHref({ scope, eventId, orgId, teamId });

  const separatorLine =
    "bg-[linear-gradient(90deg,rgba(154,70,255,0)_0%,rgba(154,70,255,0.18)_30%,rgba(255,255,255,0.08)_50%,rgba(154,70,255,0.18)_70%,rgba(154,70,255,0)_100%)]";
  const thRow = "[&>th]:pb-3 [&>th]:pt-1";
  const thBase =
    "text-left font-semibold cursor-pointer select-none hover:text-white/80";
  const thBaseRight =
    "text-right font-semibold cursor-pointer select-none hover:text-white/80";
  const thNamePad = "pl-4 pr-2";
  const thEventPad = "pl-2 pr-4";
  const thOtherPad = "px-4";
  const tdNamePad = "pl-4 pr-2";
  const tdEventPad = "pl-2 pr-4";
  const tdOtherPad = "px-4";

  return (
    <div className="relative overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 pt-3">
      <div className="mb-2 flex items-center justify-between border-b border-neutral-700 px-4 pb-3">
        <h3 className="font-bold uppercase text-neutral-400">Recent Sales</h3>

        <button
          type="button"
          onClick={() => toggleSort(sortBy)}
          className="sm:hidden inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-white/75 transition hover:bg-white/[0.05] hover:text-white"
          aria-label={`Toggle ${sortBy} sort direction`}
        >
          <span>Sort</span>
          <SortArrowsIcon direction={dir} className="-translate-y-[1px]" />
        </button>
      </div>

      <div
        ref={clipRef}
        className="relative overflow-hidden rounded-lg"
        style={{ height: isClamped ? `${CLAMP_HEIGHT}px` : "auto" }}
      >
        <div className="sm:hidden px-3 pb-1">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="mb-3 h-[148px] animate-pulse rounded-2xl border border-white/8 bg-white/[0.02]"
              />
            ))
          ) : errorMessage ? (
            <div className="rounded-2xl border border-dashed border-error-500/30 bg-error-500/5 p-8 text-center">
              <p className="text-sm font-medium text-neutral-0">
                Failed to load recent sales.
              </p>
              <p className="mt-2 text-[12px] leading-5 text-neutral-400">
                {errorMessage}
              </p>
            </div>
          ) : sorted.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-transparent p-8 text-center">
              <p className="text-sm font-medium text-neutral-0">
                No sales found.
              </p>
              <p className="mt-2 text-[12px] leading-5 text-neutral-400">
                Recent sales will appear here once orders start coming in.
              </p>
            </div>
          ) : (
            sorted.map((sale, index) => {
              const isLast = index === sorted.length - 1;
              const dt = formatDateParts(sale.createdAt);

              return (
                <div key={sale.id}>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-3.5 py-3.5">
                    <div className="flex items-start gap-3">
                      <AvatarOnly
                        name={sale.buyer.name}
                        src={sale.buyer.imageUrl}
                      />

                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="truncate text-sm font-semibold text-white">
                          {sale.buyer.name}
                        </div>

                        <div className="mt-2">
                          <EventLink sale={sale} />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <MobileStat label="Date" value={dt.date} />
                      <MobileStat label="Time" value={dt.time || "—"} />
                      <div className="col-span-2">
                        <MobileStat
                          label="Amount"
                          value={fmtCurrency(sale.amount, sale.currency)}
                          valueClassName="text-success-500"
                        />
                      </div>
                    </div>
                  </div>

                  {!isLast ? (
                    <div
                      aria-hidden
                      className={clsx("mx-1 my-2 h-px", separatorLine)}
                    />
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        <table className="hidden sm:table w-full border-collapse text-xs font-medium leading-tight">
          <thead className="text-neutral-400">
            <tr className={thRow}>
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
            {isLoading ? (
              Array.from({ length: 6 }).flatMap((_, index) => {
                const row = (
                  <tr
                    key={`loading-${index}`}
                    className={
                      index % 2 === 0 ? "bg-neutral-948" : "bg-neutral-900"
                    }
                  >
                    <td colSpan={4} className="px-4 py-4">
                      <div className="h-10 animate-pulse rounded-xl bg-white/5" />
                    </td>
                  </tr>
                );

                const separator =
                  index < 5 ? (
                    <tr
                      key={`loading-sep-${index}`}
                      aria-hidden
                      className="bg-neutral-900"
                    >
                      <td colSpan={4} className="p-0">
                        <div className={clsx("mx-4 h-px", separatorLine)} />
                      </td>
                    </tr>
                  ) : null;

                return separator ? [row, separator] : [row];
              })
            ) : errorMessage ? (
              <tr>
                <td colSpan={4} className="px-4 py-10">
                  <div className="rounded-2xl border border-dashed border-error-500/30 bg-error-500/5 p-8 text-center">
                    <p className="text-sm font-medium text-neutral-0">
                      Failed to load recent sales.
                    </p>
                    <p className="mt-2 text-[12px] text-neutral-400">
                      {errorMessage}
                    </p>
                  </div>
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10">
                  <div className="rounded-2xl border border-dashed border-white/15 bg-transparent p-10 text-center">
                    <p className="text-sm font-medium text-neutral-0">
                      No sales found.
                    </p>
                    <p className="mt-2 text-[12px] text-neutral-400">
                      Recent sales will appear here once orders start coming in.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              sorted.flatMap((sale, index) => {
                const isLast = index === sorted.length - 1;
                const rowBg =
                  index % 2 === 0 ? "bg-neutral-948" : "bg-neutral-900";
                const dt = formatDateParts(sale.createdAt);

                const dataRow = (
                  <tr
                    key={sale.id}
                    className={clsx("transition-colors", rowBg)}
                  >
                    <td className={clsx(tdNamePad, "py-2.5 align-middle")}>
                      <div className="flex min-w-0 items-center gap-2.5">
                        <AvatarOnly
                          name={sale.buyer.name}
                          src={sale.buyer.imageUrl}
                        />
                        <span
                          className="min-w-0 truncate"
                          title={sale.buyer.name}
                        >
                          {sale.buyer.name}
                        </span>
                      </div>
                    </td>

                    <td className={clsx(tdEventPad, "py-2.5 align-middle")}>
                      <EventLink sale={sale} />
                    </td>

                    <td className={clsx(tdOtherPad, "py-2.5 align-middle")}>
                      <div className="flex flex-col leading-tight">
                        <span className="text-white/90">{dt.date}</span>
                        <span className="text-[11px] text-neutral-400">
                          {dt.time || "—"}
                        </span>
                      </div>
                    </td>

                    <td
                      className={clsx(
                        tdOtherPad,
                        "py-2.5 align-middle text-right font-medium text-success-500",
                      )}
                    >
                      <span className="mr-3">
                        {fmtCurrency(sale.amount, sale.currency)}
                      </span>
                    </td>
                  </tr>
                );

                const separatorRow = !isLast ? (
                  <tr
                    key={`${sale.id}-sep`}
                    aria-hidden
                    className="bg-neutral-900"
                  >
                    <td colSpan={4} className="p-0">
                      <div className={clsx("mx-4 h-px", separatorLine)} />
                    </td>
                  </tr>
                ) : null;

                return separatorRow ? [dataRow, separatorRow] : [dataRow];
              })
            )}
          </tbody>
        </table>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(0deg,#181828_0%,rgba(24,24,40,0)_100%)]" />
      </div>

      {showViewAll ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-1 flex justify-center">
          <div className="pointer-events-auto">
            <Button
              type="button"
              onClick={() => router.push(actualViewAllHref)}
              variant="viewAction"
              size="sm"
            >
              View All
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
