/* ------------------------------------------------------------------ */
/*  src/components/ui/GridListToggle.tsx                               */
/* ------------------------------------------------------------------ */
"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

export type GridListValue = "grid" | "list";

type Props = {
  value: GridListValue;
  onChange: (v: GridListValue) => void;

  // kept for backwards compatibility (not rendered)
  gridLabel?: string;
  listLabel?: string;

  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
};

export default function GridListToggle({
  value,
  onChange,
  disabled = false,
  className,
  ariaLabel = "View toggle",
}: Props) {
  // Ensure the visual state flips instantly for correct direction/state.
  const [visual, setVisual] = useState<GridListValue>(value);

  // Flip-flop class to restart CSS animation every click (no RAF/timeout).
  const [animFlip, setAnimFlip] = useState(0);

  // ✅ Prevent animation on initial mount (only animate after user interaction)
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => setVisual(value), [value]);

  const toggle = () => {
    if (disabled) return;

    const next: GridListValue = visual === "grid" ? "list" : "grid";
    setVisual(next);
    onChange(next);

    // ✅ Enable animations only after the first user interaction
    if (!hasInteracted) setHasInteracted(true);

    // Force animation restart (alternate class => different keyframe names)
    setAnimFlip((n) => n + 1);
  };

  const isList = visual === "list";

  // ✅ No anim class until user interacts => no mount animation
  const animClass = hasInteracted
    ? animFlip % 2 === 0
      ? "anim-a"
      : "anim-b"
    : "";

  return (
    <>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-pressed={isList}
        onClick={toggle}
        disabled={disabled}
        className={clsx(
          "tikd-grid-list-btn",
          "group relative inline-grid h-10.5 w-10.5 select-none place-items-center",
          "rounded-lg border border-white/10 bg-neutral-900 backdrop-blur-xl",
          "shadow-[0_12px_34px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)]",
          "transition-[filter,box-shadow,border-color,background,transform] duration-200 ease-out motion-reduce:transition-none",
          "hover:border-white/14 hover:bg-white/8",
          "active:scale-[0.96]",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
          "text-neutral-0",
          disabled && "pointer-events-none opacity-50",
          isList && "list",
          animClass,
          className,
        )}
      >
        {/* ✅ Container fill (kept), now matches Upcoming pill background */}
        <span
          aria-hidden="true"
          className={clsx(
            "absolute inset-0.5 rounded-md",
            "border border-white/10",
            "bg-neutral-900",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
            "transition-[background-color,border-color] duration-200",
            "group-hover:bg-white/8 group-hover:border-white/14",
          )}
        />

        {/* ICON ONLY */}
        <span className="relative z-10 block" aria-hidden="true">
          <span className="icon">
            <span className="dots">
              <i />
              <i />
              <i />
              <i />
            </span>
            <span className="lines">
              <i />
              <i />
              <i />
              <i />
            </span>
          </span>
        </span>

        {/* micro-press */}
        <span
          aria-hidden="true"
          className={clsx(
            "pointer-events-none absolute inset-0 rounded-xl bg-white opacity-0",
            "transition-opacity duration-200 motion-reduce:transition-none",
            "group-active:opacity-[0.06]",
          )}
        />
      </button>

      <style jsx>{`
        /* ------------------------------------------------------------
           Tuning knobs (smaller + smoother)
        ------------------------------------------------------------ */
        .tikd-grid-list-btn .icon {
          --icon: 20px;
          --dot: 8px;
          --offset: 12px; /* icon - dot */
          --half: 6px; /* offset / 2 */
          --lineW: 14px;
          --lineH: 3px;

          position: relative;
          display: block;
          width: var(--icon);
          height: var(--icon);

          color: rgba(255, 255, 255, 0.96);
          contain: paint;
        }

        /* ------------------------------------------------------------
           GRID (static): big dots, no lines
        ------------------------------------------------------------ */
        .tikd-grid-list-btn .dots i {
          position: absolute;
          width: var(--dot);
          height: var(--dot);
          border-radius: 2px;
          background: currentColor;

          transform: translate3d(0, 0, 0) scale(1);
          will-change: transform;
          backface-visibility: hidden;
        }

        .tikd-grid-list-btn .dots i:nth-child(1) {
          left: 0;
          top: 0;
        }
        .tikd-grid-list-btn .dots i:nth-child(2) {
          left: var(--offset);
          top: 0;
        }
        .tikd-grid-list-btn .dots i:nth-child(3) {
          left: 0;
          top: var(--offset);
        }
        .tikd-grid-list-btn .dots i:nth-child(4) {
          left: var(--offset);
          top: var(--offset);
        }

        .tikd-grid-list-btn .lines i {
          position: absolute;
          right: 0;
          width: var(--lineW);
          height: var(--lineH);
          border-radius: 2px;
          background: currentColor;

          transform-origin: 100% 0;
          transform: scaleX(0);
          will-change: transform;
          backface-visibility: hidden;
        }

        /* ------------------------------------------------------------
           LINE Y POSITIONS
           ✅ Align line centers to bullet centers in LIST mode.
           Bullet centers are at y=4,10,16,22 (because dots are 8px tall).
           With lineH=3, top should be center - 1.5 => 2.5, 8.5, 14.5, 20.5
           (Lines are hidden in GRID anyway, so this is safe.)
        ------------------------------------------------------------ */
        .tikd-grid-list-btn .lines i:nth-child(1) {
          top: 2.5px;
        }
        .tikd-grid-list-btn .lines i:nth-child(2) {
          top: 8.5px;
        }
        .tikd-grid-list-btn .lines i:nth-child(3) {
          top: 14.5px;
        }
        .tikd-grid-list-btn .lines i:nth-child(4) {
          top: 20.5px;
        }

        /* ------------------------------------------------------------
           LIST (static): bullets + hide the extra 4th row
           (Only affects LIST icon; GRID stays untouched)
        ------------------------------------------------------------ */
        .tikd-grid-list-btn.list .dots i {
          border-radius: 999px; /* bullets */
          transform: translate3d(0, 0, 0) scale(0.44);
        }

        .tikd-grid-list-btn.list .dots i:nth-child(2),
        .tikd-grid-list-btn.list .dots i:nth-child(4) {
          transform: translate3d(calc(-1 * var(--offset)), var(--half), 0)
            scale(0.44);
        }

        /* Hide 4th bullet in LIST (looks cleaner) */
        .tikd-grid-list-btn.list .dots i:nth-child(4) {
          opacity: 0;
        }

        .tikd-grid-list-btn.list .lines i {
          transform: scaleX(1);
        }

        /* Hide 4th line in LIST */
        .tikd-grid-list-btn.list .lines i:nth-child(4) {
          opacity: 0;
        }

        /* ------------------------------------------------------------
           Animation plumbing: slower + smoother
           ✅ animation-name is only applied when anim-a/anim-b exists
        ------------------------------------------------------------ */
        .tikd-grid-list-btn .dots i,
        .tikd-grid-list-btn .lines i {
          animation-duration: 0.56s;
          animation-fill-mode: forwards;
          animation-direction: reverse;
          animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
        }

        .tikd-grid-list-btn.list .dots i,
        .tikd-grid-list-btn.list .lines i {
          animation-direction: normal;
        }

        /* ------------------------------------------------------------
           Restartable animations: anim-a / anim-b use DIFFERENT keyframes
        ------------------------------------------------------------ */

        /* Dots */
        .tikd-grid-list-btn.anim-a .dots i:nth-child(1),
        .tikd-grid-list-btn.anim-a .dots i:nth-child(3) {
          animation-name: dotScaleOnlyA;
        }
        .tikd-grid-list-btn.anim-a .dots i:nth-child(2),
        .tikd-grid-list-btn.anim-a .dots i:nth-child(4) {
          animation-name: dotScaleMoveA;
        }

        .tikd-grid-list-btn.anim-b .dots i:nth-child(1),
        .tikd-grid-list-btn.anim-b .dots i:nth-child(3) {
          animation-name: dotScaleOnlyB;
        }
        .tikd-grid-list-btn.anim-b .dots i:nth-child(2),
        .tikd-grid-list-btn.anim-b .dots i:nth-child(4) {
          animation-name: dotScaleMoveB;
        }

        @keyframes dotScaleOnlyA {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            transform: translate3d(0, 0, 0) scale(0.44);
          }
        }
        @keyframes dotScaleMoveA {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          70% {
            transform: translate3d(0, var(--half), 0) scale(0.44);
          }
          100% {
            transform: translate3d(calc(-1 * var(--offset)), var(--half), 0)
              scale(0.44);
          }
        }

        @keyframes dotScaleOnlyB {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            transform: translate3d(0, 0, 0) scale(0.44);
          }
        }
        @keyframes dotScaleMoveB {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          70% {
            transform: translate3d(0, var(--half), 0) scale(0.44);
          }
          100% {
            transform: translate3d(calc(-1 * var(--offset)), var(--half), 0)
              scale(0.44);
          }
        }

        /* Lines */
        .tikd-grid-list-btn.anim-a .lines i:nth-child(1),
        .tikd-grid-list-btn.anim-a .lines i:nth-child(3) {
          animation-name: lineScale1A;
        }
        .tikd-grid-list-btn.anim-a .lines i:nth-child(2),
        .tikd-grid-list-btn.anim-a .lines i:nth-child(4) {
          animation-name: lineScale2A;
        }

        .tikd-grid-list-btn.anim-b .lines i:nth-child(1),
        .tikd-grid-list-btn.anim-b .lines i:nth-child(3) {
          animation-name: lineScale1B;
        }
        .tikd-grid-list-btn.anim-b .lines i:nth-child(2),
        .tikd-grid-list-btn.anim-b .lines i:nth-child(4) {
          animation-name: lineScale2B;
        }

        @keyframes lineScale1A {
          0%,
          22% {
            transform: scaleX(0);
          }
          100% {
            transform: scaleX(1);
          }
        }
        @keyframes lineScale2A {
          0%,
          42% {
            transform: scaleX(0);
          }
          100% {
            transform: scaleX(1);
          }
        }

        @keyframes lineScale1B {
          0%,
          22% {
            transform: scaleX(0);
          }
          100% {
            transform: scaleX(1);
          }
        }
        @keyframes lineScale2B {
          0%,
          42% {
            transform: scaleX(0);
          }
          100% {
            transform: scaleX(1);
          }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .tikd-grid-list-btn .dots i,
          .tikd-grid-list-btn .lines i {
            animation: none !important;
          }
        }
      `}</style>
    </>
  );
}
