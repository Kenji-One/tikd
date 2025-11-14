/* ------------------------------------------------------------------ */
/*  src/components/dashboard/charts/SmallKpiChart.tsx                 */
/*  Figma-accurate small line charts (Page Views / Tickets Sold)      */
/* ------------------------------------------------------------------ */
"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { memo, useMemo } from "react";

type Props = {
  data: number[];
  domain?: [number, number];
  /** Exactly the labels you want to show on X (e.g. ["12AM","8AM","4PM","11PM"]) */
  xLabels?: string[];
  yTicks?: number[];
  stroke?: string;
};

const fmtY = (v: number) => (v >= 1000 ? `${Math.round(v / 1000)}K` : `${v}`);

const GRID_COLOR = "rgba(255,255,255,0.06)";

const AXIS_TICK_STYLE = {
  fill: "var(--Color-Neutral-500, #727293)",
  fontFamily: "Gilroy, ui-sans-serif, system-ui",
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: -0.2 as number,
};

function SmallKpiChart({
  data,
  domain = [0, Math.max(500, Math.max(...data))],
  xLabels = ["12AM", "8AM", "4PM", "11PM"],
  yTicks = [0, 100, 250, 500],
  stroke = "#9A46FF",
}: Props) {
  // rows carry a numeric x index
  const rows = useMemo(() => data.map((v, i) => ({ x: i, value: v })), [data]);

  // choose 4 equally spaced positions to host those labels
  const { ticks, labelByIndex } = useMemo(() => {
    if (rows.length === 0 || xLabels.length === 0) {
      return { ticks: [] as number[], labelByIndex: new Map<number, string>() };
    }
    const maxIdx = rows.length - 1;
    const idxs = xLabels.map((_, i) =>
      Math.round((i / Math.max(1, xLabels.length - 1)) * maxIdx)
    );
    const uniq = Array.from(new Set(idxs)).sort((a, b) => a - b);
    const map = new Map<number, string>();
    uniq.forEach((idx, i) => map.set(idx, xLabels[i] ?? ""));
    return { ticks: uniq, labelByIndex: map };
  }, [rows, xLabels]);

  return (
    // If you want exact Figma size: wrap this component with w-[239px] h-[111px]
    // and change ResponsiveContainer to height="100%".
    <div className="w-full">
      <ResponsiveContainer width="100%" height={111}>
        <LineChart
          data={rows}
          // Keep margins minimal; let YAxis/XAxis reserve their own spaces
          margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
        >
          <CartesianGrid
            vertical={false}
            horizontal={false}
            stroke={GRID_COLOR}
            strokeDasharray="0"
          />

          <YAxis
            dataKey="value"
            domain={domain}
            ticks={yTicks}
            tick={{ ...AXIS_TICK_STYLE, textAnchor: "end" }}
            tickFormatter={fmtY}
            width={36} // reserve left gutter here
            axisLine={{ stroke: "#2C2C44", strokeWidth: 1 }}
            tickLine={false}
            tickMargin={6} // spacing from axis to labels
          />

          <XAxis
            dataKey="x"
            type="number"
            ticks={ticks}
            tick={{ ...AXIS_TICK_STYLE, textAnchor: "middle" }}
            tickFormatter={(idx: number) => labelByIndex.get(idx) ?? ""}
            axisLine={{ stroke: "#2C2C44", strokeWidth: 1 }}
            tickLine={false}
            tickMargin={10} // spacing from axis to labels
            domain={["dataMin", "dataMax"]}
            allowDecimals={false}
          />

          {/* Glow line (behind) */}
          <Line
            dataKey="value"
            stroke={stroke}
            strokeOpacity={0.35}
            strokeWidth={1}
            dot={false}
            isAnimationActive={false}
          />
          {/* Crisp line */}
          <Line
            dataKey="value"
            stroke={stroke}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />

          <Tooltip
            cursor={{ stroke: "rgba(255,255,255,0.12)", strokeWidth: 1 }}
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
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default memo(SmallKpiChart);
