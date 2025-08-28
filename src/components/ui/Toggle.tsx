// src/components/ui/Toggle.tsx
"use client";

import * as React from "react";
import clsx from "clsx";

type Size = "sm" | "md" | "lg";

export interface ToggleProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "type"> {
  size?: Size;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  className?: string;
}

/* ── exact pixel dims for precise travel ───────────────────────── */
const TRACK_W: Record<Size, number> = { sm: 56, md: 56, lg: 64 };
const TRACK_H: Record<Size, number> = { sm: 32, md: 36, lg: 42 };
const PAD: Record<Size, number> = { sm: 4, md: 3, lg: 4 }; // inner gap
const KNOB: Record<Size, number> = { sm: 24, md: 28, lg: 32 }; // knob size

export default function Toggle({
  id,
  name,
  value,
  size = "md",
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  className,
  label,
  ...rest
}: ToggleProps) {
  const inputId = id ?? React.useId();
  const controlled = typeof checked === "boolean";
  const [internal, setInternal] = React.useState<boolean>(!!defaultChecked);
  const isOn = controlled ? !!checked : internal;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.checked;
    if (!controlled) setInternal(next);
    onCheckedChange?.(next);
  }

  // CSS vars power both the visuals and the exact travel distance.
  const cssVars: React.CSSProperties = {
    ["--w" as any]: `${TRACK_W[size]}px`,
    ["--h" as any]: `${TRACK_H[size]}px`,
    ["--p" as any]: `${PAD[size]}px`,
    ["--k" as any]: `${KNOB[size]}px`,
    ["--tx" as any]: isOn
      ? `calc(var(--w) - var(--k) - var(--p) * 2)` // right stop
      : "0px", // left stop
  };

  return (
    <label
      htmlFor={inputId}
      className={clsx(
        "group inline-flex items-center gap-3",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      )}
    >
      <input
        id={inputId}
        name={name}
        value={value}
        type="checkbox"
        className="sr-only peer"
        disabled={disabled}
        checked={controlled ? checked : undefined}
        defaultChecked={controlled ? undefined : defaultChecked}
        onChange={handleChange}
        {...rest}
      />

      {/* TRACK */}
      <span
        aria-hidden
        style={cssVars}
        className={clsx(
          "relative overflow-hidden rounded-full",
          "w-[var(--w)] h-[var(--h)]",

          // OFF
          "border bg-neutral-900 border-neutral-600",

          // ON
          "peer-checked:bg-success-950 peer-checked:border-success-700",

          // focus ring
          "outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-400/60",

          // optional soft glow when ON
          "after:content-[''] after:absolute after:inset-0 after:rounded-full after:pointer-events-none after:opacity-0",
          "peer-checked:after:opacity-100",

          className
        )}
      >
        {/* KNOB */}
        <span
          className={clsx(
            "absolute top-1/2 -translate-y-1/2 rounded-full",
            "w-[var(--k)] h-[var(--k)] left-[var(--p)]",
            "transition-transform transition-colors duration-300 ease-in-out",
            "translate-x-[var(--tx)]",
            // knob color (use React state to toggle; peer-checked can’t reach a descendant)
            isOn ? "bg-success-500" : "bg-neutral-600",
            // optional sheen
            "after:content-[''] after:absolute after:inset-0 after:rounded-full after:pointer-events-none"
          )}
        />
      </span>

      {label && (
        <span className="text-sm leading-5 text-white/90 group-hover:text-white">
          {label}
        </span>
      )}
    </label>
  );
}
