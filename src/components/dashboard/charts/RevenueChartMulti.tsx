// src/components/dashboard/charts/RevenueChartMulti.tsx
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
import { memo, useId, useMemo } from "react";

import type { RevenueTooltip } from "@/components/dashboard/charts/RevenueChart";

/* ------------------------------ Types ------------------------------ */
export type MultiSeriesLine = {
  key: string; // "male" | "female" | "other"
  label: string; // "Male" | "Female" | "Other"
  series: number[];
  stroke: string;

  /** If true, renders an area fill under this line (Figma-style). */
  showFill?: boolean;

  fillTop?: string;
  fillStartOpacity?: number;
  fillEndOpacity?: number;
};

type Props = {
  series: MultiSeriesLine[];
  pinSeriesKey?: string;

  dates?: Date[];
  domain?: [number, number];
  xLabels?: string[];
  yTicks?: number[];

  tooltip?: RevenueTooltip;

  valuePrefix?: string;
  valueSuffix?: string;

  tooltipDateMode?: "full" | "monthYear";
  showDateInTooltip?: boolean;

  tooltipVariant?: "primary" | "light" | "dark";
};

type Row = {
  i: number;
  name: string;
  date?: Date;
} & Record<string, unknown>;

type HoverTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload?: unknown }>;
};

type ReferenceDotLabelProps = { x?: number; y?: number } & Record<
  string,
  unknown
>;

/* ------------------------------ Utils ------------------------------ */
const AXIS_TICK_STYLE = {
  fill: "var(--Color-Neutral-500, #727293)",
  fontFamily: "Gilroy, ui-sans-serif, system-ui",
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: -0.2 as number,
};

const fmtAxisK = (v: number) =>
  Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}K` : `${Math.round(v)}`;

const fmtTooltipK = (v: number) => {
  if (!Number.isFinite(v)) return "0";
  if (Math.abs(v) < 1000) {
    const s = v.toFixed(1);
    return s.endsWith(".0") ? s.slice(0, -2) : s;
  }
  const n = v / 1000;
  const s = n.toFixed(1);
  return s.endsWith(".0") ? s.slice(0, -2) : s;
};

function normalizeDecimalSeparator(input?: string) {
  if (!input) return "";
  return input.replace(/(\d),(\d)/g, "$1.$2");
}

const fmtFullDate = (d?: Date) =>
  d
    ? d.toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

const fmtMonthYearLong = (d?: Date) =>
  d
    ? d.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : "";

function stripSign(s?: string) {
  return (s ?? "").trim().replace(/^[-+]\s*/, "");
}

function makePiecewiseScaler(breakpoints: number[]) {
  const b = [...breakpoints].filter(Number.isFinite).sort((a, c) => a - c);
  const uniq: number[] = [];
  for (const v of b) {
    if (uniq.length === 0 || uniq[uniq.length - 1] !== v) uniq.push(v);
  }

  const maxIdx = Math.max(0, uniq.length - 1);

  const toScaled = (value: number) => {
    if (uniq.length <= 1) return 0;
    if (value <= uniq[0]) return 0;

    if (value >= uniq[maxIdx]) {
      const prev = uniq[maxIdx - 1] ?? uniq[maxIdx];
      const denom = uniq[maxIdx] - prev || 1;
      return maxIdx + (value - uniq[maxIdx]) / denom;
    }

    for (let i = 0; i < maxIdx; i++) {
      const a = uniq[i];
      const c = uniq[i + 1];
      if (value >= a && value <= c) {
        const t = (value - a) / (c - a || 1);
        return i + t;
      }
    }

    return 0;
  };

  const tickLabelForScaled = (scaled: number) => {
    const idx = Math.round(scaled);
    const v = uniq[idx] ?? uniq[0] ?? 0;
    return fmtAxisK(v);
  };

  const ticksScaled = uniq.map((_, i) => i);

  return {
    breakpoints: uniq,
    ticksScaled,
    maxIdx,
    toScaled,
    tickLabelForScaled,
  };
}

function fixedDeltaFromTooltip(t?: RevenueTooltip) {
  if (!t?.deltaText) return null;
  const raw = (t.deltaText ?? "").trim();
  const txt = stripSign(raw);
  if (!txt) return null;

  const inferredPositive = !raw.startsWith("-");
  const positive = t.deltaPositive ?? inferredPositive;

  return { text: txt, positive };
}

function calcDeltaFromPrev(rows: Row[], idx: number, pinKey: string) {
  const prev = rows[idx - 1] as Row | undefined;
  const cur = rows[idx] as Row | undefined;
  if (!prev || !cur) return null;

  const a = Number(prev[`v_${pinKey}`] ?? 0);
  const b = Number(cur[`v_${pinKey}`] ?? 0);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === 0) return null;

  const pct = ((b - a) / a) * 100;
  const positive = pct >= 0;
  const abs = Math.abs(pct);
  const text = `${abs.toFixed(1)}%`;

  return { text, positive };
}

function DeltaPill({ text, positive }: { text: string; positive: boolean }) {
  const isNegative = !positive;

  const deltaColor = isNegative
    ? "bg-error-900 text-error-500 border-error-800"
    : "bg-success-900 text-success-500 border-success-800";

  return (
    <span
      className={`flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[12px] font-semibold leading-none border ${deltaColor}`}
      aria-label={`Change ${text}${isNegative ? " decrease" : " increase"}`}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" />
      <span className="tabular-nums">{text}</span>
    </span>
  );
}

function isRow(x: unknown): x is Row {
  return !!x && typeof x === "object";
}

/* ------------------------------ Component ------------------------------ */
function RevenueChartMulti({
  series,
  pinSeriesKey,
  dates,
  domain = [0, 250_000],
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
  valuePrefix = "",
  valueSuffix = "K",
  tooltipDateMode = "full",
  showDateInTooltip = true,
}: Props) {
  const pinKey = pinSeriesKey ?? series[0]?.key ?? "series";

  const pinStroke =
    series.find((s) => s.key === pinKey)?.stroke ?? "rgba(255,255,255,0.65)";

  const scaler = useMemo(() => {
    const base = Array.from(new Set([0, ...yTicks, domain[1]])).sort(
      (a, b) => a - b,
    );
    return makePiecewiseScaler(base);
  }, [yTicks, domain]);

  const labelForIndex = useMemo(() => {
    return (i: number) => xLabels?.[i] ?? `${i + 1}`;
  }, [xLabels]);

  const rows = useMemo(() => {
    const count = xLabels.length;

    return Array.from({ length: count }, (_, i) => {
      const r: Row = {
        i,
        name: labelForIndex(i),
        date: dates?.[i],
      };

      for (const s of series) {
        const v = Number(s.series?.[i] ?? 0);
        r[`v_${s.key}`] = v;
        r[`y_${s.key}`] = scaler.toScaled(v);
      }

      return r;
    });
  }, [series, dates, xLabels.length, labelForIndex, scaler]);

  const xTickIndices = useMemo(() => {
    if (!rows.length) return [];
    return rows.map((r) => Number((r as Row).i));
  }, [rows]);

  const xMax = Math.max(0, rows.length - 1);

  const pinIndex =
    tooltip && Number.isFinite(tooltip.index) ? tooltip.index : undefined;
  const pinnedRow = pinIndex != null ? (rows[pinIndex] as Row) : undefined;

  const autoId = useId();
  const shadowId = `rev-multi-tip-shadow-${autoId}`;

  const fixedDelta = fixedDeltaFromTooltip(tooltip);

  const tipWrapper =
    "pointer-events-none rounded-xl border border-white/10 bg-[rgba(154,70,255,0.18)] backdrop-blur-md px-4 py-3 text-white";
  const tipValue = "text-[22px] font-extrabold leading-none text-center";
  const tipDate = "mt-2 text-[14px] font-medium text-white/80 text-center";
  const tipDivider = "my-3 h-px w-full bg-white/10";
  const tipBottomRow = "flex items-center gap-2 text-[13px] font-medium";
  const tipVs = "text-white/60";

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={rows}
          margin={{ top: 12, right: 18, left: 4, bottom: 14 }}
        >
          <defs>
            <filter id={shadowId} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow
                dx="0"
                dy="16"
                stdDeviation="16"
                floodColor="#000000"
                floodOpacity="0.45"
              />
            </filter>

            {series
              .filter((s) => s.showFill)
              .map((s) => {
                const gradId = `rev-multi-fill-${s.key}-${autoId}`;
                const top = s.fillTop ?? s.stroke;
                const a0 = s.fillStartOpacity ?? 0.22;
                const a1 = s.fillEndOpacity ?? 0;

                return (
                  <linearGradient
                    key={gradId}
                    id={gradId}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={top} stopOpacity={a0} />
                    <stop offset="100%" stopColor={top} stopOpacity={a1} />
                  </linearGradient>
                );
              })}
          </defs>

          <YAxis
            dataKey={`y_${pinKey}`}
            type="number"
            domain={[0, scaler.maxIdx]}
            ticks={scaler.ticksScaled}
            interval={0}
            tick={{ ...AXIS_TICK_STYLE, textAnchor: "end" }}
            tickFormatter={scaler.tickLabelForScaled}
            width={48}
            axisLine={{ stroke: "#2C2C44", strokeWidth: 1 }}
            tickLine={false}
            tickMargin={12}
            allowDecimals={false}
          />

          <XAxis
            dataKey="i"
            type="number"
            domain={[0, xMax]}
            ticks={xTickIndices}
            allowDecimals={false}
            tick={{ ...AXIS_TICK_STYLE, textAnchor: "middle" }}
            tickFormatter={(v) => labelForIndex(Number(v))}
            axisLine={{ stroke: "#2C2C44", strokeWidth: 1 }}
            tickLine={false}
            tickMargin={12}
            minTickGap={14}
          />

          {/* ✅ Area fills (soft down-gradients like your reference) */}
          {series
            .filter((s) => s.showFill)
            .map((s) => {
              const gradId = `rev-multi-fill-${s.key}-${autoId}`;
              return (
                <Area
                  key={`fill-${s.key}`}
                  type="monotone"
                  dataKey={`y_${s.key}`}
                  stroke="transparent"
                  fill={`url(#${gradId})`}
                  activeDot={false}
                  isAnimationActive={false}
                />
              );
            })}

          {/* Lines */}
          {series.map((s) => (
            <Area
              key={`line-${s.key}`}
              type="monotone"
              dataKey={`y_${s.key}`}
              stroke={s.stroke}
              strokeWidth={2}
              fill="transparent"
              isAnimationActive={false}
              strokeLinejoin="round"
              strokeLinecap="round"
              dot={false}
              activeDot={{
                r: 5,
                fill: "#FFFFFF",
                stroke: s.stroke, // ✅ match series color (blue/pink/gray)
                strokeWidth: 2,
              }}
            />
          ))}

          {/* Pinned callout */}
          {pinnedRow && tooltip ? (
            <ReferenceDot
              x={Number(pinnedRow.i)}
              y={Number(pinnedRow[`y_${pinKey}`] ?? 0)}
              r={5}
              fill="#FFFFFF"
              stroke={pinStroke} // ✅ match pinned series
              strokeWidth={2}
              label={(p: ReferenceDotLabelProps) => {
                const x = p.x;
                const y = p.y;
                if (typeof x !== "number" || typeof y !== "number")
                  return <g />;

                const w = 240;
                const h = 90;

                const ox = x - w / 2;
                const oy = y - h - 16;

                const raw = (tooltip.deltaText ?? "").trim();
                const deltaTxt = stripSign(raw);
                const inferredPos = raw ? !raw.startsWith("-") : true;
                const isPos = tooltip.deltaPositive ?? inferredPos;

                const panelFill = "rgba(80, 0, 160, 0.80)";
                const panelStroke = "rgba(255,255,255,0.10)";

                const badgeBg = isPos
                  ? "rgba(69,255,121,0.18)"
                  : "rgba(255,69,74,0.18)";
                const badgeStroke = isPos
                  ? "rgba(69,255,121,0.30)"
                  : "rgba(255,69,74,0.30)";
                const badgeText = isPos ? "#45FF79" : "#FF454A";

                const badgeW = 72;
                const badgeH = 24;

                return (
                  <g transform={`translate(${ox}, ${oy})`}>
                    <rect
                      x="0"
                      y="0"
                      width={w}
                      height={h}
                      rx="16"
                      fill={panelFill}
                      stroke={panelStroke}
                      filter={`url(#${shadowId})`}
                    />

                    <path
                      d={`M${w / 2 - 8} ${h} L${w / 2} ${h + 9} L${
                        w / 2 + 8
                      } ${h} Z`}
                      fill={panelFill}
                      stroke={panelStroke}
                    />

                    <text
                      x="18"
                      y="34"
                      fill="#FFFFFF"
                      fontSize="26"
                      fontWeight="900"
                      fontFamily="Gilroy, ui-sans-serif, system-ui"
                    >
                      {normalizeDecimalSeparator(tooltip.valueLabel)}
                    </text>

                    {deltaTxt ? (
                      <g transform={`translate(${w - badgeW - 18}, 18)`}>
                        <rect
                          x="0"
                          y="0"
                          width={badgeW}
                          height={badgeH}
                          rx="8"
                          fill={badgeBg}
                          stroke={badgeStroke}
                        />
                        <text
                          x="12"
                          y="16.5"
                          fill={badgeText}
                          fontSize="12"
                          fontWeight="800"
                          fontFamily="Gilroy, ui-sans-serif, system-ui"
                        >
                          {deltaTxt}
                        </text>
                      </g>
                    ) : null}

                    {tooltip.subLabel ? (
                      <text
                        x="18"
                        y="64"
                        fill="rgba(255,255,255,0.68)"
                        fontSize="14"
                        fontWeight="700"
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
              if (!isRow(candidate)) return null;

              const row = candidate as Row;

              const delta =
                fixedDelta ??
                (tooltip?.index != null
                  ? calcDeltaFromPrev(rows as Row[], Number(row.i), pinKey)
                  : null);

              const dateLabel =
                tooltipDateMode === "monthYear"
                  ? fmtMonthYearLong(row.date as Date | undefined)
                  : fmtFullDate(row.date as Date | undefined);

              const main = Number(row[`v_${pinKey}`] ?? 0);

              return (
                <div className={tipWrapper}>
                  <div className={tipValue}>
                    {valuePrefix}
                    {fmtTooltipK(main)}
                    {valueSuffix}
                  </div>

                  {showDateInTooltip ? (
                    <div className={tipDate}>{dateLabel}</div>
                  ) : null}

                  <div className={tipDivider} />

                  <div className="space-y-2">
                    {series.map((s) => {
                      const v = Number(row[`v_${s.key}`] ?? 0);
                      return (
                        <div
                          key={s.key}
                          className="flex items-center justify-between gap-4 text-[13px] font-semibold text-white/85"
                        >
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="inline-block h-2 w-2 rounded-full"
                              style={{ backgroundColor: s.stroke }}
                            />
                            {s.label}
                          </span>
                          <span className="tabular-nums text-white/90">
                            {valuePrefix}
                            {fmtTooltipK(v)}
                            {valueSuffix}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {delta?.text ? (
                    <>
                      <div className={tipDivider} />
                      <div className={tipBottomRow}>
                        <DeltaPill
                          text={delta.text}
                          positive={delta.positive}
                        />
                        <span className={tipVs}>vs previous month.</span>
                      </div>
                    </>
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

export default memo(RevenueChartMulti);
