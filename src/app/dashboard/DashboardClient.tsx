/* ------------------------------------------------------------------ */
/*  src/app/dashboard/DashboardClient.tsx                              */
/* ------------------------------------------------------------------ */
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import clsx from "clsx";

import KpiCard from "@/components/dashboard/cards/KpiCard";
import RevenueChart from "@/components/dashboard/charts/RevenueChart";
import SmallKpiChart from "@/components/dashboard/charts/SmallKpiChart";
import UpcomingEventsTable from "@/components/dashboard/tables/UpcomingEventsTable";
import TrackingLinksTable from "@/components/dashboard/tables/TrackingLinksTable";
import MyTeamTable, {
  DEMO_MY_TEAM,
} from "@/components/dashboard/tables/MyTeamTable";
import RecentSalesTable from "@/components/dashboard/tables/RecentSalesTable";
import BreakdownCard from "@/components/dashboard/cards/BreakdownCard";

/* Demo data */
const sparkA = [6, 10, 18, 28, 42, 120, 140, 125, 130, 170, 210, 230].map(
  (v) => v * 1000
);
const sparkB = [120, 240, 180, 220, 260, 180, 320, 260, 380, 300, 260, 120];
const sparkC = [420, 280, 300, 260, 310, 210, 120, 180, 220, 200, 240, 480];
const genderSegments = [
  { value: 8283, label: "Male", color: "#2F45C5" },
  { value: 3238, label: "Female", color: "#FF7577" },
  { value: 2162, label: "Other", color: "#C2C2D1" },
];

const ageSegments = [
  { value: 7643, label: "0–18", color: "#9A46FF" },
  { value: 9823, label: "18–28", color: "#FF7B45" },
  { value: 5817, label: "28–50+", color: "#45FF79" },
];

/* ------------------------ Date helpers ------------------------ */
type Range = { id: string; label: string; start: Date; end: Date };

const makeRange = (label: string, y: number): Range => ({
  id: `y-${y}`,
  label,
  start: new Date(y, 0, 1),
  end: new Date(y, 11, 31),
});

const RANGES: Range[] = [
  makeRange("Jan 2024 – Dec 2024", 2024),
  makeRange("Jan 2025 – Dec 2025", 2025),
];

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
  const [range, setRange] = useState<Range>(RANGES[0]);
  const [menuOpen, setMenuOpen] = useState(false);

  const labels = useMemo(() => monthLabels(range.start, range.end), [range]);
  const dates = useMemo(() => monthDates(range.start, range.end), [range]);

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
              <div className="relative max-w-[185px]">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-neutral-700 px-3 py-2 text-xs text-white/80 hover:text-white hover:border-primary-500 cursor-pointer focus:outline-none"
                >
                  <CalendarIcon size={14} className="opacity-80" />
                  {range.label}
                  <ChevronDown size={14} className="opacity-70" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 z-10 mt-2 w-full rounded-lg border border-white/10 bg-[#121420] p-1 text-xs text-white/80">
                    {RANGES.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          setRange(r);
                          setMenuOpen(false);
                        }}
                        className={clsx(
                          "w-full rounded-md px-3 py-2 text-left hover:bg-white/5",
                          r.id === range.id ? "bg-white/10" : ""
                        )}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                )}
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
                xLabels={["12AM", "8AM", "4PM", "11PM"]}
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
                xLabels={["12AM", "8AM", "4PM", "11PM"]}
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
        <div className="grid gap-5 md:grid-cols-2 lg:col-span-2">
          <BreakdownCard
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
          />
        </div>

        <MyTeamTable
          members={DEMO_MY_TEAM}
          onDetailedView={() => {
            console.log("Detailed View clicked");
          }}
        />
      </section>

      <UpcomingEventsTable />
      <TrackingLinksTable />
    </div>
  );
}
