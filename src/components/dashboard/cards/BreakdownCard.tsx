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
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const isEmpty = total <= 0;

  const height = donutProps?.height ?? 180;
  const thickness = donutProps?.thickness ?? 22;

  // ✅ Figma-like empty state:
  // Render the SAME DonutHalf component, but as a single muted “track” segment.
  // This preserves exact geometry, thickness, rounding, padding rules, etc.
  const emptySegments: DonutSegment[] = [
    {
      label: "Empty",
      value: 1,
      // soft ghost track (works even if DonutHalf uses stroke)
      color: "rgba(255, 255, 255, 0.14)",
    },
  ];

  return (
    <div
      className={clsx(
        "rounded-lg border border-neutral-700 bg-neutral-900 pt-8 p-4",
        className,
      )}
    >
      <DonutHalf
        centerLabel={title}
        centerValue={isEmpty ? 0 : total}
        segments={isEmpty ? emptySegments : segments}
        height={height}
        thickness={thickness}
        startAngle={donutProps?.startAngle}
        endAngle={donutProps?.endAngle}
        // ✅ remove separators for empty track so it looks like one clean arc
        padAngle={isEmpty ? 0 : donutProps?.padAngle}
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
            <span
              className={clsx(
                "flex items-center gap-2",
                isEmpty ? "text-neutral-300" : "text-neutral-50",
              )}
            >
              <span
                className={clsx("inline-block h-1.5 w-1.5 rounded-full")}
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
