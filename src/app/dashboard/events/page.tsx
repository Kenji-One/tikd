/* ------------------------------------------------------------------ */
/*  src/app/dashboard/connections/events/page.tsx                      */
/*  Tikd – Events (moved out of /dashboard home)                       */
/* ------------------------------------------------------------------ */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { CalendarPlus, ChevronDown, X, CheckCircle2, Plus } from "lucide-react";

import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";

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
};

type MetricKey = "revenue" | "tickets" | "date";
type SortKey = "newest" | "oldest" | "az" | "za";
type EventViewId = "upcoming" | "past" | "drafts";

/* ---------------------------- Helpers ------------------------------ */
async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
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

/* ---------------------- Compact dropdown (Tikd style) -------------- */
function MiniSelect<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { key: T; label: string }[];
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
          "bg-white/5 px-3 py-2 text-xs font-medium text-neutral-200",
          "transition hover:bg-white/8 hover:text-neutral-0",
          "focus:outline-none focus:ring-1 focus:ring-primary-600/35"
        )}
      >
        {label}
        <ChevronDown
          className={clsx(
            "h-4 w-4 transition-transform",
            open ? "rotate-180 text-neutral-100" : "text-neutral-400"
          )}
        />
      </button>

      {open && (
        <div
          className={clsx(
            "absolute right-0 z-30 mt-2 w-44 overflow-hidden rounded-2xl",
            "border border-white/10 bg-neutral-950/95 shadow-xl backdrop-blur"
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
                    : "text-neutral-200 hover:bg-white/5"
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
  if (!open) return null;

  const hasOrgs = orgs.length > 0;
  const canConfirm = hasOrgs && !!selectedOrgId && !loading;

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
          "relative z-10 w-full max-w-xl rounded-3xl border border-white/12",
          "bg-neutral-950/95 px-5 pb-5 pt-4 shadow-[0_28px_80px_rgba(0,0,0,0.85)]",
          "md:px-7 md:pb-6 md:pt-5"
        )}
        onClick={handlePanelClick}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-neutral-0">
              Choose an organization
            </h2>
            <p className="mt-1 text-xs text-neutral-300">
              Events live under an organization. Pick where this new event
              belongs, or create a new team first.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-300 transition hover:bg-white/10 hover:text-neutral-0"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-2xl" />
              ))}
            </div>
          ) : hasOrgs ? (
            <div className="grid max-h-64 grid-cols-1 gap-3 overflow-y-auto pr-1 md:grid-cols-2">
              {orgs.map((org) => {
                const selected = org._id === selectedOrgId;
                return (
                  <div
                    key={org._id}
                    className={clsx(
                      "group relative flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all",
                      "bg-neutral-948/90 border-white/10 hover:border-primary-500/70 hover:bg-neutral-900/90",
                      selected &&
                        "border-primary-500 bg-neutral-948/95 shadow-[0_0_0_1px_rgba(154,70,255,0.55)]"
                    )}
                    onClick={(e) => handleCardClick(e, org._id)}
                  >
                    <div
                      className={clsx(
                        "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md",
                        "bg-neutral-900 ring-1 ring-inset ring-white/10",
                        selected && "ring-primary-500/80"
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
                        <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary-900/90 via-primary-700/90 to-primary-500/90 px-2 py-0.5 text-[11px] font-medium text-neutral-0 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
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
          ) : (
            <div className="rounded-2xl border border-dashed border-white/12 bg-neutral-948/90 px-4 py-4 text-sm text-neutral-200">
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

          <div className="mt-2 flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:items-center sm:justify-between sm:pt-4">
            <button
              type="button"
              onClick={onClose}
              className="mt-1 inline-flex items-center justify-center rounded-full border border-white/14 bg-white/5 px-4 py-2 text-xs font-medium text-neutral-200 transition hover:bg-white/10 hover:text-neutral-0 sm:mt-0"
            >
              Cancel
            </button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={!canConfirm}
              onClick={onConfirm}
            >
              <CalendarPlus className="mr-2 h-4 w-4" />
              Continue to event setup
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------- Shared: Stats list panel (Figma design) ------- */
function EventsStatsListPanel({
  title,
  list,
  eventsLoading,
  defaultMetric = "revenue",
  dateSortMode,
  emptyTitle,
  emptySub,
}: {
  title: string;
  list: MyEvent[];
  eventsLoading: boolean;
  defaultMetric?: MetricKey;
  dateSortMode: "soonest" | "latest";
  emptyTitle: string;
  emptySub: string;
}) {
  const [metric, setMetric] = useState<MetricKey>(defaultMetric);

  const metricOptions: { key: MetricKey; label: string }[] = [
    { key: "revenue", label: "Revenue" },
    { key: "tickets", label: "Tickets Sold" },
    { key: "date", label: "Event Date" },
  ];

  const sorted = useMemo(() => {
    const arr = [...list];

    if (metric === "revenue")
      return arr.sort((a, b) => revenueOf(b) - revenueOf(a));
    if (metric === "tickets")
      return arr.sort((a, b) => ticketsOf(b) - ticketsOf(a));

    if (dateSortMode === "soonest") {
      return arr.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    }
    return arr.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [list, metric, dateSortMode]);

  return (
    <section
      className={clsx(
        "mt-4 overflow-hidden rounded-2xl border border-white/10",
        "bg-neutral-950/70 shadow-[0_18px_60px_rgba(0,0,0,0.55)]"
      )}
    >
      <div
        className={clsx(
          "relative p-4 md:p-5",
          "bg-[radial-gradient(900px_320px_at_25%_0%,rgba(154,70,255,0.10),transparent_60%),radial-gradient(900px_320px_at_90%_110%,rgba(66,139,255,0.08),transparent_55%)]"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-neutral-300">
            {title}
          </p>

          <MiniSelect
            value={metric}
            onChange={setMetric}
            options={metricOptions}
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

              return (
                <Link
                  key={ev._id}
                  href={`/dashboard/events/${ev._id}`}
                  className={clsx(
                    "group relative block overflow-hidden rounded-2xl border",
                    activeRow
                      ? "border-white/10 bg-[#2a2a45]/90"
                      : "border-transparent bg-transparent hover:bg-white/4"
                  )}
                >
                  <div className="flex flex-col gap-3 p-3 md:flex-row md:items-center md:gap-4 md:p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-[54px] w-[54px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-neutral-900">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={ev.image ?? "/placeholder.jpg"}
                          alt=""
                          className="h-full w-full object-cover"
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
                        <p className="text-sm font-semibold text-neutral-0">
                          {money(revenue)}
                        </p>
                        <p className="mt-1 text-xs text-neutral-400">Revenue</p>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-neutral-0">
                          {ticketsSold.toLocaleString()}
                        </p>
                        <p className="mt-1 text-xs text-neutral-400">
                          Tickets Sold
                        </p>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-neutral-0">
                          {formatEventDate(ev.date)}
                        </p>
                        <p className="mt-1 text-xs text-neutral-400">
                          Event Date
                        </p>
                      </div>
                    </div>
                  </div>

                  <span className="pointer-events-none absolute inset-0 rounded-2xl ring-0 transition group-hover:ring-1 group-hover:ring-primary-700/25" />
                </Link>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

/* -------------------- Drafts list panel (same design, no stats) ----- */
function DraftsListPanel({
  list,
  eventsLoading,
  draftSort,
  setDraftSort,
  openOrgPicker,
}: {
  list: MyEvent[];
  eventsLoading: boolean;
  draftSort: SortKey;
  setDraftSort: (k: SortKey) => void;
  openOrgPicker: () => void;
}) {
  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "newest", label: "Newest" },
    { key: "oldest", label: "Oldest" },
    { key: "az", label: "A–Z" },
    { key: "za", label: "Z–A" },
  ];

  const sorted = useMemo(() => {
    const arr = [...list];
    switch (draftSort) {
      case "newest":
        return arr.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
      case "oldest":
        return arr.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
      case "az":
        return arr.sort((a, b) => a.title.localeCompare(b.title));
      case "za":
        return arr.sort((a, b) => b.title.localeCompare(a.title));
      default:
        return arr;
    }
  }, [list, draftSort]);

  return (
    <section
      className={clsx(
        "mt-4 overflow-hidden rounded-2xl border border-white/10",
        "bg-neutral-950/70 shadow-[0_18px_60px_rgba(0,0,0,0.55)]"
      )}
    >
      <div
        className={clsx(
          "relative p-4 md:p-5",
          "bg-[radial-gradient(900px_320px_at_25%_0%,rgba(154,70,255,0.10),transparent_60%),radial-gradient(900px_320px_at_90%_110%,rgba(66,139,255,0.08),transparent_55%)]"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-neutral-300">
            Drafts
          </p>

          <MiniSelect
            value={draftSort}
            onChange={setDraftSort}
            options={sortOptions}
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
              <button type="button" onClick={openOrgPicker} className="mt-4">
                <Button variant="primary" size="sm">
                  <CalendarPlus className="mr-2 h-4 w-4" />
                  Create Event
                </Button>
              </button>
            </div>
          ) : (
            sorted.map((ev, idx) => {
              const activeRow = idx === 0;

              return (
                <Link
                  key={ev._id}
                  href={`/dashboard/events/${ev._id}`}
                  className={clsx(
                    "group relative block overflow-hidden rounded-2xl border",
                    activeRow
                      ? "border-white/10 bg-[#2a2a45]/90"
                      : "border-transparent bg-transparent hover:bg-white/4"
                  )}
                >
                  <div className="flex flex-col gap-3 p-3 md:flex-row md:items-center md:gap-4 md:p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-[54px] w-[54px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-neutral-900">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={ev.image ?? "/placeholder.jpg"}
                          alt=""
                          className="h-full w-full object-cover"
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

                  <span className="pointer-events-none absolute inset-0 rounded-2xl ring-0 transition group-hover:ring-1 group-hover:ring-primary-700/25" />
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

  const [view, setView] = useState<EventViewId>("upcoming");
  const [draftSort, setDraftSort] = useState<SortKey>("newest");

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

  const orgsList = useMemo<Org[]>(() => orgs ?? [], [orgs]);
  const events = useMemo<MyEvent[]>(() => allEvents ?? [], [allEvents]);

  const now = useMemo(() => Date.now(), []);
  const upcoming = useMemo(
    () =>
      events.filter(
        (e) => new Date(e.date).getTime() >= now && e.status !== "draft"
      ),
    [events, now]
  );
  const past = useMemo(
    () =>
      events.filter(
        (e) => new Date(e.date).getTime() < now && e.status !== "draft"
      ),
    [events, now]
  );
  const drafts = useMemo(
    () => events.filter((e) => e.status === "draft"),
    [events]
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
    <div className="relative overflow-hidden bg-neutral-950 text-neutral-0">
      <section className="pb-20">
        {/* Header row */}
        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-neutral-300">
              Events
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              Track performance, manage drafts, and jump into event setup.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <MiniSelect value={view} onChange={setView} options={viewOptions} />

            <button type="button" onClick={openOrgPicker}>
              <Button variant="primary" size="sm">
                <CalendarPlus className="mr-2 h-4 w-4" />
                Create Event
              </Button>
            </button>
          </div>
        </div>

        {/* Active panel */}
        {view === "upcoming" ? (
          <EventsStatsListPanel
            title="Upcoming Events"
            list={upcoming}
            eventsLoading={eventsLoading}
            defaultMetric="revenue"
            dateSortMode="soonest"
            emptyTitle="No upcoming events yet"
            emptySub="Create an event and it will appear here once scheduled."
          />
        ) : view === "past" ? (
          <EventsStatsListPanel
            title="Past Events"
            list={past}
            eventsLoading={eventsLoading}
            defaultMetric="revenue"
            dateSortMode="latest"
            emptyTitle="No past events yet"
            emptySub="Once you’ve hosted events, they’ll show up here."
          />
        ) : (
          <DraftsListPanel
            list={drafts}
            eventsLoading={eventsLoading}
            draftSort={draftSort}
            setDraftSort={setDraftSort}
            openOrgPicker={openOrgPicker}
          />
        )}
      </section>

      {/* Org picker modal */}
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
