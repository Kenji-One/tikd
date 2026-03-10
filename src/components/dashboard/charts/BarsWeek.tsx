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
  /** Usually length 7 values */
  data: number[];
  /** Optional labels matching the data order */
  labels?: string[];
  /** 0-based index to accent */
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

const DEFAULT_DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Chart row shape */
type Row = {
  name: string;
  value: number;
  accent: boolean;
};

/** Axis tick: compact numeric (no $) */
const fmtAxisK = (v: number) => {
  if (v >= 1_000_000) {
    const m = Math.round((v / 1_000_000) * 10) / 10;
    return `${String(m).replace(/\.0$/, "")}M`;
  }
  if (v >= 1000) {
    const k = Math.round((v / 1000) * 10) / 10;
    return `${String(k).replace(/\.0$/, "")}K`;
  }
  return `${Math.round(v)}`;
};

/** Count compact (Views/Tickets) */
function fmtCountCompact(v: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0";
  if (n >= 1_000_000) {
    const m = Math.round((n / 1_000_000) * 10) / 10;
    return `${String(m).replace(/\.0$/, "")}M`;
  }
  if (n >= 1000) {
    const k = Math.round((n / 1000) * 10) / 10;
    return `${String(k).replace(/\.0$/, "")}K`;
  }
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
  if (n >= 1000) {
    const k = Math.round((n / 1000) * 10) / 10;
    return `$${String(k).replace(/\.0$/, "")}K`;
  }
  return `$${n}`;
}

function buildNiceMax(value: number) {
  const safe = Math.max(0, Number.isFinite(value) ? value : 0);
  if (safe <= 0) return 1;

  const exponent = Math.floor(Math.log10(safe));
  const magnitude = Math.pow(10, exponent);
  const normalized = safe / magnitude;

  let niceNormalized = 1;
  if (normalized <= 1) niceNormalized = 1;
  else if (normalized <= 2) niceNormalized = 2;
  else if (normalized <= 5) niceNormalized = 5;
  else niceNormalized = 10;

  return niceNormalized * magnitude;
}

function buildTicks(maxValue: number) {
  const safeMax = Math.max(1, buildNiceMax(maxValue));
  const tickCount = 5;
  const step = safeMax / (tickCount - 1);

  const ticks = Array.from({ length: tickCount }, (_, i) =>
    Math.round(step * i),
  );

  ticks[0] = 0;
  ticks[ticks.length - 1] = safeMax;

  return ticks;
}

/* ----------------------------- Tooltip ----------------------------- */
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

function BarsWeek({
  data,
  labels = DEFAULT_DAY_LABELS,
  highlightIndex,
  metric = "revenue",
}: Props) {
  const safeLabels = useMemo(() => {
    if (!labels.length) return DEFAULT_DAY_LABELS;
    return data.map((_, i) => labels[i] ?? `D${i + 1}`);
  }, [data, labels]);

  const resolvedHighlightIndex = useMemo(() => {
    if (
      typeof highlightIndex === "number" &&
      highlightIndex >= 0 &&
      highlightIndex < data.length
    ) {
      return highlightIndex;
    }
    return data.length > 0 ? data.length - 1 : -1;
  }, [data.length, highlightIndex]);

  const rows: Row[] = useMemo(
    () =>
      data.map((v, i) => ({
        name: safeLabels[i] ?? `D${i + 1}`,
        value: Number.isFinite(v) ? v : 0,
        accent: i === resolvedHighlightIndex,
      })),
    [data, resolvedHighlightIndex, safeLabels],
  );

  const rawMax = Math.max(0, ...(data.length ? data : [0]));
  const maxY = buildNiceMax(rawMax);
  const yTicks = buildTicks(maxY);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 6, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke="#2C2C44" />

        <YAxis
          dataKey="value"
          domain={[0, maxY]}
          ticks={yTicks}
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
          minPointSize={rows.some((row) => row.value > 0) ? 6 : 0}
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
