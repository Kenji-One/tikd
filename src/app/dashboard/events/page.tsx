/* ------------------------------------------------------------------ */
/*  src/app/dashboard/events/page.tsx                                  */
/* ------------------------------------------------------------------ */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import {
  CalendarPlus,
  ChevronDown,
  X,
  CheckCircle2,
  Plus,
  Search,
  ArrowDownNarrowWide,
  ArrowDownWideNarrow,
  ChevronRight,
} from "lucide-react";

import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { EventCard } from "@/components/ui/EventCard";
import { EVENT_CARD_DEFAULT_POSTER } from "@/components/ui/EventCard";
import GridListToggle, {
  type GridListValue,
} from "@/components/ui/GridListToggle";

/* ------------------------------ Types ------------------------------ */
type Org = {
  _id: string;
  name: string;
  logo?: string;
  website?: string;
};

type MyEvent = {
  _id: string;
  title: string;
  image?: string;
  date: string; // ISO string
  location: string;
  category?: string;
  status?: "draft" | "published";
  pinned?: boolean;

  // Optional dashboard stats (safe: backend can add later)
  revenue?: number;
  revenueTotal?: number;
  grossRevenue?: number;
  ticketsSold?: number;
  sold?: number;

  // Optional: clients requested sort options
  pageViews?: number;
  views?: number;
};

type EventViewId = "upcoming" | "past" | "drafts";

type SortField =
  | "title"
  | "pageViews"
  | "ticketsSold"
  | "revenue"
  | "eventDate";
type SortDir = "asc" | "desc";

/* ---------------------------- Helpers ------------------------------ */
async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

type JsonBody = Record<string, unknown> | unknown[] | null;

async function fetchJSONWithBody<T>(
  url: string,
  init: Omit<RequestInit, "body"> & { body?: JsonBody | string },
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    body:
      init.body === undefined
        ? undefined
        : typeof init.body === "string"
          ? init.body
          : JSON.stringify(init.body),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(
      `Request failed: ${res.status} ${res.statusText}${txt ? ` — ${txt}` : ""}`,
    );
  }
  return (await res.json()) as T;
}

function domainFromUrl(url?: string) {
  if (!url) return "";
  try {
    const clean = url.startsWith("http") ? url : `https://${url}`;
    const u = new URL(clean);
    return u.host.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, "");
  }
}

function money(n: number) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `$${Math.round(n).toLocaleString()}`;
  }
}

function formatEventDate(iso: string) {
  const d = new Date(iso);
  const day = d.getDate();
  const mon = d.toLocaleString(undefined, { month: "short" }).toUpperCase();
  const year = d.getFullYear();
  return `${day} ${mon}, ${year}`;
}

function formatDateLine(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function revenueOf(e: MyEvent) {
  const raw = e.revenue ?? e.revenueTotal ?? e.grossRevenue ?? 0;
  return typeof raw === "number" ? raw : 0;
}

function ticketsOf(e: MyEvent) {
  const raw = e.ticketsSold ?? e.sold ?? 0;
  return typeof raw === "number" ? raw : 0;
}

function viewsOf(e: MyEvent) {
  const raw = e.pageViews ?? e.views ?? 0;
  return typeof raw === "number" ? raw : 0;
}

function pinnedFirst(list: MyEvent[], pinnedIds: Set<string>) {
  if (!pinnedIds.size) return list;
  const pinned: MyEvent[] = [];
  const rest: MyEvent[] = [];
  for (const e of list) {
    if (pinnedIds.has(String(e._id))) pinned.push(e);
    else rest.push(e);
  }
  return [...pinned, ...rest];
}

function clampText(input: string, maxChars: number) {
  const clean = String(input || "")
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

function matchesEventQuery(e: MyEvent, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const hay =
    `${e.title ?? ""} ${e.location ?? ""} ${e.category ?? ""}`.toLowerCase();
  return hay.includes(q);
}

function sortEvents(args: {
  list: MyEvent[];
  view: EventViewId;
  sortField: SortField | null;
  sortDir: SortDir;
  pinnedIds?: Set<string>;
}) {
  const { list, view, sortField, sortDir, pinnedIds } = args;
  const arr = [...list];

  const dirMul = sortDir === "asc" ? 1 : -1;

  // Default (no sort) behavior: Upcoming by date asc (with pinned first),
  // Past/Drafts by date desc.
  if (!sortField) {
    if (view === "upcoming") {
      const base = arr.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      return pinnedIds ? pinnedFirst(base, pinnedIds) : base;
    }

    return arr.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  switch (sortField) {
    case "title": {
      const base = arr.sort((a, b) => a.title.localeCompare(b.title) * dirMul);
      return view === "upcoming" && pinnedIds
        ? pinnedFirst(base, pinnedIds)
        : base;
    }
    case "pageViews": {
      const base = arr.sort((a, b) => (viewsOf(a) - viewsOf(b)) * dirMul);
      return view === "upcoming" && pinnedIds
        ? pinnedFirst(base, pinnedIds)
        : base;
    }
    case "ticketsSold": {
      const base = arr.sort((a, b) => (ticketsOf(a) - ticketsOf(b)) * dirMul);
      return view === "upcoming" && pinnedIds
        ? pinnedFirst(base, pinnedIds)
        : base;
    }
    case "revenue": {
      const base = arr.sort((a, b) => (revenueOf(a) - revenueOf(b)) * dirMul);
      return view === "upcoming" && pinnedIds
        ? pinnedFirst(base, pinnedIds)
        : base;
    }
    case "eventDate": {
      const base = arr.sort(
        (a, b) =>
          (new Date(a.date).getTime() - new Date(b.date).getTime()) * dirMul,
      );
      return view === "upcoming" && pinnedIds
        ? pinnedFirst(base, pinnedIds)
        : base;
    }
    default:
      return arr;
  }
}

/* ---------------------- Compact dropdown (Tikd style) -------------- */
function MiniSelect<T extends string>({
  value,
  onChange,
  options,
  btnClassName,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { key: T; label: string }[];
  btnClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const label =
    options.find((o) => o.key === value)?.label ?? options[0]?.label;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "inline-flex items-center gap-2 rounded-full border border-white/10",
          "bg-neutral-900 px-3 py-2 font-medium text-neutral-200",
          "transition hover:bg-white/8 hover:text-neutral-0",
          "focus:outline-none hover:border-primary-500 focus-visible:border-primary-500 cursor-pointer",
          btnClassName,
        )}
      >
        {label}
        <ChevronDown
          className={clsx(
            "h-4 w-4 transition-transform",
            open ? "rotate-180 text-neutral-100" : "text-neutral-400",
          )}
        />
      </button>

      {open && (
        <div
          className={clsx(
            "absolute right-0 z-30 mt-2 w-full overflow-hidden rounded-2xl",
            "border border-white/10 bg-neutral-950/95 shadow-xl backdrop-blur",
          )}
        >
          {options.map((opt) => {
            const active = opt.key === value;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  onChange(opt.key);
                  setOpen(false);
                }}
                className={clsx(
                  "flex w-full items-center justify-between px-3 py-2 text-left text-xs",
                  active
                    ? "bg-primary-700/20 text-neutral-0"
                    : "text-neutral-200 hover:bg-white/5",
                )}
              >
                <span>{opt.label}</span>
                {active ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary-300" />
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------------- Sort Controls (MERGED) ---------------------- */
function SortControls({
  options,
  sortField,
  sortDir,
  setSortField,
  setSortDir,
  defaultDirFor,
  dropdownWidthClass = "w-[200px]",
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

  const sortLabel = useMemo(() => {
    if (!sortField) return "";
    return options.find((o) => o.key === sortField)?.label ?? "Sort";
  }, [options, sortField]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function apply(field: SortField) {
    // Clicking the active option again clears sorting (back to default state)
    if (sortField === field) {
      setSortField(null);
      return;
    }

    setSortField(field);
    setSortDir(defaultDirFor(field));
  }

  function setDir(dir: SortDir) {
    if (!sortField) return;
    setSortDir(dir);
  }

  const DirIcon = sortDir === "asc" ? ArrowDownNarrowWide : ArrowDownWideNarrow;

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
            : `Sort by ${sortLabel} ${
                sortDir === "asc" ? "ascending" : "descending"
              }`
        }
        data-open={open ? "1" : "0"}
        data-active={sortField ? "1" : "0"}
        className={clsx(
          "tikd-sort-btn group inline-flex select-none items-center justify-center",
          "h-9.5 w-9.5 rounded-[4px] border border-white/10",
          "bg-neutral-700/90 text-neutral-100",
          "shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_14px_28px_rgba(0,0,0,0.45)]",
          "transition-[transform,box-shadow,border-color,background-color] duration-150",
          "hover:bg-neutral-700 hover:border-white/14",
          "active:scale-[0.985]",
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
            className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-white/20 bg-neutral-500 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
          />
        ) : null}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2">
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
                        "flex w-full items-center justify-between",
                        "rounded-lg px-3 py-2.5",
                        "text-left text-sm outline-none",
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
                    onClick={() => setDir("asc")}
                    disabled={!sortField}
                    className={clsx(
                      "flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium",
                      "outline-none transition",
                      "hover:bg-white/6 focus-visible:bg-white/6",
                      sortField && sortDir === "asc"
                        ? "bg-white/8 text-white"
                        : "text-white/80",
                      "disabled:cursor-not-allowed",
                    )}
                    aria-label="Ascending"
                  >
                    <ArrowDownNarrowWide className="h-4 w-4 opacity-90" />
                    Asc
                  </button>

                  <button
                    type="button"
                    onClick={() => setDir("desc")}
                    disabled={!sortField}
                    className={clsx(
                      "flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium",
                      "outline-none transition",
                      "hover:bg-white/6 focus-visible:bg-white/6",
                      sortField && sortDir === "desc"
                        ? "bg-white/8 text-white"
                        : "text-white/80",
                      "disabled:cursor-not-allowed",
                    )}
                    aria-label="Descending"
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
                      <span className="text-white/45">Sorting:</span>{" "}
                      {sortLabel}
                    </p>
                    <DirIcon className="h-4 w-4 text-white/70" />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

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
          width: 50%;
          height: 1.5px;
          background: rgba(229, 229, 229, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          border-radius: 2px;
        }

        .tikd-sort-dot {
          width: 4px;
          height: 4px;
          position: absolute;
          border-radius: 999px;
          border: 1.5px solid rgba(255, 255, 255, 0.92);
          background: rgba(140, 140, 166, 0.95);
          box-shadow: 0 0 6px rgba(255, 255, 255, 0.28);
          transition: transform 0.3s ease;
        }

        .tikd-sort-bar1 .tikd-sort-dot {
          transform: translateX(-4px);
        }
        .tikd-sort-bar2 .tikd-sort-dot {
          transform: translateX(4px);
        }

        .tikd-sort-btn:hover .tikd-sort-bar1 .tikd-sort-dot {
          transform: translateX(4px);
        }
        .tikd-sort-btn:hover .tikd-sort-bar2 .tikd-sort-dot {
          transform: translateX(-4px);
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

/* ---------------------- Org Picker Modal -------------------------- */
type OrgPickerModalProps = {
  open: boolean;
  orgs: Org[];
  loading: boolean;
  selectedOrgId: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
  onConfirm: () => void;
};

function OrgPickerModal({
  open,
  orgs,
  loading,
  selectedOrgId,
  onSelect,
  onClose,
  onConfirm,
}: OrgPickerModalProps) {
  const [query, setQuery] = useState("");

  const filteredOrgs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orgs;

    return orgs.filter((o) => {
      const name = (o.name ?? "").toLowerCase();
      const site = domainFromUrl(o.website ?? "").toLowerCase();
      return name.includes(q) || site.includes(q);
    });
  }, [orgs, query]);

  if (!open) return null;

  const canConfirm = orgs.length > 0 && !!selectedOrgId && !loading;

  const handleOverlayClick = () => onClose();

  const handleCardClick = (e: ReactMouseEvent<HTMLDivElement>, id: string) => {
    e.stopPropagation();
    onSelect(id);
  };

  const handlePanelClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0"
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      <div
        className={clsx(
          "relative z-10 w-[92vw] max-w-[480px]",
          "rounded-2xl border border-white/12",
          "bg-neutral-950/95 shadow-[0_28px_80px_rgba(0,0,0,0.85)]",
          " max-h-[680px]",
          "p-5 sm:p-6",
        )}
        onClick={handlePanelClick}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-neutral-0">
                Choose an organization
              </h2>

              <p className="mt-1 text-xs text-neutral-300">
                Events operate under an organization. Pick which one this new
                event belongs to, or create a new organization first.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-300 transition hover:border-primary-500 hover:text-neutral-0"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search organizations..."
              variant="full"
              shape="pill"
              size="md"
              icon={<Search className="h-4 w-4 text-neutral-400" />}
              aria-label="Search organizations"
              className={clsx(
                "focus-visible:!ring-primary-500",
                "!text-[13px] placeholder:!text-neutral-500",
                "!min-h-[44px] w-full",
              )}
            />
          </div>
          <div className="mt-4 flex-1 overflow-hidden">
            {loading ? (
              <div className="h-full space-y-3 overflow-y-auto pr-1">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-[74px] rounded-2xl" />
                ))}
              </div>
            ) : orgs.length > 0 ? (
              <div className="h-full space-y-3 overflow-y-auto pr-1">
                {filteredOrgs.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/12 bg-neutral-948/90 px-4 py-4 text-sm text-neutral-200">
                    <p className="font-medium text-neutral-0">
                      No organizations match your search.
                    </p>
                    <p className="mt-1 text-xs text-neutral-400">
                      Try a different keyword.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {filteredOrgs.map((org) => {
                      const selected = org._id === selectedOrgId;

                      return (
                        <div
                          key={org._id}
                          className={clsx(
                            "group relative flex flex-col w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                            "bg-neutral-948/90 border-white/10 hover:border-primary-500/70 hover:bg-neutral-900/90",
                            selected &&
                              "border-primary-500 bg-neutral-948/95 ring-1 ring-inset ring-primary-500/80",
                          )}
                          onClick={(e) => handleCardClick(e, org._id)}
                        >
                          <div
                            className={clsx(
                              "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md",
                              "bg-neutral-900 ring-1 ring-inset ring-white/10",
                              selected && "ring-primary-500/80",
                            )}
                          >
                            {org.logo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={org.logo}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-semibold text-neutral-0">
                                {org.name?.[0]?.toUpperCase() ?? "O"}
                              </span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold text-neutral-0">
                              {org.name}
                            </p>
                            {org.website && (
                              <p className="mt-0.5 truncate text-[11px] text-neutral-400">
                                {domainFromUrl(org.website)}
                              </p>
                            )}
                          </div>

                          <div className="ml-2 shrink-0">
                            {selected ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary-900/90 via-primary-700/90 to-primary-500/90 px-2.5 py-1 text-[11px] font-medium text-neutral-0 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Selected
                              </span>
                            ) : (
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/12 bg-white/5 text-[10px] text-neutral-300 group-hover:border-primary-400/80 group-hover:text-primary-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 group-hover:bg-primary-300" />
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/12 bg-neutral-948/90 px-4 py-4 text-sm text-neutral-200">
                <p className="font-medium text-neutral-0">
                  You don&apos;t have any organizations yet.
                </p>
                <p className="mt-1 text-xs text-neutral-400">
                  Create an organization first, then you can launch events under
                  that brand.
                </p>
                <Link
                  href="/dashboard/organizations/new"
                  className="mt-4 inline-flex items-center text-xs font-medium text-primary-300 hover:text-primary-200"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Create organization
                </Link>
              </div>
            )}
          </div>

          {orgs.length > 0 ? (
            <div className="pt-8">
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="primary"
                  disabled={!canConfirm}
                  onClick={onConfirm}
                >
                  <CalendarPlus className="h-4 w-4" />
                  Continue
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* -------------------- Shared sort fields --------------------------- */
const SORT_FIELDS: { key: SortField; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "pageViews", label: "Page Views" },
  { key: "ticketsSold", label: "Tickets Sold" },
  { key: "revenue", label: "Revenue" },
  { key: "eventDate", label: "Event Date" },
];

function PinGlyph({
  active,
  className,
}: {
  active: boolean;
  className?: string;
}) {
  // Uiverse colors (kept true to reference)
  const accent = "rgb(179, 139, 255)";

  // Inactive stroke tuned for dark UI while keeping the same SVG shape
  const idleStroke = "rgba(255,255,255,0.72)";

  const stroke = active ? accent : idleStroke;
  const fill = active ? accent : "none";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill={fill}
      viewBox="0 0 75 100"
      className={clsx("h-[15px] w-[15px] rotate-[35deg]", className)}
      aria-hidden="true"
    >
      <line strokeWidth="12" stroke={stroke} y2="100" x2="37" y1="64" x1="37" />
      <path
        strokeWidth="10"
        stroke={stroke}
        d="M16.5 36V4.5H58.5V36V53.75V54.9752L59.1862 55.9903L66.9674 67.5H8.03256L15.8138 55.9903L16.5 54.9752V53.75V36Z"
      />
    </svg>
  );
}

function PinOverlayButton({
  pinned,
  onToggle,
}: {
  pinned: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        // ✅ critical: prevent EventCard/Link navigation
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className={clsx(
        "absolute right-3 top-3 z-20",
        "inline-flex items-center gap-2 cursor-pointer",
        pinned
          ? clsx(
              // “Pinned” pill (matches your screenshot vibe)
              "h-8 w-8 rounded-lg flex items-center justify-center",
              "border border-primary-500/35",
              "bg-neutral-950/55 backdrop-blur-md",
              "shadow-[0_0_0_1px_rgba(255,255,255,0.07),0_10px_24px_rgba(0,0,0,0.45)]",
              "text-[12px] font-semibold text-neutral-50",
              "transition hover:bg-neutral-950/70 hover:border-primary-500/55",
              "active:scale-[0.97]",
            )
          : clsx(
              // Unpinned = compact icon button
              "h-8 w-8 justify-center rounded-lg",
              "border border-white/10 bg-neutral-950/45 backdrop-blur-md",
              "text-neutral-200",
              "shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_10px_22px_rgba(0,0,0,0.40)]",
              "transition hover:bg-white/8 hover:border-primary-500/45",
              "active:scale-[0.97]",
            ),
      )}
      aria-label={pinned ? "Unpin event" : "Pin event"}
      title={pinned ? "Unpin" : "Pin"}
    >
      <PinGlyph active={pinned} />
    </button>
  );
}

/* ------------------------ Row card (List) -------------------------- */
function EventRowCard({
  ev,
  pinned,
  onTogglePin,
}: {
  ev: MyEvent;
  pinned: boolean;
  onTogglePin: () => void;
}) {
  const rowImg =
    ev.image && ev.image.trim() ? ev.image.trim() : EVENT_CARD_DEFAULT_POSTER;

  return (
    <Link
      href={`/dashboard/events/${ev._id}`}
      className={clsx(
        "group relative flex w-full items-center justify-between gap-4",
        "rounded-[12px] border border-white/10 bg-white/5 px-4 py-3",
        "hover:border-primary-500 hover:bg-white/7 transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
      )}
    >
      {/* Left */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[10px] bg-white/5 ring-1 ring-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={rowImg}
            alt=""
            className="h-10 w-10 object-cover"
            onError={(e) => {
              const img = e.currentTarget;
              if (img.src !== EVENT_CARD_DEFAULT_POSTER) {
                img.onerror = null;
                img.src = EVENT_CARD_DEFAULT_POSTER;
              }
            }}
          />
        </div>

        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-neutral-50">
            {ev.title}
          </div>
          <div className="mt-0.5 truncate text-[12px] text-neutral-400">
            {clampText(`${formatDateLine(ev.date)} • ${ev.location ?? ""}`, 64)}
          </div>
        </div>
      </div>

      {/* Center (true centered like org rows, desktop only) */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:flex items-center gap-6">
        <div className="text-[12px] text-neutral-300">
          {ev.category ? clampText(ev.category, 22) : "—"}
        </div>
        <div className="text-[12px] text-neutral-400">
          {formatEventDate(ev.date)}
        </div>
      </div>

      {/* Right */}
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onTogglePin();
          }}
          className={clsx(
            "inline-flex h-9 w-9 items-center justify-center rounded-lg",
            pinned
              ? "border-primary-500/45 bg-primary-500/10 text-neutral-0"
              : "border border-white/10 bg-white/5 text-neutral-200",
            "hover:border-primary-500 hover:bg-white/10 transition",
          )}
          aria-label={pinned ? "Unpin event" : "Pin event"}
          title={pinned ? "Unpin" : "Pin"}
        >
          <PinGlyph active={pinned} className="h-[14px] w-[14px]" />
        </button>

        <div className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-neutral-200 group-hover:bg-white/10">
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}

/* ----------------------------- Page -------------------------------- */
export default function DashboardEventsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const [view, setView] = useState<EventViewId>("upcoming");

  // ✅ layout view (grid/list) like Organizations page
  const [layout, setLayout] = useState<GridListValue>("grid");

  // ✅ header search (events)
  const [eventsQuery, setEventsQuery] = useState("");

  // ✅ header sort (reused existing SortControls, moved next to GridListToggle)
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [showOrgPicker, setShowOrgPicker] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  const { data: orgs, isLoading: orgsLoading } = useQuery<Org[]>({
    queryKey: ["orgs", "connections-events"],
    queryFn: () => fetchJSON<Org[]>("/api/organizations"),
    enabled: !!session,
  });

  const { data: allEvents, isLoading: eventsLoading } = useQuery<MyEvent[]>({
    queryKey: ["myEvents", "connections-events"],
    queryFn: () => fetchJSON<MyEvent[]>("/api/events?owned=1"),
    enabled: !!session,
  });

  const { data: pinnedIdsResp } = useQuery<{ ids: string[] }>({
    queryKey: ["eventPins"],
    // ✅ prevent browser/proxy caching from returning stale `{ ids: [] }`
    queryFn: () =>
      fetchJSON<{ ids: string[] }>("/api/events/pins", { cache: "no-store" }),
    enabled: !!session,
  });

  const pinnedIds = useMemo(
    () => new Set((pinnedIdsResp?.ids ?? []).map(String)),
    [pinnedIdsResp],
  );

  const pinMutation = useMutation({
    mutationFn: async (vars: { id: string; pinned: boolean }) => {
      return fetchJSONWithBody<{ ok: true; pinned: boolean }>(
        `/api/events/${vars.id}/pin`,
        { method: "PUT", body: { pinned: vars.pinned } },
      );
    },
    onMutate: async ({ id, pinned }) => {
      await queryClient.cancelQueries({ queryKey: ["eventPins"] });

      const prev = queryClient.getQueryData<{ ids: string[] }>(["eventPins"]);
      const prevIds = (prev?.ids ?? []).map(String);

      const nextIds = new Set(prevIds);
      if (pinned) nextIds.add(String(id));
      else nextIds.delete(String(id));

      queryClient.setQueryData(["eventPins"], { ids: Array.from(nextIds) });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["eventPins"], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["eventPins"] });
    },
  });

  function togglePin(id: string, nextPinned: boolean) {
    pinMutation.mutate({ id, pinned: nextPinned });
  }

  const orgsList = useMemo<Org[]>(() => orgs ?? [], [orgs]);
  const events = useMemo<MyEvent[]>(() => allEvents ?? [], [allEvents]);

  const now = useMemo(() => Date.now(), []);

  const upcomingBase = useMemo(
    () =>
      events.filter(
        (e) => new Date(e.date).getTime() >= now && e.status !== "draft",
      ),
    [events, now],
  );
  const pastBase = useMemo(
    () =>
      events.filter(
        (e) => new Date(e.date).getTime() < now && e.status !== "draft",
      ),
    [events, now],
  );
  const draftsBase = useMemo(
    () => events.filter((e) => e.status === "draft"),
    [events],
  );

  // ✅ If the user switches to Past/Drafts, force list layout (these views are row-based).
  useEffect(() => {
    if (view !== "upcoming") setLayout("list");
  }, [view]);

  // ✅ Reset to page-appropriate default sort direction when choosing a new field.
  const defaultDirFor = useMemo(() => {
    return (field: SortField): SortDir => {
      if (field === "title") return "asc";
      if (field === "eventDate") return view === "upcoming" ? "asc" : "desc";
      return "desc";
    };
  }, [view]);

  // Keep sortDir in sync when view changes and sortField is eventDate (so “Upcoming” feels natural).
  useEffect(() => {
    if (!sortField) return;
    setSortDir((prev) => {
      const ideal = defaultDirFor(sortField);
      // only auto-adjust for eventDate; leave other fields as user last picked
      if (sortField === "eventDate") return ideal;
      return prev;
    });
  }, [view, sortField, defaultDirFor]);

  const viewOptions: { key: EventViewId; label: string }[] = [
    { key: "upcoming", label: "Upcoming" },
    { key: "past", label: "Past" },
    { key: "drafts", label: "Drafts" },
  ];

  function openOrgPicker() {
    if (orgsList.length > 0) setSelectedOrgId(orgsList[0]._id);
    else setSelectedOrgId(null);
    setShowOrgPicker(true);
  }

  function handleOrgPickerConfirm() {
    if (!selectedOrgId) return;
    setShowOrgPicker(false);
    router.push(`/dashboard/organizations/${selectedOrgId}/events/create`);
  }

  // ✅ Apply header search to whichever view is active
  const upcomingFiltered = useMemo(
    () => upcomingBase.filter((e) => matchesEventQuery(e, eventsQuery)),
    [upcomingBase, eventsQuery],
  );
  const pastFiltered = useMemo(
    () => pastBase.filter((e) => matchesEventQuery(e, eventsQuery)),
    [pastBase, eventsQuery],
  );
  const draftsFiltered = useMemo(
    () => draftsBase.filter((e) => matchesEventQuery(e, eventsQuery)),
    [draftsBase, eventsQuery],
  );

  const upcomingSorted = useMemo(
    () =>
      sortEvents({
        list: upcomingFiltered,
        view: "upcoming",
        sortField,
        sortDir,
        pinnedIds,
      }),
    [upcomingFiltered, sortField, sortDir, pinnedIds],
  );

  const pastSorted = useMemo(
    () =>
      sortEvents({
        list: pastFiltered,
        view: "past",
        sortField,
        sortDir,
      }),
    [pastFiltered, sortField, sortDir],
  );

  const draftsSorted = useMemo(
    () =>
      sortEvents({
        list: draftsFiltered,
        view: "drafts",
        sortField,
        sortDir,
      }),
    [draftsFiltered, sortField, sortDir],
  );

  // ✅ Keep EventCard sizes EXACTLY as-is
  const gridCols =
    "grid-cols-[repeat(auto-fill,minmax(170px,170px))] " +
    "sm:grid-cols-[repeat(auto-fill,minmax(190px,190px))] " +
    "md:grid-cols-[repeat(auto-fill,minmax(200px,200px))] " +
    "lg:grid-cols-[repeat(auto-fill,minmax(210px,210px))]";

  return (
    <div className="relative overflow-hidden bg-neutral-950 text-neutral-0">
      <section className="pb-16">
        {/* ✅ Match Organizations page structure: one main card wrapper */}
        <section
          className={clsx(
            "mt-4 overflow-hidden rounded-2xl border border-white/10",
            "bg-neutral-950/70 shadow-[0_18px_60px_rgba(0,0,0,0.55)]",
          )}
        >
          <div
            className={clsx(
              "relative p-4 md:p-5",
              "bg-[radial-gradient(900px_320px_at_25%_0%,rgba(154,70,255,0.10),transparent_60%),radial-gradient(900px_320px_at_90%_110%,rgba(66,139,255,0.08),transparent_55%)]",
            )}
          >
            {/* ✅ Header layout (left → right) exactly like Organizations:
                Events title + subtitle | Search | Grid/List | Sort | Upcoming dropdown | Create button */}
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-base font-semibold tracking-[0.18em] text-neutral-300">
                  EVENTS
                </div>
                <div className="mt-1 text-neutral-400">
                  Track performance, manage drafts, and jump into event setup.
                </div>
              </div>

              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
                {/* Search bar */}
                <div
                  className={clsx(
                    "relative w-full sm:w-[420px]",
                    "rounded-lg border border-white/10 bg-white/5 h-10",
                  )}
                >
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-300" />
                  <input
                    value={eventsQuery}
                    onChange={(e) => setEventsQuery(e.target.value)}
                    placeholder="Search here"
                    className={clsx(
                      "h-10 w-full rounded-lg bg-transparent",
                      "pl-10 pr-4 text-[12px] text-neutral-100",
                      "placeholder:text-neutral-500",
                      "outline-none border-none focus:ring-1 focus:ring-primary-500",
                    )}
                    aria-label="Search events"
                  />
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2">
                  <GridListToggle
                    value={layout}
                    onChange={setLayout}
                    disabled={view !== "upcoming"}
                    ariaLabel="Layout view toggle"
                  />

                  {/* ✅ Sort button immediately to the right of Grid/List */}
                  <SortControls
                    options={SORT_FIELDS}
                    sortField={sortField}
                    sortDir={sortDir}
                    setSortField={setSortField}
                    setSortDir={setSortDir}
                    defaultDirFor={defaultDirFor}
                    dropdownWidthClass="w-[220px]"
                  />

                  {/* Upcoming dropdown (view selector) */}
                  <MiniSelect
                    value={view}
                    onChange={setView}
                    options={viewOptions}
                    btnClassName="h-10"
                  />

                  {/* Create Event button */}
                  <Button
                    onClick={openOrgPicker}
                    type="button"
                    variant="primary"
                    icon={<CalendarPlus className="h-4 w-4" />}
                    animation
                  >
                    Create Event
                  </Button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="mt-4">
              {/* UPCOMING */}
              {view === "upcoming" ? (
                eventsLoading ? (
                  layout === "grid" ? (
                    <div
                      className={clsx("grid gap-3", gridCols, "justify-start")}
                    >
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="w-full">
                          <Skeleton className="aspect-[71/114] w-full rounded-lg" />
                          <div className="mt-2 space-y-1">
                            <Skeleton className="h-4 w-3/4 rounded-md" />
                            <Skeleton className="h-3 w-1/2 rounded-md" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton
                          key={`up-row-skel-${i}`}
                          className="h-[56px] w-full rounded-[12px]"
                        />
                      ))}
                    </div>
                  )
                ) : upcomingSorted.length === 0 ? (
                  <div className="w-full rounded-2xl border border-dashed border-white/15 bg-transparent p-10 text-center">
                    <p className="text-sm font-medium text-neutral-0">
                      No upcoming events yet
                    </p>
                    <p className="mt-2 text-[12px] text-neutral-400">
                      Create an event and it will appear here once scheduled.
                    </p>
                  </div>
                ) : layout === "grid" ? (
                  <div
                    className={clsx(
                      "grid gap-3",
                      gridCols,
                      "justify-start content-start",
                    )}
                  >
                    {upcomingSorted.map((ev) => {
                      const isPinned = pinnedIds.has(String(ev._id));
                      return (
                        <div key={ev._id} className="relative">
                          <EventCard
                            id={ev._id}
                            title={ev.title}
                            dateLabel={formatEventDate(ev.date)}
                            venue={ev.location ?? ""}
                            category={ev.category ?? ""}
                            img={ev.image ?? ""}
                            href={`/dashboard/events/${ev._id}`}
                            className="w-full"
                          />

                          <PinOverlayButton
                            pinned={isPinned}
                            onToggle={() =>
                              togglePin(String(ev._id), !isPinned)
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingSorted.map((ev) => {
                      const isPinned = pinnedIds.has(String(ev._id));
                      return (
                        <EventRowCard
                          key={ev._id}
                          ev={ev}
                          pinned={isPinned}
                          onTogglePin={() =>
                            togglePin(String(ev._id), !isPinned)
                          }
                        />
                      );
                    })}
                  </div>
                )
              ) : null}

              {/* PAST */}
              {view === "past" ? (
                eventsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-[92px] rounded-2xl" />
                    <Skeleton className="h-[92px] rounded-2xl" />
                    <Skeleton className="h-[92px] rounded-2xl" />
                  </div>
                ) : pastSorted.length === 0 ? (
                  <div className="w-full rounded-2xl border border-dashed border-white/15 bg-transparent p-10 text-center">
                    <p className="text-sm font-medium text-neutral-0">
                      No past events yet
                    </p>
                    <p className="mt-2 text-[12px] text-neutral-400">
                      Once you’ve hosted events, they’ll show up here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pastSorted.map((ev, idx) => {
                      const revenue = revenueOf(ev) || 123_382;
                      const ticketsSold = ticketsOf(ev) || 328;

                      const activeRow = idx === 0;

                      const rowImg =
                        ev.image && ev.image.trim()
                          ? ev.image.trim()
                          : EVENT_CARD_DEFAULT_POSTER;

                      return (
                        <Link
                          key={ev._id}
                          href={`/dashboard/events/${ev._id}`}
                          className={clsx(
                            "group relative block rounded-lg border transition-colors duration-200 ease-out",
                            activeRow
                              ? "border-white/10 bg-neutral-948/10"
                              : "border-transparent bg-transparent hover:bg-white/4",
                          )}
                        >
                          <span
                            className={clsx(
                              "pointer-events-none absolute inset-0 z-0 rounded-lg",
                              "opacity-0 transition-opacity duration-250 ease-out",
                              "group-hover:opacity-100",
                              "bg-[radial-gradient(900px_220px_at_20%_0%,rgba(154,70,255,0.10),transparent_55%),radial-gradient(700px_220px_at_95%_120%,rgba(66,139,255,0.08),transparent_55%)]",
                            )}
                          />
                          <span
                            className={clsx(
                              "pointer-events-none absolute inset-0 z-0 rounded-lg",
                              "opacity-0 transition-opacity duration-250 ease-out",
                              "group-hover:opacity-100",
                              "shadow-[0_0_0_1px_rgba(154,70,255,0.22),0_0_22px_rgba(154,70,255,0.14)]",
                            )}
                          />

                          <div className="relative z-10 flex flex-col gap-3 p-3 md:flex-row md:items-center md:gap-4 md:p-4">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="h-[54px] w-[54px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-neutral-900">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={rowImg}
                                  alt=""
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    const img = e.currentTarget;
                                    if (img.src !== EVENT_CARD_DEFAULT_POSTER) {
                                      img.onerror = null;
                                      img.src = EVENT_CARD_DEFAULT_POSTER;
                                    }
                                  }}
                                />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-[15px] font-semibold text-neutral-0">
                                  {ev.title}
                                </p>
                                <p className="mt-1 truncate text-xs text-primary-500">
                                  {formatDateLine(ev.date)}
                                </p>
                              </div>
                            </div>

                            <div className="grid flex-1 grid-cols-1 gap-3 text-left sm:grid-cols-3 sm:text-center">
                              <div>
                                <p className="text-base font-semibold text-neutral-0">
                                  {money(revenue)}
                                </p>
                                <p className="mt-1 text-neutral-400">Revenue</p>
                              </div>

                              <div>
                                <p className="text-base font-semibold text-neutral-0">
                                  {ticketsSold.toLocaleString()}
                                </p>
                                <p className="mt-1 text-neutral-400">
                                  Tickets Sold
                                </p>
                              </div>

                              <div>
                                <p className="text-base font-semibold text-neutral-0">
                                  {formatEventDate(ev.date)}
                                </p>
                                <p className="mt-1 text-neutral-400">
                                  Event Date
                                </p>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )
              ) : null}

              {/* DRAFTS */}
              {view === "drafts" ? (
                eventsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-[92px] rounded-2xl" />
                    <Skeleton className="h-[92px] rounded-2xl" />
                    <Skeleton className="h-[92px] rounded-2xl" />
                  </div>
                ) : draftsSorted.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-neutral-950/50 p-10 text-center">
                    <p className="text-sm font-medium text-neutral-0">
                      No drafts yet
                    </p>
                    <p className="mt-1 text-xs text-neutral-300">
                      Start creating an event and save it as a draft to keep
                      building it later.
                    </p>
                    <button
                      type="button"
                      onClick={openOrgPicker}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-4 py-3 text-xs font-medium text-white transition hover:bg-primary-600 cursor-pointer"
                    >
                      <CalendarPlus className="h-4 w-4" />
                      Create Event
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {draftsSorted.map((ev, idx) => {
                      const activeRow = idx === 0;

                      const rowImg =
                        ev.image && ev.image.trim()
                          ? ev.image.trim()
                          : EVENT_CARD_DEFAULT_POSTER;

                      return (
                        <Link
                          key={ev._id}
                          href={`/dashboard/events/${ev._id}`}
                          className={clsx(
                            "group relative block rounded-lg border transition-colors duration-200 ease-out",
                            activeRow
                              ? "border-white/10 bg-neutral-948/10"
                              : "border-transparent bg-transparent hover:bg-white/4",
                          )}
                        >
                          <span
                            className={clsx(
                              "pointer-events-none absolute inset-0 z-0 rounded-lg",
                              "opacity-0 transition-opacity duration-250 ease-out",
                              "group-hover:opacity-100",
                              "bg-[radial-gradient(900px_220px_at_20%_0%,rgba(154,70,255,0.10),transparent_55%),radial-gradient(700px_220px_at_95%_120%,rgba(66,139,255,0.08),transparent_55%)]",
                            )}
                          />
                          <span
                            className={clsx(
                              "pointer-events-none absolute inset-0 z-0 rounded-lg",
                              "opacity-0 transition-opacity duration-250 ease-out",
                              "group-hover:opacity-100",
                              "shadow-[0_0_0_1px_rgba(154,70,255,0.22),0_0_22px_rgba(154,70,255,0.14)]",
                            )}
                          />

                          <div className="relative z-10 flex flex-col gap-3 p-3 md:flex-row md:items-center md:gap-4 md:p-4">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="h-[54px] w-[54px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-neutral-900">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={rowImg}
                                  alt=""
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    const img = e.currentTarget;
                                    if (img.src !== EVENT_CARD_DEFAULT_POSTER) {
                                      img.onerror = null;
                                      img.src = EVENT_CARD_DEFAULT_POSTER;
                                    }
                                  }}
                                />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-[15px] font-semibold text-neutral-0">
                                  {ev.title}
                                </p>
                                <p className="mt-1 truncate text-xs text-primary-500">
                                  {formatDateLine(ev.date)}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-1 items-center justify-start sm:justify-end">
                              <div className="text-left sm:text-center">
                                <p className="text-sm font-semibold text-neutral-0">
                                  Draft
                                </p>
                                <p className="mt-1 text-xs text-neutral-400">
                                  Status
                                </p>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )
              ) : null}
            </div>
          </div>
        </section>
      </section>

      <OrgPickerModal
        open={showOrgPicker}
        orgs={orgsList}
        loading={orgsLoading}
        selectedOrgId={selectedOrgId}
        onSelect={setSelectedOrgId}
        onClose={() => setShowOrgPicker(false)}
        onConfirm={handleOrgPickerConfirm}
      />
    </div>
  );
}
