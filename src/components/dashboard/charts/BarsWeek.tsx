/* ------------------------------------------------------------------ */
/*  BarsWeek – 7-day vertical bar chart, highlight one day            */
/* ------------------------------------------------------------------ */
"use client";

import { memo, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  Cell,
  Rectangle,
} from "recharts";

type Metric = "revenue" | "views" | "tickets";

type Props = {
  /** Length 7 (Mon..Sun) values in absolute numbers */
  data: number[];
  /** 0-based index to accent (e.g., 4 = Friday). */
  highlightIndex?: number;
  /** What this chart represents (controls tooltip label + formatting) */
  metric?: Metric;
};

const AXIS_TICK_STYLE = {
  fill: "var(--color-neutral-500, #727293)",
  fontFamily: "Gilroy, ui-sans-serif, system-ui",
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: -0.2 as number,
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Chart row shape */
type Row = {
  name: string;
  value: number;
  accent: boolean;
};

/** Axis tick: compact numeric (no $) */
const fmtAxisK = (v: number) =>
  v >= 1000 ? `${Math.round(v / 1000)}K` : `${v}`;

/** Count compact (Views/Tickets) */
function fmtCountCompact(v: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0";
  if (n >= 1_000_000) {
    const m = Math.round((n / 1_000_000) * 10) / 10;
    return `${String(m).replace(/\.0$/, "")}M`;
  }
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return `${n}`;
}

/** Money compact (Revenue) */
function fmtMoneyCompact(v: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "$0";
  if (n >= 1_000_000) {
    const m = Math.round((n / 1_000_000) * 10) / 10;
    return `$${String(m).replace(/\.0$/, "")}M`;
  }
  if (n >= 1000) return `$${Math.round(n / 1000)}K`;
  return `$${n}`;
}

/* ----------------------------- Tooltip ----------------------------- */
/** Local tooltip props (avoids Recharts TS mismatches across versions) */
type TooltipPayloadItem = { value?: number | string };
type SimpleTooltipProps = {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
};

function metricMeta(metric: Metric) {
  if (metric === "revenue") return { dot: "#9A46FF", label: "Revenue" };
  if (metric === "tickets") return { dot: "#9A46FF", label: "Tickets Sold" };
  return { dot: "#9A46FF", label: "Page Views" };
}

function formatTooltipValue(metric: Metric, v: number) {
  if (metric === "revenue") return fmtMoneyCompact(v);
  return fmtCountCompact(v);
}

function PeakDaysTooltip({
  active,
  payload,
  label,
  metric,
}: SimpleTooltipProps & { metric: Metric }) {
  if (!active || !payload?.length) return null;

  const raw = payload[0]?.value ?? 0;
  const v = Number(raw);
  const meta = metricMeta(metric);

  return (
    <div
      className={[
        "rounded-2xl border border-white/10",
        "bg-[#141625]/95 backdrop-blur-xl",
        "px-4 py-3",
        "shadow-[0_18px_46px_rgba(0,0,0,0.55)]",
        "min-w-[170px]",
      ].join(" ")}
      style={{ WebkitBackdropFilter: "blur(18px)" }}
    >
      <div className="text-xs font-semibold text-white/70">{label}</div>

      <div className="mt-1 text-xl font-extrabold tracking-tight text-white">
        {formatTooltipValue(metric, v)}
      </div>

      <div className="mt-2 h-px w-full bg-white/10" />

      <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-white/70">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: meta.dot }}
        />
        {meta.label}
      </div>
    </div>
  );
}

function BarsWeek({ data, highlightIndex = 4, metric = "revenue" }: Props) {
  const rows: Row[] = useMemo(
    () =>
      data.map((v, i) => ({
        name: DAY_LABELS[i] ?? `D${i + 1}`,
        value: v,
        accent: i === highlightIndex,
      })),
    [data, highlightIndex],
  );

  // Keep your nice “big range” default, but adapt if data exceeds it
  const maxY = Math.max(250000, ...(data.length ? data : [0]));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 6, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke="#2C2C44" />

        <YAxis
          dataKey="value"
          domain={[0, maxY]}
          ticks={[0, 25_000, 50_000, 100_000, 150_000, 200_000, 250_000]}
          tick={{ ...AXIS_TICK_STYLE, textAnchor: "end" }}
          tickFormatter={fmtAxisK}
          width={40}
          axisLine={{ stroke: "#2C2C44", strokeWidth: 1 }}
          tickLine={false}
        />

        <XAxis
          dataKey="name"
          tick={{ ...AXIS_TICK_STYLE, textAnchor: "middle" }}
          axisLine={{ stroke: "#2C2C44", strokeWidth: 1 }}
          tickLine={false}
          tickMargin={10}
        />

        <Bar
          dataKey="value"
          radius={[10, 10, 0, 0]}
          isAnimationActive={false}
          activeBar={<Rectangle radius={[10, 10, 0, 0]} fill="#AA73FF" />}
        >
          {rows.map((r, i) => (
            <Cell key={i} fill={r.accent ? "#9A46FF" : "#6D5BD0"} />
          ))}
        </Bar>

        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.06)" }}
          isAnimationActive={false}
          wrapperStyle={{ pointerEvents: "none" }}
          content={(p) => (
            <PeakDaysTooltip {...(p as SimpleTooltipProps)} metric={metric} />
          )}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default memo(BarsWeek);
