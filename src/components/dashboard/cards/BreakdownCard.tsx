"use client";

import DonutHalf, {
  type DonutSegment,
} from "@/components/dashboard/charts/DonutHalf";
import clsx from "clsx";

type DonutOverrides = {
  height?: number;
  thickness?: number;
  startAngle?: number;
  endAngle?: number;
  padAngle?: number;
};

type Props = {
  title: string;
  segments: DonutSegment[]; // [{ value, label, color }]
  className?: string;
  onDetailedView?: () => void;
  donutProps?: DonutOverrides; // optional visual tweaks
};

export default function BreakdownCard({
  title,
  segments,
  className,
  donutProps,
  onDetailedView,
}: Props) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  return (
    <div
      className={clsx(
        "rounded-lg border border-neutral-700 bg-neutral-900 pt-8 p-4",
        className
      )}
    >
      {/* Donut uses the *same* segments and same total */}
      <DonutHalf
        centerLabel={title}
        centerValue={total}
        segments={segments}
        height={donutProps?.height ?? 180}
        thickness={donutProps?.thickness ?? 22}
        startAngle={donutProps?.startAngle}
        endAngle={donutProps?.endAngle}
        padAngle={donutProps?.padAngle}
      />

      {/* Legend generated from the same segments so colors/values can’t drift */}
      <ul className="mt-4 space-y-2 text-sm">
        {segments.map((s) => (
          <li
            key={s.label}
            className="flex items-center justify-between text-white/70 border-b last:border-b-0 border-neutral-700 pb-1"
          >
            <span className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: s.color }}
                aria-hidden="true"
              />
              {s.label}
            </span>
            <span>{s.value.toLocaleString()}</span>
          </li>
        ))}
      </ul>

      <div className="pointer-events-none w-full flex justify-end mt-4">
        <button
          type="button"
          onClick={onDetailedView}
          className="pointer-events-auto rounded-full border border-neutral-500 bg-neutral-700 px-4 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm transition hover:bg-white/15 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          Detailed View
        </button>
      </div>
    </div>
  );
}
