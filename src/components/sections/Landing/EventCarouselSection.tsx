"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EventCard } from "@/components/ui/EventCard";
import { Button } from "@/components/ui/Button";

/* -------------------------------------------------- */
/*  Data shape your EventCard requires                */
/* -------------------------------------------------- */
export type Event = {
  id: string;
  title: string;
  dateLabel: string;
  venue: string;
  img: string;
  category: string;
};

/* -------------------------------------------------- */
/*  Layout + behaviour configuration                  */
/* -------------------------------------------------- */
const GAP_PX = 7;
const CARD_WIDTHS = [229, 171] as const;

const RESPONSIVE_CAROUSEL_BREAKPOINT = 1024; // < lg => carousel when isCarousel={false}
const SHADOW_W = 64; // px
const TRANSITION_MS = 300;

/** Desktop grid rules (your “max 6 columns, wrap when hit min width”) */
const GRID_MIN_CARD_W = 220; // must match minmax(220px, 1fr)
const GRID_GAP_PX = 16; // gap-4 = 16px
const GRID_MAX_COLS = 6;

const getSidePadding = (winW: number) => {
  // Must match container paddings used in this component:
  // px-4 (16) | sm:px-6 (24) | lg:px-[120px]
  if (winW >= 1024) return 120;
  if (winW >= 640) return 24;
  return 16;
};

const calcLayout = (winW: number) => {
  const side = getSidePadding(winW);
  const safe = Math.max(0, winW - side * 2);

  for (const cw of CARD_WIDTHS) {
    const vis = Math.floor((safe + GAP_PX) / (cw + GAP_PX));
    if (vis >= 1) return { cardW: cw, visible: vis };
  }

  return { cardW: CARD_WIDTHS.at(-1)!, visible: 1 };
};

/** Desktop grid columns: clamp to max 6, drop rows when cards would go < 220px */
const calcGridCols = (winW: number) => {
  const side = getSidePadding(winW);
  const safe = Math.max(0, winW - side * 2);

  // how many columns can fit at the MIN card width (including gaps)
  const colsAtMin = Math.floor(
    (safe + GRID_GAP_PX) / (GRID_MIN_CARD_W + GRID_GAP_PX)
  );

  // clamp: 1..6
  return Math.min(GRID_MAX_COLS, Math.max(1, colsAtMin));
};

/* -------------------------------------------------- */
/*  Component                                         */
/* -------------------------------------------------- */
export interface EventCarouselSectionProps {
  title: string;
  icon?: ReactNode;
  events: Event[];
  onViewAll?: () => void;
  onSelect?: (e: Event) => void;

  /**
   * - true  => always carousel (arrows + sliding)
   * - false => ≥1024: desktop grid list (6 items)
   *           <1024: carousel (6 items) instead of wrapping
   */
  isCarousel?: boolean;
}

export default function EventCarouselSection({
  title,
  icon,
  events,
  onViewAll,
  onSelect,
  isCarousel = false,
}: EventCarouselSectionProps) {
  // When NOT forced carousel, we only ever show 6 items (both desktop list + mobile carousel)
  const shownEvents = useMemo(
    () => (isCarousel ? events : events.slice(0, 6)),
    [events, isCarousel]
  );

  // Track window width to switch modes responsively
  const [winW, setWinW] = useState(() =>
    typeof window === "undefined" ? 1200 : window.innerWidth
  );

  // If user didn't ask for carousel, make it carousel on mobile/tablet (<1024)
  const responsiveCarousel =
    !isCarousel && winW < RESPONSIVE_CAROUSEL_BREAKPOINT;
  const effectiveCarousel = isCarousel || responsiveCarousel;

  /* responsive sizing (carousel modes only) */
  const [{ cardW, visible }, setLayout] = useState(() =>
    typeof window === "undefined"
      ? { cardW: CARD_WIDTHS[0], visible: 3 }
      : calcLayout(window.innerWidth)
  );

  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      setWinW(w);

      // Only keep layout in sync when carousel is active (forced OR responsive)
      if (isCarousel || w < RESPONSIVE_CAROUSEL_BREAKPOINT) {
        setLayout(calcLayout(w));
      }
    };

    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isCarousel]);

  const STEP = cardW + GAP_PX;
  const viewportW = visible * cardW + (visible - 1) * GAP_PX;

  /* desktop grid template (fixed columns, max 6) */
  const gridTemplateColumns = useMemo(() => {
    const cols = calcGridCols(winW);
    // ✅ fixed track count => never “more than 6 columns”
    // ✅ empty tracks stay => fewer than 6 items won't stretch larger
    // ✅ wraps naturally as cols drops (5/4/3/2/1)
    return `repeat(${cols}, minmax(${GRID_MIN_CARD_W}px, 1fr))`;
  }, [winW]);

  /* carousel state */
  const [idx, setIdx] = useState(0);
  const [anim, setAnim] = useState(false);

  /* boundaries */
  useEffect(() => {
    if (!effectiveCarousel) {
      setIdx(0);
      setAnim(false);
      return;
    }

    // keep idx valid when visible count / event count changes
    setIdx((i) => Math.min(i, Math.max(shownEvents.length - visible, 0)));
  }, [effectiveCarousel, visible, shownEvents.length]);

  const maxIdx = Math.max(shownEvents.length - visible, 0);

  const canLeft = effectiveCarousel && idx < maxIdx;
  const canRight = effectiveCarousel && idx > 0;

  const shiftLeft = useCallback(() => {
    if (!effectiveCarousel) return;
    if (!canLeft || anim) return;
    setAnim(true);
    setIdx((i) => i + 1);
  }, [effectiveCarousel, canLeft, anim]);

  const shiftRight = useCallback(() => {
    if (!effectiveCarousel) return;
    if (!canRight || anim) return;
    setAnim(true);
    setIdx((i) => i - 1);
  }, [effectiveCarousel, canRight, anim]);

  const onEnd = () => setAnim(false);

  return (
    <div className="mb-16">
      {/* header */}
      <div className="mb-6 flex items-center justify-between px-4 sm:px-6 lg:px-[120px]">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center text-white [&_svg]:h-7 [&_svg]:w-7">
            {icon}
          </span>
          <h2 className="text-2xl font-semibold text-neutral-0">{title}</h2>
        </div>

        <div className="flex items-center gap-3">
          {onViewAll && (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={onViewAll}
              className="!hidden md:!inline-flex border border-transparent hover:border-primary-500 transition duration-200"
            >
              View all
            </Button>
          )}

          {/* arrows only when we're actually in carousel mode AND there's something to slide */}
          {effectiveCarousel && maxIdx > 0 && (
            <>
              <button
                onClick={shiftRight}
                disabled={!canRight}
                className={clsx(
                  "rounded-full border border-neutral-700/70 p-3 hover:border-primary-500 cursor-pointer",
                  !canRight && "cursor-default opacity-30 hover:bg-transparent"
                )}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={shiftLeft}
                disabled={!canLeft}
                className={clsx(
                  "rounded-full border border-neutral-700/70 p-3 hover:border-primary-500 cursor-pointer",
                  !canLeft && "cursor-default opacity-30 hover:bg-transparent"
                )}
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* content */}
      <div className="relative px-4 sm:px-6 lg:px-[120px]">
        {/* ≥1024 and isCarousel={false}: DESKTOP grid list (max 6 cols, wraps when hit min width) */}
        {!effectiveCarousel ? (
          <div
            className="grid w-full gap-4 group/row transition-all duration-300"
            style={{ gridTemplateColumns }}
          >
            {shownEvents.map((ev) => (
              <div
                key={ev.id}
                className="cursor-pointer"
                onClick={() => onSelect?.(ev)}
              >
                <EventCard {...ev} className="h-full w-full" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* gradient fades – carousel only */}
            <div
              aria-hidden
              className={clsx(
                "pointer-events-none absolute top-0 bottom-0 z-10",
                canRight ? "opacity-100" : "opacity-0"
              )}
              style={{
                left: 0,
                width: SHADOW_W,
                backgroundColor: "var(--background)",
                WebkitMaskImage:
                  "linear-gradient(to right, black 0%, transparent 100%)",
                maskImage:
                  "linear-gradient(to right, black 0%, transparent 100%)",
                transition: "opacity 200ms ease",
              }}
            />
            <div
              aria-hidden
              className={clsx(
                "pointer-events-none absolute top-0 bottom-0 z-10",
                canLeft ? "opacity-100" : "opacity-0"
              )}
              style={{
                right: 0,
                width: SHADOW_W,
                backgroundColor: "var(--background)",
                WebkitMaskImage:
                  "linear-gradient(to left, black 0%, transparent 100%)",
                maskImage:
                  "linear-gradient(to left, black 0%, transparent 100%)",
                transition: "opacity 200ms ease",
              }}
            />

            {/* track (NO overflow-hidden — it can spill off-screen) */}
            <div className="flex items-start">
              <div className="relative" style={{ width: viewportW }}>
                <div
                  onTransitionEnd={onEnd}
                  className="group/row flex"
                  style={{
                    columnGap: GAP_PX,
                    transform: `translateX(-${idx * STEP}px)`,
                    transition: anim
                      ? `transform ${TRANSITION_MS}ms ease`
                      : "none",
                  }}
                >
                  {shownEvents.map((ev) => (
                    <div
                      key={ev.id}
                      style={{ width: cardW }}
                      className="flex-shrink-0 cursor-pointer"
                      onClick={() => onSelect?.(ev)}
                    >
                      <EventCard {...ev} className="h-full" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
