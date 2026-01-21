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
  subLabel?: string; // e.g. "June 2025" or "June 21, 2025"
  deltaText?: string; // e.g. "+24.6%"
  deltaPositive?: boolean;
};

type Props = {
  data: number[];
  dates?: Date[];
  domain?: [number, number];
  xLabels?: string[];
  /**
   * IMPORTANT:
   * These are the "label values" you want to show on the Y axis.
   * We will render them with EQUAL spacing (Figma behavior),
   * using a piecewise value->level mapping.
   */
  yTicks?: number[];
  tooltip?: RevenueTooltip;
  stroke?: string;
  fillTop?: string;

  fillStartOpacity?: number;
  fillEndOpacity?: number;

  valuePrefix?: string; // default "$"
  valueSuffix?: string; // default "K"
  showDateInTooltip?: boolean;

  // ✅ controls hover tooltip date formatting
  tooltipDateMode?: "full" | "monthYear";

  tooltipVariant?: "primary" | "light" | "dark";
  gradientId?: string;
};

type ChartRow = {
  i: number;
  name: string;
  date?: Date;
  /** original value (real money) */
  value: number;
  /** scaled value (0..N) for equal Y tick spacing */
  y: number;
};

type ReferenceDotLabelProps = { x?: number; y?: number } & Record<
  string,
  unknown
>;

type HoverTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload?: unknown }>;
};

function isChartRow(x: unknown): x is ChartRow {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.value === "number" &&
    typeof o.y === "number" &&
    typeof o.name === "string" &&
    typeof o.i === "number" &&
    (o.date === undefined || o.date instanceof Date)
  );
}

/* ------------------------------ Utils ------------------------------ */
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

function calcDeltaFromPrev(rows: ChartRow[], idx: number) {
  const prev = rows[idx - 1];
  const cur = rows[idx];
  if (!prev || !cur) return null;
  if (prev.value === 0) return null;

  const pct = ((cur.value - prev.value) / prev.value) * 100;
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

  // (placeholder SVGs per your request to avoid massive svg path blocks)
  const deltaIcon = isNegative ? (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" />
  ) : (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" />
  );

  return (
    <span
      className={`flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[12px] font-semibold leading-none border ${deltaColor}`}
      aria-label={`Change ${text}${isNegative ? " decrease" : " increase"}`}
    >
      {deltaIcon}
      <span className="tabular-nums">{text}</span>
    </span>
  );
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
  tooltipDateMode = "full",
  tooltipVariant = "primary",
  gradientId,
}: Props) {
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
    return data.map((v, i) => ({
      i,
      name: labelForIndex(i),
      date: dates?.[i],
      value: v,
      y: scaler.toScaled(v),
    }));
  }, [data, dates, scaler, labelForIndex]);

  /**
   * ✅ Key fix:
   * Use numeric X (index) so Recharts doesn't "dedupe/skip" category labels in weird ways
   * and render ticks only for UNIQUE day labels (prevents "missing Jan 20" gap).
   */
  const xTickIndices = useMemo(() => {
    if (!rows.length) return [];

    // If we have dates (expanded modal), collapse ticks to one per unique label.
    if (dates?.length) {
      const seen = new Set<string>();
      const ticks: number[] = [];

      for (const r of rows) {
        const key = r.name; // already "Jan 20" style in modal
        if (!seen.has(key)) {
          seen.add(key);
          ticks.push(r.i);
        }
      }

      // Always keep last tick visible (nice UX).
      const last = rows[rows.length - 1]?.i;
      if (typeof last === "number" && !ticks.includes(last)) ticks.push(last);

      return ticks;
    }

    // Fallback for monthly charts: show all indices (small count anyway)
    return rows.map((r) => r.i);
  }, [rows, dates]);

  const pinIndex =
    tooltip && Number.isFinite(tooltip.index) ? tooltip.index : undefined;
  const pinnedRow = pinIndex != null ? rows[pinIndex] : undefined;

  const autoId = useId();
  const gradId = gradientId ?? `rev-fill-${autoId}`;
  const shadowId = `rev-tip-shadow-${autoId}`;

  const fixedDelta = fixedDeltaFromTooltip(tooltip);

  const tipWrapper =
    "pointer-events-none rounded-xl border border-white/10 bg-[rgba(154,70,255,0.18)] backdrop-blur-md px-4 py-3 text-white";
  const tipValue = "text-[22px] font-extrabold leading-none text-center";
  const tipDate = "mt-2 text-[14px] font-medium text-white/80 text-center";
  const tipDivider = "my-3 h-px w-full bg-white/10";
  const tipBottomRow = "flex items-center gap-2 text-[13px] font-medium";
  const tipVs = "text-white/60";

  const xMax = Math.max(0, rows.length - 1);

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={rows}
          margin={{ top: 12, right: 18, left: 4, bottom: 14 }}
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

            <filter id={shadowId} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow
                dx="0"
                dy="16"
                stdDeviation="16"
                floodColor="#000000"
                floodOpacity="0.45"
              />
            </filter>
          </defs>

          <YAxis
            dataKey="y"
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

          {/* ✅ Numeric X axis (index-based) + stable tick rendering */}
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

          <Area
            type="monotone"
            dataKey="y"
            stroke="transparent"
            fill={`url(#${gradId})`}
            activeDot={false}
            isAnimationActive={false}
          />

          <Area
            type="monotone"
            dataKey="y"
            stroke={stroke}
            strokeWidth={2}
            fill="transparent"
            isAnimationActive={false}
            strokeLinejoin="round"
            strokeLinecap="round"
            dot={false}
            activeDot={{
              r: 5,
              fill: "#FFFFFF",
              stroke: "#BD99FF",
              strokeWidth: 2,
            }}
          />

          {pinnedRow && tooltip ? (
            <ReferenceDot
              x={pinnedRow.i}
              y={pinnedRow.y}
              r={5}
              fill="#FFFFFF"
              stroke="#BD99FF"
              strokeWidth={2}
              label={(p: ReferenceDotLabelProps) => {
                const x = p.x;
                const y = p.y;
                if (typeof x !== "number" || typeof y !== "number")
                  return <g />;

                const w = 220;
                const h = 86;

                const ox = x - w / 2;
                const oy = y - h - 16;

                const raw = (tooltip.deltaText ?? "").trim();
                const deltaTxt = stripSign(raw);
                const inferredPos = raw ? !raw.startsWith("-") : true;
                const isPos = tooltip.deltaPositive ?? inferredPos;

                const panelFill = "rgba(154,70,255,0.18)";
                const panelStroke = "rgba(255,255,255,0.10)";

                const badgeBg = isPos
                  ? "rgba(69,255,121,0.18)"
                  : "rgba(255,69,74,0.18)";
                const badgeStroke = isPos
                  ? "rgba(69,255,121,0.30)"
                  : "rgba(255,69,74,0.30)";
                const badgeText = isPos ? "#45FF79" : "#FF454A";

                const badgeW = 64;
                const badgeH = 22;

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
                      x="16"
                      y="30"
                      fill="#FFFFFF"
                      fontSize="22"
                      fontWeight="800"
                      fontFamily="Gilroy, ui-sans-serif, system-ui"
                    >
                      {normalizeDecimalSeparator(tooltip.valueLabel)}
                    </text>

                    {tooltip.subLabel ? (
                      <text
                        x="16"
                        y="54"
                        fill="rgba(255,255,255,0.80)"
                        fontSize="13"
                        fontWeight="600"
                        fontFamily="Gilroy, ui-sans-serif, system-ui"
                      >
                        {tooltip.subLabel}
                      </text>
                    ) : null}

                    <line
                      x1="16"
                      y1="64"
                      x2={w - 16}
                      y2="64"
                      stroke="rgba(255,255,255,0.12)"
                      strokeWidth="1"
                    />

                    {deltaTxt ? (
                      <>
                        <g transform={`translate(16, 70)`}>
                          <rect
                            x="0"
                            y="0"
                            width={badgeW}
                            height={badgeH}
                            rx="7"
                            fill={badgeBg}
                            stroke={badgeStroke}
                          />
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

                        <text
                          x={16 + badgeW + 10}
                          y={86 - 10}
                          fill="rgba(255,255,255,0.60)"
                          fontSize="13"
                          fontWeight="600"
                          fontFamily="Gilroy, ui-sans-serif, system-ui"
                        >
                          vs previous month.
                        </text>
                      </>
                    ) : null}
                  </g>
                );
              }}
            />
          ) : null}

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

              const delta =
                fixedDelta ?? calcDeltaFromPrev(rows, row.i) ?? null;

              const dateLabel =
                tooltipDateMode === "monthYear"
                  ? fmtMonthYearLong(row.date)
                  : fmtFullDate(row.date);

              return (
                <div className={tipWrapper}>
                  <div className={tipValue}>
                    {valuePrefix}
                    {fmtTooltipK(row.value)}
                    {valueSuffix}
                  </div>

                  {showDateInTooltip ? (
                    <div className={tipDate}>{dateLabel}</div>
                  ) : null}

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

export default memo(RevenueChart);
