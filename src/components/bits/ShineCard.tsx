// src/components/bits/ShineCard.tsx
"use client";

import clsx from "clsx";
import {
  PropsWithChildren,
  useEffect,
  useRef,
  useState,
  MutableRefObject,
} from "react";

/**
 * ShineCard — dark surface, no hover movement.
 * - No lift, no tilt, no transform/transition on hover.
 * - Purple spotlight only (follows cursor), border spin remains opt-in.
 */
export default function ShineCard({
  children,
  className,
  animated = false,
  surfaceClassName,
  borderWidth = 1,
  enableGrid = true,
  hoverLift = false, // ignored (no movement)
  ringSpin = false,
}: PropsWithChildren<{
  className?: string;
  animated?: boolean;
  surfaceClassName?: string;
  borderWidth?: number;
  enableGrid?: boolean;
  hoverLift?: boolean; // kept for API compatibility; no effect
  ringSpin?: boolean;
}>) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  // true only while pointer is inside; used to show the purple spotlight
  const inside = useSpotlight(animated, rootRef);

  return (
    <div
      ref={rootRef}
      className={clsx("relative", className)}
      style={
        {
          "--mx": "50%",
          "--my": "50%",
          "--ringW": `${Math.max(1, borderWidth)}px`,
        } as React.CSSProperties
      }
    >
      {/* Masked gradient border ring ONLY (no surface fill, no movement by default) */}
      <div
        className={clsx(
          "pointer-events-none absolute inset-0 rounded-2xl",
          "[mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)]",
          "[mask-composite:exclude] [-webkit-mask-composite:xor]"
        )}
        style={{ padding: "var(--ringW)" }}
        aria-hidden="true"
      >
        <div className="relative h-full w-full rounded-[inherit] overflow-hidden">
          {/* Primary ring */}
          <div
            className={clsx(
              "absolute inset-0 rounded-[inherit]",
              "bg-[conic-gradient(from_220deg,theme(colors.primary.500),#7c3aed,theme(colors.primary.300),theme(colors.primary.500))]",
              animated && ringSpin ? "animate-[spin_12s_linear_infinite]" : ""
            )}
          />
          {/* Secondary shimmer */}
          <div
            className={clsx(
              "absolute inset-0 rounded-[inherit] opacity-60 mix-blend-plus-lighter",
              "bg-[conic-gradient(from_40deg,rgba(255,255,255,0.18),transparent_25%,rgba(170,115,255,0.18)_50%,transparent_75%,rgba(255,255,255,0.18))]",
              animated && ringSpin
                ? "animate-[spin_20s_linear_infinite_reverse]"
                : ""
            )}
          />
        </div>
      </div>

      {/* Surface (dark, static — no transform/transition at all) */}
      <div
        className={clsx(
          "relative rounded-2xl border border-white/10 overflow-hidden",
          surfaceClassName ?? "bg-neutral-950/85 backdrop-blur-sm"
        )}
      >
        {/* Neutral micro-grid (very subtle) */}
        {animated && enableGrid && (
          <div
            className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-[0.035]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, rgba(255,255,255,0.35) 0 1px, transparent 1px 24px), repeating-linear-gradient(0deg, rgba(255,255,255,0.35) 0 1px, transparent 1px 24px)",
            }}
            aria-hidden="true"
          />
        )}

        {/* Cursor-reactive purple spotlight — purely visual, no layout shift */}
        {animated && inside && (
          <div
            className="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-screen"
            style={{
              background:
                "radial-gradient(280px 220px at var(--mx) var(--my), rgba(154,70,255,0.16), transparent 60%)",
            }}
            aria-hidden="true"
          />
        )}

        {children}
      </div>
    </div>
  );
}

/* ---------------------------- Hooks ----------------------------- */

/** Tracks pointer inside + updates spotlight center without transforms. */
function useSpotlight(
  active: boolean,
  rootRef: MutableRefObject<HTMLElement | null>
) {
  const rafRef = useRef<number | null>(null);
  const [inside, setInside] = useState(false);

  useEffect(() => {
    if (!active) return;
    const root = rootRef.current;
    if (!root) return;

    const onEnter = () => setInside(true);
    const onLeave = () => {
      setInside(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      root.style.setProperty("--mx", "50%");
      root.style.setProperty("--my", "50%");
    };

    const onMove = (e: PointerEvent) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const rect = root.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const px = Math.max(0, Math.min(1, x / rect.width));
        const py = Math.max(0, Math.min(1, y / rect.height));
        root.style.setProperty("--mx", `${px * 100}%`);
        root.style.setProperty("--my", `${py * 100}%`);
      });
    };

    root.addEventListener("pointerenter", onEnter, { passive: true });
    root.addEventListener("pointermove", onMove, { passive: true });
    root.addEventListener("pointerleave", onLeave, { passive: true });

    return () => {
      root.removeEventListener("pointerenter", onEnter);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, rootRef]);

  return inside;
}
