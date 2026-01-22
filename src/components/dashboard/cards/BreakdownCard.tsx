// src/components/dashboard/cards/BreakdownCard.tsx
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
  // ✅ Safety: prevent runtime crashes if something ever passes null/undefined.
  const safeSegments: DonutSegment[] = Array.isArray(segments) ? segments : [];

  const total = safeSegments.reduce(
    (sum, s) => sum + (Number(s.value) || 0),
    0,
  );
  const isEmpty = total <= 0;

  const height = donutProps?.height ?? 180;
  const thickness = donutProps?.thickness ?? 22;

  // ✅ Empty arc: keep donut geometry identical, but show only the muted track.
  const emptySegments: DonutSegment[] = [
    {
      label: "Empty",
      value: 1,
      color: "rgba(255, 255, 255, 0.14)",
    },
  ];

  const canOpenDetails = !!onDetailedView && !isEmpty;

  return (
    <div
      className={clsx(
        "rounded-lg border border-neutral-700 bg-neutral-900 pt-8 p-4",
        className,
      )}
    >
      <DonutHalf
        centerLabel={title}
        // ✅ If no content: show 0 in the center (as now). Otherwise show the real total.
        centerValue={isEmpty ? 0 : total}
        // ✅ If no content: show the empty muted arc. Otherwise show real segments.
        segments={isEmpty ? emptySegments : safeSegments}
        height={height}
        thickness={thickness}
        startAngle={donutProps?.startAngle}
        endAngle={donutProps?.endAngle}
        // ✅ remove separators for empty track so it looks like one clean arc
        padAngle={isEmpty ? 0 : donutProps?.padAngle}
      />

      <ul className="mt-8">
        {safeSegments.map((s) => (
          <li
            key={s.label}
            className="
              relative flex items-center justify-between py-3
              after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-px
              after:bg-gradient-to-r after:from-transparent after:via-[#414162] after:to-transparent
              last:after:hidden
            "
          >
            <span
              className={clsx(
                "flex items-center gap-2",
                isEmpty ? "text-neutral-300" : "text-neutral-50",
              )}
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor: s.color,
                  opacity: isEmpty ? 0.55 : 1,
                }}
                aria-hidden="true"
              />
              {s.label}
            </span>

            <span
              className={clsx(
                "text-base",
                isEmpty ? "text-neutral-300" : "text-neutral-0",
              )}
            >
              {(isEmpty
                ? 0
                : Math.max(0, Number(s.value) || 0)
              ).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>

      <div className="pointer-events-none mt-1 flex w-full justify-end">
        <button
          type="button"
          onClick={onDetailedView}
          disabled={!canOpenDetails}
          className="pointer-events-auto cursor-pointer rounded-full border border-neutral-500 bg-neutral-700 px-3 py-2 text-xs font-medium text-white transition duration-200 hover:border-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Detailed View
        </button>
      </div>
    </div>
  );
}
