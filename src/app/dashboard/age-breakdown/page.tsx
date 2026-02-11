import { BadgeDollarSign, Ticket, TrendingUp, User } from "lucide-react";

import DetailedViewShell from "@/components/dashboard/finances/DetailedViewShell";
import type { DonutSegment } from "@/components/dashboard/charts/DonutFull";

const kpiA = [60, 120, 90, 160, 180, 130, 200, 230, 180, 220, 260, 300];
const kpiB = [420, 280, 300, 260, 310, 210, 120, 180, 220, 200, 240, 480];
const kpiC = [120, 240, 180, 220, 260, 180, 320, 260, 380, 300, 260, 120];
const kpiD = [80, 100, 160, 220, 260, 200, 220, 240, 210, 230, 250, 260];

const totalSeries = [6, 10, 18, 28, 42, 120, 140, 125, 130, 170, 210, 230].map(
  (v) => v * 1000,
);

const PEAK_BARS = [22_000, 120_000, 65_000, 42_000, 220_000, 98_000, 55_000];

const AGE_SOURCE: DonutSegment[] = [
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

export default function AgeBreakdownDetailedPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const eventIdRaw = searchParams?.eventId;
  const orgIdRaw = searchParams?.orgId;

  const eventId = Array.isArray(eventIdRaw) ? eventIdRaw[0] : eventIdRaw;
  const orgId = Array.isArray(orgIdRaw) ? orgIdRaw[0] : orgIdRaw;

  const backHref = eventId
    ? `/dashboard/events/${eventId}/summary`
    : orgId
      ? `/dashboard/organizations/${orgId}/summary`
      : "/dashboard";

  return (
    <DetailedViewShell
      heading="Age Breakdown Detailed View"
      backHref={backHref}
      miniCards={[
        {
          title: "Avg Customer Age",
          value: "40",
          delta: "+24.6%",
          series: kpiA,
          icon: <User className="h-4 w-4" />,
        },
        {
          title: "Fastest Age Group Growth",
          value: "21",
          delta: "-24.6%",
          negative: true,
          series: kpiB,
          icon: <TrendingUp className="h-4 w-4" />,
        },
        {
          title: "Top Revenue Age Group",
          value: "24",
          delta: "-24.6%",
          negative: true,
          series: kpiC,
          icon: <BadgeDollarSign className="h-4 w-4" />,
        },
        {
          title: "Fastest Sellout Age Group",
          value: "32",
          delta: "-24.6%",
          negative: true,
          series: kpiD,
          icon: <Ticket className="h-4 w-4" />,
        },
      ]}
      bigCard={{
        label: "REVENUE BY AGE",
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
        // Figma: no icon next to the big value
        valueIcon: false,
      }}
      donut={{
        label: "AGE SOURCE",
        heading: "SEPTEMBER 2025",
        segments: AGE_SOURCE,
      }}
      mapLabel="TOP REVENUE LOCATIONS"
      mode="revenue"
      barsLabel="PEAK DAYS"
      barsHeading="SEPTEMBER 2025"
      barsData={PEAK_BARS}
    />
  );
}
