// src/app/dashboard/gender-breakdown/page.tsx
import { Repeat2, Users, UserRound, Repeat } from "lucide-react";

import DetailedViewShell from "@/components/dashboard/finances/DetailedViewShell";
import type { DonutSegment } from "@/components/dashboard/charts/DonutFull";

const kpiA = [60, 120, 90, 160, 180, 130, 200, 230, 180, 220, 260, 300];
const kpiB = [420, 280, 300, 260, 310, 210, 120, 180, 220, 200, 240, 480];
const kpiC = [120, 240, 180, 220, 260, 180, 320, 260, 380, 300, 260, 120];
const kpiD = [80, 100, 160, 220, 260, 200, 220, 240, 210, 230, 250, 260];

const totalSeries = [6, 10, 18, 28, 42, 120, 140, 125, 130, 170, 210, 230].map(
  (v) => v * 1000,
);

/**
 * Gender lines (Male / Female / Other)
 * Keep the overall shape similar to existing totals, but split into 3 series.
 */
const maleSeries = totalSeries.map((v, i) =>
  Math.round(v * (0.55 + (i % 3) * 0.02)),
);
const femaleSeries = totalSeries.map((v, i) =>
  Math.round(v * (0.32 + (i % 4) * 0.01)),
);
const otherSeries = totalSeries.map((v, i) =>
  Math.max(0, v - maleSeries[i] - femaleSeries[i]),
);

/**
 * Peak Days (stacked per day)
 */
const PEAK_TOTALS = [22_000, 120_000, 65_000, 42_000, 220_000, 98_000, 55_000];

const PEAK_MALE = PEAK_TOTALS.map((v, i) =>
  Math.round(v * (0.52 + (i % 2) * 0.03)),
);
const PEAK_FEMALE = PEAK_TOTALS.map((v, i) =>
  Math.round(v * (0.33 + (i % 3) * 0.02)),
);
const PEAK_OTHER = PEAK_TOTALS.map((v, i) =>
  Math.max(0, v - PEAK_MALE[i] - PEAK_FEMALE[i]),
);

const TRAFFIC_SOURCE: DonutSegment[] = [
  { value: 150, label: "Spent", color: "#F97316" },
  { value: 96, label: "Opened", color: "#EF4444" },
  { value: 56, label: "Spam", color: "#7C3AED" },
  { value: 10, label: "Deleted", color: "#22C55E" },
];

function KpiIcon({ children }: { children: React.ReactNode }) {
  return (
    <span
      className={[
        "inline-flex h-7 w-7 items-center justify-center rounded-md",
        "border border-white/10",
        "bg-[linear-gradient(180deg,rgba(255,255,255,0.10),rgba(255,255,255,0)_40%),rgba(154,70,255,0.18)]",
        "shadow-[0_14px_32px_rgba(0,0,0,0.55)]",
        "text-white/90",
      ].join(" ")}
      aria-hidden
    >
      {children}
    </span>
  );
}

export default function GenderBreakdownDetailedPage() {
  return (
    <DetailedViewShell
      heading="Gender Breakdown Detailed View"
      backHref="/dashboard"
      miniCards={[
        {
          title: "Gender Ratio",
          value: "Male 3 : Female 1",
          delta: "+24.6%",
          series: kpiA,
          icon: <Users className="h-4 w-4" />,
        },
        {
          title: "Avg Gender Event Ratio",
          value: "Male 2 : Female 1",
          delta: "-24.6%",
          negative: true,
          series: kpiB,
          icon: <UserRound className="h-4 w-4" />,
        },
        {
          title: "Avg Male Repeat",
          value: "12%",
          delta: "-24.6%",
          negative: true,
          series: kpiC,
          icon: <Repeat className="h-4 w-4" />,
        },
        {
          title: "Avg Female Repeat",
          value: "15%",
          delta: "-24.6%",
          negative: true,
          series: kpiD,
          icon: <Repeat2 className="h-4 w-4" />,
        },
      ]}
      bigCard={{
        label: "TOTAL TICKETS SOLD BY GENDER",
        value: "240,8K",
        delta: "+24.6%",
        deltaPositive: true,

        /**
         * Keep the existing `series` (used for internal clamping and defaults),
         * but render multi-lines ONLY here via `seriesLines`.
         */
        series: totalSeries,

        /**
         * ✅ Match reference:
         * - Blue / Pink / Gray
         * - Each line has a soft warm down-fill (area gradient)
         * - Keep the rest of the design unchanged
         */
        seriesLines: [
          // draw "other" first so it sits visually behind
          {
            key: "other",
            label: "Other",
            series: otherSeries,
            stroke: "#B7B7CC",
            showFill: true,
            fillTop: "#B7B7CC",
            fillStartOpacity: 0.14,
            fillEndOpacity: 0,
          },
          {
            key: "female",
            label: "Female",
            series: femaleSeries,
            stroke: "#FF2D6D",
            showFill: true,
            fillTop: "#FF2D6D",
            fillStartOpacity: 0.2,
            fillEndOpacity: 0,
          },
          {
            key: "male",
            label: "Male",
            series: maleSeries,
            stroke: "#2B4CFF",
            showFill: true,
            fillTop: "#2B4CFF",
            fillStartOpacity: 0.22,
            fillEndOpacity: 0,
          },
        ],
        pinSeriesKey: "male",

        tooltip: {
          index: 6,
          valueLabel: "240,8K",
          subLabel: "June 21, 2025 - Male",
          deltaText: "+24.6%",
          deltaPositive: true,
        },
        valuePrefix: "",
        valueSuffix: "K",
        valueIcon: false,
      }}
      donut={{
        label: "TRAFFIC SOURCE",
        heading: "SEPTEMBER 2025",
        segments: TRAFFIC_SOURCE,
      }}
      mapLabel="TOP REVENUE LOCATIONS"
      mode="revenue"
      barsLabel="PEAK DAYS"
      barsHeading="SEPTEMBER 2025"
      barsData={PEAK_TOTALS}
      barsStacks={[
        { key: "other", label: "Other", color: "#2C2C44", data: PEAK_OTHER },
        { key: "female", label: "Female", color: "#FF2D6D", data: PEAK_FEMALE },
        { key: "male", label: "Male", color: "#2B4CFF", data: PEAK_MALE },
      ]}
    />
  );
}
