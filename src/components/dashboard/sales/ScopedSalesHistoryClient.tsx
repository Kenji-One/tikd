// src/components/dashboard/sales/ScopedSalesHistoryClient.tsx
"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownNarrowWide,
  ArrowDownWideNarrow,
  ChevronRight,
  Filter,
  Search,
} from "lucide-react";

import DateRangePicker, {
  type DateRangeValue,
} from "@/components/ui/DateRangePicker";
import {
  fetchSales,
  type FetchSalesInput,
  type SaleOrderStatus,
  type SaleRow,
  type SalesListResponse,
  type SalesSortDir,
} from "@/lib/api/sales";

type SortField = "id" | "name" | "event" | "date" | "amount" | "status";
type SortDir = SalesSortDir;

type ScopedSalesHistoryClientProps = {
  scope: FetchSalesInput["scope"];
  eventId?: string | null;
  orgId?: string | null;
  teamId?: string | null;
  title?: string;
  subtitle?: string;
};

const SORT_FIELDS: { key: SortField; label: string }[] = [
  { key: "id", label: "#" },
  { key: "name", label: "Name" },
  { key: "event", label: "Event" },
  { key: "date", label: "Date" },
  { key: "amount", label: "Amount" },
  { key: "status", label: "Status" },
];

const STATUS_OPTIONS: Array<{
  key: "all" | SaleOrderStatus;
  label: string;
}> = [
  { key: "all", label: "All statuses" },
  { key: "paid", label: "Completed" },
  { key: "pending", label: "Pending" },
  { key: "refunded", label: "Refunded" },
  { key: "cancelled", label: "Cancelled" },
  { key: "expired", label: "Expired" },
];

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

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
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

function eventDashboardHref(sale: SaleRow) {
  return sale.event.id
    ? `/dashboard/events/${encodeURIComponent(sale.event.id)}`
    : "#";
}

function statusPill(status: SaleOrderStatus) {
  switch (status) {
    case "paid":
      return clsx(
        "border-success-500/18 text-success-200",
        "bg-success-900/26",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
      );
    case "pending":
      return clsx(
        "border-warning-500/18 text-warning-200",
        "bg-warning-900/22",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
      );
    case "refunded":
      return clsx(
        "border-primary-500/18 text-primary-200",
        "bg-primary-900/20",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
      );
    case "expired":
      return clsx(
        "border-neutral-500/18 text-neutral-200",
        "bg-neutral-800/55",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
      );
    case "cancelled":
      return clsx(
        "border-error-500/18 text-error-200",
        "bg-error-900/22",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
      );
    default:
      return "bg-white/8 text-white/80 border-white/10";
  }
}

function toApiSort(
  field: SortField | null,
): "createdAt" | "amount" | "buyerName" | "eventTitle" | "status" {
  switch (field) {
    case "amount":
      return "amount";
    case "name":
      return "buyerName";
    case "event":
      return "eventTitle";
    case "status":
      return "status";
    case "id":
    case "date":
    default:
      return "createdAt";
  }
}

function SortControls({
  options,
  sortField,
  sortDir,
  setSortField,
  setSortDir,
  defaultDirFor,
  dropdownWidthClass = "w-[220px]",
}: {
  options: { key: SortField; label: string }[];
  sortField: SortField | null;
  sortDir: SortDir;
  setSortField: (v: SortField | null) => void;
  setSortDir: (v: SortDir) => void;
  defaultDirFor: (f: SortField) => SortDir;
  dropdownWidthClass?: string;
}) {
  const [open, setOpen] = useState(false);

  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const sortLabel = useMemo(() => {
    if (!sortField) return "";
    return options.find((o) => o.key === sortField)?.label ?? "Sort";
  }, [options, sortField]);

  const [pos, setPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  const inferWidthFallback = useCallback(() => {
    const m = /w-\[(\d+)px\]/.exec(dropdownWidthClass);
    const n = m?.[1] ? Number(m[1]) : Number.NaN;
    return Number.isFinite(n) ? n : 220;
  }, [dropdownWidthClass]);

  const recalc = useCallback(() => {
    const wrap = ref.current;
    if (!wrap) return;

    const button = wrap.querySelector("button");
    if (!button) return;

    const r = button.getBoundingClientRect();
    const vw = window.innerWidth;
    const panelW =
      panelRef.current?.getBoundingClientRect().width ?? inferWidthFallback();

    let left = r.right - panelW;
    const top = r.bottom + 8;

    left = Math.max(12, Math.min(left, vw - 12 - panelW));
    setPos({ top, left });
  }, [inferWidthFallback]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      const inButton = !!ref.current?.contains(t);
      const inPanel = !!panelRef.current?.contains(t);
      if (!inButton && !inPanel) setOpen(false);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    if (open) {
      document.addEventListener("mousedown", onDoc);
      window.addEventListener("keydown", onKey);
    }

    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    recalc();
    const raf = requestAnimationFrame(recalc);
    const onScrollOrResize = () => recalc();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, recalc]);

  function apply(field: SortField) {
    if (sortField === field) {
      setSortField(null);
      return;
    }

    setSortField(field);
    setSortDir(defaultDirFor(field));
  }

  const DirIcon = sortDir === "asc" ? ArrowDownNarrowWide : ArrowDownWideNarrow;

  const dropdown = (
    <div
      ref={panelRef}
      className="fixed z-[99999]"
      style={{ top: pos.top, left: pos.left }}
    >
      <div className="relative">
        <span className="pointer-events-none absolute -top-1 right-4 h-3 w-3 rotate-45 border border-white/10 border-b-0 border-r-0 bg-[#121420]" />
        <div
          className={clsx(
            "overflow-hidden rounded-2xl border border-white/10",
            "bg-[#121420] backdrop-blur",
            "shadow-[0_18px_40px_rgba(0,0,0,0.45)]",
            dropdownWidthClass,
          )}
        >
          <div role="listbox" aria-label="Sort" className="p-2">
            {options.map((opt) => {
              const active = opt.key === sortField;
              return (
                <button
                  key={opt.key}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => apply(opt.key)}
                  title={active ? "Click again to clear sort" : undefined}
                  className={clsx(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm outline-none",
                    "hover:bg-white/5 focus:bg-white/5",
                    active ? "bg-white/5 text-white" : "text-white/90",
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {active ? (
                    <span className="text-xs font-semibold text-white/80">
                      ✓
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="h-px w-full bg-white/10" />

          <div className="p-2">
            <div
              className={clsx(
                "grid grid-cols-2 overflow-hidden rounded-xl border border-white/10 bg-neutral-950/35",
                !sortField && "opacity-60",
              )}
            >
              <button
                type="button"
                onClick={() => sortField && setSortDir("asc")}
                disabled={!sortField}
                className={clsx(
                  "flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium",
                  "outline-none transition hover:bg-white/6 focus-visible:bg-white/6",
                  sortField && sortDir === "asc"
                    ? "bg-white/8 text-white"
                    : "text-white/80",
                  "disabled:cursor-not-allowed",
                )}
              >
                <ArrowDownNarrowWide className="h-4 w-4 opacity-90" />
                Asc
              </button>
              <button
                type="button"
                onClick={() => sortField && setSortDir("desc")}
                disabled={!sortField}
                className={clsx(
                  "flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium",
                  "outline-none transition hover:bg-white/6 focus-visible:bg-white/6",
                  sortField && sortDir === "desc"
                    ? "bg-white/8 text-white"
                    : "text-white/80",
                  "disabled:cursor-not-allowed",
                )}
              >
                <ArrowDownWideNarrow className="h-4 w-4 opacity-90" />
                Desc
              </button>
            </div>

            {!sortField ? (
              <p className="mt-2 px-1 text-[11px] text-white/45">
                Select a sort type first
              </p>
            ) : null}

            {sortField ? (
              <div className="mt-2 flex items-center justify-between rounded-xl border border-white/10 bg-neutral-950/25 px-3 py-2">
                <p className="truncate text-[11px] text-white/70">
                  <span className="text-white/45">Sorting:</span> {sortLabel}
                </p>
                <DirIcon className="h-4 w-4 text-white/70" />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={
          !sortField
            ? "Sort"
            : `Sort by ${sortLabel} ${sortDir === "asc" ? "ascending" : "descending"}`
        }
        data-open={open ? "1" : "0"}
        data-active={sortField ? "1" : "0"}
        className={clsx(
          "tikd-sort-btn group inline-flex select-none items-center justify-center",
          "h-10 w-10 rounded-[10px] border border-white/10 bg-white/5 text-neutral-100",
          "shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_14px_28px_rgba(0,0,0,0.45)]",
          "transition-[transform,box-shadow,border-color,background-color] duration-150",
          "hover:bg-white/7 hover:border-white/14 active:scale-[0.985]",
          "focus:outline-none focus-visible:border-primary-500",
          "focus-visible:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_14px_28px_rgba(0,0,0,0.45),0_0_0_2px_rgba(154,81,255,0.35)]",
          open && "border-primary-500/70",
          "cursor-pointer",
        )}
      >
        <span className="tikd-sort-bars" aria-hidden="true">
          <span className="tikd-sort-bar tikd-sort-bar1">
            <span className="tikd-sort-dot" />
          </span>
          <span className="tikd-sort-bar tikd-sort-bar2">
            <span className="tikd-sort-dot" />
          </span>
          <span className="tikd-sort-bar tikd-sort-bar1">
            <span className="tikd-sort-dot" />
          </span>
        </span>
        {sortField ? (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-white/20 bg-neutral-500 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
          />
        ) : null}
      </button>

      {mounted && open ? createPortal(dropdown, document.body) : null}

      <style jsx>{`
        .tikd-sort-bars {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .tikd-sort-bar {
          width: 54%;
          height: 1.25px;
          background: rgba(229, 229, 229, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          border-radius: 2px;
        }
        .tikd-sort-dot {
          width: 3.5px;
          height: 3.5px;
          position: absolute;
          border-radius: 999px;
          border: 1.5px solid rgba(255, 255, 255, 0.92);
          background: rgba(140, 140, 166, 0.95);
          box-shadow: 0 0 6px rgba(255, 255, 255, 0.28);
          transition: transform 0.3s ease;
        }
        .tikd-sort-bar1 .tikd-sort-dot {
          transform: translateX(-3px);
        }
        .tikd-sort-bar2 .tikd-sort-dot {
          transform: translateX(3px);
        }
        .tikd-sort-btn:hover .tikd-sort-bar1 .tikd-sort-dot {
          transform: translateX(3px);
        }
        .tikd-sort-btn:hover .tikd-sort-bar2 .tikd-sort-dot {
          transform: translateX(-3px);
        }
        @media (prefers-reduced-motion: reduce) {
          .tikd-sort-dot {
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}

function FilterControls({
  value,
  onChange,
}: {
  value: "all" | SaleOrderStatus;
  onChange: (v: "all" | SaleOrderStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [pos, setPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  const recalc = useCallback(() => {
    const wrap = ref.current;
    if (!wrap) return;
    const button = wrap.querySelector("button");
    if (!button) return;
    const r = button.getBoundingClientRect();
    const vw = window.innerWidth;
    const panelW = panelRef.current?.getBoundingClientRect().width ?? 240;
    let left = r.right - panelW;
    const top = r.bottom + 8;
    left = Math.max(12, Math.min(left, vw - 12 - panelW));
    setPos({ top, left });
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      const inButton = !!ref.current?.contains(t);
      const inPanel = !!panelRef.current?.contains(t);
      if (!inButton && !inPanel) setOpen(false);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    if (open) {
      document.addEventListener("mousedown", onDoc);
      window.addEventListener("keydown", onKey);
    }
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    recalc();
    const raf = requestAnimationFrame(recalc);
    const onScrollOrResize = () => recalc();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, recalc]);

  const dropdown = (
    <div
      ref={panelRef}
      className="fixed z-[99999]"
      style={{ top: pos.top, left: pos.left }}
    >
      <div className="relative">
        <span className="pointer-events-none absolute -top-1 right-4 h-3 w-3 rotate-45 border border-white/10 border-b-0 border-r-0 bg-[#121420]" />
        <div className="w-[240px] overflow-hidden rounded-2xl border border-white/10 bg-[#121420] backdrop-blur shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
          <div className="flex items-center justify-between px-3 py-2.5">
            <div className="text-xs font-semibold text-white/80">Filter</div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white/80 hover:bg-white/8"
            >
              Close
            </button>
          </div>
          <div className="h-px w-full bg-white/10" />
          <div role="listbox" aria-label="Status filter" className="p-2">
            {STATUS_OPTIONS.map((option) => {
              const active = option.key === value;
              return (
                <button
                  key={option.key}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(option.key);
                    setOpen(false);
                  }}
                  className={clsx(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm outline-none",
                    "hover:bg-white/5 focus:bg-white/5",
                    active ? "bg-white/5 text-white" : "text-white/90",
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {active ? (
                    <span className="text-xs font-semibold text-white/80">
                      ✓
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  const hasActive = value !== "all";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Filter"
        className={clsx(
          "group inline-flex h-10 w-10 items-center justify-center rounded-[10px]",
          "border border-white/10 bg-white/5 text-neutral-100",
          "shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_14px_28px_rgba(0,0,0,0.45)]",
          "transition-[transform,box-shadow,border-color,background-color] duration-150",
          "hover:bg-white/7 hover:border-white/14 active:scale-[0.985]",
          "focus:outline-none focus-visible:border-primary-500",
          "focus-visible:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_14px_28px_rgba(0,0,0,0.45),0_0_0_2px_rgba(154,81,255,0.35)]",
          open && "border-primary-500/70",
        )}
      >
        <Filter className="h-[18px] w-[18px] text-white/85" />
        {hasActive ? (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-white/20 bg-primary-500 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
          />
        ) : null}
      </button>
      {mounted && open ? createPortal(dropdown, document.body) : null}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  const visible = useMemo(() => {
    const max = Math.min(totalPages, 4);
    return Array.from({ length: max }).map((_, i) => i + 1);
  }, [totalPages]);

  return (
    <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 p-1">
      <button
        type="button"
        onClick={() => onPage(clamp(page - 1, 1, totalPages))}
        disabled={page <= 1}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/5 text-neutral-100 hover:border-primary-500 disabled:opacity-40 disabled:hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60"
        aria-label="Previous page"
      >
        ‹
      </button>
      {visible.map((p) => {
        const active = p === page;
        return (
          <button
            key={p}
            type="button"
            onClick={() => onPage(p)}
            className={clsx(
              "inline-flex h-8 w-8 items-center justify-center rounded-md text-[12px] font-semibold transition-colors",
              active
                ? "bg-primary-500 text-neutral-0"
                : "bg-white/0 text-neutral-200 hover:bg-white/10 hover:border-white/20",
            )}
            aria-current={active ? "page" : undefined}
          >
            {p}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => onPage(clamp(page + 1, 1, totalPages))}
        disabled={page >= totalPages}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/5 text-neutral-100 hover:border-primary-500 disabled:opacity-40 disabled:hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60"
        aria-label="Next page"
      >
        ›
      </button>
    </div>
  );
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

function EventLink({ sale }: { sale: SaleRow }) {
  if (!sale.event.id) {
    return (
      <div className="group flex min-w-0 items-center justify-start gap-2">
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
      href={eventDashboardHref(sale)}
      className={clsx(
        "group flex min-w-0 items-center justify-start gap-2 rounded-md outline-none",
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

function ViewDetailButton() {
  return (
    <button
      type="button"
      aria-disabled="true"
      title="Sales detail page coming soon"
      className={clsx(
        "group inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5",
        "border border-white/12 bg-white/5 text-[12px] font-semibold text-white/55",
        "cursor-not-allowed opacity-70",
      )}
    >
      <span>View Detail</span>
      <ChevronRight className="h-3.5 w-3.5 opacity-70" />
    </button>
  );
}

export default function ScopedSalesHistoryClient({
  scope,
  eventId = null,
  orgId = null,
  teamId = null,
  title = "SALES HISTORY",
  subtitle = "Review your transactions and ticket revenue",
}: ScopedSalesHistoryClientProps) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    start: null,
    end: null,
  });
  const [statusFilter, setStatusFilter] = useState<"all" | SaleOrderStatus>(
    "paid",
  );
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const defaultDirFor = useCallback((field: SortField): SortDir => {
    if (field === "name" || field === "event" || field === "status") {
      return "asc";
    }
    return "desc";
  }, []);

  const pageSize = 10;
  const hasChosenRange = !!dateRange.start && !!dateRange.end;

  useEffect(() => {
    setPage(1);
  }, [
    query,
    hasChosenRange,
    dateRange.start,
    dateRange.end,
    sortField,
    sortDir,
    statusFilter,
    scope,
    eventId,
    orgId,
    teamId,
  ]);

  const salesQuery = useQuery<SalesListResponse>({
    queryKey: [
      "sales-history",
      scope,
      eventId,
      orgId,
      teamId,
      query.trim(),
      statusFilter,
      sortField,
      sortDir,
      dateRange.start ? dateRange.start.toISOString() : null,
      dateRange.end ? dateRange.end.toISOString() : null,
      page,
      pageSize,
    ],
    queryFn: () =>
      fetchSales({
        scope,
        eventId,
        orgId,
        teamId,
        search: query.trim() || null,
        status: statusFilter,
        start: hasChosenRange ? dateRange.start : null,
        end: hasChosenRange ? dateRange.end : null,
        sortBy: toApiSort(sortField),
        sortDir,
        page,
        pageSize,
      }),
    staleTime: 10_000,
  });

  const rows = salesQuery.data?.rows ?? [];
  const total = salesQuery.data?.total ?? 0;
  const totalPages = Math.max(1, salesQuery.data?.totalPages ?? 1);
  const pageSafe = clamp(page, 1, totalPages);

  useEffect(() => {
    setPage((current) => clamp(current, 1, totalPages));
  }, [totalPages]);

  const showingLabel = useMemo(() => {
    if (!total) return "Showing 0-0 from 0 data";
    const start = (pageSafe - 1) * pageSize + 1;
    const end = Math.min(total, start + pageSize - 1);
    return `Showing ${start}-${end} from ${total} data`;
  }, [pageSafe, pageSize, total]);

  const thRow = "[&>th]:pb-3 [&>th]:pt-1";
  const thBase =
    "text-center font-semibold select-none text-neutral-400 text-[12px]";
  const tdStart = "pl-4 pr-1 py-2.5 align-middle text-left";
  const tdName = "pl-1 pr-3 py-2.5 align-middle text-left";
  const tdCenter = "px-3 py-2.5 align-middle text-center";
  const tdLeft = "px-0 py-2.5 align-middle text-left";
  const tdEnd = "pl-3 pr-4 py-2.5 align-middle text-right";
  const separatorLine =
    "bg-[linear-gradient(90deg,rgba(154,70,255,0)_0%,rgba(154,70,255,0.18)_30%,rgba(255,255,255,0.08)_50%,rgba(154,70,255,0.18)_70%,rgba(154,70,255,0)_100%)]";

  const errorMessage =
    salesQuery.error instanceof Error ? salesQuery.error.message : null;

  return (
    <div className="relative overflow-hidden bg-neutral-950 text-neutral-0">
      <section className="pb-16">
        <section
          className={clsx(
            "mt-4 overflow-hidden rounded-2xl border border-white/10",
            "bg-neutral-950/70 shadow-[0_18px_60px_rgba(0,0,0,0.55)]",
          )}
        >
          <div
            className={clsx(
              "relative p-3 sm:p-4 md:p-5",
              "bg-[radial-gradient(900px_320px_at_25%_0%,rgba(154,70,255,0.10),transparent_60%),radial-gradient(900px_320px_at_90%_110%,rgba(66,139,255,0.08),transparent_55%)]",
            )}
          >
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold tracking-[0.16em] text-neutral-300 sm:text-base sm:tracking-[0.18em]">
                  {title}
                </div>
                <div className="mt-1 text-sm leading-5 text-neutral-400">
                  {subtitle}
                </div>
              </div>

              <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:items-center">
                <div
                  className={clsx(
                    "relative w-full lg:w-[420px]",
                    "h-10 rounded-[10px] border border-white/10 bg-white/5",
                  )}
                >
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-300" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search here"
                    className={clsx(
                      "h-10 w-full rounded-[10px] bg-transparent pl-10 pr-4 text-[12px] text-neutral-100",
                      "placeholder:text-neutral-500 outline-none border-none focus:ring-1 focus:ring-primary-500",
                    )}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1 lg:w-[210px] lg:flex-none">
                    <DateRangePicker
                      value={dateRange}
                      onChange={setDateRange}
                      variant="compact"
                      buttonClassName={clsx(
                        "h-10 w-full rounded-[10px]",
                        "border border-white/10 bg-white/5 px-3 py-0 text-[12px] font-semibold text-neutral-100",
                        "hover:bg-white/7 hover:border-white/14 focus-visible:ring-2 focus-visible:ring-primary-500/40",
                      )}
                    />
                  </div>

                  <div className="shrink-0">
                    <FilterControls
                      value={statusFilter}
                      onChange={setStatusFilter}
                    />
                  </div>

                  <div className="shrink-0">
                    <SortControls
                      options={SORT_FIELDS}
                      sortField={sortField}
                      sortDir={sortDir}
                      setSortField={setSortField}
                      setSortDir={setSortDir}
                      defaultDirFor={defaultDirFor}
                      dropdownWidthClass="w-[220px]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {errorMessage ? (
              <div className="mb-4 rounded-2xl border border-error-500/25 bg-error-500/10 px-4 py-3 text-[12px] text-error-200">
                {errorMessage}
              </div>
            ) : null}

            <div className="space-y-3 lg:hidden">
              {salesQuery.isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-[240px] animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]"
                  />
                ))
              ) : rows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 bg-transparent p-8 text-center">
                  <p className="text-sm font-medium text-neutral-0">
                    No sales found.
                  </p>
                  <p className="mt-2 text-[12px] leading-5 text-neutral-400">
                    Try changing the date range, status filter, or search text.
                  </p>
                </div>
              ) : (
                rows.map((sale, index) => {
                  const dt = formatDateParts(sale.createdAt);
                  const isLast = index === rows.length - 1;

                  return (
                    <div
                      key={sale.id}
                      className={clsx(
                        "overflow-hidden rounded-2xl border border-white/10",
                        index % 2 === 0 ? "bg-neutral-948" : "bg-neutral-900",
                        "shadow-[0_10px_30px_rgba(0,0,0,0.28)]",
                      )}
                    >
                      <div className="p-3 sm:p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                              Sale ID
                            </div>
                            <div className="mt-1 text-sm font-semibold text-white/88">
                              {sale.orderDisplay}
                            </div>
                          </div>

                          <span
                            className={clsx(
                              "inline-flex shrink-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold backdrop-blur",
                              statusPill(sale.status),
                            )}
                          >
                            <span className="h-2 w-2 rounded-full bg-current opacity-80 ring-1 ring-white/25 shadow-[0_0_0_2px_rgba(0,0,0,0.25),0_0_10px_rgba(255,255,255,0.12)]" />
                            {sale.statusLabel}
                          </span>
                        </div>

                        <div
                          className={clsx("mt-3 h-px w-full", separatorLine)}
                        />

                        <div className="mt-3 flex items-start gap-3">
                          <AvatarOnly
                            name={sale.buyer.name}
                            src={sale.buyer.imageUrl}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                              Customer
                            </div>
                            <div className="mt-1 truncate text-sm font-semibold text-white/92">
                              {sale.buyer.name}
                            </div>
                            <div className="mt-1 truncate text-[12px] text-neutral-400">
                              {sale.buyer.email || "—"}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="min-w-0 rounded-xl border border-white/8 bg-white/[0.03] p-3">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                              Event
                            </div>
                            <div className="mt-2">
                              <EventLink sale={sale} />
                            </div>
                          </div>

                          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                              Date
                            </div>
                            <div className="mt-2 text-sm font-medium text-white/90">
                              {dt.date}
                            </div>
                            <div className="mt-1 text-[12px] text-neutral-400">
                              {dt.time || "—"}
                            </div>
                          </div>

                          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                              Ticket Summary
                            </div>
                            <div className="mt-2 text-sm font-medium text-white/90">
                              {sale.ticketSummary}
                            </div>
                            <div className="mt-1 text-[12px] text-neutral-400">
                              Quantity: {sale.quantity}
                            </div>
                          </div>

                          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                              Amount
                            </div>
                            <div className="mt-2 text-base font-semibold text-success-500">
                              {fmtCurrency(sale.amount, sale.currency)}
                            </div>
                          </div>

                          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3 sm:col-span-2">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                                  Status
                                </div>
                                <div className="mt-2 text-sm font-medium text-white/90">
                                  {sale.statusLabel}
                                </div>
                              </div>
                              <ViewDetailButton />
                            </div>
                          </div>
                        </div>
                      </div>

                      {!isLast ? (
                        <div className="px-3 pb-0 sm:px-4">
                          <div className={clsx("h-px w-full", separatorLine)} />
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>

            <div className="relative hidden overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 pt-3 lg:block">
              <div className="relative overflow-hidden">
                <table className="w-full table-fixed border-collapse text-xs font-medium leading-tight">
                  <colgroup>
                    <col style={{ width: "4%" }} />
                    <col style={{ width: "20%" }} />
                    <col style={{ width: "16%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "18%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "10%" }} />
                  </colgroup>

                  <thead className="text-neutral-400">
                    <tr className={thRow}>
                      <th className={clsx(thBase, "pl-1 text-center")}>#</th>
                      <th className={clsx(thBase, "pl-1 text-left")}>Name</th>
                      <th className={clsx(thBase, "text-left")}>Event</th>
                      <th className={thBase}>Date</th>
                      <th className={thBase}>Amount</th>
                      <th className={clsx(thBase, "text-left")}>Status</th>
                      <th className={clsx(thBase, "text-left")}>Tickets</th>
                      <th className={clsx(thBase, "pr-10 text-right")}>
                        View Detail
                      </th>
                    </tr>
                  </thead>

                  <tbody className="text-white">
                    {salesQuery.isLoading ? (
                      Array.from({ length: 6 }).flatMap((_, index) => {
                        const row = (
                          <tr
                            key={`loading-${index}`}
                            className={
                              index % 2 === 0
                                ? "bg-neutral-948"
                                : "bg-neutral-900"
                            }
                          >
                            <td colSpan={8} className="px-4 py-4">
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
                              <td colSpan={8} className="p-0">
                                <div
                                  className={clsx("mx-3 h-px", separatorLine)}
                                />
                              </td>
                            </tr>
                          ) : null;

                        return separator ? [row, separator] : [row];
                      })
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-10">
                          <div className="rounded-2xl border border-dashed border-white/15 bg-transparent p-10 text-center">
                            <p className="text-sm font-medium text-neutral-0">
                              No sales found.
                            </p>
                            <p className="mt-2 text-[12px] text-neutral-400">
                              Try changing the date range, status filter, or
                              search text.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      rows.flatMap((sale, index) => {
                        const isLast = index === rows.length - 1;
                        const rowBg =
                          index % 2 === 0 ? "bg-neutral-948" : "bg-neutral-900";
                        const dt = formatDateParts(sale.createdAt);

                        const dataRow = (
                          <tr
                            key={sale.id}
                            className={clsx(
                              "transition-colors hover:bg-white/[0.05]",
                              rowBg,
                            )}
                          >
                            <td className={clsx(tdStart, "text-white/70")}>
                              <span className="tabular-nums">
                                {sale.orderDisplay}
                              </span>
                            </td>

                            <td className={clsx(tdName, "text-white/90")}>
                              <div className="flex min-w-0 items-center gap-2.5">
                                <AvatarOnly
                                  name={sale.buyer.name}
                                  src={sale.buyer.imageUrl}
                                />
                                <div className="min-w-0">
                                  <div
                                    className="truncate"
                                    title={sale.buyer.name}
                                  >
                                    {sale.buyer.name}
                                  </div>
                                  <div className="truncate text-[11px] text-neutral-500">
                                    {sale.buyer.email || "—"}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className={tdLeft}>
                              <EventLink sale={sale} />
                            </td>

                            <td className={tdCenter}>
                              <div className="flex flex-col items-center leading-tight">
                                <span className="text-white/90">{dt.date}</span>
                                <span className="text-[11px] text-neutral-400">
                                  {dt.time || "—"}
                                </span>
                              </div>
                            </td>

                            <td className={tdCenter}>
                              <span className="tabular-nums font-medium text-success-500">
                                {fmtCurrency(sale.amount, sale.currency)}
                              </span>
                            </td>

                            <td className={tdLeft}>
                              <span
                                className={clsx(
                                  "inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold backdrop-blur",
                                  statusPill(sale.status),
                                )}
                              >
                                <span className="h-2 w-2 rounded-full bg-current opacity-80 ring-1 ring-white/25 shadow-[0_0_0_2px_rgba(0,0,0,0.25),0_0_10px_rgba(255,255,255,0.12)]" />
                                {sale.statusLabel}
                              </span>
                            </td>

                            <td className={tdLeft}>
                              <div className="min-w-0">
                                <div className="truncate text-white/90">
                                  {sale.ticketSummary}
                                </div>
                                <div className="text-[11px] text-neutral-500">
                                  Qty {sale.quantity}
                                </div>
                              </div>
                            </td>

                            <td className={tdEnd}>
                              <ViewDetailButton />
                            </td>
                          </tr>
                        );

                        const separatorRow = !isLast ? (
                          <tr
                            key={`${sale.id}-sep`}
                            aria-hidden
                            className="bg-neutral-900"
                          >
                            <td colSpan={8} className="p-0">
                              <div
                                className={clsx("mx-3 h-px", separatorLine)}
                              />
                            </td>
                          </tr>
                        ) : null;

                        return separatorRow
                          ? [dataRow, separatorRow]
                          : [dataRow];
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-center text-[12px] text-neutral-300 sm:text-left">
                {showingLabel}
              </div>

              <div className="flex justify-center sm:justify-end">
                <Pagination
                  page={pageSafe}
                  totalPages={totalPages}
                  onPage={setPage}
                />
              </div>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
