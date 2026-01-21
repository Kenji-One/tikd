/* ------------------------------------------------------------------ */
/*  src/app/dashboard/events/[eventId]/layout.tsx                      */
/* ------------------------------------------------------------------ */
"use client";

import type { ReactNode, ComponentType, SVGProps } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import {
  CalendarDays,
  Check,
  Copy,
  Eye,
  LayoutDashboard,
  PencilLine,
  Percent,
  Settings,
  Ticket,
  UserRoundCog,
  Users,
  UsersRound,
} from "lucide-react";

import { fetchEventById, type EventWithMeta } from "@/lib/api/events";
import { Button } from "@/components/ui/Button";

type EventLayoutProps = {
  children: ReactNode;
};

type EventTabId =
  | "summary"
  | "ticket-types"
  | "promo-codes"
  | "guests"
  | "team"
  | "edit"
  | "settings";

type EventTabIcon = ComponentType<SVGProps<SVGSVGElement>>;

type EventTab = {
  id: EventTabId;
  label: string;
  Icon: EventTabIcon;
};

const EVENT_TABS: EventTab[] = [
  { id: "summary", label: "Summary", Icon: LayoutDashboard },
  { id: "ticket-types", label: "Ticket Types", Icon: Ticket },
  { id: "promo-codes", label: "Promo Codes", Icon: Percent },
  { id: "guests", label: "Guests", Icon: UsersRound },
  { id: "team", label: "Team", Icon: UserRoundCog },
  { id: "edit", label: "Edit", Icon: PencilLine },
  { id: "settings", label: "Settings", Icon: Settings },
];

function formatDateTime(value?: string) {
  if (!value) return "Date not set";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Date not set";

  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function titleInitial(title?: string) {
  const t = (title ?? "").trim();
  if (!t) return "E";
  return t[0]!.toUpperCase();
}

/**
 * Prefetch helpers — IMPORTANT:
 * We prefetch RAW API arrays, and the pages use `select` to map into rows.
 * That way, cache data type is consistent across layout + page.
 */
async function fetchTicketTypesApi(eventId: string) {
  const res = await fetch(`/api/events/${eventId}/ticket-types`);
  if (!res.ok) throw new Error("Failed to load ticket types");
  return res.json();
}

async function fetchPromoCodesApi(eventId: string) {
  const res = await fetch(`/api/events/${eventId}/promo-codes`);
  if (!res.ok) throw new Error("Failed to load promo codes");
  return res.json();
}

export default function EventDashboardLayout({ children }: EventLayoutProps) {
  const { eventId } = useParams() as { eventId?: string };
  const pathname = usePathname();
  const qc = useQueryClient();

  const [copied, setCopied] = useState(false);

  // For nicer “page-change” feel when clicking tabs
  const [isPending, startTransition] = useTransition();
  const [pendingTab, setPendingTab] = useState<EventTabId | null>(null);

  // Sticky styling when user scrolls
  const [isScrolled, setIsScrolled] = useState(false);

  const basePath = eventId ? `/dashboard/events/${eventId}` : "";

  const { data: event, isLoading } = useQuery<EventWithMeta>({
    queryKey: ["event", eventId],
    queryFn: () => fetchEventById(eventId!),
    enabled: !!eventId,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });

  const activeTab: EventTabId = useMemo(() => {
    let tab: EventTabId = "summary";
    if (basePath && pathname.startsWith(basePath)) {
      const rest = pathname.slice(basePath.length);
      const segment = rest.split("/").filter(Boolean)[0];
      if (segment && EVENT_TABS.some((t) => t.id === segment)) {
        tab = segment as EventTabId;
      }
    }
    return tab;
  }, [basePath, pathname]);

  const isSummaryPage = useMemo(() => {
    if (!basePath) return false;
    return pathname === `${basePath}/summary` || activeTab === "summary";
  }, [activeTab, basePath, pathname]);

  // Prefetch the “heavy tabs” once we know the eventId.
  useEffect(() => {
    if (!eventId) return;

    qc.prefetchQuery({
      queryKey: ["event", eventId],
      queryFn: () => fetchEventById(eventId),
      staleTime: 5 * 60_000,
    });

    qc.prefetchQuery({
      queryKey: ["ticket-types", eventId],
      queryFn: () => fetchTicketTypesApi(eventId),
      staleTime: 60_000,
    });

    qc.prefetchQuery({
      queryKey: ["promo-codes", eventId],
      queryFn: () => fetchPromoCodesApi(eventId),
      staleTime: 60_000,
    });
  }, [eventId, qc]);

  // Clear pending state after route actually changes
  useEffect(() => {
    setPendingTab(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Track scroll to style the sticky header background when it becomes "stuck"
  useEffect(() => {
    if (typeof window === "undefined") return;

    const threshold = 8;
    let raf: number | null = null;

    const onScroll = () => {
      if (raf != null) return;
      raf = window.requestAnimationFrame(() => {
        const y = window.scrollY || 0;
        setIsScrolled(y > threshold);
        raf = null;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf != null) window.cancelAnimationFrame(raf);
    };
  }, []);

  const status = event?.status;
  const statusLabel = status === "draft" ? "Draft" : "Published";

  const statusChipClasses =
    status === "draft"
      ? "tikd-chip tikd-chip-muted"
      : "tikd-chip tikd-chip-success";

  async function handleCopyPublicLink() {
    if (!eventId || typeof navigator === "undefined") return;
    const url = `/events/${eventId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // ignore
    }
  }

  function onTabClick(tabId: EventTabId) {
    startTransition(() => {
      setPendingTab(tabId);
    });
  }

  function prefetchForTab(tabId: EventTabId) {
    if (!eventId) return;

    if (tabId === "ticket-types") {
      qc.prefetchQuery({
        queryKey: ["ticket-types", eventId],
        queryFn: () => fetchTicketTypesApi(eventId),
        staleTime: 60_000,
      });
      return;
    }

    if (tabId === "promo-codes") {
      qc.prefetchQuery({
        queryKey: ["promo-codes", eventId],
        queryFn: () => fetchPromoCodesApi(eventId),
        staleTime: 60_000,
      });
      return;
    }

    if (tabId === "team") {
      qc.prefetchQuery({
        queryKey: ["event", eventId],
        queryFn: () => fetchEventById(eventId),
        staleTime: 5 * 60_000,
      });
    }
  }

  const posterUrl = event?.image || "";

  return (
    <main className="relative min-h-screen bg-neutral-950 text-neutral-0">
      <section className="tikd-event-hero pb-14">
        {/* Neutral hero wash behind header */}
        {/* <div aria-hidden="true" className="tikd-event-hero-bg" /> */}

        {/* Sticky TOP HEADER ONLY (tabs NOT included) */}
        <div className="tikd-event-header-sticky">
          <header
            className={clsx(
              "tikd-event-header-surface",
              isScrolled && "tikd-event-header-surface-scrolled",
            )}
          >
            {/* Full-width header always */}
            <div className="p-4 md:p-6 lg:p-8 z-2">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  {/* Title row with poster thumbnail */}
                  <div className="flex items-start gap-3">
                    {/* Poster thumbnail */}
                    <div className="mt-0.5 shrink-0">
                      {isLoading ? (
                        <div className="h-16 w-16 animate-pulse rounded-lg bg-neutral-900 ring-1 ring-neutral-800/60" />
                      ) : posterUrl ? (
                        <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-neutral-900 ring-1 ring-neutral-800/60">
                          <Image
                            src={posterUrl}
                            alt={`${event?.title ?? "Event"} poster`}
                            fill
                            sizes="64px"
                            className="object-cover"
                            priority
                          />
                        </div>
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-900 ring-1 ring-neutral-800/60 text-[14px] font-semibold text-neutral-200">
                          {titleInitial(event?.title)}
                        </div>
                      )}
                    </div>

                    {/* Title + chips */}
                    <div className="min-w-0">
                      <h1 className="tikd-event-title z-2">
                        {isLoading
                          ? "Loading event…"
                          : (event?.title ?? "Event")}
                      </h1>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="tikd-chip">
                          <CalendarDays className="h-3.5 w-3.5 text-neutral-500" />
                          <span className="text-neutral-300">
                            {event?.date
                              ? formatDateTime(event.date)
                              : "Date TBA"}
                          </span>
                        </span>

                        <span className={statusChipClasses}>
                          <span
                            className={clsx(
                              "tikd-chip-dot",
                              status === "draft"
                                ? "bg-neutral-300"
                                : "bg-success-500",
                            )}
                          />
                          <span>{statusLabel}</span>
                        </span>

                        <span className="tikd-chip">
                          <Users className="h-3.5 w-3.5 text-neutral-500" />
                          <span className="text-neutral-300">
                            {(event?.attendingCount ?? 0).toLocaleString()}{" "}
                            {(event?.attendingCount ?? 0) === 1
                              ? "attendee"
                              : "attendees"}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyPublicLink}
                    className={clsx(
                      "tikd-action-icon",
                      copied && "tikd-action-icon-success",
                    )}
                    title={copied ? "Link copied" : "Copy public link"}
                    aria-label={copied ? "Link copied" : "Copy public link"}
                    icon={
                      copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )
                    }
                  />

                  {eventId && (
                    <Button
                      asChild
                      variant="ghost"
                      size="md"
                      className="tikd-action-pill"
                      title="View public page"
                      icon={<Eye className="h-4 w-4" />}
                    >
                      <Link
                        href={`/events/${eventId}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </header>
        </div>

        {/* Tabs */}
        <div className="mt-5 px-4">
          <div className="no-scrollbar overflow-x-auto overflow-y-visible">
            {/* ✅ Center tabs on wide screens, still scrollable on small screens */}
            <div className="flex w-full justify-center">
              <nav
                aria-label="Event dashboard tabs"
                role="tablist"
                aria-busy={isPending ? "true" : "false"}
                className={clsx(
                  // ⬆️ Bigger shell (height/padding/rounding) + a bit more spacing
                  "tikd-tabs-shell relative inline-flex min-w-max items-center gap-3 px-2 py-2",
                  isPending && "tikd-tabs-pending",
                )}
              >
                {EVENT_TABS.map((tab) => {
                  const href =
                    basePath && eventId ? `${basePath}/${tab.id}` : "#";
                  const isActive = activeTab === tab.id;

                  // While route is changing: make clicked tab look “selected/loading”
                  const isVisuallyActive =
                    isActive || (isPending && pendingTab === tab.id);

                  const Icon = tab.Icon;

                  return (
                    <Link
                      key={tab.id}
                      href={href}
                      prefetch
                      scroll={false}
                      role="tab"
                      aria-selected={isActive}
                      aria-current={isActive ? "page" : undefined}
                      title={!isActive ? tab.label : undefined}
                      onClick={() => onTabClick(tab.id)}
                      onMouseEnter={() => prefetchForTab(tab.id)}
                      className={clsx(
                        // ⬆️ Bigger hit-area for each tab
                        "relative z-10 min-h-[44px] px-3.5 py-2 outline-none focus-visible:ring-2 focus-visible:ring-primary-500/35 focus-visible:ring-offset-0",
                        isVisuallyActive ? "tikd-tab-active" : "tikd-tab-icon",
                        isPending &&
                          pendingTab === tab.id &&
                          "tikd-tab-clicked",
                      )}
                    >
                      {/* ⬆️ Slightly larger icon */}
                      <Icon className={clsx("shrink-0", "h-5.5 w-5.5")} />

                      {isVisuallyActive ? (
                        // ⬆️ Slightly larger label
                        <span className="whitespace-nowrap text-[15px] font-semibold tracking-[-0.2px]">
                          {tab.label}
                        </span>
                      ) : (
                        <span className="sr-only">{tab.label}</span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>

        <div className="mt-8">
          {isSummaryPage ? (
            <div>{children}</div>
          ) : (
            <div className="mx-auto max-w-6xl px-4 pb-8">{children}</div>
          )}
        </div>
      </section>
    </main>
  );
}
