// src/components/ui/RowCard.tsx
"use client";

import type { ReactNode } from "react";
import clsx from "clsx";

type RowCardProps = {
  /**
   * Optional element rendered BEFORE the icon bubble on the left
   * (Perfect for drag handles / checkboxes / etc.)
   */
  leading?: ReactNode;

  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;

  /** Right side content (your “columns”: price/sold/status/etc.) */
  meta?: ReactNode;

  /** Far-right actions (kebab, buttons, etc.) */
  actions?: ReactNode;

  className?: string;
};

export function RowCard({
  leading,
  icon,
  title,
  description,
  meta,
  actions,
  className,
}: RowCardProps) {
  return (
    <div
      className={clsx(
        "group relative overflow-hidden rounded-lg border border-white/10 bg-neutral-948/75 px-5 py-4",
        "shadow-[0_10px_26px_rgba(0,0,0,0.35)]",
        "transition-[border-color,background-color,box-shadow,transform] duration-200",
        "hover:border-white/14 hover:bg-neutral-948/85 hover:shadow-[0_14px_32px_rgba(0,0,0,0.42)]",
        "active:scale-[0.998]",
        className,
      )}
    >
      {/* subtle ambient shine (not too loud) */}
      <div
        className={clsx(
          "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100",
        )}
        style={{
          background:
            "radial-gradient(900px 220px at 18% 0%, rgba(154,70,255,0.10), transparent 55%), radial-gradient(700px 220px at 92% 10%, rgba(255,255,255,0.06), transparent 60%)",
        }}
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left */}
        <div className="flex min-w-0 items-center gap-3">
          {leading ? <div className="shrink-0">{leading}</div> : null}

          {icon ? (
            <span
              className={clsx(
                "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                "border border-white/10 bg-neutral-900/45 text-primary-200",
                "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
              )}
            >
              {icon}
            </span>
          ) : null}

          <div className="min-w-0">
            <div className="truncate font-medium text-neutral-0">{title}</div>
            {description ? (
              <div className="mt-1 truncate text-[12px] text-neutral-400">
                {description}
              </div>
            ) : null}
          </div>
        </div>

        {/* Right */}
        {(meta || actions) && (
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            {meta ? (
              <div className="flex flex-wrap items-center gap-5">{meta}</div>
            ) : null}
            {actions ? (
              <div className="flex items-center">{actions}</div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

/** Optional helper for consistent “label/value” mini-columns */
export function RowCardStat({
  label,
  value,
  align = "right",
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "min-w-[84px]",
        align === "right" ? "text-right" : "text-left",
        className,
      )}
    >
      <div className="text-[11px] text-neutral-500">{label}</div>
      <div className="mt-0.5 font-medium text-neutral-200">{value}</div>
    </div>
  );
}
