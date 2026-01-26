"use client";

import React, { useEffect, useRef, useState } from "react";
import clsx from "clsx";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;

    const apply = () => setReduced(!!mq.matches);
    apply();

    // Safari < 14 fallback
    if (mq.addEventListener) mq.addEventListener("change", apply);
    else mq.addListener(apply);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", apply);
      else mq.removeListener(apply);
    };
  }, []);

  return reduced;
}

/**
 * NOTE:
 * We intentionally split "perspective host" (the element that receives mouse events)
 * from "surface" (the element that gets rotated).
 *
 * This reduces GPU text rasterization blur in Chromium browsers because the perspective
 * is applied as a CSS property on the host (not as `perspective()` inside transform).
 */
export function useTilt3d<T extends HTMLElement>(opts?: {
  maxDeg?: number;
  perspective?: number;
  liftPx?: number;
  disabled?: boolean;
}) {
  // This ref points to the INNER surface that we transform.
  const ref = useRef<T | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const maxDeg = opts?.maxDeg ?? 10;
  const liftPx = opts?.liftPx ?? 3;
  const disabled = !!opts?.disabled;

  const rafRef = useRef<number | null>(null);

  const setVars = (el: HTMLElement, rx: number, ry: number, lift: number) => {
    el.style.setProperty("--tikd-tilt-rx", `${rx}deg`);
    el.style.setProperty("--tikd-tilt-ry", `${ry}deg`);
    el.style.setProperty("--tikd-tilt-rx-inv", `${-rx}deg`);
    el.style.setProperty("--tikd-tilt-ry-inv", `${-ry}deg`);
    el.style.setProperty("--tikd-tilt-lift", `${lift}px`);
  };

  const setTransform = (rx: number, ry: number, lift: number) => {
    const el = ref.current;
    if (!el) return;

    setVars(el, rx, ry, lift);

    // IMPORTANT: no `perspective()` here — perspective is applied on the parent via CSS property.
    el.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translate3d(0, ${-lift}px, 0)`;
  };

  const reset = () => {
    const el = ref.current;
    if (!el) return;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;

    el.style.transition = "transform 220ms cubic-bezier(.2,.8,.2,1)";
    setTransform(0, 0, 0);
  };

  const onMouseMove: React.MouseEventHandler<HTMLElement> = (e) => {
    if (disabled || prefersReducedMotion) return;

    const el = ref.current;
    if (!el) return;

    // Use the element receiving the handler (host) for bounds.
    const host = e.currentTarget as HTMLElement;
    const rect = host.getBoundingClientRect();

    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height; // 0..1

    const dx = (px - 0.5) * 2;
    const dy = (py - 0.5) * 2;

    const rx = clamp(-dy * maxDeg, -maxDeg, maxDeg);
    const ry = clamp(dx * maxDeg, -maxDeg, maxDeg);

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      el.style.transition = "transform 50ms linear";
      setTransform(rx, ry, liftPx);
    });
  };

  const onMouseLeave: React.MouseEventHandler<HTMLElement> = () => reset();

  const onMouseEnter: React.MouseEventHandler<HTMLElement> = () => {
    const el = ref.current;
    if (!el || disabled || prefersReducedMotion) return;
    el.style.transition = "transform 220ms cubic-bezier(.2,.8,.2,1)";
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { ref, onMouseMove, onMouseLeave, onMouseEnter, reset };
}

export function Tilt3d({
  children,
  className,
  style,
  maxDeg,
  perspective,
  liftPx,
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  maxDeg?: number;
  perspective?: number;
  liftPx?: number;
  disabled?: boolean;
}) {
  const tilt = useTilt3d<HTMLDivElement>({
    maxDeg,
    perspective,
    liftPx,
    disabled,
  });

  const persp = perspective ?? 1100;

  return (
    <div
      onMouseEnter={tilt.onMouseEnter}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      className={clsx("relative", className)}
      style={{
        // Perspective is applied here (host), not inside transform.
        perspective: `${persp}px`,
        ...style,
      }}
    >
      <div
        ref={tilt.ref}
        className={clsx("h-full w-full will-change-transform")}
        style={{
          // default vars so child layers can safely reference them
          // (they’ll be updated live on hover)
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          ...({
            "--tikd-tilt-rx": "0deg",
            "--tikd-tilt-ry": "0deg",
            "--tikd-tilt-rx-inv": "0deg",
            "--tikd-tilt-ry-inv": "0deg",
            "--tikd-tilt-lift": "0px",
          } as React.CSSProperties),
          transform: "rotateX(0deg) rotateY(0deg) translate3d(0, 0, 0)",
          transformStyle: "preserve-3d",
          backfaceVisibility: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}
