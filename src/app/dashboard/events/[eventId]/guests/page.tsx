// src/app/dashboard/events/[eventId]/guests/page.tsx
"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import {
  Search,
  Download,
  MoreVertical,
  Instagram,
  Check,
  Clock,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

/* ----------------------------- Types ----------------------------- */
type GuestsView = "guest" | "order";
type GuestStatus = "checked_in" | "pending_arrival";

type GuestRow = {
  id: string;

  // Shared
  orderNumber: string; // "#1527"
  fullName: string;
  handle?: string; // "@byoussefi"
  igFollowers?: number; // 131
  gender?: "Male" | "Female";
  age?: number;
  phone?: string;
  email?: string;

  amount: number; // total paid
  ticketType: string; // pill label
  status: GuestStatus;

  // Order view extras
  referrer?: string;
  quantity?: number;
  dateTimeISO?: string; // includes date + time
};

const MOCK_GUESTS: GuestRow[] = [
  {
    id: "1",
    orderNumber: "#1527",
    fullName: "Jacob Antilety",
    handle: "@jacobantilety",
    igFollowers: 131,
    gender: "Male",
    age: 24,
    phone: "+1 (305) 555-0188",
    email: "jacob@demo.com",
    amount: 0,
    ticketType: "Free RSVP",
    status: "pending_arrival",
    referrer: "IG - @astrohospitality",
    quantity: 2,
    dateTimeISO: new Date().toISOString(),
  },
  {
    id: "2",
    orderNumber: "#1528",
    fullName: "Sam Yalvac",
    handle: "@samyalvac",
    igFollowers: 4820,
    gender: "Female",
    age: 28,
    phone: "+1 (647) 555-0114",
    email: "sam@demo.com",
    amount: 45,
    ticketType: "General Admission - Tier 1",
    status: "checked_in",
    referrer: "Promoter Link - Alex",
    quantity: 1,
    dateTimeISO: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
  },
];

/* ---------------------------- Helpers ---------------------------- */
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function initialsFromName(name: string) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "GU";

  const a = parts[0]?.[0] ?? "";
  const b = (parts.length > 1 ? parts[1]?.[0] : parts[0]?.[1]) ?? "";
  const two = `${a}${b}`.toUpperCase();
  return two || "GU";
}

function fmtUsd(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function fmtNum(n: number) {
  return n.toLocaleString(undefined);
}

function prettyDateTime(d?: string) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function useFluidTabIndicator(
  containerRef: { current: HTMLElement | null },
  indicatorRef: { current: HTMLElement | null },
  tab: string,
) {
  useLayoutEffect(() => {
    const c = containerRef.current;
    const i = indicatorRef.current;
    if (!c || !i) return;
    const active = c.querySelector<HTMLButtonElement>(`[data-tab="${tab}"]`);
    if (!active) return;
    const { offsetLeft, offsetWidth } = active;
    i.style.transform = `translateX(${offsetLeft}px)`;
    i.style.width = `${offsetWidth}px`;
  }, [containerRef, indicatorRef, tab]);
}

/* ----------------------------- UI bits --------------------------- */
function StatusPill({ status }: { status: GuestStatus }) {
  const map: Record<GuestStatus, string> = {
    checked_in:
      "bg-success-900/35 text-success-300 ring-success-700/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
    pending_arrival:
      "bg-white/8 text-neutral-200 ring-white/14 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
  };

  const label = status === "checked_in" ? "Checked-In" : "Pending Arrival";

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1",
        "text-[13px] font-semibold ring-1 ring-inset whitespace-nowrap",
        map[status],
      )}
    >
      {status === "checked_in" ? (
        <Check className="h-4 w-4 shrink-0" />
      ) : (
        <Clock className="h-4 w-4 shrink-0" />
      )}
      <span className="leading-none">{label}</span>
    </span>
  );
}

function TicketPill({ label }: { label: string }) {
  return (
    <span
      className={clsx(
        "inline-flex max-w-full min-w-0 items-center rounded-md px-2.5 py-1.5",
        "text-[13px] font-semibold ring-1 ring-inset",
        "bg-[#428BFF]/10 text-[#A9C9FF] ring-[#428BFF]/22",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
        "overflow-hidden whitespace-nowrap",
      )}
      title={label}
    >
      <span className="truncate">{label}</span>
    </span>
  );
}

/* ----------------------- Actions menu (3 dots) --------------------- */
function GuestActionsMenu({ guest }: { guest: GuestRow }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    maxHeight: number;
  } | null>(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node | null;
      if (!t) return;

      const btn = btnRef.current;
      const panel = panelRef.current;
      if (btn?.contains(t) || panel?.contains(t)) return;

      setOpen(false);
    };

    const reposition = () => {
      const btn = btnRef.current;
      if (!btn) return;

      const r = btn.getBoundingClientRect();
      const PANEL_W = 240;
      const PAD = 12;

      const maxHeight = Math.max(200, window.innerHeight - PAD * 2);

      let left = r.right - PANEL_W;
      left = Math.max(PAD, Math.min(left, window.innerWidth - PANEL_W - PAD));

      const belowTop = r.bottom + 10;

      setPos({ top: belowTop, left, maxHeight });

      requestAnimationFrame(() => {
        const panel = panelRef.current;
        const hRaw = panel?.offsetHeight ?? 0;
        const h = Math.min(hRaw, maxHeight);
        const maxBottom = window.innerHeight - PAD;

        const belowFits = belowTop + h <= maxBottom;
        const aboveTop = r.top - 10 - h;
        const aboveFits = aboveTop >= PAD;

        let top = belowTop;

        if (belowFits) top = belowTop;
        else if (aboveFits) top = aboveTop;
        else top = PAD;

        top = Math.max(PAD, Math.min(top, maxBottom - h));

        setPos({ top, left, maxHeight });
      });
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("touchstart", onDown);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    reposition();

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("touchstart", onDown);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  const action = (name: string) => {
    // eslint-disable-next-line no-console
    console.log(`[Guests] ${name}`, {
      guestId: guest.id,
      order: guest.orderNumber,
    });
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-label="Edit guest"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "inline-flex h-9 w-9 items-center justify-center rounded-full",
          "bg-white/5 text-neutral-200 hover:bg-white/10",
          "border border-white/10",
          "opacity-90 hover:opacity-100",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
        )}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && typeof document !== "undefined" && pos
        ? createPortal(
            <div
              ref={panelRef}
              style={{ top: pos.top, left: pos.left, maxHeight: pos.maxHeight }}
              className={clsx(
                "fixed z-[9999] w-[240px]",
                "overflow-hidden rounded-xl border border-white/10 bg-neutral-950/95",
                "shadow-[0_18px_70px_rgba(0,0,0,0.60)] backdrop-blur-[10px]",
              )}
            >
              <div className="px-3 py-2.5 border-b border-white/10">
                <div className="text-[12px] font-semibold text-neutral-200">
                  Edit
                </div>
                <div className="mt-0.5 text-[11px] text-neutral-500">
                  Order{" "}
                  <span className="text-neutral-300 font-semibold">
                    {guest.orderNumber}
                  </span>
                </div>
              </div>

              <div className="max-h-[calc(100vh-160px)] overflow-y-auto">
                <div className="p-2 space-y-1">
                  {[
                    { label: "Approve", tone: "neutral" },
                    { label: "Decline", tone: "neutral" },
                    { label: "Suspend", tone: "neutral" },
                    { label: "Refund", tone: "warn" },
                  ].map((it) => (
                    <button
                      key={it.label}
                      type="button"
                      onClick={() => action(it.label)}
                      className={clsx(
                        "w-full px-2.5 py-2 rounded-lg text-left",
                        "flex items-center gap-2",
                        "border border-white/10",
                        it.tone === "warn"
                          ? "bg-warning-500/10 text-warning-200 hover:bg-warning-500/14"
                          : "bg-white/5 text-neutral-200 hover:bg-white/10",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
                      )}
                    >
                      <span className="text-[12px] font-semibold">
                        {it.label}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => action("Remove")}
                    className={clsx(
                      "w-full px-3 py-2.5 text-left",
                      "flex items-center gap-2",
                      "text-[12px] font-semibold",
                      "text-red-300 hover:text-red-200",
                      "hover:bg-red-500/10",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 cursor-pointer",
                    )}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

/* ------------------------------ Pagination ------------------------ */
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
    <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-1">
      <button
        type="button"
        onClick={() => onPage(clamp(page - 1, 1, totalPages))}
        disabled={page <= 1}
        className={clsx(
          "inline-flex h-8 w-8 items-center justify-center rounded-md",
          "border border-white/10 bg-white/5 text-neutral-100",
          "hover:border-primary-500 disabled:opacity-40 disabled:hover:bg-white/5",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
        )}
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
              "inline-flex h-8 w-8 items-center justify-center rounded-md text-[12px] font-semibold",
              "transition-colors",
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
        className={clsx(
          "inline-flex h-8 w-8 items-center justify-center rounded-md",
          "border border-white/10 bg-white/5 text-neutral-100",
          "hover:border-primary-500 disabled:opacity-40 disabled:hover:bg-white/5",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
        )}
        aria-label="Next page"
      >
        ›
      </button>
    </div>
  );
}

/* ------------------------------ Page ------------------------------ */
export default function GuestsPage() {
  const [view, setView] = useState<GuestsView>("guest");
  const [query, setQuery] = useState("");

  const tabBarRef = useRef<HTMLDivElement | null>(null);
  const indicatorRef = useRef<HTMLSpanElement | null>(null);
  useFluidTabIndicator(tabBarRef, indicatorRef, view);

  /* ------------------------------------------------------------------
     ✅ Real responsive table (NO horizontal scroll)
     Strategy:
     - md shows essential columns only
     - lg reveals more
     - xl reveals all
     - all flexible tracks use minmax(0, ...) so they can shrink and truncate
  ------------------------------------------------------------------ */
  const GRID_GUEST =
    "md:grid md:items-center md:gap-4 " +
    // md: Order | Name | Amount | Ticket | Status | Edit
    "md:[grid-template-columns:88px_minmax(0,2.6fr)_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_64px] " +
    // lg: + Gender | Age (Contact still hidden)
    "lg:[grid-template-columns:88px_minmax(0,2.4fr)_88px_60px_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_64px] " +
    // xl: + Contact (full)
    "xl:[grid-template-columns:88px_minmax(0,2.2fr)_88px_60px_minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_64px]";

  const GRID_ORDER =
    "md:grid md:items-center md:gap-4 " +
    // md: Order | Name | Amount | Date | Status | Edit
    "md:[grid-template-columns:88px_minmax(0,2.7fr)_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.2fr)_64px] " +
    // lg: + Referrer | Qty (Gender still hidden)
    "lg:[grid-template-columns:88px_minmax(0,2.2fr)_minmax(0,1.8fr)_80px_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.2fr)_64px] " +
    // xl: + Gender (full)
    "xl:[grid-template-columns:88px_minmax(0,2.0fr)_88px_minmax(0,1.8fr)_80px_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.2fr)_64px]";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MOCK_GUESTS;

    return MOCK_GUESTS.filter((g) => {
      const hay = [
        g.orderNumber,
        g.fullName,
        g.handle ?? "",
        g.email ?? "",
        g.phone ?? "",
        g.ticketType,
        g.referrer ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [query]);

  /* --------------------------- Pagination --------------------------- */
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setPage(1);
  }, [query, view]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage((p) => clamp(p, 1, totalPages));
  }, [totalPages]);

  const pageSafe = clamp(page, 1, totalPages);
  const slice = useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageSafe]);

  const showingLabel = useMemo(() => {
    if (!total) return "Showing 0-0 from 0 data";
    const start = (pageSafe - 1) * pageSize + 1;
    const end = Math.min(total, start + pageSize - 1);
    return `Showing ${start}-${end} from ${total} data`;
  }, [total, pageSafe]);

  const isLoading = false;

  return (
    <div className="relative overflow-hidden bg-neutral-950 text-neutral-0 px-4 md:px-6 lg:px-8">
      <section className="pb-16">
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
            {/* Header */}
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-base font-semibold tracking-[0.18em] text-neutral-300 uppercase">
                  Guests
                </div>
                <div className="mt-1 text-neutral-400">
                  View attendees, check them in, and inspect their orders.
                </div>
              </div>

              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
                <div
                  className={clsx(
                    "relative w-full sm:w-[420px]",
                    "rounded-lg border border-white/10 bg-white/5 h-10",
                  )}
                >
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-300" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search here"
                    className={clsx(
                      "h-10 w-full rounded-lg bg-transparent",
                      "pl-10 pr-4 text-[12px] text-neutral-100",
                      "placeholder:text-neutral-500",
                      "outline-none border-none focus:ring-1 focus:ring-primary-500",
                    )}
                    aria-label="Search guests"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    icon={<Download className="h-4 w-4" />}
                    onClick={() => {
                      // eslint-disable-next-line no-console
                      console.log("[Guests] Export CSV");
                    }}
                  >
                    Export CSV
                  </Button>
                </div>
              </div>
            </div>

            {/* Toggle */}
            <div className="mb-4 flex items-center justify-between gap-3">
              <div
                ref={tabBarRef}
                className="relative inline-flex rounded-full border border-white/10 bg-neutral-950"
              >
                <button
                  data-tab="guest"
                  className={clsx(
                    "relative z-10 rounded-full px-4 py-2 text-[12px] font-semibold",
                    view === "guest"
                      ? "text-neutral-0"
                      : "text-neutral-300 hover:text-neutral-0",
                  )}
                  onClick={() => setView("guest")}
                  type="button"
                >
                  Guest Info
                </button>

                <button
                  data-tab="order"
                  className={clsx(
                    "relative z-10 rounded-full px-4 py-2 text-[12px] font-semibold",
                    view === "order"
                      ? "text-neutral-0"
                      : "text-neutral-300 hover:text-neutral-0",
                  )}
                  onClick={() => setView("order")}
                  type="button"
                >
                  Order Info
                </button>

                <span
                  ref={indicatorRef}
                  className="absolute left-0 top-0 h-full w-0 rounded-full bg-white/10 ring-1 ring-inset ring-white/15 transition-[transform,width] duration-200 ease-out"
                  aria-hidden="true"
                />
              </div>

              <div className="hidden md:inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-neutral-300">
                <span className="text-neutral-400">Guests:</span>{" "}
                <span className="font-semibold text-neutral-100">{total}</span>
              </div>
            </div>

            {/* Column header */}
            <div
              className={clsx(
                "hidden md:block mt-3",
                "rounded-[12px] border border-white/10 bg-white/5 px-4 py-2.5",
                "text-[13px] font-semibold text-neutral-300",
              )}
            >
              <div className={view === "guest" ? GRID_GUEST : GRID_ORDER}>
                {/* Shared */}
                <div>Order</div>
                <div>Name</div>

                {/* Guest-only columns (progressive) */}
                {view === "guest" ? (
                  <>
                    <div className="hidden lg:block">Gender</div>
                    <div className="hidden lg:block">Age</div>
                    <div className="hidden xl:block">Contact Info</div>
                    <div>Amount</div>
                    <div>Ticket Type</div>
                    <div>Status</div>
                    <div className="text-right">Edit</div>
                  </>
                ) : (
                  <>
                    <div className="hidden xl:block">Gender</div>
                    <div className="hidden lg:block">Referrer</div>
                    <div className="hidden lg:block">Quantity</div>
                    <div>Amount</div>
                    <div>Date</div>
                    <div>Status</div>
                    <div className="text-right">Edit</div>
                  </>
                )}
              </div>
            </div>

            {/* List */}
            <div className="mt-3">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-[88px] rounded-[12px]" />
                  ))}
                </div>
              ) : slice.length ? (
                <div className="space-y-3">
                  {slice.map((g) => {
                    const badge = initialsFromName(g.fullName);
                    const followersLabel =
                      typeof g.igFollowers === "number"
                        ? fmtNum(g.igFollowers)
                        : "—";

                    return (
                      <div
                        key={g.id}
                        className={clsx(
                          "relative rounded-[12px] border border-white/10 bg-white/5 px-4 py-3",
                          "hover:bg-white/7 transition-colors",
                        )}
                      >
                        {/* Desktop row */}
                        <div className="hidden md:block">
                          <div
                            className={
                              view === "guest" ? GRID_GUEST : GRID_ORDER
                            }
                          >
                            {/* Order */}
                            <div className="text-[13px] font-semibold text-neutral-100">
                              {g.orderNumber}
                            </div>

                            {/* Name */}
                            <div className="min-w-0">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="relative shrink-0">
                                  <div className="h-10 w-10 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
                                    <div className="flex h-full w-full items-center justify-center text-[13px] font-extrabold text-neutral-200">
                                      {badge}
                                    </div>
                                  </div>

                                  <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-[7px]">
                                    <span
                                      className={clsx(
                                        "tikd-chip tikd-chip-primary rounded-md",
                                        "px-1 py-[3px] text-[9px] font-semibold leading-none",
                                        "gap-1",
                                      )}
                                      title={`${followersLabel} Instagram followers`}
                                    >
                                      <Instagram className="h-2.5 w-2.5 text-primary-200" />
                                      <span className="tabular-nums text-neutral-0/95">
                                        {followersLabel}
                                      </span>
                                    </span>
                                  </div>
                                </div>

                                <div className="min-w-0">
                                  <div className="truncate text-[14px] font-semibold text-neutral-0">
                                    {g.fullName}
                                  </div>
                                  <div className="truncate text-[13px] text-neutral-500">
                                    {g.handle ?? "—"}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {view === "guest" ? (
                              <>
                                {/* Gender (lg+) */}
                                <div className="hidden lg:block text-[13px] text-neutral-200">
                                  <span className="font-semibold text-neutral-100">
                                    {g.gender ?? "—"}
                                  </span>
                                </div>

                                {/* Age (lg+) */}
                                <div className="hidden lg:block text-[13px] text-neutral-200">
                                  <span className="font-semibold text-neutral-100">
                                    {typeof g.age === "number" ? g.age : "—"}
                                  </span>
                                </div>

                                {/* Contact (xl+) */}
                                <div className="hidden xl:block min-w-0">
                                  <div className="truncate text-[13px] font-semibold text-neutral-100">
                                    {g.phone ?? "—"}
                                  </div>
                                  <div className="truncate text-[13px] text-neutral-500">
                                    {g.email ?? "—"}
                                  </div>
                                </div>

                                {/* Amount */}
                                <div className="text-[13px] text-neutral-200">
                                  <span className="font-semibold text-neutral-100">
                                    {fmtUsd(g.amount)}
                                  </span>
                                </div>

                                {/* Ticket */}
                                <div className="min-w-0">
                                  <TicketPill label={g.ticketType} />
                                </div>

                                {/* Status */}
                                <div className="min-w-0">
                                  <StatusPill status={g.status} />
                                </div>

                                {/* Edit */}
                                <div className="flex justify-end">
                                  <GuestActionsMenu guest={g} />
                                </div>
                              </>
                            ) : (
                              <>
                                {/* Gender (xl+) */}
                                <div className="hidden xl:block text-[13px] text-neutral-200">
                                  <span className="font-semibold text-neutral-100">
                                    {g.gender ?? "—"}
                                  </span>
                                </div>

                                {/* Referrer (lg+) */}
                                <div className="hidden lg:block min-w-0 text-[13px] text-neutral-200">
                                  <span className="truncate block font-semibold text-neutral-100">
                                    {g.referrer ?? "—"}
                                  </span>
                                </div>

                                {/* Quantity (lg+) */}
                                <div className="hidden lg:block text-[13px] text-neutral-200">
                                  <span className="font-semibold text-neutral-100">
                                    {typeof g.quantity === "number"
                                      ? g.quantity
                                      : "—"}
                                  </span>
                                </div>

                                {/* Amount */}
                                <div className="text-[13px] text-neutral-200">
                                  <span className="font-semibold text-neutral-100">
                                    {fmtUsd(g.amount)}
                                  </span>
                                </div>

                                {/* Date */}
                                <div className="min-w-0 text-[13px] text-neutral-400">
                                  <span className="truncate block">
                                    {prettyDateTime(g.dateTimeISO)}
                                  </span>
                                </div>

                                {/* Status */}
                                <div className="min-w-0">
                                  <StatusPill status={g.status} />
                                </div>

                                {/* Edit */}
                                <div className="flex justify-end">
                                  <GuestActionsMenu guest={g} />
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Mobile stacked (unchanged) */}
                        <div className="md:hidden">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="min-w-[52px]">
                                <div className="h-10 w-10 overflow-hidden rounded-[10px] bg-white/5 ring-1 ring-white/10">
                                  <div className="flex h-full w-full items-center justify-center text-[13px] font-extrabold text-neutral-200">
                                    {badge}
                                  </div>
                                </div>

                                <div className="mt-1 flex items-center justify-center gap-1 text-[11px] text-neutral-500">
                                  <Instagram className="h-3.5 w-3.5" />
                                  <span className="font-semibold text-neutral-400">
                                    {followersLabel}
                                  </span>
                                </div>
                              </div>

                              <div className="min-w-0">
                                <div className="truncate text-[14px] font-semibold text-neutral-0">
                                  {g.fullName}
                                </div>
                                <div className="truncate text-[13px] text-neutral-500">
                                  {g.handle ?? "—"} •{" "}
                                  <span className="text-neutral-400">
                                    {g.orderNumber}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <StatusPill status={g.status} />
                              <GuestActionsMenu guest={g} />
                            </div>
                          </div>

                          <div className="mt-3 grid gap-2">
                            {view === "guest" ? (
                              <>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="rounded-xl border border-white/10 bg-neutral-950/30 px-3 py-2">
                                    <div className="text-[11px] text-neutral-500">
                                      Gender
                                    </div>
                                    <div className="mt-1 text-[13px] font-semibold text-neutral-100">
                                      {g.gender ?? "—"}
                                    </div>
                                  </div>

                                  <div className="rounded-xl border border-white/10 bg-neutral-950/30 px-3 py-2">
                                    <div className="text-[11px] text-neutral-500">
                                      Age
                                    </div>
                                    <div className="mt-1 text-[13px] font-semibold text-neutral-100">
                                      {typeof g.age === "number" ? g.age : "—"}
                                    </div>
                                  </div>
                                </div>

                                <div className="rounded-xl border border-white/10 bg-neutral-950/30 px-3 py-2">
                                  <div className="text-[11px] text-neutral-500">
                                    Contact Info
                                  </div>
                                  <div className="mt-1 text-[13px] font-semibold text-neutral-100">
                                    {g.phone ?? "—"}
                                  </div>
                                  <div className="mt-0.5 text-[12px] text-neutral-500">
                                    {g.email ?? "—"}
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div className="rounded-xl border border-white/10 bg-neutral-950/30 px-3 py-2">
                                    <div className="text-[11px] text-neutral-500">
                                      Amount
                                    </div>
                                    <div className="mt-1 text-[13px] font-semibold text-neutral-100">
                                      {fmtUsd(g.amount)}
                                    </div>
                                  </div>

                                  <div className="rounded-xl border border-white/10 bg-neutral-950/30 px-3 py-2">
                                    <div className="text-[11px] text-neutral-500">
                                      Ticket Type
                                    </div>
                                    <div className="mt-1">
                                      <TicketPill label={g.ticketType} />
                                    </div>
                                  </div>
                                </div>

                                <div className="rounded-xl border border-white/10 bg-neutral-950/30 px-3 py-2">
                                  <div className="text-[11px] text-neutral-500">
                                    Status
                                  </div>
                                  <div className="mt-1">
                                    <StatusPill status={g.status} />
                                  </div>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="rounded-xl border border-white/10 bg-neutral-950/30 px-3 py-2">
                                    <div className="text-[11px] text-neutral-500">
                                      Gender
                                    </div>
                                    <div className="mt-1 text-[13px] font-semibold text-neutral-100">
                                      {g.gender ?? "—"}
                                    </div>
                                  </div>

                                  <div className="rounded-xl border border-white/10 bg-neutral-950/30 px-3 py-2">
                                    <div className="text-[11px] text-neutral-500">
                                      Quantity
                                    </div>
                                    <div className="mt-1 text-[13px] font-semibold text-neutral-100">
                                      {typeof g.quantity === "number"
                                        ? g.quantity
                                        : "—"}
                                    </div>
                                  </div>
                                </div>

                                <div className="rounded-xl border border-white/10 bg-neutral-950/30 px-3 py-2">
                                  <div className="text-[11px] text-neutral-500">
                                    Referrer
                                  </div>
                                  <div className="mt-1 text-[13px] font-semibold text-neutral-100">
                                    {g.referrer ?? "—"}
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div className="rounded-xl border border-white/10 bg-neutral-950/30 px-3 py-2">
                                    <div className="text-[11px] text-neutral-500">
                                      Amount
                                    </div>
                                    <div className="mt-1 text-[13px] font-semibold text-neutral-100">
                                      {fmtUsd(g.amount)}
                                    </div>
                                  </div>

                                  <div className="rounded-xl border border-white/10 bg-neutral-950/30 px-3 py-2">
                                    <div className="text-[11px] text-neutral-500">
                                      Date
                                    </div>
                                    <div className="mt-1 text-[13px] font-semibold text-neutral-100">
                                      {prettyDateTime(g.dateTimeISO)}
                                    </div>
                                  </div>
                                </div>

                                <div className="rounded-xl border border-white/10 bg-neutral-950/30 px-3 py-2">
                                  <div className="text-[11px] text-neutral-500">
                                    Status
                                  </div>
                                  <div className="mt-1">
                                    <StatusPill status={g.status} />
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-[12px] text-neutral-300">
                      {showingLabel}
                    </div>
                    <Pagination
                      page={pageSafe}
                      totalPages={totalPages}
                      onPage={setPage}
                    />
                  </div>
                </div>
              ) : (
                <div
                  className={clsx(
                    "rounded-2xl border border-white/10 bg-white/5 px-4 py-12",
                    "text-center",
                  )}
                >
                  <div className="text-[13px] font-semibold text-neutral-100">
                    No guests found
                  </div>
                  <div className="mt-1 text-[12px] text-neutral-500">
                    Try a different search.
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
