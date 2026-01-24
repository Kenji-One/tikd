/* ------------------------------------------------------------------ */
/*  src/app/dashboard/finances/payout-portal/PayoutPortalClient.tsx    */
/* ------------------------------------------------------------------ */
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  ArrowLeft,
  LayoutGrid,
  List,
  MoreVertical,
  Search,
  Sparkles,
  Ticket,
  TrendingUp,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import SortArrowsIcon from "@/components/ui/SortArrowsIcon";
import DateRangePicker, {
  type DateRangeValue,
} from "@/components/ui/DateRangePicker";

/* ------------------------------ Types ------------------------------ */
type PayoutStatus = "completed" | "inProgress" | "notStarted";

type PayoutRow = {
  id: string;
  event: string;
  eventThumbUrl?: string | null;
  dateISO: string; // ISO date
  ticketsSold: number;
  revenue: number; // USD
  status: PayoutStatus;
};

type FilterTab = "all" | PayoutStatus;

type SortKey = "event" | "date" | "ticketsSold" | "revenue" | "status";
type SortDir = "asc" | "desc";

/* ----------------------------- Helpers ----------------------------- */
function formatUSD(n: number) {
  // round to whole dollars (no cents)
  const whole = Math.round(Number(n) || 0);
  return `$${whole.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function fmtTableDate(iso: string) {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function clampToDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function sameDay(a: Date, b: Date) {
  return clampToDay(a).getTime() === clampToDay(b).getTime();
}

function inDayRange(d: Date, start: Date, end: Date) {
  const t = clampToDay(d).getTime();
  const a = clampToDay(start).getTime();
  const b = clampToDay(end).getTime();
  return t >= Math.min(a, b) && t <= Math.max(a, b);
}

function compareStrings(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function sortRows(rows: PayoutRow[], key: SortKey, dir: SortDir) {
  const mul = dir === "asc" ? 1 : -1;
  const copy = [...rows];

  copy.sort((A, B) => {
    if (key === "ticketsSold") return (A.ticketsSold - B.ticketsSold) * mul;
    if (key === "revenue") return (A.revenue - B.revenue) * mul;
    if (key === "date") {
      const a = new Date(A.dateISO).getTime();
      const b = new Date(B.dateISO).getTime();
      return (a - b) * mul;
    }
    if (key === "status") return compareStrings(A.status, B.status) * mul;
    return compareStrings(A.event, B.event) * mul;
  });

  return copy;
}

function statusLabel(s: PayoutStatus) {
  if (s === "completed") return "Completed";
  if (s === "inProgress") return "In-Progress";
  return "Not-Started";
}

function statusPillClasses(s: PayoutStatus) {
  if (s === "completed") {
    return "bg-success-900/35 text-success-400 ring-1 ring-success-700/25";
  }
  if (s === "inProgress") {
    return "bg-warning-900/30 text-warning-400 ring-1 ring-warning-700/25";
  }
  return "bg-neutral-900/35 text-neutral-300 ring-1 ring-neutral-700/25";
}

function svgDataUri(svg: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function hashHue(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % 360;
}

/** Small “poster” thumbnail placeholder (for Event column) */
function posterPlaceholderUrl(seed: string) {
  const hue = hashHue(seed);
  const hue2 = (hue + 38) % 360;

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="hsl(${hue} 90% 60%)" stop-opacity="0.85"/>
        <stop offset="1" stop-color="hsl(${hue2} 90% 55%)" stop-opacity="0.25"/>
      </linearGradient>
      <radialGradient id="r" cx="30%" cy="20%" r="70%">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/>
        <stop offset="1" stop-color="#000000" stop-opacity="0"/>
      </radialGradient>
    </defs>

    <rect x="4" y="4" width="64" height="64" rx="14" fill="rgba(18,18,32,1)"/>
    <rect x="6" y="6" width="60" height="60" rx="12" fill="url(#g)"/>
    <rect x="6" y="6" width="60" height="60" rx="12" fill="url(#r)"/>

    <rect x="16" y="18" width="40" height="10" rx="5" fill="rgba(0,0,0,0.20)"/>
    <rect x="16" y="34" width="28" height="8" rx="4" fill="rgba(0,0,0,0.22)"/>
    <rect x="16" y="46" width="34" height="8" rx="4" fill="rgba(0,0,0,0.16)"/>

    <circle cx="56" cy="54" r="7" fill="rgba(255,255,255,0.20)"/>
    <circle cx="56" cy="54" r="3" fill="rgba(255,255,255,0.55)"/>
  </svg>`;

  return svgDataUri(svg);
}

function downloadCsv(filename: string, rows: string[][]) {
  const escape = (s: string) => {
    const needs = /[",\n]/.test(s);
    const out = s.replace(/"/g, '""');
    return needs ? `"${out}"` : out;
  };

  const csv = rows
    .map((r) => r.map((c) => escape(String(c ?? ""))).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ------------------------------ Data ------------------------------ */
async function getPayoutPortalDummy(): Promise<{
  rows: PayoutRow[];
  monthlyRevenue: number;
  pendingRevenue: number;
}> {
  return {
    monthlyRevenue: 84_912.81,
    pendingRevenue: 429_862.92,
    rows: [
      {
        id: "PO-23918",
        event: "Summer Rooftop Party",
        eventThumbUrl: posterPlaceholderUrl("Summer Rooftop Party"),
        dateISO: "2026-12-19T10:00:00.000Z",
        ticketsSold: 1298,
        revenue: 157_912.77,
        status: "completed",
      },
      {
        id: "PO-88412",
        event: "Charity Night Run",
        eventThumbUrl: posterPlaceholderUrl("Charity Night Run"),
        dateISO: "2026-12-21T10:00:00.000Z",
        ticketsSold: 873,
        revenue: 679_412.27,
        status: "completed",
      },
      {
        id: "PO-77126",
        event: "Indie Music Fest",
        eventThumbUrl: posterPlaceholderUrl("Indie Music Fest"),
        dateISO: "2026-12-23T10:00:00.000Z",
        ticketsSold: 612,
        revenue: 729_112.77,
        status: "inProgress",
      },
      {
        id: "PO-12490",
        event: "Tech Meetup Tbilisi",
        eventThumbUrl: posterPlaceholderUrl("Tech Meetup Tbilisi"),
        dateISO: "2026-12-24T10:00:00.000Z",
        ticketsSold: 401,
        revenue: 837_412.77,
        status: "notStarted",
      },
      {
        id: "PO-65409",
        event: "Food & Wine Expo",
        eventThumbUrl: posterPlaceholderUrl("Food & Wine Expo"),
        dateISO: "2026-12-25T10:00:00.000Z",
        ticketsSold: 982,
        revenue: 414_912.77,
        status: "completed",
      },
      {
        id: "PO-51802",
        event: "Creators Conference",
        eventThumbUrl: posterPlaceholderUrl("Creators Conference"),
        dateISO: "2026-12-28T10:00:00.000Z",
        ticketsSold: 740,
        revenue: 927_912.77,
        status: "notStarted",
      },
      {
        id: "PO-90012",
        event: "New Year Countdown",
        eventThumbUrl: posterPlaceholderUrl("New Year Countdown"),
        dateISO: "2026-12-30T10:00:00.000Z",
        ticketsSold: 2401,
        revenue: 341_912.77,
        status: "inProgress",
      },
    ],
  };
}

/* ----------------------------- Component --------------------------- */
export default function PayoutPortalClient() {
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [pendingRevenue, setPendingRevenue] = useState(0);

  // simulate initial load (client-only, deterministic)
  useMemo(() => {
    if (ready) return;
    getPayoutPortalDummy().then((r) => {
      setRows(r.rows);
      setMonthlyRevenue(r.monthlyRevenue);
      setPendingRevenue(r.pendingRevenue);
      setReady(true);
    });
  }, [ready]);

  // search + filters
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<FilterTab>("all");

  // ✅ sort state
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [dir, setDir] = useState<SortDir>("desc");
  const toggleSort = (key: SortKey) => {
    if (key === sortBy) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setDir("desc");
    }
  };

  // ✅ DateRangePicker (replaces native date)
  const [range, setRange] = useState<DateRangeValue>({
    start: null,
    end: null,
  });

  // view toggle (now actually changes layout)
  const [view, setView] = useState<"list" | "grid">("list");

  // Add payout modal (dummy, but fully functional)
  const [addOpen, setAddOpen] = useState(false);
  const [draftEvent, setDraftEvent] = useState("");
  const [draftDate, setDraftDate] = useState("");
  const [draftTickets, setDraftTickets] = useState("0");
  const [draftRevenue, setDraftRevenue] = useState("0");
  const [draftStatus, setDraftStatus] = useState<PayoutStatus>("notStarted");

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const start = range.start ? clampToDay(range.start) : null;
    const end = range.end ? clampToDay(range.end) : null;

    return rows.filter((r) => {
      if (tab !== "all" && r.status !== tab) return false;

      if (start && end) {
        const rd = new Date(r.dateISO);
        if (!inDayRange(rd, start, end)) return false;
      }

      if (!qq) return true;
      return (
        r.event.toLowerCase().includes(qq) || r.id.toLowerCase().includes(qq)
      );
    });
  }, [rows, q, tab, range.start, range.end]);

  const sorted = useMemo(
    () => sortRows(filtered, sortBy, dir),
    [filtered, sortBy, dir],
  );

  const filtersLabel = useMemo(() => {
    if (tab === "all") return "All Events";
    return statusLabel(tab);
  }, [tab]);

  function onGenerateReport() {
    const header = ["ID", "Event", "Date", "Tickets Sold", "Revenue", "Status"];
    const body = sorted.map((r) => [
      r.id,
      r.event,
      fmtTableDate(r.dateISO),
      String(r.ticketsSold),
      formatUSD(r.revenue),
      statusLabel(r.status),
    ]);

    downloadCsv("payout-portal-report.csv", [header, ...body]);
  }

  function onOpenAdd() {
    setDraftEvent("");
    setDraftDate("");
    setDraftTickets("0");
    setDraftRevenue("0");
    setDraftStatus("notStarted");
    setAddOpen(true);
  }

  function onCreatePayout() {
    const event = draftEvent.trim();
    if (!event) return;

    const tickets = Math.max(0, Number(draftTickets || 0));
    const revenue = Math.max(0, Math.round(Number(draftRevenue || 0)));

    const date = draftDate
      ? new Date(draftDate + "T10:00:00.000Z")
      : new Date();
    if (!Number.isFinite(date.getTime())) return;

    const id = `PO-${Math.floor(10000 + Math.random() * 90000)}`;

    const next: PayoutRow = {
      id,
      event,
      eventThumbUrl: posterPlaceholderUrl(event),
      dateISO: date.toISOString(),
      ticketsSold: Number.isFinite(tickets) ? tickets : 0,
      revenue: Number.isFinite(revenue) ? revenue : 0,
      status: draftStatus,
    };

    setRows((prev) => [next, ...prev]);
    setAddOpen(false);
  }

  const hasRange = !!range.start && !!range.end;

  return (
    <div className="w-full py-4 sm:py-6">
      <div className="mx-auto w-full max-w-[1600px]">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/finances"
              className={clsx(
                "inline-flex h-10 w-10 items-center justify-center rounded-full",
                "border border-white/10 bg-neutral-900/40 text-neutral-200 backdrop-blur-xl",
                "hover:bg-neutral-800/55 hover:text-neutral-0",
              )}
              aria-label="Back to Finances"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div>
              <h1 className="text-3xl font-bold tracking-[-0.03em] text-neutral-50">
                Payout Portal
              </h1>
              <p className="mt-1 text-[13px] tracking-[-0.02em] text-neutral-400">
                Track event payouts, status, and revenue in one place.
              </p>
            </div>
          </div>
        </div>

        {/* Top row: Search (replace with shared design) */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div
            className={clsx(
              "relative w-full sm:w-[420px]",
              "rounded-lg border border-white/10 bg-white/5 h-10",
            )}
          >
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-300" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search here"
              className={clsx(
                "h-10 w-full rounded-lg bg-transparent",
                "pl-10 pr-4 text-[12px] text-neutral-100",
                "placeholder:text-neutral-500",
                "outline-none border-none focus:ring-1 focus:ring-primary-500",
              )}
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <div className="hidden text-[12px] font-semibold text-neutral-400 sm:block">
              Showing: <span className="text-neutral-200">{filtersLabel}</span>
            </div>
          </div>
        </div>

        {/* Cards row (better styling / less ugly gradient) */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Generate Financial Report */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(900px 420px at 10% 0%, rgba(154,70,255,0.22), transparent 62%), radial-gradient(760px 420px at 110% 40%, rgba(255,255,255,0.06), transparent 55%)",
              }}
            />
            <div className="relative flex h-full flex-col">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/7 ring-1 ring-white/10 backdrop-blur-xl">
                  <Sparkles className="h-5 w-5 text-primary-200" />
                </div>
                <div>
                  <div className="text-[14px] font-bold tracking-[-0.03em] text-neutral-0">
                    Generate Payout Report
                  </div>
                  <div className="mt-1 text-[12px] text-neutral-400">
                    Analyze payouts and revenue with a clean export.
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-4 self-center">
                <Button
                  type="button"
                  animation={true}
                  onClick={onGenerateReport}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Report
                </Button>
              </div>
            </div>
          </div>

          {/* Monthly Revenue */}
          <KpiCard
            title="Monthly Revenue"
            icon={<TrendingUp className="h-5 w-5 text-primary-200" />}
            value={ready ? formatUSD(monthlyRevenue) : "$—"}
            delta="-18.24%"
          />

          {/* Pending Payouts */}
          <KpiCard
            title="Pending Payouts"
            icon={<Ticket className="h-5 w-5 text-primary-200" />}
            value={ready ? formatUSD(pendingRevenue) : "$—"}
            delta="+24.92%"
          />
        </div>

        {/* Filters + Controls */}
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Status Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <FilterPill active={tab === "all"} onClick={() => setTab("all")}>
                All Events
              </FilterPill>

              <FilterPill
                active={tab === "completed"}
                onClick={() => setTab("completed")}
              >
                Completed
              </FilterPill>

              <FilterPill
                active={tab === "inProgress"}
                onClick={() => setTab("inProgress")}
              >
                In-Progress
              </FilterPill>

              <FilterPill
                active={tab === "notStarted"}
                onClick={() => setTab("notStarted")}
              >
                Not-Started
              </FilterPill>
            </div>

            {/* Right controls (now all functional) */}
            <div className="flex items-center justify-between gap-2 lg:justify-end">
              {/* Date range */}
              <div className="flex items-center gap-2">
                <DateRangePicker
                  value={range}
                  onChange={setRange}
                  variant="compact"
                  align="right"
                  buttonClassName={clsx(
                    "!h-10 !rounded-lg !px-3 !py-0",
                    "!bg-neutral-950/12 !border-neutral-800/70",
                    "!text-neutral-200 hover:!bg-neutral-900/18",
                    "focus:!ring-0 focus-visible:!ring-0",
                  )}
                />

                {hasRange && (
                  <button
                    type="button"
                    onClick={() => setRange({ start: null, end: null })}
                    className={clsx(
                      "inline-flex h-10 w-10 items-center justify-center rounded-lg",
                      "border border-neutral-800/70 bg-neutral-950/12 text-neutral-300",
                      "hover:bg-neutral-900/18 hover:text-neutral-0",
                    )}
                    aria-label="Clear dates"
                    title="Clear dates"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* View toggle (now switches table/grid) */}
              <div className="flex overflow-hidden rounded-lg border border-neutral-800/70 bg-neutral-950/12">
                <button
                  type="button"
                  onClick={() => setView("grid")}
                  className={clsx(
                    "inline-flex h-10 w-10 items-center justify-center transition",
                    view === "grid"
                      ? "bg-neutral-900/35 text-neutral-0"
                      : "text-neutral-300 hover:bg-neutral-900/18 hover:text-neutral-0",
                  )}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className={clsx(
                    "inline-flex h-10 w-10 items-center justify-center transition",
                    view === "list"
                      ? "bg-neutral-900/35 text-neutral-0"
                      : "text-neutral-300 hover:bg-neutral-900/18 hover:text-neutral-0",
                  )}
                  aria-label="List view"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {/* CTA (opens functional modal) */}
              <Button type="button" animation={true} onClick={onOpenAdd}>
                Add New Payout
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        {view === "grid" ? (
          <div className="mt-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-base font-bold tracking-[-0.03em] text-neutral-50">
                  Payouts
                </div>
                <div className="mt-1 text-[12px] text-neutral-400">
                  Grid view · {sorted.length} result(s)
                </div>
              </div>

              <div className="text-[13px] font-semibold text-neutral-400">
                Showing:{" "}
                <span className="text-neutral-200">{filtersLabel}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {sorted.map((r) => (
                <div
                  key={r.id}
                  className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div
                    className="pointer-events-none absolute inset-0 opacity-90"
                    style={{
                      background:
                        "radial-gradient(680px 260px at 15% 0%, rgba(154,70,255,0.14), transparent 60%), radial-gradient(520px 260px at 110% 60%, rgba(255,255,255,0.05), transparent 55%)",
                    }}
                  />
                  <div className="relative">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <EventThumb title={r.event} url={r.eventThumbUrl} />
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-semibold text-neutral-100">
                            {r.event}
                          </div>
                          <div className="mt-1 text-[12px] text-neutral-500">
                            {r.id}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className={clsx(
                          "inline-flex h-9 w-9 items-center justify-center rounded-lg",
                          "border border-white/10 bg-neutral-950/12 text-neutral-300",
                          "hover:bg-neutral-900/18 hover:text-neutral-0",
                        )}
                        aria-label="Row actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-white/10 bg-neutral-950/12 p-3">
                        <div className="text-[11px] font-semibold text-neutral-400">
                          Date
                        </div>
                        <div className="mt-1 text-[13px] font-bold text-neutral-0">
                          {fmtTableDate(r.dateISO)}
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-neutral-950/12 p-3">
                        <div className="text-[11px] font-semibold text-neutral-400">
                          Tickets Sold
                        </div>
                        <div className="mt-1 text-[13px] font-bold tabular-nums text-neutral-0">
                          {r.ticketsSold.toLocaleString()}
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-neutral-950/12 p-3">
                        <div className="text-[11px] font-semibold text-neutral-400">
                          Revenue
                        </div>
                        <div className="mt-1 text-[13px] font-bold tabular-nums text-primary-200">
                          {formatUSD(r.revenue)}
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-neutral-950/12 p-3">
                        <div className="text-[11px] font-semibold text-neutral-400">
                          Status
                        </div>
                        <div className="mt-2">
                          <span
                            className={clsx(
                              "inline-flex items-center rounded-md px-2.5 py-1 text-[12px] font-semibold tracking-[-0.02em]",
                              statusPillClasses(r.status),
                            )}
                          >
                            {statusLabel(r.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {!sorted.length && (
                <div className="col-span-full rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-[13px] text-neutral-400">
                  No payouts match your filters.
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Bottom table */
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div>
                <div className="text-base font-bold tracking-[-0.03em] text-neutral-50">
                  Payouts
                </div>
                <div className="mt-1 text-[12px] text-neutral-400">
                  View payouts by event, date, and completion status.
                </div>
              </div>

              <div className="text-[13px] font-semibold text-neutral-400">
                Showing:{" "}
                <span className="text-neutral-200">{filtersLabel}</span>
              </div>
            </div>

            <div className="relative w-full overflow-x-auto">
              <table className="w-full min-w-[1060px] table-fixed border-collapse font-medium leading-tight">
                {/* More even spacing across the data columns */}
                <colgroup>
                  <col style={{ width: "30%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "64px" }} />
                </colgroup>

                <thead className="text-neutral-400">
                  <tr className="[&>th]:pb-3 [&>th]:pt-3 [&>th]:px-4">
                    <ThSort
                      label="Event"
                      active={sortBy === "event"}
                      dir={dir}
                      onClick={() => toggleSort("event")}
                    />
                    <ThSort
                      label="Date"
                      active={sortBy === "date"}
                      dir={dir}
                      onClick={() => toggleSort("date")}
                      right
                    />
                    <ThSort
                      label="Tickets Sold"
                      active={sortBy === "ticketsSold"}
                      dir={dir}
                      onClick={() => toggleSort("ticketsSold")}
                      right
                    />
                    <ThSort
                      label="Revenue"
                      active={sortBy === "revenue"}
                      dir={dir}
                      onClick={() => toggleSort("revenue")}
                      right
                    />
                    <ThSort
                      label="Status"
                      active={sortBy === "status"}
                      dir={dir}
                      onClick={() => toggleSort("status")}
                      center
                    />
                    <th className="px-4 text-right font-semibold">Action</th>
                  </tr>
                </thead>

                <tbody className="text-white">
                  {sorted.map((r, i) => (
                    <tr
                      key={r.id}
                      className={clsx(
                        "border-t border-white/10 hover:bg-white/5",
                        i % 2 === 0 ? "bg-neutral-950/10" : "bg-transparent",
                      )}
                    >
                      {/* Event */}
                      <td className="px-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <EventThumb title={r.event} url={r.eventThumbUrl} />
                          <div className="min-w-0">
                            <div className="truncate text-[13px] font-semibold text-neutral-100">
                              {r.event}
                            </div>
                            <div className="mt-1 text-[12px] text-neutral-500">
                              {r.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-right">
                        <div className="text-[13px] text-neutral-200">
                          {fmtTableDate(r.dateISO)}
                        </div>
                      </td>

                      {/* Tickets Sold */}
                      <td className="px-4 py-3 text-right">
                        <div className="text-[13px] font-bold tabular-nums text-neutral-0">
                          {r.ticketsSold.toLocaleString()}
                        </div>
                      </td>

                      {/* Revenue */}
                      <td className="px-4 py-3 text-right">
                        <div className="text-[13px] font-bold tabular-nums text-primary-200">
                          {formatUSD(r.revenue)}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={clsx(
                            "inline-flex items-center rounded-md px-2.5 py-1 text-[12px] font-semibold tracking-[-0.02em]",
                            statusPillClasses(r.status),
                          )}
                        >
                          {statusLabel(r.status)}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          className={clsx(
                            "inline-flex h-9 w-9 items-center justify-center rounded-lg",
                            "border border-white/10 bg-neutral-950/12 text-neutral-300",
                            "hover:bg-neutral-900/18 hover:text-neutral-0",
                          )}
                          aria-label="Row actions"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {!sorted.length && (
                    <tr className="border-t border-white/10">
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-[13px] text-neutral-400"
                      >
                        No payouts match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(0deg,rgba(10,10,18,0.85)_0%,rgba(10,10,18,0)_100%)]" />
            </div>
          </div>
        )}
      </div>

      {/* Add payout modal (fully functional, dummy) */}
      {addOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Add New Payout"
        >
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={() => setAddOpen(false)}
          />

          <div className="relative w-full max-w-[520px] overflow-hidden rounded-2xl border border-white/10 bg-neutral-950/90 p-4 shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(860px 320px at 20% 0%, rgba(154,70,255,0.18), transparent 60%), radial-gradient(620px 320px at 110% 70%, rgba(255,255,255,0.05), transparent 55%)",
              }}
            />

            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[16px] font-extrabold tracking-[-0.03em] text-neutral-0">
                    Add New Payout
                  </div>
                  <div className="mt-1 text-[12px] text-neutral-400">
                    Creates a new payout row locally (dummy data).
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className={clsx(
                    "inline-flex h-9 w-9 items-center justify-center rounded-lg",
                    "border border-white/10 bg-neutral-950/12 text-neutral-300",
                    "hover:bg-neutral-900/18 hover:text-neutral-0",
                  )}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-[11px] font-semibold text-neutral-400">
                    Event Name
                  </label>
                  <input
                    value={draftEvent}
                    onChange={(e) => setDraftEvent(e.target.value)}
                    placeholder="e.g. Rooftop Party"
                    className={clsx(
                      "h-10 w-full rounded-lg bg-white/5",
                      "border border-white/10 px-3 text-[12px] text-neutral-100",
                      "placeholder:text-neutral-500 outline-none",
                      "focus:ring-1 focus:ring-primary-500",
                    )}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold text-neutral-400">
                    Date
                  </label>
                  <input
                    type="date"
                    value={draftDate}
                    onChange={(e) => setDraftDate(e.target.value)}
                    className={clsx(
                      "h-10 w-full rounded-lg bg-white/5",
                      "border border-white/10 px-3 text-[12px] text-neutral-100",
                      "outline-none focus:ring-1 focus:ring-primary-500",
                    )}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold text-neutral-400">
                    Status
                  </label>
                  <select
                    value={draftStatus}
                    onChange={(e) =>
                      setDraftStatus(e.target.value as PayoutStatus)
                    }
                    className={clsx(
                      "h-10 w-full rounded-lg bg-white/5",
                      "border border-white/10 px-3 text-[12px] text-neutral-100",
                      "outline-none focus:ring-1 focus:ring-primary-500",
                    )}
                  >
                    <option value="notStarted">Not-Started</option>
                    <option value="inProgress">In-Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold text-neutral-400">
                    Tickets Sold
                  </label>
                  <input
                    inputMode="numeric"
                    value={draftTickets}
                    onChange={(e) => setDraftTickets(e.target.value)}
                    className={clsx(
                      "h-10 w-full rounded-lg bg-white/5",
                      "border border-white/10 px-3 text-[12px] text-neutral-100",
                      "outline-none focus:ring-1 focus:ring-primary-500",
                    )}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold text-neutral-400">
                    Revenue (USD)
                  </label>
                  <input
                    inputMode="decimal"
                    value={draftRevenue}
                    onChange={(e) => setDraftRevenue(e.target.value)}
                    className={clsx(
                      "h-10 w-full rounded-lg bg-white/5",
                      "border border-white/10 px-3 text-[12px] text-neutral-100",
                      "outline-none focus:ring-1 focus:ring-primary-500",
                    )}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className={clsx(
                    "inline-flex h-10 items-center rounded-lg px-3 text-[12px] font-semibold",
                    "border border-white/10 bg-white/5 text-neutral-200",
                    "hover:bg-white/7",
                  )}
                >
                  Cancel
                </button>

                <Button
                  type="button"
                  animation={true}
                  onClick={onCreatePayout}
                  disabled={!draftEvent.trim()}
                >
                  Create Payout
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------- UI Components -------------------------- */
function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "inline-flex h-10 items-center rounded-full px-4 text-[13px] font-semibold tracking-[-0.02em] transition",
        active
          ? clsx(
              "text-neutral-0 ring-1 ring-white/10",
              "bg-[linear-gradient(90deg,var(--color-primary-600)_0%,var(--color-primary-500)_55%,var(--color-primary-400)_100%)]",
              "shadow-[0_18px_56px_rgba(154,81,255,0.16)]",
            )
          : "border border-neutral-800/70 bg-neutral-950/12 text-neutral-300 hover:bg-neutral-900/18 hover:text-neutral-0",
      )}
    >
      {children}
    </button>
  );
}

function ThSort({
  label,
  active,
  dir,
  onClick,
  right,
  center,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
  right?: boolean;
  center?: boolean;
}) {
  const base = "font-semibold cursor-pointer select-none hover:text-white/80";
  const cls = center
    ? `${base} text-center `
    : right
      ? `${base} text-right`
      : `${base} text-left`;

  return (
    <th
      className={clsx(cls, "px-4")}
      onClick={onClick}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <div
        className={clsx(
          "inline-flex items-center",
          center
            ? "justify-center w-full"
            : right
              ? "justify-end w-full"
              : "justify-start",
        )}
      >
        {label}
        <SortArrowsIcon
          direction={active ? dir : null}
          className="ml-2 -translate-y-[1px]"
        />
      </div>
    </th>
  );
}

function EventThumb({ title, url }: { title: string; url?: string | null }) {
  const showImg = !!url;

  return (
    <div className="relative h-10 w-10 overflow-hidden rounded-xl bg-neutral-900/55 ring-1 ring-neutral-800/70">
      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold text-neutral-300">
        {title.trim().slice(0, 2).toUpperCase()}
      </div>

      {showImg && (
        <img
          src={url as string}
          alt={`${title} poster`}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
}

/** KPI card with delta badge styled like the shared KpiCard component */
function KpiCard({
  title,
  icon,
  value,
  delta,
}: {
  title: string;
  icon: React.ReactNode;
  value: string;
  delta: string; // "+24.92%" or "-18.24%"
}) {
  const rawDelta = (delta ?? "").trim();
  const isNegative = rawDelta.startsWith("-");
  const deltaText = rawDelta.replace(/^[-+]\s*/, "");

  const deltaColor = isNegative
    ? "bg-error-900 text-error-500 border-error-800"
    : "bg-success-900 text-success-500 border-success-800";

  const deltaIcon = isNegative ? (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M14.6133 11.5867C14.5457 11.7496 14.4162 11.879 14.2533 11.9467C14.1732 11.9808 14.0871 11.9989 14 12H10.6667C10.4899 12 10.3203 11.9298 10.1953 11.8047C10.0702 11.6797 10 11.5101 10 11.3333C10 11.1565 10.0702 10.987 10.1953 10.8619C10.3203 10.7369 10.4899 10.6667 10.6667 10.6667H12.3933L8.66667 6.94L6.47333 9.14C6.41136 9.20249 6.33762 9.25208 6.25638 9.28593C6.17515 9.31977 6.08801 9.3372 6 9.3372C5.91199 9.3372 5.82486 9.31977 5.74362 9.28593C5.66238 9.25208 5.58864 9.20249 5.52667 9.14L1.52667 5.14C1.46418 5.07802 1.41458 5.00429 1.38074 4.92305C1.34689 4.84181 1.32947 4.75467 1.32947 4.66667C1.32947 4.57866 1.34689 4.49152 1.38074 4.41028C1.41458 4.32904 1.46418 4.25531 1.52667 4.19333C1.58864 4.13085 1.66238 4.08125 1.74362 4.04741C1.82486 4.01356 1.91199 3.99613 2 3.99613C2.08801 3.99613 2.17514 4.01356 2.25638 4.04741C2.33762 4.08125 2.41136 4.13085 2.47333 4.19333L6 7.72667L8.19333 5.52667C8.25531 5.46418 8.32904 5.41459 8.41028 5.38074C8.49152 5.34689 8.57866 5.32947 8.66667 5.32947C8.75467 5.32947 8.84181 5.34689 8.92305 5.38074C9.00429 5.41459 9.07802 5.46418 9.14 5.52667L13.3333 9.72667V8C13.3333 7.82319 13.4036 7.65362 13.5286 7.5286C13.6536 7.40357 13.8232 7.33333 14 7.33333C14.1768 7.33333 14.3464 7.40357 14.4714 7.5286C14.5964 7.65362 14.6667 7.82319 14.6667 8V11.3333C14.6656 11.4205 14.6475 11.5065 14.6133 11.5867Z"
        fill="#FF454A"
      />
    </svg>
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M14.6133 4.41333C14.5457 4.25043 14.4162 4.12098 14.2533 4.05333C14.1732 4.01917 14.0871 4.00105 14 4H10.6667C10.4899 4 10.3203 4.07024 10.1953 4.19526C10.0702 4.32029 10 4.48986 10 4.66667C10 4.84348 10.0702 5.01305 10.1953 5.13807C10.3203 5.2631 10.4899 5.33333 10.6667 5.33333H12.3933L8.66667 9.06L6.47333 6.86C6.41136 6.79751 6.33762 6.74792 6.25638 6.71407C6.17515 6.68023 6.08801 6.6628 6 6.6628C5.91199 6.6628 5.82486 6.68023 5.74362 6.71407C5.66238 6.74792 5.58864 6.79751 5.52667 6.86L1.52667 10.86C1.46418 10.922 1.41458 10.9957 1.38074 11.0769C1.34689 11.1582 1.32947 11.2453 1.32947 11.3333C1.32947 11.4213 1.34689 11.5085 1.38074 11.5897C1.41458 11.671 1.46418 11.7447 1.52667 11.8067C1.58864 11.8692 1.66238 11.9187 1.74362 11.9526C1.82486 11.9864 1.91199 12.0039 2 12.0039C2.08801 12.0039 2.17514 11.9864 2.25638 11.9526C2.33762 11.9187 2.41136 11.8692 2.47333 11.8067L6 8.27333L8.19333 10.4733C8.25531 10.5358 8.32904 10.5854 8.41028 10.6193C8.49152 10.6531 8.57866 10.6705 8.66667 10.6705C8.75467 10.6705 8.84181 10.6531 8.92305 10.6193C9.00429 10.5854 9.07802 10.5358 9.14 10.4733L13.3333 6.27333V8C13.3333 8.17681 13.4036 8.34638 13.5286 8.4714C13.6536 8.59643 13.8232 8.66667 14 8.66667C14.1768 8.66667 14.3464 8.59643 14.4714 8.4714C14.5964 8.34638 14.6667 8.17681 14.6667 8V4.66667C14.6656 4.57955 14.6475 4.49348 14.6133 4.41333Z"
        fill="#45FF79"
      />
    </svg>
  );

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 420px at 10% 0%, rgba(154,70,255,0.20), transparent 62%), radial-gradient(760px 420px at 110% 40%, rgba(255,255,255,0.06), transparent 55%)",
        }}
      />
      <div className="relative">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/7 ring-1 ring-white/10 backdrop-blur-xl">
            {icon}
          </div>
          <div className="font-semibold text-neutral-300">{title}</div>
        </div>

        <div className="mt-4 text-[28px] font-extrabold leading-none tracking-[-0.04em] text-neutral-0">
          {value}
        </div>

        <div className="mt-3">
          <span
            className={clsx(
              "flex w-fit items-center gap-0.5 rounded-md px-1.5 py-1 text-[12px] font-semibold leading-none",
              "border",
              deltaColor,
            )}
            aria-label={`Change ${deltaText}${isNegative ? " decrease" : " increase"}`}
          >
            {deltaIcon}
            <span className="tabular-nums">{deltaText}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
