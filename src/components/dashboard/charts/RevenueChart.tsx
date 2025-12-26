/* ------------------------------------------------------------------ */
/*  src/components/dashboard/charts/RevenueChart.tsx                  */
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
  /** index to pin the marker + callout */
  index: number;
  valueLabel: string; // e.g. "$240,8K"
  subLabel?: string; // e.g. "June 21, 2025"
  deltaText?: string; // e.g. "+24.6%"
  deltaPositive?: boolean;
};

type Props = {
  data: number[];
  dates?: Date[];
  domain?: [number, number];
  xLabels?: string[];
  yTicks?: number[];
  tooltip?: RevenueTooltip;
  stroke?: string;
  fillTop?: string;

  fillStartOpacity?: number;
  fillEndOpacity?: number;

  valuePrefix?: string; // default "$"
  valueSuffix?: string; // default "K"
  showDateInTooltip?: boolean;

  tooltipVariant?: "primary" | "light" | "dark";
  gradientId?: string;
};

type ChartRow = {
  i: number;
  name: string;
  date?: Date;
  value: number;
};

/**
 * Recharts passes a big props object to label render functions.
 * We only need x/y; keep the rest as unknown (not any).
 */
type ReferenceDotLabelProps = { x?: number; y?: number } & Record<
  string,
  unknown
>;

/**
 * Recharts Tooltip typing differs across versions.
 * Runtime gives us `active` + `payload`, so we model only what we use.
 */
type HoverTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload?: unknown }>;
};

function isChartRow(x: unknown): x is ChartRow {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.value === "number" &&
    typeof o.name === "string" &&
    typeof o.i === "number" &&
    (o.date === undefined || o.date instanceof Date)
  );
}

/* ------------------------------ Utils ------------------------------ */
const toRows = (
  vals: number[],
  labels?: string[],
  dates?: Date[]
): ChartRow[] =>
  vals.map((v, i) => ({
    i,
    name: labels?.[i] ?? `${i + 1}`,
    date: dates?.[i],
    value: v,
  }));

const fmtAxisK = (v: number) =>
  Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}K` : `${v}`;

const fmtTooltipK = (v: number) => {
  if (Math.abs(v) < 1000) return `${v}`;
  const n = v / 1000;
  const s = n.toFixed(1);
  return s.endsWith(".0") ? s.slice(0, -2) : s;
};

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
  return {
    wrapper: "pointer-events-none rounded-lg bg-primary-800 p-2.5",
    value: "text-white font-extrabold text-[18px]",
    sub: "mt-1 text-xs text-neutral-300",
  };
};

function stripSign(s?: string) {
  return (s ?? "").trim().replace(/^[-+]\s*/, "");
}

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

          <YAxis
            dataKey="value"
            domain={domain}
            ticks={yTicks}
            tick={{ ...AXIS_TICK_STYLE, textAnchor: "end" }}
            tickFormatter={fmtAxisK}
            width={44}
            axisLine={{ stroke: "#2C2C44", strokeWidth: 1 }}
            tickLine={false}
            tickMargin={8}
          />
          <XAxis
            dataKey="name"
            tick={{ ...AXIS_TICK_STYLE, textAnchor: "middle" }}
            axisLine={{ stroke: "#2C2C44", strokeWidth: 1 }}
            tickLine={false}
            interval="preserveStartEnd"
            tickMargin={12}
          />

          <Area
            type="monotone"
            dataKey="value"
            stroke="transparent"
            fill={`url(#${gradId})`}
            activeDot={false}
            isAnimationActive={false}
          />
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

          {/* Pinned dot + pinned callout (Figma-like) */}
          {pinnedRow && tooltip ? (
            <ReferenceDot
              x={pinnedRow.name}
              y={pinnedRow.value}
              r={4.5}
              fill="#FFFFFF"
              stroke="#BD99FF"
              strokeWidth={2}
              label={(p: ReferenceDotLabelProps) => {
                const x = p.x;
                const y = p.y;
                if (typeof x !== "number" || typeof y !== "number")
                  return <g />;

                const w = 170;
                const h = 54;
                const ox = x - w / 2;
                const oy = y - h - 14;

                const deltaTxt = stripSign(tooltip.deltaText);
                const isPos = tooltip.deltaPositive !== false;

                const bg = tooltipVariant === "dark" ? "#141625" : "#6D28D9"; // primary-ish
                const badgeBg = isPos
                  ? "rgba(69,255,121,0.18)"
                  : "rgba(255,69,74,0.18)";
                const badgeStroke = isPos
                  ? "rgba(69,255,121,0.30)"
                  : "rgba(255,69,74,0.30)";
                const badgeText = isPos ? "#45FF79" : "#FF454A";

                return (
                  <g transform={`translate(${ox}, ${oy})`}>
                    <rect x="0" y="0" width={w} height={h} rx="10" fill={bg} />
                    {/* pointer */}
                    <path
                      d={`M${w / 2 - 7} ${h} L${w / 2} ${h + 8} L${
                        w / 2 + 7
                      } ${h} Z`}
                      fill={bg}
                    />

                    {/* value */}
                    <text
                      x="12"
                      y="20"
                      fill="#FFFFFF"
                      fontSize="16"
                      fontWeight="800"
                      fontFamily="Gilroy, ui-sans-serif, system-ui"
                    >
                      {tooltip.valueLabel}
                    </text>

                    {/* delta badge */}
                    {deltaTxt ? (
                      <g transform={`translate(${w - 12 - 62}, 8)`}>
                        <rect
                          x="0"
                          y="0"
                          width="62"
                          height="22"
                          rx="7"
                          fill={badgeBg}
                          stroke={badgeStroke}
                        />
                        {/* tiny arrow */}
                        <path
                          d={
                            isPos
                              ? "M10 15 L15 10 L15 13.5 L19 13.5 L19 7 L12.5 7 L12.5 11 L16 11 L11 16 Z"
                              : "M10 7 L15 12 L15 8.5 L19 8.5 L19 15 L12.5 15 L12.5 11 L16 11 L11 6 Z"
                          }
                          fill={badgeText}
                        />
                        <text
                          x="28"
                          y="15.5"
                          fill={badgeText}
                          fontSize="11"
                          fontWeight="700"
                          fontFamily="Gilroy, ui-sans-serif, system-ui"
                        >
                          {deltaTxt}
                        </text>
                      </g>
                    ) : null}

                    {/* sub label */}
                    {tooltip.subLabel ? (
                      <text
                        x="12"
                        y="42"
                        fill="rgba(255,255,255,0.70)"
                        fontSize="11"
                        fontWeight="600"
                        fontFamily="Gilroy, ui-sans-serif, system-ui"
                      >
                        {tooltip.subLabel}
                      </text>
                    ) : null}
                  </g>
                );
              }}
            />
          ) : null}

          {/* Hover tooltip */}
          <Tooltip
            cursor={{ stroke: "rgba(255,255,255,0.12)", strokeWidth: 1 }}
            isAnimationActive={false}
            content={(props: HoverTooltipProps) => {
              const active = props.active;
              const payload = props.payload;

              if (!active || !payload || payload.length === 0) return null;

              const candidate = payload[0]?.payload;
              if (!isChartRow(candidate)) return null;

              const row = candidate;

              return (
                <div className={tipCls.wrapper}>
                  <div className={tipCls.value}>
                    {valuePrefix}
                    {fmtTooltipK(row.value)}
                    {valueSuffix}
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
