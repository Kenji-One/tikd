// src\components\ui\Tilt3d.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import clsx from "clsx";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;

    const apply = () => setReduced(Boolean(mq.matches));
    apply();

    if (mq.addEventListener) mq.addEventListener("change", apply);
    else mq.addListener(apply);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", apply);
      else mq.removeListener(apply);
    };
  }, []);

  return reduced;
}

type TiltOpts = {
  disabled?: boolean;

  /**
   * CodePen-style knobs (defaults tuned for Tikd UI)
   * - scale lowered (no big zoom)
   * - glow toned down (no white wash)
   */
  scale?: number; // default 1.03
  divisor?: number; // default 100 (tilt response)
  angleMultiplier?: number; // default 2 (log(distance) * multiplier)
  glowSpreadMultiplier?: number; // default 1.45 (how fast glow "travels")
};

export function useTilt3d<T extends HTMLElement>(opts?: TiltOpts) {
  const ref = useRef<T | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const disabled = Boolean(opts?.disabled);
  const scale = opts?.scale ?? 1.03; // ✅ was 1.07 (too much)
  const divisor = opts?.divisor ?? 100;
  const angleMultiplier = opts?.angleMultiplier ?? 2;
  const glowSpreadMultiplier = opts?.glowSpreadMultiplier ?? 1.45; // ✅ was effectively 2

  const boundsRef = useRef<DOMRect | null>(null);
  const rafRef = useRef<number | null>(null);

  const glowSelector = "[data-tilt-glow]";

  const setGlow = (el: HTMLElement, mx: number, my: number) => {
    const glow = el.querySelector<HTMLElement>(glowSelector);
    if (!glow) return;

    // ✅ Much less “white film” and shine
    glow.style.backgroundImage = `
      radial-gradient(
        circle at ${mx}px ${my}px,
        rgba(255,255,255,0.10),
        rgba(0,0,0,0.14)
      )
    `;
  };

  const resetGlow = (el: HTMLElement) => {
    const glow = el.querySelector<HTMLElement>(glowSelector);
    if (!glow) return;

    // ✅ Neutral, subtle resting glow (not bright)
    glow.style.backgroundImage =
      "radial-gradient(circle at 50% -20%, rgba(255,255,255,0.05), rgba(0,0,0,0.14))";
  };

  const applyTransform = (el: HTMLElement, cx: number, cy: number) => {
    const distance = Math.sqrt(cx * cx + cy * cy);
    const safeDistance = Math.max(distance, 1);
    const deg = Math.log(safeDistance) * angleMultiplier;

    el.style.transform = `
      scale3d(${scale}, ${scale}, ${scale})
      rotate3d(${cy / divisor}, ${-cx / divisor}, 0, ${deg}deg)
    `;
  };

  const onMouseMove: React.MouseEventHandler<HTMLElement> = (e) => {
    if (disabled || prefersReducedMotion) return;

    const surface = ref.current as unknown as HTMLElement | null;
    if (!surface) return;

    const rect = boundsRef.current ?? e.currentTarget.getBoundingClientRect();
    boundsRef.current = rect;

    const mouseX = e.clientX;
    const mouseY = e.clientY;

    const leftX = mouseX - rect.x;
    const topY = mouseY - rect.y;

    const centerX = leftX - rect.width / 2;
    const centerY = topY - rect.height / 2;

    const glowX = centerX * glowSpreadMultiplier + rect.width / 2;
    const glowY = centerY * glowSpreadMultiplier + rect.height / 2;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      surface.style.transition = "transform 0ms";
      applyTransform(surface, centerX, centerY);
      setGlow(surface, glowX, glowY);
    });
  };

  const onMouseEnter: React.MouseEventHandler<HTMLElement> = (e) => {
    if (disabled || prefersReducedMotion) return;

    const surface = ref.current as unknown as HTMLElement | null;
    if (!surface) return;

    boundsRef.current = (
      e.currentTarget as HTMLElement
    ).getBoundingClientRect();

    surface.style.willChange = "transform";
    surface.style.transition = "transform 260ms ease-out";
    resetGlow(surface);
  };

  const onMouseLeave: React.MouseEventHandler<HTMLElement> = () => {
    const surface = ref.current as unknown as HTMLElement | null;
    if (!surface) return;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;

    boundsRef.current = null;

    surface.style.transition = "transform 260ms ease-out";
    surface.style.transform = "";
    resetGlow(surface);

    window.setTimeout(() => {
      const cur = ref.current as unknown as HTMLElement | null;
      if (!cur) return;
      cur.style.willChange = "auto";
    }, 280);
  };

  useEffect(() => {
    const el = ref.current as unknown as HTMLElement | null;
    if (el) el.style.willChange = "auto";

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { ref, onMouseMove, onMouseLeave, onMouseEnter };
}

export function Tilt3d({
  children,
  className,
  style,
  perspective,
  disabled,
  maxDeg: _maxDeg, // legacy, ignored (kept for compatibility)
  liftPx: _liftPx, // legacy, ignored (kept for compatibility)
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  perspective?: number;
  disabled?: boolean;
  maxDeg?: number;
  liftPx?: number;
}) {
  const persp = perspective ?? 1500;

  const tilt = useTilt3d<HTMLDivElement>({
    disabled,
    // ✅ unified defaults across all cards
    scale: 1.03,
    divisor: 100,
    angleMultiplier: 2,
    glowSpreadMultiplier: 1.45,
  });

  return (
    <div
      onMouseEnter={tilt.onMouseEnter}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      className={clsx("relative", className)}
      style={{
        perspective: `${persp}px`,
        ...style,
      }}
    >
      <div ref={tilt.ref} className="h-full w-full">
        {children}
      </div>
    </div>
  );
}
