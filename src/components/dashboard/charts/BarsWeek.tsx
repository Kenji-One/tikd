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
} from "recharts";

type Props = {
  /** Length 7 (Mon..Sun) values in absolute numbers */
  data: number[];
  /** 0-based index to accent (e.g., 4 = Friday). */
  highlightIndex?: number;
};

const AXIS_TICK_STYLE = {
  fill: "var(--color-neutral-500, #727293)",
  fontFamily: "Gilroy, ui-sans-serif, system-ui",
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: -0.2 as number,
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const fmtK = (v: number) => (v >= 1000 ? `${Math.round(v / 1000)}K` : `${v}`);

/** Row shape we pass into Recharts */
type Row = {
  name: string;
  value: number;
  accent: boolean;
};

function BarsWeek({ data, highlightIndex = 4 }: Props) {
  const rows: Row[] = useMemo(
    () =>
      data.map((v, i) => ({
        name: DAY_LABELS[i] ?? `D${i + 1}`,
        value: v,
        accent: i === highlightIndex,
      })),
    [data, highlightIndex]
  );

  const maxY = Math.max(250000, ...(data.length ? data : [0]));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <CartesianGrid vertical={false} stroke="#2C2C44" />
        <YAxis
          dataKey="value"
          domain={[0, maxY]}
          ticks={[0, 25_000, 50_000, 100_000, 150_000, 200_000, 250_000]}
          tick={{ ...AXIS_TICK_STYLE, textAnchor: "end" }}
          tickFormatter={fmtK}
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

        {/* Bars with per-datum fill via <Cell /> */}
        <Bar dataKey="value" radius={[8, 8, 0, 0]} isAnimationActive={false}>
          {rows.map((r, i) => (
            <Cell key={i} fill={r.accent ? "#9A46FF" : "#6D5BD0"} />
          ))}
        </Bar>

        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.06)" }}
          contentStyle={{
            background: "#141625",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10,
            padding: "6px 8px",
            color: "#fff",
            fontSize: 12,
          }}
          labelStyle={{ color: "rgba(255,255,255,0.7)", marginBottom: 2 }}
          isAnimationActive={false}
          formatter={(val: unknown) => [`$${fmtK(Number(val))}`, "Revenue"]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default memo(BarsWeek);
