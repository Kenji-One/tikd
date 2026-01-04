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

      <ul className="mt-8">
        {segments.map((s) => (
          <li
            key={s.label}
            className="
        relative flex items-center justify-between py-3
        after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-px
        after:bg-gradient-to-r after:from-transparent after:via-[#414162] after:to-transparent
        last:after:hidden
      "
          >
            <span className="flex items-center gap-2 text-neutral-50">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: s.color }}
                aria-hidden="true"
              />
              {s.label}
            </span>

            <span className="text-neutral-0 text-base">
              {s.value.toLocaleString()}
            </span>
          </li>
        ))}
      </ul>

      <div className="pointer-events-none w-full flex justify-end mt-1">
        <button
          type="button"
          onClick={onDetailedView}
          className="pointer-events-auto rounded-full border border-neutral-500 bg-neutral-700 px-3 py-2 text-xs font-medium text-white transition duration-200 hover:border-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          Detailed View
        </button>
      </div>
    </div>
  );
}
