// src/components/ui/Toggle.tsx
"use client";

import * as React from "react";
import clsx from "clsx";

type Size = "sm" | "md" | "lg";
type Variant = "default" | "settings";

export interface ToggleProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "type"> {
  size?: Size;
  variant?: Variant;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  className?: string;
}

/* ── existing “default” sizing (keep) ───────────────────────── */
const TRACK_W: Record<Size, number> = { sm: 56, md: 56, lg: 64 };
const TRACK_H: Record<Size, number> = { sm: 32, md: 36, lg: 42 };
const PAD: Record<Size, number> = { sm: 4, md: 3, lg: 4 };
const KNOB: Record<Size, number> = { sm: 24, md: 28, lg: 32 };

/* ── “settings” sizing (match HTML: 3rem x 1.5rem) ──────────── */
const S_TRACK_W: Record<Size, number> = { sm: 48, md: 56, lg: 64 };
const S_TRACK_H: Record<Size, number> = { sm: 24, md: 28, lg: 32 };
const S_PAD: Record<Size, number> = { sm: 2, md: 2, lg: 3 };
const S_KNOB: Record<Size, number> = { sm: 18, md: 20, lg: 24 };

type CSSVarKeys = "--w" | "--h" | "--p" | "--k" | "--x" | "--inset";
type CSSVarStyle = React.CSSProperties & Record<CSSVarKeys, string>;

export default function Toggle({
  id,
  name,
  value,
  size = "md",
  variant = "default",
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  className,
  label,
  ...rest
}: ToggleProps) {
  const reactId = React.useId();
  const inputId = id ?? reactId;

  const controlled = typeof checked === "boolean";
  const [internal, setInternal] = React.useState<boolean>(!!defaultChecked);
  const isOn = controlled ? !!checked : internal;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.checked;
    if (!controlled) setInternal(next);
    onCheckedChange?.(next);
  }

  const w = variant === "settings" ? S_TRACK_W[size] : TRACK_W[size];
  const h = variant === "settings" ? S_TRACK_H[size] : TRACK_H[size];
  const p = variant === "settings" ? S_PAD[size] : PAD[size];
  const k = variant === "settings" ? S_KNOB[size] : KNOB[size];

  // ✅ FIX: account for the track border so the knob never clips on edges.
  // Track uses `border` (1px). Overflow clips to the padding box, so we must
  // inset the knob by (padding + borderWidth) and compute travel from that.
  const BORDER = 1;
  const inset = p + BORDER;

  // travel distance inside the clipped box (padding box)
  const travel = Math.max(0, w - k - inset * 2);
  const x = isOn ? travel : 0;

  const cssVars: CSSVarStyle = {
    "--w": `${w}px`,
    "--h": `${h}px`,
    "--p": `${p}px`,
    "--k": `${k}px`,
    "--inset": `${inset}px`,
    "--x": `${x}px`,
  };

  const trackBase = clsx(
    "relative isolate overflow-hidden rounded-full",
    "w-[var(--w)] h-[var(--h)]",
    "border outline-none",
    "transition-[background,border-color,box-shadow] duration-200 ease-out",
    "peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500/55",
  );

  const trackDefault = clsx(
    trackBase,
    "border-white/10 bg-white/5",
    "peer-checked:border-primary-500/60",
    "peer-checked:bg-[radial-gradient(56px_36px_at_30%_20%,rgba(154,70,255,0.32),transparent_60%),radial-gradient(60px_36px_at_90%_80%,rgba(66,139,255,0.22),transparent_60%)]",
    // subtle sheen UNDER the knob (so it can’t “bite” into it visually)
    "before:content-[''] before:absolute before:inset-0 before:rounded-full before:pointer-events-none",
    "before:z-0 before:opacity-100",
    "before:bg-[radial-gradient(60px_36px_at_20%_20%,rgba(255,255,255,0.08),transparent_55%)]",
    "peer-checked:before:opacity-0",
  );

  const trackSettings = clsx(
    trackBase,
    "border-white/20 bg-white/10",
    // keep border width stable (only color changes)
    "peer-checked:border-transparent",
    "peer-checked:bg-[linear-gradient(135deg,#7c3aed,#6366f1)]",
    "peer-focus-visible:ring-primary-500/40",
  );

  const knobBase = clsx(
    "absolute z-10 top-1/2 rounded-full",
    "h-[var(--k)] w-[var(--k)]",
    "left-[var(--inset)]",
    "-translate-y-1/2 translate-x-[var(--x)]",
    "transition-transform duration-200 ease-out will-change-transform",
  );

  const knobDefault = clsx(
    knobBase,
    "bg-neutral-0/95",
    "shadow-[0_8px_18px_rgba(0,0,0,0.35)]",
    isOn && "shadow-[0_10px_24px_rgba(154,70,255,0.22)]",
  );

  const knobSettings = clsx(
    knobBase,
    "bg-white",
    "shadow-[0_8px_18px_rgba(0,0,0,0.35)]",
  );

  return (
    <label
      htmlFor={inputId}
      className={clsx(
        "group inline-flex items-center gap-3",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
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

      <span
        aria-hidden
        style={cssVars}
        className={clsx(
          variant === "settings" ? trackSettings : trackDefault,
          className,
        )}
      >
        <span className={variant === "settings" ? knobSettings : knobDefault} />
      </span>

      {label && (
        <span className="text-sm leading-5 text-white/90 group-hover:text-white">
          {label}
        </span>
      )}
    </label>
  );
}
