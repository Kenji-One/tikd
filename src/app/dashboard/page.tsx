/* ------------------------------------------------------------------ */
/*  src/app/dashboard/page.tsx – Tikd Dashboard Home                  */
/* ------------------------------------------------------------------ */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import {
  CalendarPlus,
  ArrowRight,
  Plus,
  Calendar,
  FilePlus2,
  X,
  CheckCircle2,
  ChevronDown,
  DollarSign,
} from "lucide-react";
import DashboardClient from "./DashboardClient";

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
};

type HomeViewId = "home" | "upcoming" | "orgs" | "past" | "drafts";

/* ---------------------------- Helpers ------------------------------ */
async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
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

function normalizeView(v: string | null): HomeViewId {
  if (v === "upcoming" || v === "orgs" || v === "past" || v === "drafts") {
    return v;
  }
  return "home";
}

const VIEW_LABEL: Record<HomeViewId, string> = {
  home: "Home",
  upcoming: "Upcoming Events",
  orgs: "My Organizations",
  past: "Past Events",
  drafts: "Drafts",
};

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

/* -------------------------- Org Card (shared) ---------------------- */
function OrgCard({
  org,
}: {
  org: { _id: string; name: string; logo?: string; website?: string };
}) {
  const site = domainFromUrl(org.website);

  return (
    <Link
      href={`/dashboard/organizations/${org._id}`}
      className={clsx(
        "group relative flex items-center gap-5 rounded-2xl",
        "border border-white/10 bg-neutral-948 p-5",
        "ring-1 ring-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.35)]",
        "transition-all duration-200 hover:-translate-y-0.5",
        "hover:border-primary-700/40 hover:ring-primary-700/25"
      )}
    >
      {/* Logo tile */}
      <div
        className={clsx(
          "relative h-16 w-16 shrink-0 overflow-hidden rounded-md",
          "bg-neutral-900 ring-1 ring-inset ring-white/10",
          "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]",
          "transition-colors duration-200 group-hover:ring-primary-700/40"
        )}
        aria-hidden="true"
      >
        {org.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={org.logo} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-[conic-gradient(from_220deg_at_50%_50%,#6d28d9,#3b82f6,#111827)] text-white">
            <span className="text-lg font-semibold">
              {org.name?.[0]?.toUpperCase() ?? "O"}
            </span>
          </div>
        )}
      </div>

      {/* Text block */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold leading-tight">
          {org.name}
        </p>
        <p className="mt-1 truncate text-sm text-neutral-300/90">
          {site || "Public profile"}
        </p>
      </div>

      {/* Right pill + chevron */}
      <div className="ml-auto flex items-center gap-2">
        <span
          className={clsx(
            "rounded-full px-3 py-1.5 text-xs",
            "text-neutral-200 ring-1 ring-inset ring-white/10",
            "bg-white/5 transition-colors duration-200",
            "group-hover:bg-primary-700/20 group-hover:text-neutral-0"
          )}
        >
          View
        </span>
        <svg
          className="h-4 w-4 text-neutral-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-neutral-0"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M7.5 15l5-5-5-5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Focus ring */}
      <span className="pointer-events-none absolute inset-0 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600/50" />
    </Link>
  );
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
  onSelect: (id: string) => void;
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
      {/* Clickable overlay */}
      <div
        className="absolute inset-0"
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={clsx(
          "relative z-10 w-full max-w-xl rounded-3xl border border-white/12",
          "bg-neutral-950/95 px-5 pb-5 pt-4 shadow-[0_28px_80px_rgba(0,0,0,0.85)]",
          "md:px-7 md:pb-6 md:pt-5"
        )}
        onClick={handlePanelClick}
      >
        {/* Header */}
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

        {/* Content */}
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
                    {/* Logo / initial */}
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

                    {/* Text */}
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

                    {/* Selected badge */}
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

          {/* Footer */}
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

/* ----------------------------- Page -------------------------------- */
export default function DashboardHomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const view = normalizeView(searchParams.get("view"));

  /* Drafts sort (Tikd dropdown style) */
  type SortKey = "newest" | "oldest" | "az" | "za";
  const [draftSort, setDraftSort] = useState<SortKey>("newest");

  /* Upcoming/Past stats sort (Revenue dropdown style) */
  type MetricKey = "revenue" | "tickets" | "date";

  const [showOrgPicker, setShowOrgPicker] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  /* --- data queries --- */
  const { data: orgs, isLoading: orgsLoading } = useQuery<Org[]>({
    queryKey: ["orgs", "dashboard"],
    queryFn: () => fetchJSON<Org[]>("/api/organizations"),
    enabled: !!session,
  });

  const { data: allEvents, isLoading: eventsLoading } = useQuery<MyEvent[]>({
    queryKey: ["myEvents", "dashboard-home"],
    queryFn: () => fetchJSON<MyEvent[]>("/api/events?owned=1"),
    enabled: !!session,
  });

  const orgsList = orgs ?? [];
  const events = allEvents ?? [];

  /* --- computed event lists --- */
  const now = useMemo(() => Date.now(), []);
  const upcoming = events.filter(
    (e) => new Date(e.date).getTime() >= now && e.status !== "draft"
  );
  const past = events.filter(
    (e) => new Date(e.date).getTime() < now && e.status !== "draft"
  );
  const drafts = events.filter((e) => e.status === "draft");

  /* --- orgs: one simple stat (safe for future backend fields) --- */
  const totalOrgRevenue = useMemo(() => {
    const published = events.filter((e) => e.status !== "draft");
    const sum = published.reduce((acc, e) => {
      const raw =
        (e as any).revenue ??
        (e as any).revenueTotal ??
        (e as any).grossRevenue ??
        0;
      return acc + (typeof raw === "number" ? raw : 0);
    }, 0);
    return sum;
  }, [events]);

  /* ---------------------- Navigation helpers ---------------------- */
  function goToView(next: HomeViewId) {
    const href = next === "home" ? "/dashboard" : `/dashboard?view=${next}`;
    router.push(href);
  }

  /* ---------------------- Actions ---------------------- */
  function openOrgPicker() {
    if (orgsList.length > 0) {
      setSelectedOrgId(orgsList[0]._id);
    } else {
      setSelectedOrgId(null);
    }
    setShowOrgPicker(true);
  }

  function handleOrgPickerConfirm() {
    if (!selectedOrgId) return;
    setShowOrgPicker(false);
    const target = `/dashboard/organizations/${selectedOrgId}/events/create`;
    router.push(target);
  }

  /* ---------------------- Home tab ---------------------- */
  function renderHomeTab() {
    return (
      <div className="mt-4 space-y-8">
        {/* Top CTA row */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Build organization */}
          <Link href="/dashboard/organizations/new" className="group block">
            <div className="flex h-full items-center justify-between rounded-xl border border-white/10 bg-neutral-948/90 px-6 py-5 shadow-[0_18px_45px_rgba(0,0,0,0.65)] transition-colors duration-200 hover:border-primary-700/50 hover:bg-neutral-900">
              <div>
                <h2 className="text-base font-semibold text-neutral-0">
                  Build your organization
                </h2>
                <p className="mt-2 text-sm text-neutral-300">
                  Start by crafting your branded empire, then add your events.
                </p>
              </div>
              <div className="ml-4 flex h-11 w-11 items-center justify-center rounded-full bg-neutral-950 text-primary-300 ring-1 ring-primary-700/40 transition-all duration-200 group-hover:bg-primary-600 group-hover:text-white">
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </Link>

          {/* Launch event */}
          <button
            type="button"
            onClick={openOrgPicker}
            className="group block cursor-pointer"
          >
            <div
              className={clsx(
                "flex h-full items-center justify-between rounded-xl border px-6 py-5",
                "border-primary-700/45 bg-neutral-948/95",
                "shadow-[0_18px_45px_rgba(0,0,0,0.75)]",
                "bg-[radial-gradient(circle_at_0%_0%,rgba(154,70,255,0.35),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(66,139,255,0.32),transparent_55%)]",
                "transition-colors duration-200 hover:border-primary-500 hover:bg-primary-950/60"
              )}
            >
              <div>
                <h2 className="text-base font-semibold text-neutral-0 text-start">
                  Launch an event
                </h2>
                <p className="mt-2 text-sm text-neutral-200">
                  Go live in seconds. Pick the organization for this event and
                  start selling tickets.
                </p>
              </div>
              <div className="ml-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary-500 text-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.25)] transition-all duration-200 group-hover:bg-primary-400 group-hover:shadow-[0_0_0_1px_rgba(255,255,255,0.45)]">
                <CalendarPlus className="h-4 w-4" />
              </div>
            </div>
          </button>
        </div>
        <DashboardClient />
      </div>
    );
  }

  /* -------------------- Shared: Stats list panel (Figma design) -------------------- */
  function EventsStatsListPanel({
    title,
    list,
    defaultMetric = "revenue",
    dateSortMode,
    emptyTitle,
    emptySub,
  }: {
    title: string;
    list: MyEvent[];
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

      const revenueOf = (e: MyEvent) => {
        const raw =
          (e as any).revenue ??
          (e as any).revenueTotal ??
          (e as any).grossRevenue ??
          0;
        return typeof raw === "number" ? raw : 0;
      };

      const ticketsOf = (e: MyEvent) => {
        const raw = (e as any).ticketsSold ?? (e as any).sold ?? 0;
        return typeof raw === "number" ? raw : 0;
      };

      if (metric === "revenue")
        return arr.sort((a, b) => revenueOf(b) - revenueOf(a));
      if (metric === "tickets")
        return arr.sort((a, b) => ticketsOf(b) - ticketsOf(a));

      // date
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
          {/* Header */}
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

          {/* List */}
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
                  {emptyTitle}
                </p>
                <p className="mt-1 text-xs text-neutral-300">{emptySub}</p>
              </div>
            ) : (
              sorted.map((ev, idx) => {
                // keep placeholders until backend stats exist (won’t break when added)
                const revenue =
                  typeof (ev as any).revenue === "number"
                    ? (ev as any).revenue
                    : typeof (ev as any).revenueTotal === "number"
                      ? (ev as any).revenueTotal
                      : 123382;

                const ticketsSold =
                  typeof (ev as any).ticketsSold === "number"
                    ? (ev as any).ticketsSold
                    : typeof (ev as any).sold === "number"
                      ? (ev as any).sold
                      : 328;

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
                      {/* left: poster + title */}
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

                      {/* right: metrics */}
                      <div className="grid flex-1 grid-cols-1 gap-3 text-left sm:grid-cols-3 sm:text-center">
                        <div>
                          <p className="text-sm font-semibold text-neutral-0">
                            {money(revenue)}
                          </p>
                          <p className="mt-1 text-xs text-neutral-400">
                            Revenue
                          </p>
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

  /* -------------------- Drafts list panel (same design, no stats) -------------------- */
  function DraftsListPanel({ list }: { list: MyEvent[] }) {
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
          {/* Header */}
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

          {/* List */}
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
                  Start creating an event and save it as a draft to keep
                  building it later.
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
                      {/* left: poster + title */}
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

                      {/* right: status only (no statistics) */}
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

  /* ---------------------- Orgs Tab (same panel styling + total revenue) ---------------------- */
  function renderOrgsTab(full = false) {
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
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-neutral-300">
                My Organizations
              </p>
              <p className="mt-1 text-xs text-neutral-400">
                {full
                  ? "Create and manage organizations that own your events."
                  : "All the brands and teams you manage in Tikd."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-neutral-200">
                <DollarSign className="h-4 w-4 text-neutral-400" />
                <span className="font-semibold text-neutral-0">
                  {money(totalOrgRevenue)}
                </span>
                <span className="text-neutral-400">Total revenue</span>
              </span>

              <Link
                href="/dashboard/organizations/new"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-neutral-0 transition-colors hover:border-primary-600/60 hover:bg-primary-700/30"
              >
                <Plus className="h-3 w-3" />
                New organization
              </Link>
            </div>
          </div>

          {orgsLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
          ) : orgsList.length ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {orgsList.map((o) => (
                <OrgCard key={o._id} org={o} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/15 bg-neutral-950/50 p-10 text-center">
              <p className="text-sm font-medium text-neutral-0">
                You don&apos;t have any organizations yet.
              </p>
              <p className="mt-1 text-xs text-neutral-300">
                Create an organization to host events under your own brand.
              </p>
              <Link
                href="/dashboard/organizations/new"
                className="mt-4 inline-flex items-center justify-center rounded-full border border-white/14 bg-white/5 px-4 py-2 text-xs font-medium text-neutral-0 transition hover:bg-white/10"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add your first organization
              </Link>
            </div>
          )}
        </div>
      </section>
    );
  }

  /* ---------------------- Upcoming (same original list design) ---------------------- */
  function UpcomingEventsSection({ list }: { list: MyEvent[] }) {
    return (
      <EventsStatsListPanel
        title="Upcoming Events"
        list={list}
        defaultMetric="revenue"
        dateSortMode="soonest"
        emptyTitle="No upcoming events yet"
        emptySub="Create an event and it will appear here once scheduled."
      />
    );
  }

  /* ---------------------- Past (same exact design as Upcoming) ---------------------- */
  function PastEventsSection({ list }: { list: MyEvent[] }) {
    return (
      <EventsStatsListPanel
        title="Past Events"
        list={list}
        defaultMetric="revenue"
        dateSortMode="latest"
        emptyTitle="No past events yet"
        emptySub="Once you’ve hosted events, they’ll show up here."
      />
    );
  }

  let content: ReactNode;
  switch (view) {
    case "home":
      content = renderHomeTab();
      break;
    case "upcoming":
      content = <UpcomingEventsSection list={upcoming} />;
      break;
    case "orgs":
      content = renderOrgsTab(true);
      break;
    case "past":
      content = <PastEventsSection list={past} />;
      break;
    case "drafts":
      content = <DraftsListPanel list={drafts} />;
      break;
    default:
      content = renderHomeTab();
  }

  return (
    <div className="relative overflow-hidden bg-neutral-950 text-neutral-0">
      <section className="pb-20">
        {/* Mobile section picker (since sidebar is hidden on mobile) */}
        <div className="mt-6 md:hidden">
          <label
            htmlFor="dashboard-view"
            className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400"
          >
            Section
          </label>
          <div className="relative">
            <select
              id="dashboard-view"
              value={view}
              onChange={(e) => goToView(e.target.value as HomeViewId)}
              className={clsx(
                "h-[44px] w-full appearance-none rounded-full border border-white/10",
                "bg-[#121420] px-4 pr-10 text-sm text-neutral-0",
                "focus:outline-none focus-visible:border-violet-500/50"
              )}
            >
              <option value="home">Home</option>
              <option value="upcoming">Upcoming Events</option>
              <option value="orgs">My Organizations</option>
              <option value="past">Past Events</option>
              <option value="drafts">Drafts</option>
            </select>
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neutral-300">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                aria-hidden="true"
              >
                <path
                  d="M11.333 6.113a.67.67 0 0 0-.47-.194c-.176 0-.345.07-.47.194L8 8.473 5.64 6.113a.665.665 0 0 0-.94 0 .66.66 0 0 0 0 .947l2.827 2.827a.666.666 0 0 0 .946 0l2.86-2.827a.66.66 0 0 0 0-.947Z"
                  fill="currentColor"
                />
              </svg>
            </span>
          </div>
        </div>

        {/* Desktop page label (sidebar handles actual navigation) */}
        <div className="mt-6 hidden md:block">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
            {VIEW_LABEL[view]}
          </p>
        </div>

        {/* Active section content */}
        {content}
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
