/* ------------------------------------------------------------------ */
/*  src/components/dashboard/charts/RevenueChart.tsx                  */
/*  Reusable area chart (line + gradient), exact-day tooltip          */
/*                                                                    */
/*  IMPORTANT: each instance now uses a UNIQUE SVG gradient id to     */
/*  avoid cross-chart clashes (was the cause of the purple fill).     */
/* ------------------------------------------------------------------ */
"use client";

import {
  Area,
  AreaChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { memo, useMemo, useId } from "react";

/* ------------------------------ Types ------------------------------ */
export type RevenueTooltip = {
  /** index to pin the white marker; tooltip follows hover */
  index: number;
  valueLabel: string; // e.g. "$240,8K"
  subLabel?: string;
  deltaText?: string;
  deltaPositive?: boolean;
};

type Props = {
  /** numeric series (e.g., revenue) */
  data: number[];
  /** optional date for each point (used for tooltip exact day) */
  dates?: Date[];
  /** axis domain/ticks and labels */
  domain?: [number, number];
  xLabels?: string[]; // labels on X
  yTicks?: number[];
  tooltip?: RevenueTooltip; // used for the pinned marker only
  stroke?: string;
  fillTop?: string;

  /** gradient opacity (top->bottom) */
  fillStartOpacity?: number; // default 0.25
  fillEndOpacity?: number; // default 0

  /** tooltip value decorations */
  valuePrefix?: string; // default "$"
  valueSuffix?: string; // default "K"
  /** show calendar date under value in tooltip */
  showDateInTooltip?: boolean; // default true

  /** tooltip body theme */
  tooltipVariant?: "primary" | "light" | "dark";

  /** (optional) force a specific gradient id; otherwise auto-unique */
  gradientId?: string;
};

/* ------------------------------ Utils ------------------------------ */
const toRows = (vals: number[], labels?: string[], dates?: Date[]) =>
  vals.map((v, i) => ({
    i,
    name: labels?.[i] ?? `${i + 1}`,
    date: dates?.[i],
    value: v,
  }));

const fmtK = (v: number) =>
  Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}K` : `${v}`;

const AXIS_TICK_STYLE = {
  fill: "var(--Color-Neutral-500, #727293)",
  fontFamily: "Gilroy, ui-sans-serif, system-ui",
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: -0.2 as number,
};

const fmtFullDate = (d?: Date) =>
  d
    ? d.toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

const tooltipClasses = (variant: NonNullable<Props["tooltipVariant"]>) => {
  if (variant === "light") {
    return {
      wrapper:
        "pointer-events-none rounded-lg bg-white text-neutral-900 shadow px-3 py-2.5",
      value: "text-[18px] font-extrabold",
      sub: "mt-1 text-xs text-neutral-500",
    };
  }
  if (variant === "dark") {
    return {
      wrapper:
        "pointer-events-none rounded-lg bg-[#141625] border border-white/10 text-white px-3 py-2.5",
      value: "text-[18px] font-extrabold text-white",
      sub: "mt-1 text-xs text-neutral-400",
    };
  }
  // primary (purple) like the Total Revenue mock
  return {
    wrapper: "pointer-events-none rounded-lg bg-primary-800 p-2.5",
    value: "text-white font-extrabold text-[18px]",
    sub: "mt-1 text-xs text-neutral-400",
  };
};

/* ------------------------------ Component ------------------------------ */
function RevenueChart({
  data,
  dates,
  domain = [0, Math.max(250000, Math.max(...data))],
  xLabels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ],
  yTicks = [0, 25_000, 50_000, 100_000, 150_000, 200_000, 250_000],
  tooltip,
  stroke = "#9A46FF",
  fillTop = "#9A46FF",
  fillStartOpacity = 0.25,
  fillEndOpacity = 0,
  valuePrefix = "$",
  valueSuffix = "K",
  showDateInTooltip = true,
  tooltipVariant = "primary",
  gradientId,
}: Props) {
  const rows = useMemo(
    () => toRows(data, xLabels, dates),
    [data, xLabels, dates]
  );

  const pinIndex =
    tooltip && Number.isFinite(tooltip.index) ? tooltip.index : undefined;
  const pinnedRow = pinIndex != null ? rows[pinIndex] : undefined;

  const tipCls = tooltipClasses(tooltipVariant);

  // UNIQUE gradient id per instance to avoid clashes across charts
  const autoId = useId();
  const gradId = gradientId ?? `rev-fill-${autoId}`;

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={rows}
          margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={fillTop}
                stopOpacity={fillStartOpacity}
              />
              <stop
                offset="100%"
                stopColor={fillTop}
                stopOpacity={fillEndOpacity}
              />
            </linearGradient>
          </defs>

          {/* Y axis */}
          <YAxis
            dataKey="value"
            domain={domain}
            ticks={yTicks}
            tick={{ ...AXIS_TICK_STYLE, textAnchor: "end" }}
            tickFormatter={fmtK}
            width={44}
            axisLine={{ stroke: "#2C2C44", strokeWidth: 1 }}
            tickLine={false}
            tickMargin={8}
          />
          {/* X axis */}
          <XAxis
            dataKey="name"
            tick={{ ...AXIS_TICK_STYLE, textAnchor: "middle" }}
            axisLine={{ stroke: "#2C2C44", strokeWidth: 1 }}
            tickLine={false}
            interval="preserveStartEnd"
            tickMargin={12}
          />

          {/* Fill first for gradient (uses unique id) */}
          <Area
            type="monotone"
            dataKey="value"
            stroke="transparent"
            fill={`url(#${gradId})`}
            activeDot={false}
            isAnimationActive={false}
          />

          {/* Crisp line */}
          <Area
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={2}
            fill="transparent"
            isAnimationActive={false}
            strokeLinejoin="round"
            strokeLinecap="round"
            dot={false}
          />

          {/* Pinned white marker (visual only) */}
          {pinnedRow ? (
            <ReferenceDot
              x={pinnedRow.name}
              y={pinnedRow.value}
              r={4.5}
              fill="#BD99FF"
            />
          ) : null}

          {/* Tooltip */}
          <Tooltip
            cursor={{ stroke: "rgba(255,255,255,0.12)", strokeWidth: 1 }}
            isAnimationActive={false}
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const row = payload[0]?.payload as
                | { value: number; date?: Date }
                | undefined;
              if (!row) return null;
              return (
                <div className={tipCls.wrapper}>
                  <div className="flex items-center gap-2">
                    <div className={tipCls.value}>
                      {valuePrefix}
                      {fmtK(row.value)}
                      {valueSuffix}
                    </div>
                  </div>
                  {showDateInTooltip ? (
                    <div className={tipCls.sub}>{fmtFullDate(row.date)}</div>
                  ) : null}
                </div>
              );
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default memo(RevenueChart);
