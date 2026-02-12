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

type CSSVarKeys = "--w" | "--h" | "--p" | "--k" | "--tx";
type CSSVarStyle = React.CSSProperties & Record<CSSVarKeys, string>;

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

  // CSS vars power both the visuals and the exact travel distance.
  const cssVars: CSSVarStyle = {
    "--w": `${TRACK_W[size]}px`,
    "--h": `${TRACK_H[size]}px`,
    "--p": `${PAD[size]}px`,
    "--k": `${KNOB[size]}px`,
    "--tx": isOn
      ? `calc(var(--w) - var(--k) - var(--p) * 2)` // right stop
      : "0px", // left stop
  };

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

      {/* TRACK */}
      <span
        aria-hidden
        style={cssVars}
        className={clsx(
          "relative overflow-hidden rounded-full",
          "w-[var(--w)] h-[var(--h)]",

          // OFF
          "border border-white/10 bg-white/5",

          // ON (✅ purple brand gradients like your PermissionToggle snippet)
          "peer-checked:border-primary-500/60",
          "peer-checked:bg-[radial-gradient(56px_36px_at_30%_20%,rgba(154,70,255,0.32),transparent_60%),radial-gradient(60px_36px_at_90%_80%,rgba(66,139,255,0.22),transparent_60%)]",

          // focus ring (✅ purple)
          "outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500/55",

          // optional soft inner sheen
          "after:content-[''] after:absolute after:inset-0 after:rounded-full after:pointer-events-none after:opacity-100",
          "after:bg-[radial-gradient(60px_36px_at_20%_20%,rgba(255,255,255,0.08),transparent_55%)]",
          "peer-checked:after:opacity-0",

          className,
        )}
      >
        {/* KNOB */}
        <span
          className={clsx(
            "absolute top-1/2 -translate-y-1/2 rounded-full",
            "w-[var(--k)] h-[var(--k)] left-[var(--p)]",
            "transition-transform duration-200 ease-out",
            "translate-x-[var(--tx)]",

            // knob look (neutral, premium)
            "bg-neutral-0/95",
            "shadow-[0_8px_18px_rgba(0,0,0,0.35)]",

            // subtle glow when ON
            isOn && "shadow-[0_10px_24px_rgba(154,70,255,0.22)]",
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
