import DetailedViewShell from "@/components/dashboard/finances/DetailedViewShell";
import type { DonutSegment } from "@/components/dashboard/charts/DonutFull";

const kpiA = [60, 120, 90, 160, 180, 130, 200, 230, 180, 220, 260, 300];
const kpiB = [420, 280, 300, 260, 310, 210, 120, 180, 220, 200, 240, 480];
const kpiC = [120, 240, 180, 220, 260, 180, 320, 260, 380, 300, 260, 120];
const kpiD = [80, 100, 160, 220, 260, 200, 220, 240, 210, 230, 250, 260];

const totalSeries = [6, 10, 18, 28, 42, 120, 140, 125, 130, 170, 210, 230].map(
  (v) => v * 1000
);

const PEAK_BARS = [22_000, 120_000, 65_000, 42_000, 220_000, 98_000, 55_000];

const TRAFFIC_SOURCE: DonutSegment[] = [
  { value: 150, label: "Spent", color: "#F97316" },
  { value: 96, label: "Opened", color: "#EF4444" },
  { value: 56, label: "Spam", color: "#7C3AED" },
  { value: 10, label: "Deleted", color: "#22C55E" },
];

export default function FinancesGenderBreakdownDetailedPage() {
  return (
    <DetailedViewShell
      heading="Gender Breakdown Detailed View"
      miniCards={[
        { title: "Gender Ratio", value: "Male 3 : Female", series: kpiA },
        {
          title: "Avg Gender Event Ratio",
          value: "Male 2 : Female",
          series: kpiB,
        },
        {
          title: "Avg Male Repeat",
          value: "12%",
          delta: "-24.6%",
          negative: true,
          series: kpiC,
        },
        {
          title: "Avg Female Repeat",
          value: "15%",
          delta: "-24.6%",
          negative: true,
          series: kpiD,
        },
      ]}
      bigCard={{
        label: "TOTAL TICKETS SOLD BY GENDER",
        value: "240,8K",
        delta: "+24.6%",
        deltaPositive: true,
        series: totalSeries,
        tooltip: {
          index: 6,
          valueLabel: "240,8K",
          subLabel: "June 21, 2025",
          deltaText: "+24.6%",
          deltaPositive: true,
        },
        valuePrefix: "",
        valueSuffix: "K",
      }}
      donut={{
        label: "TRAFFIC SOURCE",
        heading: "SEPTEMBER 2025",
        segments: TRAFFIC_SOURCE,
      }}
      mapLabel="TOP TICKETS SOLD BY GENDER LOCATIONS"
      barsLabel="PEAK DAYS"
      barsHeading="SEPTEMBER 2025"
      barsData={PEAK_BARS}
    />
  );
}
