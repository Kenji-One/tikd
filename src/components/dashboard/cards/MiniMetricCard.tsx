/* ------------------------------------------------------------------ */
/*  MiniMetricCard – compact KPI + tiny line chart + "Detailed View"  */
/* ------------------------------------------------------------------ */
"use client";

import type { ReactNode } from "react";
import clsx from "clsx";

type Props = {
  title: string;
  value: string;
  delta?: string;
  /** If true, delta is styled as negative (red). */
  negative?: boolean;
  chart: ReactNode;
  className?: string;
};

export default function MiniMetricCard({
  title,
  value,
  delta,
  negative,
  chart,
  className,
}: Props) {
  return (
    <div
      className={clsx(
        "rounded-lg border border-neutral-700 bg-neutral-900 p-4",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-white/60">{title}</div>
          <div className="mt-1 text-xl font-extrabold tracking-tight">
            {value}
          </div>
        </div>

        {delta ? (
          <span
            className={clsx(
              "inline-flex min-w-[58px] items-center justify-center rounded-full px-2 py-1 text-xs font-semibold",
              negative
                ? "bg-error-950 text-error-400 border border-error-700/40"
                : "bg-success-950 text-success-400 border border-success-700/40"
            )}
          >
            {delta}
          </span>
        ) : null}
      </div>

      <div className="mt-3">{chart}</div>

      <div className="mt-2 flex justify-end">
        <button
          type="button"
          className="rounded-full border border-neutral-600 bg-neutral-700/40 px-3 py-1 text-[11px] text-white/75 hover:bg-neutral-600/40"
        >
          Detailed View
        </button>
      </div>
    </div>
  );
}
