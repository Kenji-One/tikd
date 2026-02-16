/* ------------------------------------------------------------------ */
/*  src/app/dashboard/events/[eventId]/layout.tsx                      */
/* ------------------------------------------------------------------ */
"use client";

import type { ReactNode, ComponentType, SVGProps } from "react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  useCallback,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  Rocket,
  X,
  Loader2,
  Link as LinkIcon,
} from "lucide-react";

import confetti from "canvas-confetti";
import { gsap } from "gsap";

import { fetchEventById, type EventWithMeta } from "@/lib/api/events";
import { Button } from "@/components/ui/Button";
import DownloadCsvModal from "@/components/dashboard/data/DownloadCsvModal";
import { titleInitial } from "@/lib/utils";

type EventLayoutProps = {
  children: ReactNode;
};

type EventTabId =
  | "summary"
  | "ticket-types"
  | "promo-codes"
  | "tracking-links"
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
  { id: "tracking-links", label: "Tracking Links", Icon: LinkIcon },
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

function mapTicketTypeApiToRow(api: {
  _id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  soldCount?: number;
  totalQuantity: number | null;
  availabilityStatus?: string;
}) {
  return {
    id: api._id,
    name: api.name,
    description: api.description ?? "",
    price: api.price,
    currency: api.currency,
    sold: api.soldCount ?? 0,
    capacity: api.totalQuantity,
    status: (api.availabilityStatus ?? "on_sale") as
      | "on_sale"
      | "sale_ended"
      | "scheduled"
      | "unknown",
  };
}

/**
 * IMPORTANT:
 * The ticket-types page expects TicketTypeRow[] (with `id`),
 * so prefetch MUST store the same shape in the cache.
 * Otherwise first client navigation reads cached raw API data and drag/drop breaks.
 */
async function fetchTicketTypesRows(eventId: string) {
  const res = await fetch(`/api/events/${eventId}/ticket-types`);
  if (!res.ok) throw new Error("Failed to load ticket types");
  const json = (await res.json()) as Array<{
    _id: string;
    name: string;
    description?: string;
    price: number;
    currency: string;
    soldCount?: number;
    totalQuantity: number | null;
    availabilityStatus?: string;
  }>;
  return json.map(mapTicketTypeApiToRow);
}

async function fetchPromoCodesApi(eventId: string) {
  const res = await fetch(`/api/events/${eventId}/promo-codes`);
  if (!res.ok) throw new Error("Failed to load promo codes");
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  Status mutation                                                    */
/* ------------------------------------------------------------------ */
async function patchEventStatus(
  eventId: string,
  status: "published" | "draft",
) {
  const res = await fetch(`/api/events/${eventId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    let message = "Failed to update event status";
    try {
      const j: unknown = await res.json();

      if (typeof j === "string") {
        message = j || message;
      } else if (j && typeof j === "object") {
        const obj = j as Record<string, unknown>;
        const maybeError = typeof obj.error === "string" ? obj.error : "";
        const maybeMsg = typeof obj.message === "string" ? obj.message : "";
        message = maybeError || maybeMsg || message;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return true;
}

/* ------------------------------------------------------------------ */
/*  Galaxy Publish Button                                              */
/* ------------------------------------------------------------------ */
function GalaxyPublishButton(props: {
  disabled?: boolean;
  pending?: boolean;
  onClick: () => void;
  title?: string;
}) {
  const { disabled, pending, onClick, title } = props;

  const ref = useRef<HTMLButtonElement | null>(null);

  const burstTimeout = useRef<number | null>(null);
  const [burst, setBurst] = useState(false);

  const setCenter = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--mx", "50%");
    el.style.setProperty("--my", "50%");
    el.style.setProperty("--mxpx", "0px");
    el.style.setProperty("--mypx", "0px");
  }, []);

  useEffect(() => {
    setCenter();
    return () => {
      if (burstTimeout.current != null)
        window.clearTimeout(burstTimeout.current);
    };
  }, [setCenter]);

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();

    const px = e.clientX - r.left;
    const py = e.clientY - r.top;

    const mx = Math.max(0, Math.min(100, (px / r.width) * 100));
    const my = Math.max(0, Math.min(100, (py / r.height) * 100));

    el.style.setProperty("--mx", `${mx}%`);
    el.style.setProperty("--my", `${my}%`);

    const dx = (mx - 50) / 50;
    const dy = (my - 50) / 50;
    el.style.setProperty("--mxpx", `${dx * 6}px`);
    el.style.setProperty("--mypx", `${dy * 5}px`);
  };

  const triggerBurst = () => {
    if (disabled || pending) return;
    setBurst(false);
    requestAnimationFrame(() => setBurst(true));
    if (burstTimeout.current != null) window.clearTimeout(burstTimeout.current);
    burstTimeout.current = window.setTimeout(() => setBurst(false), 720);
  };

  return (
    <button
      ref={ref}
      type="button"
      className={clsx(
        "tikd-publish-pill",
        disabled && "tikd-publish-pill-disabled",
      )}
      onClick={() => {
        triggerBurst();
        onClick();
      }}
      onPointerMove={onPointerMove}
      onPointerEnter={setCenter}
      onPointerLeave={setCenter}
      disabled={disabled}
      aria-disabled={disabled ? "true" : "false"}
      data-burst={burst ? "true" : "false"}
      data-pending={pending ? "true" : "false"}
      title={title ?? "Publish event"}
    >
      <span className="tikd-publish-pill-bg" aria-hidden="true" />
      <span className="tikd-publish-sky" aria-hidden="true" />
      <span className="tikd-publish-stars" aria-hidden="true" />

      {/* Border (base + aurora only) */}
      <span className="tikd-publish-border" aria-hidden="true">
        <svg
          className="tikd-publish-border-svg"
          viewBox="0 0 100 40"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <linearGradient
              id="tikdPublishBorderBaseGrad"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.62" />
              <stop offset="55%" stopColor="#ffffff" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>

            <linearGradient
              id="tikdPublishBorderAurora"
              x1="0"
              y1="0"
              x2="1"
              y2="1"
            >
              <stop offset="0%" stopColor="#ff5adc" stopOpacity="0.55" />
              <stop offset="45%" stopColor="#9a46ff" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#c7a0ff" stopOpacity="0.55" />
            </linearGradient>
          </defs>

          <path
            className="tikd-publish-border-base"
            d="M20 1H80A19 19 0 0 1 99 20A19 19 0 0 1 80 39H20A19 19 0 0 1 1 20A19 19 0 0 1 20 1Z"
            pathLength="100"
            vectorEffect="non-scaling-stroke"
          />

          <path
            className="tikd-publish-border-aurora"
            d="M20 1H80A19 19 0 0 1 99 20A19 19 0 0 1 80 39H20A19 19 0 0 1 1 20A19 19 0 0 1 20 1Z"
            pathLength="100"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </span>

      <span className="tikd-publish-rocketWrap" aria-hidden="true">
        {pending ? (
          <span className="tikd-publish-spinner" />
        ) : (
          <Rocket className="tikd-publish-rocket h-4 w-4" />
        )}
      </span>

      <span className="tikd-publish-pill-text">
        {pending ? "Publishing…" : "Publish"}
      </span>
    </button>
  );
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

  // Publish success popup
  const [publishSuccessOpen, setPublishSuccessOpen] = useState(false);

  // Download CSV modal
  const [downloadOpen, setDownloadOpen] = useState(false);

  // --- NEW: refs for animation + confetti (keeps design intact) ---
  const publishModalRef = useRef<HTMLDivElement | null>(null);
  const publishIconRef = useRef<HTMLDivElement | null>(null);
  const publishCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const confettiApiRef = useRef<ReturnType<typeof confetti.create> | null>(
    null,
  );
  const confettiTimeoutRef = useRef<number | null>(null);
  const hasFiredRef = useRef(false);

  const basePath = eventId ? `/dashboard/events/${eventId}` : "";

  const { data: event, isLoading } = useQuery<EventWithMeta>({
    queryKey: ["event", eventId],
    queryFn: () => fetchEventById(eventId!),
    enabled: !!eventId,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });

  const status = event?.status as "draft" | "published" | undefined;
  const isPublished = status === "published";

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
    return (
      pathname === `${basePath}/summary` ||
      activeTab === "summary" ||
      activeTab === "guests" ||
      activeTab === "tracking-links" ||
      activeTab === "team"
    );
  }, [activeTab, basePath, pathname]);

  // Prefetch the “heavy tabs” once we know the eventId.
  useEffect(() => {
    if (!eventId) return;

    qc.prefetchQuery({
      queryKey: ["event", eventId],
      queryFn: () => fetchEventById(eventId),
      staleTime: 5 * 60_000,
    });

    // ✅ Prefetch rows (NOT raw API), so cache matches ticket-types page
    qc.prefetchQuery({
      queryKey: ["ticket-types", eventId],
      queryFn: () => fetchTicketTypesRows(eventId),
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

  // Close publish popup on ESC
  useEffect(() => {
    if (!publishSuccessOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPublishSuccessOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [publishSuccessOpen]);

  // Close download modal on ESC (since it uses a fixed overlay)
  useEffect(() => {
    if (!downloadOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDownloadOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [downloadOpen]);

  // --- NEW: confetti + GSAP animation when modal opens ---
  useEffect(() => {
    if (!publishSuccessOpen) {
      hasFiredRef.current = false;

      // cleanup any pending confetti burst
      if (confettiTimeoutRef.current != null) {
        window.clearTimeout(confettiTimeoutRef.current);
        confettiTimeoutRef.current = null;
      }
      return;
    }

    // Respect reduced motion
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce) return;

    // Build confetti instance bound to OUR canvas (fixes z-index issues)
    const canvas = publishCanvasRef.current;
    if (canvas) {
      confettiApiRef.current = confetti.create(canvas, { resize: true });
    } else {
      confettiApiRef.current = null;
    }

    // Make sure canvas fills overlay immediately
    const resizeCanvas = () => {
      const c = publishCanvasRef.current;
      if (!c) return;
      // Canvas-confetti reads client sizes; ensure we have them
      const w = window.innerWidth;
      const h = window.innerHeight;
      c.style.width = "100%";
      c.style.height = "100%";
      c.width = Math.floor(w * (window.devicePixelRatio || 1));
      c.height = Math.floor(h * (window.devicePixelRatio || 1));
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Defer one frame so DOM is definitely painted before we animate
    const raf = window.requestAnimationFrame(() => {
      const modal = publishModalRef.current;
      const icon = publishIconRef.current;

      if (!modal) return;

      // Animate content lines (title/subtext/button) without changing design classes
      const lines = Array.from(
        modal.querySelectorAll<HTMLElement>("[data-publish-anim='line']"),
      );

      if (icon) {
        gsap.set(icon, { opacity: 0, scale: 0.75, y: -6 });
      }
      if (lines.length) {
        gsap.set(lines, { opacity: 0, y: 10 });
      }

      const tl = gsap.timeline();

      if (icon) {
        tl.to(icon, {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.85,
          ease: "elastic.out(1,0.45)",
        });
      }

      if (lines.length) {
        tl.to(
          lines,
          {
            opacity: 1,
            y: 0,
            duration: 0.42,
            ease: "power3.out",
            stagger: 0.06,
          },
          0.18,
        );
      }

      // Fire confetti once per open
      if (!hasFiredRef.current) {
        hasFiredRef.current = true;

        const shoot = confettiApiRef.current;

        if (shoot) {
          // Tikd purple vibe
          const colors = [
            "#9A46FF",
            "#C7A0FF",
            "#FF5ADC",
            "#7C3AED",
            "#A855F7",
          ];

          // Burst 1
          shoot({
            particleCount: 95,
            spread: 78,
            startVelocity: 28,
            gravity: 0.98,
            scalar: 0.9,
            ticks: 220,
            origin: { x: 0.5, y: 0.34 },
            colors,
          });

          // Burst 2 (follow-up “party” feel)
          confettiTimeoutRef.current = window.setTimeout(() => {
            shoot({
              particleCount: 65,
              spread: 118,
              startVelocity: 20,
              gravity: 1.05,
              scalar: 0.78,
              ticks: 200,
              origin: { x: 0.5, y: 0.34 },
              colors,
            });
          }, 130);
        }
      }
    });

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resizeCanvas);

      if (confettiTimeoutRef.current != null) {
        window.clearTimeout(confettiTimeoutRef.current);
        confettiTimeoutRef.current = null;
      }
    };
  }, [publishSuccessOpen]);

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
        queryFn: () => fetchTicketTypesRows(eventId),
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

  const setEventStatusInCache = useCallback(
    (nextStatus: "published" | "draft") => {
      if (!eventId) return;

      qc.setQueryData(["event", eventId], (prev: EventWithMeta | undefined) => {
        if (!prev) return prev;
        return { ...prev, status: nextStatus };
      });
    },
    [eventId, qc],
  );

  const invalidateDashboardUpcoming = useCallback(() => {
    // ✅ Key fix: this makes the dashboard “Upcoming Events” update immediately.
    qc.invalidateQueries({
      queryKey: ["dashboard-upcoming-events"],
      refetchType: "active",
    });
  }, [qc]);

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!eventId) throw new Error("Missing event id");
      return patchEventStatus(eventId, "published");
    },
    onSuccess: () => {
      setEventStatusInCache("published");
      qc.invalidateQueries({ queryKey: ["event", eventId] });

      // ✅ important: update dashboard upcoming list immediately
      invalidateDashboardUpcoming();

      setPublishSuccessOpen(true);
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: async () => {
      if (!eventId) throw new Error("Missing event id");
      return patchEventStatus(eventId, "draft");
    },
    onSuccess: () => {
      setEventStatusInCache("draft");
      qc.invalidateQueries({ queryKey: ["event", eventId] });

      // ✅ important: remove it from dashboard upcoming list immediately
      invalidateDashboardUpcoming();
    },
  });

  const isStatusBusy = publishMutation.isPending || unpublishMutation.isPending;

  const handlePublishClick = () => {
    if (!eventId || isStatusBusy) return;
    publishMutation.mutate();
  };

  const handleUnpublishClick = () => {
    if (!eventId || isStatusBusy) return;
    unpublishMutation.mutate();
  };

  const openPublicEvent = () => {
    if (!eventId) return;
    window.open(`/events/${eventId}`, "_blank", "noreferrer");
  };

  const statusError =
    publishMutation.error?.message || unpublishMutation.error?.message || "";

  return (
    <main className="relative min-h-screen bg-neutral-950 text-neutral-0">
      {/* Download CSV modal */}
      <DownloadCsvModal
        open={downloadOpen}
        onOpenChange={setDownloadOpen}
        eventName={event?.title ?? ""}
      />

      {/* Publish success modal */}
      {publishSuccessOpen && (
        <div
          className={clsx(
            "tikd-publish-modal-overlay",
            "tikd-publish-overlay-anim",
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Event published"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPublishSuccessOpen(false);
          }}
        >
          {/* Confetti canvas pinned to overlay (ALWAYS visible above backdrop) */}
          <canvas
            ref={publishCanvasRef}
            className="tikd-publish-confetti-canvas"
            aria-hidden="true"
          />

          {/* Modal (design class unchanged; only adds animation + spacing helpers) */}
          <div
            ref={publishModalRef}
            className={clsx(
              "tikd-publish-modal",
              "tikd-publish-modal-anim",
              // spacing/sizing fix (no visual redesign; just less cramped)
              "px-8 py-7 sm:px-10 sm:py-8",
            )}
          >
            <button
              type="button"
              className="tikd-publish-modal-close"
              onClick={() => setPublishSuccessOpen(false)}
              aria-label="Close"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>

            {/* icon pop target (design class unchanged) */}
            <div ref={publishIconRef} className="tikd-publish-modal-icon">
              <Check className="h-6 w-6" />
            </div>

            {/* spacing + stagger targets */}
            <div className="mt-5 space-y-2 text-center">
              <h3 data-publish-anim="line" className="tikd-publish-modal-title">
                Event Published!
              </h3>

              <p
                data-publish-anim="line"
                className="tikd-publish-modal-subtext"
              >
                Your event is now live and visible to users. You can manage
                details, tickets, and settings at any time.
              </p>
            </div>

            <div
              data-publish-anim="line"
              className="mt-6 flex items-center justify-center"
            >
              <button
                type="button"
                className="tikd-publish-modal-btn"
                onClick={openPublicEvent}
              >
                View Live Event
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="tikd-event-hero pb-14">
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
                        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-neutral-900 ring-1 ring-neutral-800/60 text-[14px] font-semibold text-neutral-200">
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
                        <span className="tikd-chip tikd-chip-primary">
                          <CalendarDays className="h-3.5 w-3.5 text-primary-200" />
                          <span>
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

                      {!!statusError && (
                        <div className="mt-2 text-[12.5px] font-medium text-red-300">
                          {statusError}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-2">
                  {/* Download button (Uiverse-inspired) */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    asChild
                    className="tikd-action-icon tikdDownloadWrap"
                    title="Download CSV"
                    aria-label="Download CSV"
                  >
                    <button
                      type="button"
                      className="tikdDownloadBtn"
                      onClick={() => setDownloadOpen(true)}
                    >
                      <svg
                        className="tikdDownloadBtn__svgIcon"
                        viewBox="0 0 384 512"
                        width="16"
                        height="16"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <path d="M169.4 470.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L224 370.8 224 64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 306.7L54.6 265.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z" />
                      </svg>
                      <span
                        className="tikdDownloadBtn__icon2"
                        aria-hidden="true"
                      />
                      <span className="tikdDownloadBtn__tooltip">Download</span>
                    </button>
                  </Button>

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

                  {/* Publish / Unpublish */}
                  {eventId && (
                    <>
                      {isPublished ? (
                        <button
                          type="button"
                          className={clsx(
                            "tikd-unpublish-btn",
                            isStatusBusy && "tikd-unpublish-btn-disabled",
                          )}
                          onClick={handleUnpublishClick}
                          disabled={isStatusBusy}
                          aria-disabled={isStatusBusy ? "true" : "false"}
                          title="Unpublish event"
                        >
                          {unpublishMutation.isPending ? (
                            <span className="inline-flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Unpublishing
                            </span>
                          ) : (
                            "Unpublish"
                          )}
                        </button>
                      ) : (
                        <GalaxyPublishButton
                          disabled={isStatusBusy}
                          pending={publishMutation.isPending}
                          onClick={handlePublishClick}
                          title="Publish event"
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </header>
        </div>

        {/* Tabs */}
        <div className="mt-5 px-4">
          <div className="no-scrollbar overflow-x-auto overflow-y-visible">
            <div className="flex w-full justify-center">
              <nav
                aria-label="Event dashboard tabs"
                role="tablist"
                aria-busy={isPending ? "true" : "false"}
                className={clsx(
                  "tikd-tabs-shell relative inline-flex min-w-max items-center gap-3 px-2 py-2",
                  isPending && "tikd-tabs-pending",
                )}
              >
                {EVENT_TABS.map((tab) => {
                  const href =
                    basePath && eventId ? `${basePath}/${tab.id}` : "#";
                  const isActive = activeTab === tab.id;

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
                        "relative z-10 min-h-[44px] px-3.5 py-2 outline-none focus-visible:ring-2 focus-visible:ring-primary-500/35 focus-visible:ring-offset-0",
                        isVisuallyActive ? "tikd-tab-active" : "tikd-tab-icon",
                        isPending &&
                          pendingTab === tab.id &&
                          "tikd-tab-clicked",
                      )}
                    >
                      <Icon className={clsx("shrink-0", "h-5.5 w-5.5")} />
                      {isVisuallyActive ? (
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

      {/* Always-on CSS for the Uiverse download button (scoped to classnames) */}
      <style jsx global>{`
        /* From Uiverse.io by vinodjangid07 (adapted to Tikd tokens) */
        .tikdDownloadBtn {
          width: 100%;
          height: 100%;
          border: none;
          border-radius: 999px;
          /* background-color: rgba(24, 24, 40, 0.86); */
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          position: relative;
          transition-duration: 0.3s;
          /* box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.11); */
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          padding: 0px;
        }

        .tikdDownloadBtn:focus-visible {
          outline: none;
          box-shadow:
            0 0 0 2px rgba(154, 70, 255, 0.35),
            2px 2px 10px rgba(0, 0, 0, 0.11);
        }

        .tikdDownloadBtn__svgIcon {
          fill: var(--color-primary-200);
          width: 16px;
          height: 16px;
          display: block;
        }

        .tikdDownloadBtn__icon2 {
          width: 16px;
          height: 5px;
          border-bottom: 2px solid var(--color-primary-300);
          border-left: 2px solid var(--color-primary-300);
          border-right: 2px solid var(--color-primary-300);
          margin-top: 2px;
        }

        /* Tooltip appears to the LEFT (we're on the right side of the header) */
        .tikdDownloadBtn__tooltip {
          position: absolute;
          right: calc(100% + 12px);
          top: 50%;
          transform: translateY(-50%);
          opacity: 0;
          background-color: rgba(8, 8, 15, 0.92);
          color: white;
          padding: 6px 10px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition-duration: 0.2s;
          pointer-events: none;
          letter-spacing: 0.4px;
          font-size: 12.5px;
          font-weight: 700;
          white-space: nowrap;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow:
            0 14px 46px rgba(0, 0, 0, 0.62),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }

        .tikdDownloadBtn__tooltip::before {
          position: absolute;
          content: "";
          width: 10px;
          height: 10px;
          background-color: rgba(8, 8, 15, 0.92);
          transform: rotate(45deg);
          right: -5px;
          top: 50%;
          margin-top: -5px;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .tikdDownloadWrap:hover .tikdDownloadBtn__tooltip,
        .tikdDownloadBtn:hover .tikdDownloadBtn__tooltip {
          opacity: 1;
          transition-duration: 0.3s;
        }

        .tikdDownloadWrap:hover .tikdDownloadBtn,
        .tikdDownloadBtn:hover {
          transition-duration: 0.3s;
        }

        .tikdDownloadBtn:active {
          transform: translateY(0px);
        }

        .tikdDownloadWrap:hover .tikdDownloadBtn__icon2,
        .tikdDownloadBtn:hover .tikdDownloadBtn__icon2 {
          border-bottom: 2px solid rgba(235, 235, 235, 0.95);
          border-left: 2px solid rgba(235, 235, 235, 0.95);
          border-right: 2px solid rgba(235, 235, 235, 0.95);
        }

        tikdDownloadWrap:hover .tikdDownloadBtn__svgIcon,
        .tikdDownloadBtn:hover .tikdDownloadBtn__svgIcon {
          fill: rgb(255, 255, 255);
          animation: tikd-slide-in-top 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)
            both;
        }

        @keyframes tikd-slide-in-top {
          0% {
            transform: translateY(-10px);
            opacity: 0;
          }
          100% {
            transform: translateY(0px);
            opacity: 1;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .tikdDownloadBtn {
            transition-duration: 0.01ms;
          }
          .tikdDownloadBtn:hover .tikdDownloadBtn__svgIcon {
            animation: none;
          }
        }

        /* ---------------- Publish success modal animations + confetti ---------------- */
        .tikd-publish-overlay-anim {
          animation: tikdPublishFadeIn 220ms ease-out both;
        }

        .tikd-publish-modal-anim {
          animation: tikdPublishPopIn 280ms cubic-bezier(0.2, 0.9, 0.2, 1) both;
        }

        @keyframes tikdPublishFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes tikdPublishPopIn {
          from {
            opacity: 0;
            transform: translate3d(0, 10px, 0) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }

        /* Confetti should be above backdrop but BELOW the modal */
        .tikd-publish-confetti-canvas {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 3;
        }

        /* Ensure modal is above confetti */
        .tikd-publish-modal {
          position: relative;
          z-index: 2;
        }

        .tikd-publish-modal-close {
          z-index: 4;
        }
      `}</style>
    </main>
  );
}
