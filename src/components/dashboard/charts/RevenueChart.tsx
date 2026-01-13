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

  const deltaIcon = isNegative ? (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M14.6133 11.5867C14.5457 11.7496 14.4162 11.879 14.2533 11.9467C14.1732 11.9808 14.0871 11.9989 14 12H10.6667C10.4899 12 10.3203 11.9298 10.1953 11.8047C10.0702 11.6797 10 11.5101 10 11.3333C10 11.1565 10.0702 10.987 10.1953 10.8619C10.3203 10.7369 10.4899 10.6667 10.6667 10.6667H12.3933L8.66667 6.94L6.47333 9.14C6.41136 9.20249 6.33762 9.25208 6.25638 9.28593C6.17515 9.31977 6.08801 9.3372 6 9.3372C5.91199 9.3372 5.82486 9.31977 5.74362 9.28593C5.66238 9.25208 5.58864 9.20249 5.52667 9.14L1.52667 5.14C1.46418 5.07802 1.41458 5.00429 1.38074 4.92305C1.34689 4.84181 1.32947 4.75467 1.32947 4.66667C1.32947 4.57866 1.34689 4.49152 1.38074 4.41028C1.41458 4.32904 1.46418 4.25531 1.52667 4.19333C1.58864 4.13085 1.66238 4.08125 1.74362 4.04741C1.82486 4.01356 1.91199 3.99613 2 3.99613C2.08801 3.99613 2.17514 4.01356 2.25638 4.04741C2.33762 4.08125 2.41136 4.13085 2.47333 4.19333L6 7.72667L8.19333 5.52667C8.25531 5.46418 8.32904 5.41459 8.41028 5.38074C8.49152 5.34689 8.57866 5.32947 8.66667 5.32947C8.75467 5.32947 8.84181 5.34689 8.92305 5.38074C9.00429 5.41459 9.07802 5.46418 9.14 5.52667L13.3333 9.72667V8C13.3333 7.82319 13.4036 7.65362 13.5286 7.5286C13.6536 7.40357 13.8232 7.33333 14 7.33333C14.1768 7.33333 14.3464 7.40357 14.4714 7.5286C14.5964 7.65362 14.6667 7.82319 14.6667 8V11.3333C14.6656 11.4205 14.6475 11.5065 14.6133 11.5867Z"
        fill="#FF454A"
      />
    </svg>
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M14.6133 4.41333C14.5457 4.25043 14.4162 4.12098 14.2533 4.05333C14.1732 4.01917 14.0871 4.00105 14 4H10.6667C10.4899 4 10.3203 4.07024 10.1953 4.19526C10.0702 4.32029 10 4.48986 10 4.66667C10 4.84348 10.0702 5.01305 10.1953 5.13807C10.3203 5.2631 10.4899 5.33333 10.6667 5.33333H12.3933L8.66667 9.06L6.47333 6.86C6.41136 6.79751 6.33762 6.74792 6.25638 6.71407C6.17515 6.68023 6.08801 6.6628 6 6.6628C5.91199 6.6628 5.82486 6.68023 5.74362 6.71407C5.66238 6.74792 5.58864 6.79751 5.52667 6.86L1.52667 10.86C1.46418 10.922 1.41458 10.9957 1.38074 11.0769C1.34689 11.1582 1.32947 11.2453 1.32947 11.3333C1.32947 11.4213 1.34689 11.5085 1.38074 11.5897C1.41458 11.671 1.46418 11.7447 1.52667 11.8067C1.58864 11.8692 1.66238 11.9187 1.74362 11.9526C1.82486 11.9864 1.91199 12.0039 2 12.0039C2.08801 12.0039 2.17514 11.9864 2.25638 11.9526C2.33762 11.9187 2.41136 11.8692 2.47333 11.8067L6 8.27333L8.19333 10.4733C8.25531 10.5358 8.32904 10.5854 8.41028 10.6193C8.49152 10.6531 8.57866 10.6705 8.66667 10.6705C8.75467 10.6705 8.84181 10.6531 8.92305 10.6193C9.00429 10.5854 9.07802 10.5358 9.14 10.4733L13.3333 6.27333V8C13.3333 8.17681 13.4036 8.34638 13.5286 8.4714C13.6536 8.59643 13.8232 8.66667 14 8.66667C14.1768 8.66667 14.3464 8.59643 14.4714 8.4714C14.5964 8.34638 14.6667 8.17681 14.6667 8V4.66667C14.6656 4.57955 14.6475 4.49348 14.6133 4.41333Z"
        fill="#45FF79"
      />
    </svg>
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
      (a, b) => a - b
    );
    return makePiecewiseScaler(base);
  }, [yTicks, domain]);

  const rows = useMemo(() => {
    return data.map((v, i) => ({
      i,
      name: xLabels?.[i] ?? `${i + 1}`,
      date: dates?.[i],
      value: v,
      y: scaler.toScaled(v),
    }));
  }, [data, xLabels, dates, scaler]);

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
              x={pinnedRow.name}
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
                      {tooltip.valueLabel}
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
