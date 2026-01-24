// src/components/ui/Tilt3d.tsx
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

export function useTilt3d<T extends HTMLElement>(opts?: {
  maxDeg?: number;
  perspective?: number;
  liftPx?: number;
  disabled?: boolean;
}) {
  const ref = useRef<T | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const maxDeg = opts?.maxDeg ?? 10;
  const perspective = opts?.perspective ?? 1100;
  const liftPx = opts?.liftPx ?? 3;
  const disabled = !!opts?.disabled;

  const rafRef = useRef<number | null>(null);

  const setTransform = (rx: number, ry: number, lift: number) => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = `perspective(${perspective}px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(${-lift}px)`;
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

    const rect = el.getBoundingClientRect();
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

  return (
    <div
      ref={tilt.ref}
      onMouseEnter={tilt.onMouseEnter}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      className={clsx("will-change-transform", className)}
      style={{
        transform: `perspective(${perspective ?? 1100}px) rotateX(0deg) rotateY(0deg) translateY(0px)`,
        transformStyle: "preserve-3d",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
