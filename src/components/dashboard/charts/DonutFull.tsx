/* ------------------------------------------------------------------ */
/*  src/components/dashboard/charts/DonutFull.tsx                      */
/* ------------------------------------------------------------------ */
"use client";

import { memo, useMemo } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  type PieLabelRenderProps,
} from "recharts";
import clsx from "clsx";

export type DonutSegment = { value: number; label: string; color: string };

type Props = {
  segments: DonutSegment[];
  /** Overall square height/width in px (container stretches to width 100%). */
  height?: number; // default 260
  /** Thickness of the ring in px. */
  thickness?: number; // default 28
  /** Small gap between slices in degrees. */
  padAngle?: number; // default 0
  /** Guarantee min slice visibility in degrees. */
  minSliceAngle?: number; // default 4
  /** Track color behind segments. */
  trackColor?: string; // default rgba(255,255,255,0.12)
  /** Show white rounded value badges on the slices. */
  showSliceBadges?: boolean; // default true
  className?: string;
};

function DonutFull({
  segments,
  height = 260,
  thickness = 28,
  padAngle = 0, // ✅ default: no gaps
  minSliceAngle = 4,
  trackColor = "rgba(255,255,255,0.12)",
  showSliceBadges = true,
  className,
}: Props) {
  const total = useMemo(
    () => segments.reduce((a, s) => a + s.value, 0),
    [segments],
  );

  const outerRadius = Math.max(4, height / 2 - 6);
  const innerRadius = Math.max(outerRadius - thickness, 0);

  return (
    <div className={clsx("relative w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          {/* Grey track underlay */}
          <Pie
            data={[{ name: "track", value: total }]}
            dataKey="value"
            startAngle={90}
            endAngle={-270} // full ring, clockwise
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            isAnimationActive={false}
            stroke="none"
          >
            <Cell fill={trackColor} />
          </Pie>

          {/* Colored segments */}
          <Pie
            data={segments}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={padAngle}
            minAngle={minSliceAngle}
            isAnimationActive={false}
            stroke="none"
            cornerRadius={2}
            labelLine={false}
            label={
              showSliceBadges
                ? (props: PieLabelRenderProps) => {
                    const RAD = Math.PI / 180;

                    const innerR = Number(props.innerRadius ?? 0);
                    const outerR = Number(props.outerRadius ?? 0);
                    const cx = Number(props.cx ?? 0);
                    const cy = Number(props.cy ?? 0);
                    const midAngle = Number(props.midAngle ?? 0);

                    const r = (innerR + outerR) / 2;
                    const x = cx + r * Math.cos(-midAngle * RAD);
                    const y = cy + r * Math.sin(-midAngle * RAD);

                    const text = String(props.value ?? "");
                    const padX = 8;
                    const charW = 7; // rough width per char
                    const w = Math.max(24, padX * 2 + text.length * charW);
                    const h = 22;

                    return (
                      <g transform={`translate(${x - w / 2}, ${y - h / 2})`}>
                        <rect
                          rx={8}
                          ry={8}
                          width={w}
                          height={h}
                          fill="#ffffff"
                        />
                        <text
                          x={w / 2}
                          y={h / 2 + 4}
                          textAnchor="middle"
                          fontSize={12}
                          fontWeight={700}
                          fill="#111827"
                        >
                          {text}
                        </text>
                      </g>
                    );
                  }
                : undefined
            }
          >
            {segments.map((s, i) => (
              <Cell
                key={i}
                fill={s.color}
                stroke={s.color} // ✅ kills hairline seams between slices
                strokeWidth={1}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default memo(DonutFull);
