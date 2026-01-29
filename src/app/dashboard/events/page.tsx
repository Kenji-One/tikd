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
} from "lucide-react";

import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { EventCard } from "@/components/ui/EventCard";
import { EVENT_CARD_DEFAULT_POSTER } from "@/components/ui/EventCard";

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
          "h-[34px] w-[34px] rounded-[4px] border border-white/10",
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

/* -------------------- Upcoming (GRID) panel ------------------------- */
function UpcomingEventsGridPanel({
  list,
  eventsLoading,
  emptyTitle,
  emptySub,
  pinnedIds,
  onTogglePin,
}: {
  list: MyEvent[];
  eventsLoading: boolean;
  emptyTitle: string;
  emptySub: string;
  pinnedIds: Set<string>;
  onTogglePin: (id: string, nextPinned: boolean) => void;
}) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function defaultDirFor(field: SortField): SortDir {
    if (field === "title") return "asc";
    if (field === "eventDate") return "asc";
    return "desc";
  }

  const sorted = useMemo(() => {
    const arr = [...list];

    if (!sortField) {
      const base = arr.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      return pinnedFirst(base, pinnedIds);
    }

    const dirMul = sortDir === "asc" ? 1 : -1;

    switch (sortField) {
      case "title":
        return pinnedFirst(
          arr.sort((a, b) => a.title.localeCompare(b.title) * dirMul),
          pinnedIds,
        );
      case "pageViews":
        return pinnedFirst(
          arr.sort((a, b) => (viewsOf(a) - viewsOf(b)) * dirMul),
          pinnedIds,
        );
      case "ticketsSold":
        return pinnedFirst(
          arr.sort((a, b) => (ticketsOf(a) - ticketsOf(b)) * dirMul),
          pinnedIds,
        );
      case "revenue":
        return pinnedFirst(
          arr.sort((a, b) => (revenueOf(a) - revenueOf(b)) * dirMul),
          pinnedIds,
        );
      case "eventDate":
        return pinnedFirst(
          arr.sort(
            (a, b) =>
              (new Date(a.date).getTime() - new Date(b.date).getTime()) *
              dirMul,
          ),
          pinnedIds,
        );
      default:
        return arr;
    }
  }, [list, sortField, sortDir, pinnedIds]);

  const gridCols =
    "grid-cols-[repeat(auto-fill,minmax(170px,170px))] " +
    "sm:grid-cols-[repeat(auto-fill,minmax(190px,190px))] " +
    "md:grid-cols-[repeat(auto-fill,minmax(200px,200px))] " +
    "lg:grid-cols-[repeat(auto-fill,minmax(210px,210px))]";

  return (
    <section
      className={clsx(
        "mt-4 overflow-hidden rounded-2xl border border-white/10",
        "bg-neutral-950/70 shadow-[0_18px_60px_rgba(0,0,0,0.55)]",
      )}
    >
      <div
        className={clsx(
          "relative p-4",
          "bg-[radial-gradient(900px_320px_at_25%_0%,rgba(154,70,255,0.10),transparent_60%),radial-gradient(900px_320px_at_90%_110%,rgba(66,139,255,0.08),transparent_55%)]",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold uppercase tracking-[0.18em] text-neutral-300">
            Upcoming Events
          </p>

          <SortControls
            options={SORT_FIELDS}
            sortField={sortField}
            sortDir={sortDir}
            setSortField={setSortField}
            setSortDir={setSortDir}
            defaultDirFor={defaultDirFor}
            dropdownWidthClass="w-[200px]"
          />
        </div>

        {eventsLoading ? (
          <div className={clsx("mt-4 grid gap-3", gridCols, "justify-start")}>
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
        ) : sorted.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-white/15 bg-neutral-950/50 p-10 text-center">
            <p className="text-sm font-medium text-neutral-0">{emptyTitle}</p>
            <p className="mt-1 text-xs text-neutral-300">{emptySub}</p>
          </div>
        ) : (
          <div
            className={clsx(
              "mt-4 grid gap-3",
              gridCols,
              "justify-start content-start",
            )}
          >
            {sorted.map((ev) => {
              const isPinned = pinnedIds.has(String(ev._id));
              return (
                <EventCard
                  key={ev._id}
                  id={ev._id}
                  title={ev.title}
                  dateLabel={formatEventDate(ev.date)}
                  venue={ev.location ?? ""}
                  category={ev.category ?? ""}
                  img={ev.image ?? ""}
                  href={`/dashboard/events/${ev._id}`}
                  className="w-full"
                  pin={{
                    pinned: isPinned,
                    onToggle: () => onTogglePin(String(ev._id), !isPinned),
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

/* -------------------- Past Events list panel ------------------------ */
function PastEventsListPanel({
  list,
  eventsLoading,
  emptyTitle,
  emptySub,
}: {
  list: MyEvent[];
  eventsLoading: boolean;
  emptyTitle: string;
  emptySub: string;
}) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function defaultDirFor(field: SortField): SortDir {
    if (field === "title") return "asc";
    if (field === "eventDate") return "desc";
    return "desc";
  }

  const sorted = useMemo(() => {
    const arr = [...list];

    if (!sortField) {
      return arr.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
    }

    const dirMul = sortDir === "asc" ? 1 : -1;

    switch (sortField) {
      case "title":
        return arr.sort((a, b) => a.title.localeCompare(b.title) * dirMul);
      case "pageViews":
        return arr.sort((a, b) => (viewsOf(a) - viewsOf(b)) * dirMul);
      case "ticketsSold":
        return arr.sort((a, b) => (ticketsOf(a) - ticketsOf(b)) * dirMul);
      case "revenue":
        return arr.sort((a, b) => (revenueOf(a) - revenueOf(b)) * dirMul);
      case "eventDate":
        return arr.sort(
          (a, b) =>
            (new Date(a.date).getTime() - new Date(b.date).getTime()) * dirMul,
        );
      default:
        return arr;
    }
  }, [list, sortField, sortDir]);

  return (
    <section
      className={clsx(
        "mt-4 rounded-2xl border border-white/10",
        "bg-neutral-950/70 shadow-[0_18px_60px_rgba(0,0,0,0.55)]",
      )}
    >
      <div
        className={clsx(
          "relative p-4",
          "bg-[radial-gradient(900px_320px_at_25%_0%,rgba(154,70,255,0.10),transparent_60%),radial-gradient(900px_320px_at_90%_110%,rgba(66,139,255,0.08),transparent_55%)]",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold uppercase tracking-[0.18em] text-neutral-300">
            Past Events
          </p>

          <SortControls
            options={SORT_FIELDS}
            sortField={sortField}
            sortDir={sortDir}
            setSortField={setSortField}
            setSortDir={setSortDir}
            defaultDirFor={defaultDirFor}
            dropdownWidthClass="w-[200px]"
          />
        </div>

        <div className="mt-3 space-y-2">
          {eventsLoading ? (
            <>
              <Skeleton className="h-[92px] rounded-2xl" />
              <Skeleton className="h-[92px] rounded-2xl" />
              <Skeleton className="h-[92px] rounded-2xl" />
            </>
          ) : sorted.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-neutral-950/50 p-10 text-center">
              <p className="text-sm font-medium text-neutral-0">{emptyTitle}</p>
              <p className="mt-1 text-xs text-neutral-300">{emptySub}</p>
            </div>
          ) : (
            sorted.map((ev, idx) => {
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
                        <p className="mt-1 text-neutral-400">Tickets Sold</p>
                      </div>

                      <div>
                        <p className="text-base font-semibold text-neutral-0">
                          {formatEventDate(ev.date)}
                        </p>
                        <p className="mt-1 text-neutral-400">Event Date</p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

/* -------------------- Drafts list panel ---------------------------- */
function DraftsListPanel({
  list,
  eventsLoading,
  openOrgPicker,
}: {
  list: MyEvent[];
  eventsLoading: boolean;
  openOrgPicker: () => void;
}) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function defaultDirFor(field: SortField): SortDir {
    if (field === "title") return "asc";
    if (field === "eventDate") return "desc";
    return "desc";
  }

  const sorted = useMemo(() => {
    const arr = [...list];

    if (!sortField) {
      return arr.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
    }

    const dirMul = sortDir === "asc" ? 1 : -1;

    switch (sortField) {
      case "title":
        return arr.sort((a, b) => a.title.localeCompare(b.title) * dirMul);
      case "pageViews":
        return arr.sort((a, b) => (viewsOf(a) - viewsOf(b)) * dirMul);
      case "ticketsSold":
        return arr.sort((a, b) => (ticketsOf(a) - ticketsOf(b)) * dirMul);
      case "revenue":
        return arr.sort((a, b) => (revenueOf(a) - revenueOf(b)) * dirMul);
      case "eventDate":
        return arr.sort(
          (a, b) =>
            (new Date(a.date).getTime() - new Date(b.date).getTime()) * dirMul,
        );
      default:
        return arr;
    }
  }, [list, sortField, sortDir]);

  return (
    <section
      className={clsx(
        "mt-4 rounded-2xl border border-white/10",
        "bg-neutral-950/70 shadow-[0_18px_60px_rgba(0,0,0,0.55)]",
      )}
    >
      <div
        className={clsx(
          "relative p-4",
          "bg-[radial-gradient(900px_320px_at_25%_0%,rgba(154,70,255,0.10),transparent_60%),radial-gradient(900px_320px_at_90%_110%,rgba(66,139,255,0.08),transparent_55%)]",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold uppercase tracking-[0.18em] text-neutral-300">
            Drafts
          </p>

          <SortControls
            options={SORT_FIELDS}
            sortField={sortField}
            sortDir={sortDir}
            setSortField={setSortField}
            setSortDir={setSortDir}
            defaultDirFor={defaultDirFor}
            dropdownWidthClass="w-[200px]"
          />
        </div>

        <div className="mt-3 space-y-2">
          {eventsLoading ? (
            <>
              <Skeleton className="h-[92px] rounded-2xl" />
              <Skeleton className="h-[92px] rounded-2xl" />
              <Skeleton className="h-[92px] rounded-2xl" />
            </>
          ) : sorted.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-neutral-950/50 p-10 text-center">
              <p className="text-sm font-medium text-neutral-0">
                No drafts yet
              </p>
              <p className="mt-1 text-xs text-neutral-300">
                Start creating an event and save it as a draft to keep building
                it later.
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
            sorted.map((ev, idx) => {
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
                        <p className="mt-1 text-xs text-neutral-400">Status</p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- Page -------------------------------- */
export default function DashboardEventsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const [view, setView] = useState<EventViewId>("upcoming");

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

  const upcoming = useMemo(
    () =>
      events.filter(
        (e) => new Date(e.date).getTime() >= now && e.status !== "draft",
      ),
    [events, now],
  );
  const past = useMemo(
    () =>
      events.filter(
        (e) => new Date(e.date).getTime() < now && e.status !== "draft",
      ),
    [events, now],
  );
  const drafts = useMemo(
    () => events.filter((e) => e.status === "draft"),
    [events],
  );

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

  const viewOptions: { key: EventViewId; label: string }[] = [
    { key: "upcoming", label: "Upcoming" },
    { key: "past", label: "Past" },
    { key: "drafts", label: "Drafts" },
  ];

  return (
    <div className="relative bg-neutral-950 text-neutral-0">
      <section className="pb-20">
        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-3xl font-bold tracking-[-0.03em] text-neutral-50">
              Events
            </p>
            <p className="mt-1 text-[13px] tracking-[-0.02em] text-neutral-400">
              Track performance, manage drafts, and jump into event setup.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <MiniSelect value={view} onChange={setView} options={viewOptions} />
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

        {view === "upcoming" ? (
          <UpcomingEventsGridPanel
            list={upcoming}
            eventsLoading={eventsLoading}
            emptyTitle="No upcoming events yet"
            emptySub="Create an event and it will appear here once scheduled."
            pinnedIds={pinnedIds}
            onTogglePin={togglePin}
          />
        ) : view === "past" ? (
          <PastEventsListPanel
            list={past}
            eventsLoading={eventsLoading}
            emptyTitle="No past events yet"
            emptySub="Once you’ve hosted events, they’ll show up here."
          />
        ) : (
          <DraftsListPanel
            list={drafts}
            eventsLoading={eventsLoading}
            openOrgPicker={openOrgPicker}
          />
        )}
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
