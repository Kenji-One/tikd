/* ------------------------------------------------------------------ */
/*  src/components/ui/GridListToggle.tsx                               */
/* ------------------------------------------------------------------ */
"use client";

import clsx from "clsx";
import { LayoutGrid, List } from "lucide-react";

export type GridListValue = "grid" | "list";

type Props = {
  value: GridListValue;
  onChange: (v: GridListValue) => void;

  gridLabel?: string;
  listLabel?: string;

  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
};

export default function GridListToggle({
  value,
  onChange,
  gridLabel = "Grid",
  listLabel = "List",
  disabled = false,
  className,
  ariaLabel = "View toggle",
}: Props) {
  const isGrid = value === "grid";

  const toggle = () => {
    if (disabled) return;
    onChange(isGrid ? "list" : "grid");
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={isGrid}
      onClick={toggle}
      disabled={disabled}
      className={clsx(
        "group relative inline-flex h-10.5 select-none items-center justify-center",
        // compact: no fixed width; feels like a “block”
        "px-3",
        // more squared (not a pill)
        "rounded-lg border border-white/10 bg-white/5",
        "backdrop-blur-xl",
        "shadow-[0_12px_34px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)]",
        "transition-[filter,box-shadow,border-color,background] duration-200 ease-out motion-reduce:transition-none",
        "hover:border-white/15 hover:bg-white/[0.06]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      {/* Active background (single box) */}
      <span
        aria-hidden="true"
        className={clsx(
          "absolute inset-0.5 rounded-md",
          "border border-white/10",
          "bg-[linear-gradient(90deg,var(--color-primary-600)_0%,var(--color-primary-500)_55%,var(--color-primary-400)_100%)]",
          "shadow-[0_18px_56px_rgba(154,81,255,0.22),inset_0_1px_0_rgba(255,255,255,0.16)]",
          "transition-[filter,opacity] duration-200 ease-out motion-reduce:transition-none",
        )}
      />

      {/* CONTENT: only one is visible at a time; the other is hidden with animation */}
      <span className="relative z-10 grid place-items-center">
        {/* GRID */}
        <span
          className={clsx(
            "col-start-1 row-start-1 inline-flex items-center gap-2",
            "transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none",
            isGrid
              ? "opacity-100 translate-y-0 scale-100"
              : "pointer-events-none opacity-0 -translate-y-1 scale-[0.98]",
          )}
          aria-hidden={!isGrid}
        >
          <LayoutGrid className="h-4 w-4 text-neutral-0" />
          <span className="text-[12px] font-semibold text-neutral-0">
            {gridLabel}
          </span>
        </span>

        {/* LIST */}
        <span
          className={clsx(
            "col-start-1 row-start-1 inline-flex items-center gap-2",
            "transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none",
            !isGrid
              ? "opacity-100 translate-y-0 scale-100"
              : "pointer-events-none opacity-0 translate-y-1 scale-[0.98]",
          )}
          aria-hidden={isGrid}
        >
          <List className="h-4 w-4 text-neutral-0" />
          <span className="text-[12px] font-semibold text-neutral-0">
            {listLabel}
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
  );
}
