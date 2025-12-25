/* ------------------------------------------------------------------ */
/*  MiniMetricCard – compact KPI + tiny line chart + "Detailed View"  */
/* ------------------------------------------------------------------ */
"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { DeltaBadge } from "../finances/DetailedViewShell";

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
          <div className="uppercase text-neutral-400 font-semibold">
            {title}
          </div>
          <div className="mt-1 text-xl font-extrabold tracking-tight">
            {value}
          </div>
        </div>
        <DeltaBadge delta={delta} />
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
