import DetailedViewShell from "@/components/dashboard/finances/DetailedViewShell";
import type { DonutSegment } from "@/components/dashboard/charts/DonutFull";
import { UserRound, CalendarDays, Trophy, CalendarCheck2 } from "lucide-react";

const kpiA = [60, 120, 90, 160, 180, 130, 200, 230, 180, 220, 260, 300];
const kpiB = [420, 280, 300, 260, 310, 210, 120, 180, 220, 200, 240, 480];
const kpiC = [120, 240, 180, 220, 260, 180, 320, 260, 380, 300, 260, 120];
const kpiD = [80, 100, 160, 220, 260, 200, 220, 240, 210, 230, 250, 260];

const totalSeries = [6, 10, 18, 28, 42, 120, 140, 125, 130, 170, 210, 230].map(
  (v) => v * 1000,
);

const PEAK_BARS = [22_000, 120_000, 65_000, 42_000, 220_000, 98_000, 55_000];

const REVENUE_SOURCE: DonutSegment[] = [
  { value: 150, label: "Spent", color: "#FF7B45" },
  { value: 106, label: "Opened", color: "#FF454A" },
  { value: 76, label: "Spam", color: "#9A46FF" },
  { value: 30, label: "Deleted", color: "#45FF79" },
];

export default function FinancesRevenueDetailedPage() {
  return (
    <DetailedViewShell
      heading="Revenue Detailed View"
      miniCards={[
        {
          title: "Avg Revenue Per Customer",
          value: "400",
          delta: "24.6%",
          series: kpiA,
          icon: <UserRound className="h-4.5 w-4.5" aria-hidden />,
        },
        {
          title: "Avg Revenue Per Event",
          value: "$150,000",
          delta: "-24.6%",
          series: kpiB,
          icon: <CalendarDays className="h-4.5 w-4.5" aria-hidden />,
        },
        {
          title: "Highest Earning Event",
          value: "Poster Boy",
          delta: "24.6%",
          series: kpiC,
          icon: <Trophy className="h-4.5 w-4.5" aria-hidden />,
        },
        {
          title: "Highest Earning Month",
          value: "April 2025",
          delta: "-24.6%",
          series: kpiD,
          icon: <CalendarCheck2 className="h-4.5 w-4.5" aria-hidden />,
        },
      ]}
      bigCard={{
        label: "TOTAL REVENUE",
        value: "$240,8K",
        delta: "+24.6%",
        deltaPositive: true,
        series: totalSeries,
        tooltip: {
          index: 6,
          valueLabel: "$240,8K",
          subLabel: "June 21, 2025",
          deltaText: "+24.6%",
          deltaPositive: true,
        },
        valuePrefix: "$",
        valueSuffix: "K",
      }}
      donut={{
        label: "REVENUE SOURCE",
        heading: "SEPTEMBER 2025",
        segments: REVENUE_SOURCE,
      }}
      mapLabel="TOP REVENUE LOCATIONS"
      barsLabel="PEAK DAYS"
      barsHeading="SEPTEMBER 2025"
      barsData={PEAK_BARS}
      mode="revenue"
    />
  );
}
