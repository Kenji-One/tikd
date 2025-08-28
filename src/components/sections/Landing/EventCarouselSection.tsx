// src/components/sections/Landing/EventCarouselSection.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
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
/*  Slider layout + behaviour configuration           */
/* -------------------------------------------------- */
const GAP_PX = 7;
const CARD_WIDTHS = [229, 171] as const;

const SIDE_PADDING = 120; // px per side
const SHADOW_W = 64; // px
const TRANSITION_MS = 300;

const calcLayout = (winW: number) => {
  const safe = Math.max(0, winW - SIDE_PADDING * 2);
  for (const cw of CARD_WIDTHS) {
    const vis = Math.floor((safe + GAP_PX) / (cw + GAP_PX));
    if (vis >= 1) return { cardW: cw, visible: vis };
  }
  return { cardW: CARD_WIDTHS.at(-1)!, visible: 1 };
};

/* -------------------------------------------------- */
/*  Component                                         */
/* -------------------------------------------------- */
export interface EventCarouselSectionProps {
  title: string;
  icon?: React.ReactNode;
  events: Event[];
  onViewAll?: () => void;
  onSelect?: (e: Event) => void;
}

export default function EventCarouselSection({
  title,
  icon,
  events,
  onViewAll,
  onSelect,
}: EventCarouselSectionProps) {
  /* responsive sizing */
  const [{ cardW, visible }, setLayout] = useState(() =>
    typeof window === "undefined"
      ? { cardW: 260, visible: 3 }
      : calcLayout(window.innerWidth)
  );
  const STEP = cardW + GAP_PX;
  const viewportW = visible * cardW + (visible - 1) * GAP_PX;

  useEffect(() => {
    const onResize = () => setLayout(calcLayout(window.innerWidth));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* carousel state */
  const [idx, setIdx] = useState(0);
  const [anim, setAnim] = useState(false);

  /* boundaries */
  useEffect(() => {
    setIdx((i) => Math.min(i, Math.max(events.length - visible, 0)));
  }, [visible, events.length]);

  const maxIdx = Math.max(events.length - visible, 0);
  const canLeft = idx < maxIdx;
  const canRight = idx > 0;

  const shiftLeft = useCallback(
    () => canLeft && !anim && (setAnim(true), setIdx((i) => i + 1)),
    [canLeft, anim]
  );
  const shiftRight = useCallback(
    () => canRight && !anim && (setAnim(true), setIdx((i) => i - 1)),
    [canRight, anim]
  );
  const onEnd = () => setAnim(false);

  /* render */
  return (
    <div className="mb-16">
      {/* header */}
      <div className="mb-6 flex items-center justify-between px-4 lg:px-8 xl:px-[120px]">
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <h2 className="text-2xl font-semibold text-neutral-0">{title}</h2>
        </div>

        <div className="flex items-center gap-3">
          {onViewAll && (
            <Button
              variant="ghost"
              size="xs"
              type="button"
              onClick={onViewAll}
              className="hidden md:inline-flex border border-transparent hover:border-primary-500 transition duration-200"
            >
              View all
            </Button>
          )}
          <button
            onClick={shiftRight}
            disabled={!canRight}
            className={clsx(
              "rounded-full border border-neutral-700/70 p-3 hover:border-primary-500 cursor-pointer ",
              !canRight && "cursor-default opacity-30 hover:bg-transparent"
            )}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={shiftLeft}
            disabled={!canLeft}
            className={clsx(
              "rounded-full border border-neutral-700/70 p-3 hover:border-primary-500 cursor-pointer ",
              !canLeft && "cursor-default opacity-30 hover:bg-transparent"
            )}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* row (no overflow clipping) */}
      <div className="relative px-4 lg:px-8 xl:px-[120px]">
        {/* gradient fades – anchored to the INNER padding edge */}
        {/* left fade */}
        <div
          aria-hidden
          className={clsx(
            "pointer-events-none absolute top-0 bottom-0 z-10",
            canRight ? "opacity-100" : "opacity-0"
          )}
          style={{
            left: 0, // ✅ at the very start of content (padding edge)
            width: SHADOW_W,
            backgroundColor: "var(--background)",
            WebkitMaskImage:
              "linear-gradient(to right, black 0%, transparent 100%)",
            maskImage: "linear-gradient(to right, black 0%, transparent 100%)",
            transition: "opacity 200ms ease",
          }}
        />
        {/* right fade */}
        <div
          aria-hidden
          className={clsx(
            "pointer-events-none absolute top-0 bottom-0 z-10",
            canLeft ? "opacity-100" : "opacity-0"
          )}
          style={{
            right: 0, // ✅ flush with the end of content (padding edge)
            width: SHADOW_W,
            backgroundColor: "var(--background)",
            WebkitMaskImage:
              "linear-gradient(to left, black 0%, transparent 100%)",
            maskImage: "linear-gradient(to left, black 0%, transparent 100%)",
            transition: "opacity 200ms ease",
          }}
        />

        {/* track */}
        <div className="flex items-start">
          <div className="relative" style={{ width: viewportW }}>
            <div
              onTransitionEnd={onEnd}
              className="group/row flex"
              style={{
                columnGap: GAP_PX,
                transform: `translateX(-${idx * STEP}px)`,
                transition: anim ? `transform ${TRANSITION_MS}ms ease` : "none",
              }}
            >
              {events.map((ev) => (
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
      </div>
    </div>
  );
}
