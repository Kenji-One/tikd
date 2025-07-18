"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
const MAX_VISIBLE = 5;
const SIDE_SAFE = 64;
const TRANSITION_MS = 300;

const calcLayout = (winW: number) => {
  for (const cw of CARD_WIDTHS) {
    const safe = winW - SIDE_SAFE;
    const vis = Math.floor((safe + GAP_PX) / (cw + GAP_PX));
    if (vis >= 2) return { cardW: cw, visible: Math.min(vis, MAX_VISIBLE) };
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
      ? { cardW: 260, visible: MAX_VISIBLE }
      : calcLayout(window.innerWidth)
  );
  // const cardH = Math.round(cardW * (286 / 229));
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
  const shiftRight = () =>
    canRight && !anim && (setAnim(true), setIdx((i) => i - 1));
  const onEnd = () => setAnim(false);

  /* render */
  return (
    <div className="mb-16">
      {/* header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <h2 className="text-2xl font-semibold text-neutral-0">{title}</h2>
        </div>

        <div className="flex items-center gap-3">
          {onViewAll && (
            <Button variant="ghost" size="xs" type="button" onClick={onViewAll}>
              View all
            </Button>
          )}
          <button
            onClick={shiftRight}
            disabled={!canRight}
            className={clsx(
              "rounded-full border border-neutral-700/70 p-3 hover:bg-neutral-800/60",
              !canRight && "opacity-30 cursor-default hover:bg-transparent"
            )}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={shiftLeft}
            disabled={!canLeft}
            className={clsx(
              "rounded-full border border-neutral-700/70 p-3 hover:bg-neutral-800/60",
              !canLeft && "opacity-30 cursor-default hover:bg-transparent"
            )}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* row */}
      <div className="flex items-start gap-6">
        <div className="relative " style={{ width: viewportW }}>
          <div
            onTransitionEnd={onEnd}
            className="flex group/row"
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
  );
}
