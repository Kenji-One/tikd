/* ------------------------------------------------------------------ */
/*  src/app/dashboard/DashboardClient.tsx                              */
/* ------------------------------------------------------------------ */
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import KpiCard from "@/components/dashboard/cards/KpiCard";
import RevenueChart from "@/components/dashboard/charts/RevenueChart";
import SmallKpiChart from "@/components/dashboard/charts/SmallKpiChart";
import UpcomingEventsTable from "@/components/dashboard/tables/UpcomingEventsTable";
import TrackingLinksTable from "@/components/dashboard/tables/TrackingLinksTable";
import MyTeamTable, {
  DEMO_MY_TEAM,
} from "@/components/dashboard/tables/MyTeamTable";
import RecentSalesTable from "@/components/dashboard/tables/RecentSalesTable";

import DateRangePicker, {
  type DateRangeValue,
} from "@/components/ui/DateRangePicker";

/* Demo data */
const sparkA = [6, 10, 18, 28, 42, 120, 140, 125, 130, 170, 210, 230].map(
  (v) => v * 1000
);
const sparkB = [120, 240, 180, 220, 260, 180, 320, 260, 380, 300, 260, 120];
const sparkC = [420, 280, 300, 260, 310, 210, 120, 180, 220, 200, 240, 480];

const monthLabels = (start: Date, end: Date) => {
  const labels: string[] = [];
  const d = new Date(start);
  d.setDate(1);
  while (d <= end) {
    labels.push(d.toLocaleDateString(undefined, { month: "short" }));
    d.setMonth(d.getMonth() + 1);
  }
  return labels;
};

const monthDates = (start: Date, end: Date) => {
  const out: Date[] = [];
  const d = new Date(start);
  d.setDate(21);
  while (d <= end) {
    out.push(new Date(d));
    d.setMonth(d.getMonth() + 1);
  }
  return out;
};

const mapSeriesToRange = (vals: number[], monthsCount: number) => {
  if (monthsCount === vals.length) return vals;
  const a = [...vals];
  while (a.length < monthsCount) a.push(a[a.length % vals.length]);
  return a.slice(0, monthsCount);
};

export default function DashboardClient() {
  const router = useRouter();

  // ✅ Replaces old preset dropdown with a real date-range picker
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    start: new Date(2024, 0, 1),
    end: new Date(2024, 11, 31),
  });

  // For this dashboard demo, we still render MONTH points,
  // so we convert the selected date span into month buckets.
  const start = useMemo(
    () => dateRange.start ?? new Date(2024, 0, 1),
    [dateRange.start]
  );
  const end = useMemo(
    () => dateRange.end ?? new Date(2024, 11, 31),
    [dateRange.end]
  );

  const labels = useMemo(() => monthLabels(start, end), [start, end]);
  const dates = useMemo(() => monthDates(start, end), [start, end]);

  const revenueData = useMemo(
    () => mapSeriesToRange(sparkA, labels.length),
    [labels.length]
  );

  return (
    <div className="space-y-5">
      {/* KPIs + Charts --------------------------------------------------- */}
      <section className="grid grid-cols-[3.10fr_1.51fr] gap-5">
        <div className="grid grid-cols-[3.15fr_1.74fr] rounded-lg border border-neutral-700 bg-neutral-900 pl-4">
          {/* Big Revenue card (left) */}
          <KpiCard
            title="Total Revenue"
            value="$240,8K"
            delta="+24.6%"
            accent="from-[#7C3AED] to-[#9333EA]"
            className="pr-6 py-5 border-r border-neutral-700"
            stretchChart
            detailsHref="/dashboard/finances/revenue"
            toolbar={
              <div className="max-w-[220px]">
                <DateRangePicker value={dateRange} onChange={setDateRange} />
              </div>
            }
          >
            <RevenueChart
              data={revenueData}
              dates={dates}
              domain={[0, 250_000]}
              yTicks={[0, 25_000, 50_000, 100_000, 150_000, 200_000, 250_000]}
              xLabels={labels}
              tooltip={{
                index: 6,
                valueLabel: "$240,8K",
                subLabel: "June 21, 2025",
                deltaText: "+24.6%",
                deltaPositive: true,
              }}
              stroke="#9A46FF"
              fillTop="#9A46FF"
            />
          </KpiCard>

          <div>
            {/* Right top: Page Views */}
            <KpiCard
              title="Total Page Views"
              value="400"
              delta="+24.6%"
              accent="from-[#7C3AED] to-[#9A46FF]"
              className="p-5 border-b border-neutral-700"
              detailsHref="/dashboard/finances/page-views"
            >
              <SmallKpiChart
                data={sparkB}
                domain={[0, 500]}
                yTicks={[0, 100, 250, 500]}
                xLabels={labels}
                stroke="#9A46FF"
                deltaText="+24.6%"
                deltaPositive
              />
            </KpiCard>

            {/* Right bottom: Tickets Sold */}
            <KpiCard
              title="Total Tickets Sold"
              value="400"
              delta="-24.6%"
              accent="from-[#7C3AED] to-[#9A46FF]"
              className="p-5"
              detailsHref="/dashboard/finances/tickets-sold"
            >
              <SmallKpiChart
                data={sparkC}
                domain={[0, 500]}
                yTicks={[0, 100, 250, 500]}
                xLabels={labels}
                stroke="#9A46FF"
                deltaText="-24.6%"
                deltaPositive={false}
              />
            </KpiCard>
          </div>
        </div>

        <RecentSalesTable />
      </section>

      {/* Donuts + Right column lists ------------------------------------ */}
      <section className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* <BreakdownCard
            title="Gender Breakdown"
            segments={genderSegments}
            onDetailedView={() =>
              router.push("/dashboard/finances/gender-breakdown")
            }
          />
          <BreakdownCard
            title="Age Breakdown"
            segments={ageSegments}
            onDetailedView={() =>
              router.push("/dashboard/finances/age-breakdown")
            }
          /> */}
          <UpcomingEventsTable />
        </div>

        <MyTeamTable
          members={DEMO_MY_TEAM}
          onDetailedView={() => {
            console.log("Detailed View clicked");
          }}
        />
      </section>

      <TrackingLinksTable />
    </div>
  );
}
