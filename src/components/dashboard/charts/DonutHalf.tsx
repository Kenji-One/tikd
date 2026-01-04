"use client";

import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { memo, useMemo } from "react";
import clsx from "clsx";

export type DonutSegment = { value: number; label: string; color: string };

type Props = {
  segments: DonutSegment[];
  total?: number;
  height?: number;
  thickness?: number;
  centerValue?: number | string;
  centerLabel?: string;
  className?: string;
  trackColor?: string;
  /** Tiny gap between slices (deg). Keep this low. */
  padAngle?: number;
  /** Give small slices a guaranteed visible arc (deg). */
  minSliceAngle?: number;
  startAngle?: number; // default 205
  endAngle?: number; // default -25 (= 335)
};

function formatNumber(n: number | string) {
  return typeof n === "number" ? n.toLocaleString() : n;
}

function DonutHalf({
  segments,
  total,
  height = 180,
  thickness = 24,
  centerValue,
  centerLabel,
  className,
  trackColor = "rgba(255,255,255,0.12)",
  padAngle = 0.25, // ↓ tighter seam so small slice survives
  minSliceAngle = 1.8, // ↓ ensure a visible minimum
  startAngle = 205,
  endAngle = -25,
}: Props) {
  const computedTotal = useMemo(
    () =>
      typeof total === "number"
        ? total
        : segments.reduce((a, s) => a + s.value, 0),
    [segments, total]
  );

  const outerRadius = Math.max(2, height - 8);
  const innerRadius = Math.max(outerRadius - thickness, 0);

  const trackData = useMemo(
    () => [{ name: "track", value: computedTotal }],
    [computedTotal]
  );
  const centerPrimary =
    typeof centerValue !== "undefined" ? centerValue : computedTotal;

  // Softer caps but small enough to not swallow tiny slices
  const cornerRadiusPx = Math.min(8, Math.floor(thickness * 0.28));

  return (
    <div
      className={clsx("relative w-full", className)}
      style={{ height }}
      aria-label={centerLabel ?? "Donut breakdown"}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          {/* Grey track */}
          <Pie
            data={trackData}
            dataKey="value"
            startAngle={startAngle}
            endAngle={endAngle}
            cx="50%"
            cy="100%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            stroke="none"
            isAnimationActive={false}
          >
            <Cell fill={trackColor} />
          </Pie>

          {/* Colored segments */}
          <Pie
            data={segments}
            dataKey="value"
            startAngle={startAngle}
            endAngle={endAngle}
            cx="50%"
            cy="100%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            // cornerRadius={cornerRadiusPx}
            paddingAngle={padAngle}
            minAngle={minSliceAngle}
            stroke="none"
            isAnimationActive={false}
          >
            {segments.map((s, i) => (
              <Cell key={i} fill={s.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* Center value/label */}
      <div className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center justify-center">
        <div className="translate-y-1 text-center">
          <div className="text-[32px] font-extrabold leading-none text-white">
            {formatNumber(centerPrimary)}
          </div>
          {centerLabel ? (
            <div className="mt-2 font-medium leading-none text-neutral-400">
              {centerLabel}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default memo(DonutHalf);
