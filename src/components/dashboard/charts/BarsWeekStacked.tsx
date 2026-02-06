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
} from "recharts";

type Metric = "revenue" | "views" | "tickets";

export type BarsStackSeries = {
  key: string; // "male" | "female" | "other"
  label: string;
  color: string;
  data: number[]; // length 7
};

type Props = {
  series: BarsStackSeries[];
  highlightIndex?: number;
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

type Row = {
  name: string;
  accent: boolean;
} & Record<string, number | boolean | string>;

const fmtAxisK = (v: number) =>
  v >= 1000 ? `${Math.round(v / 1000)}K` : `${v}`;

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
type TooltipPayloadItem = { payload?: Row };
type SimpleTooltipProps = {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
};

function metricMeta(metric: Metric) {
  if (metric === "revenue") return { label: "Revenue", fmt: fmtMoneyCompact };
  if (metric === "tickets")
    return { label: "Tickets Sold", fmt: fmtCountCompact };
  return { label: "Page Views", fmt: fmtCountCompact };
}

function StackedTooltip({
  active,
  payload,
  label,
  metric,
  series,
}: SimpleTooltipProps & { metric: Metric; series: BarsStackSeries[] }) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload;
  if (!row) return null;

  const meta = metricMeta(metric);

  const total = series.reduce((acc, s) => acc + Number(row[s.key] ?? 0), 0);

  return (
    <div
      className={[
        "rounded-2xl border border-white/10",
        "bg-[#141625]/95 backdrop-blur-xl",
        "px-4 py-3",
        "shadow-[0_18px_46px_rgba(0,0,0,0.55)]",
        "min-w-[190px]",
      ].join(" ")}
      style={{ WebkitBackdropFilter: "blur(18px)" }}
    >
      <div className="text-xs font-semibold text-white/70">{label}</div>

      <div className="mt-1 text-xl font-extrabold tracking-tight text-white">
        {meta.fmt(total)}
      </div>

      <div className="mt-2 h-px w-full bg-white/10" />

      <div className="mt-2 space-y-2">
        {series.map((s) => {
          const v = Number(row[s.key] ?? 0);
          return (
            <div
              key={s.key}
              className="flex items-center justify-between gap-4 text-xs font-semibold text-white/75"
            >
              <span className="inline-flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                {s.label}
              </span>
              <span className="tabular-nums text-white/85">{meta.fmt(v)}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-2 h-px w-full bg-white/10" />

      <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-white/70">
        <span className="inline-block h-2 w-2 rounded-full bg-[#9A46FF]" />
        {meta.label}
      </div>
    </div>
  );
}

function BarsWeekStacked({
  series,
  highlightIndex = 4,
  metric = "revenue",
}: Props) {
  const rows: Row[] = useMemo(() => {
    return DAY_LABELS.map((name, i) => {
      const r: Row = { name, accent: i === highlightIndex };
      for (const s of series) r[s.key] = Number(s.data?.[i] ?? 0);
      return r;
    });
  }, [series, highlightIndex]);

  const maxY = useMemo(() => {
    const totals = rows.map((r) =>
      series.reduce((acc, s) => acc + Number(r[s.key] ?? 0), 0),
    );
    return Math.max(250_000, ...(totals.length ? totals : [0]));
  }, [rows, series]);

  // order matters visually; we keep the given order for stacking
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 6, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke="#2C2C44" />

        <YAxis
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

        {series.map((s, sIdx) => {
          const isTop = sIdx === series.length - 1;
          return (
            <Bar
              key={s.key}
              dataKey={s.key}
              stackId="g"
              isAnimationActive={false}
              radius={isTop ? [10, 10, 0, 0] : [0, 0, 0, 0]}
            >
              {rows.map((r, i) => (
                <Cell
                  key={`${s.key}-${i}`}
                  fill={s.color}
                  fillOpacity={r.accent ? 1 : 0.82}
                />
              ))}
            </Bar>
          );
        })}

        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.06)" }}
          isAnimationActive={false}
          wrapperStyle={{ pointerEvents: "none" }}
          content={(p) => (
            <StackedTooltip
              {...(p as SimpleTooltipProps)}
              metric={metric}
              series={series}
            />
          )}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default memo(BarsWeekStacked);
