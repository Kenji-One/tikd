/* ------------------------------------------------------------------ */
/*  /dashboard/finances – Revenue Detailed View                       */
/*  Reuses the same <RevenueChart /> for Total / Recent / Activity    */
/* ------------------------------------------------------------------ */
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Calendar as CalendarIcon,
  ChevronDown,
} from "lucide-react";
import clsx from "clsx";

import SmallKpiChart from "@/components/dashboard/charts/SmallKpiChart";
import RevenueChart from "@/components/dashboard/charts/RevenueChart";
import BarsWeek from "@/components/dashboard/charts/BarsWeek";
import DonutFull, {
  type DonutSegment,
} from "@/components/dashboard/charts/DonutFull";
import MiniMetricCard from "@/components/dashboard/cards/MiniMetricCard";

/* ----------------------------- Demo data ----------------------------- */
const kpiA = [60, 120, 90, 160, 180, 130, 200, 230, 180, 220, 260, 300];
const kpiB = [420, 280, 300, 260, 310, 210, 120, 180, 220, 200, 240, 480];
const kpiC = [120, 240, 180, 220, 260, 180, 320, 260, 380, 300, 260, 120];
const kpiD = [80, 100, 160, 220, 260, 200, 220, 240, 210, 230, 250, 260];

const totalRevenueSeries = [
  6, 10, 18, 28, 42, 120, 140, 125, 130, 170, 210, 230,
].map((v) => v * 1000);
const recentRevenueSeries = [
  6, 10, 18, 28, 42, 120, 140, 132, 129, 160, 190, 240,
].map((v) => v * 1000);

const PEAK_BARS = [22_000, 120_000, 65_000, 42_000, 220_000, 98_000, 55_000];

const REVENUE_SOURCE: DonutSegment[] = [
  { value: 150, label: "Spent", color: "#F97316" },
  { value: 96, label: "Opened", color: "#EF4444" },
  { value: 56, label: "Spam", color: "#7C3AED" },
  { value: 10, label: "Deleted", color: "#22C55E" },
];

const TOP_LOCATIONS: DonutSegment[] = [
  { value: 20, label: "Applications", color: "#F97316" },
  { value: 9, label: "Photos", color: "#EF4444" },
  { value: 16, label: "iCloud", color: "#7C3AED" },
  { value: 20, label: "Podcasts", color: "#22C55E" },
  { value: 8, label: "iOS", color: "#60A5FA" },
  { value: 13, label: "System Data", color: "#000000" },
  { value: 14, label: "Free Storage", color: "#FFFFFF" },
];

/* --------------------------- Date helpers ---------------------------- */
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
const monthLabels = (s: Date, e: Date) => {
  const a: string[] = [];
  const d = new Date(s);
  d.setDate(1);
  while (d <= e) {
    a.push(d.toLocaleDateString(undefined, { month: "short" }));
    d.setMonth(d.getMonth() + 1);
  }
  return a;
};
const monthDates = (s: Date, e: Date) => {
  const out: Date[] = [];
  const d = new Date(s);
  d.setDate(21);
  while (d <= e) {
    out.push(new Date(d));
    d.setMonth(d.getMonth() + 1);
  }
  return out;
};

/* Activity (hourly) using the same chart */
const ACTIVITY_VALUES = [
  40, 50, 65, 80, 100, 130, 180, 260, 340, 360, 330, 410, 520,
];
const ACTIVITY_LABELS = Array.from(
  { length: 13 },
  (_, i) => (i * 2).toString().padStart(2, "0") + ":00"
);

export default function FinancesRevenuePage() {
  const [range, setRange] = useState<Range>(RANGES[1]);
  const [menuOpen, setMenuOpen] = useState(false);

  const labels = useMemo(() => monthLabels(range.start, range.end), [range]);
  const dates = useMemo(() => monthDates(range.start, range.end), [range]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#121220] px-3 py-1.5 text-sm text-white/80 hover:bg-white/10"
        >
          <ChevronLeft size={16} /> Back
        </Link>
        <h1 className="text-lg font-extrabold tracking-tight uppercase text-white">
          Revenue Detailed View
        </h1>
      </div>

      {/* 4 KPIs */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MiniMetricCard
          title="Avg Revenue Per Customer"
          value="400"
          delta="+24.6%"
          chart={
            <SmallKpiChart
              data={kpiA}
              domain={[0, 500]}
              yTicks={[0, 100, 250, 500]}
              xLabels={["12AM", "8AM", "4PM", "11PM"]}
              stroke="#9A46FF"
            />
          }
        />
        <MiniMetricCard
          title="Avg Revenue Per Event"
          value="$150,000"
          delta="-24.6%"
          negative
          chart={
            <SmallKpiChart
              data={kpiB}
              domain={[0, 500]}
              yTicks={[0, 100, 250, 500]}
              xLabels={["12AM", "8AM", "4PM", "11PM"]}
              stroke="#9A46FF"
            />
          }
        />
        <MiniMetricCard
          title="Highest Earning Event"
          value="Poster Boy"
          delta="-24.6%"
          negative
          chart={
            <SmallKpiChart
              data={kpiC}
              domain={[0, 500]}
              yTicks={[0, 100, 250, 500]}
              xLabels={["12AM", "8AM", "4PM", "11PM"]}
              stroke="#9A46FF"
            />
          }
        />
        <MiniMetricCard
          title="Highest Earning Month"
          value="April"
          delta="-24.6%"
          negative
          chart={
            <SmallKpiChart
              data={kpiD}
              domain={[0, 500]}
              yTicks={[0, 100, 250, 500]}
              xLabels={["12AM", "8AM", "4PM", "11PM"]}
              stroke="#9A46FF"
            />
          }
        />
      </section>

      {/* Total Revenue + Donut */}
      <section className="grid grid-cols-12 gap-5">
        <div className="col-span-12 xl:col-span-8 rounded-lg border border-neutral-700 bg-neutral-900 pl-4">
          <div className="flex items-start justify-between pr-6 pt-5">
            <div>
              <div className="text-xs text-white/60">TOTAL REVENUE</div>
              <div className="mt-1 text-3xl font-extrabold">$240,8K</div>
            </div>

            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#1A1C29] px-3 py-2 text-xs text-white/80 hover:border-violet-500/40"
              >
                <CalendarIcon size={14} className="opacity-80" />
                {range.label}
                <ChevronDown size={14} className="opacity-70" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 z-10 mt-2 w-56 rounded-lg border border-white/10 bg-[#1A1C29] p-1 text-xs text-white/80 shadow-lg">
                  {RANGES.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setRange(r);
                        setMenuOpen(false);
                      }}
                      className={clsx(
                        "w-full rounded-md px-3 py-2 text-left hover:bg-white/5",
                        r.id === range.id && "bg-white/10"
                      )}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="pr-6 pb-5 h-[320px] sm:h-[340px] lg:h-[360px]">
            <RevenueChart
              data={totalRevenueSeries}
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
              tooltipVariant="primary" // purple body like the mock
            />
          </div>
        </div>

        <div className="col-span-12 xl:col-span-4 rounded-lg border border-neutral-700 bg-neutral-900 p-5">
          <div className="text-xs text-white/60">REVENUE SOURCE</div>
          <div className="mt-1 text-lg font-extrabold">SEPTEMBER 2025</div>

          <DonutFull
            segments={REVENUE_SOURCE}
            height={260}
            thickness={28}
            padAngle={4}
            minSliceAngle={6}
            trackColor="rgba(255,255,255,0.10)"
            showSliceBadges
          />

          <ul className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
            {REVENUE_SOURCE.map((s) => (
              <li
                key={s.label}
                className="flex items-center gap-2 text-white/80"
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="mr-auto">{s.label}</span>
                <span className="text-white/60">{s.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Recent Revenue + Peak Days */}
      <section className="grid grid-cols-12 gap-5">
        <div className="col-span-12 xl:col-span-8 rounded-lg border border-neutral-700 bg-neutral-900 pl-4">
          <div className="flex items-start justify-between pr-6 pt-5">
            <div>
              <div className="text-xs text-white/60">RECENT REVENUE</div>
              <div className="mt-1 text-3xl font-extrabold">$240,8K</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#1A1C29] px-3 py-2 text-xs text-white/70">
              Jan 2024 – Dec 2024
            </div>
          </div>

          <div className="pr-6 pb-5 h-[320px] sm:h-[340px] lg:h-[360px]">
            {/* EXACT: white gradient 40% -> 0% and white line */}
            <RevenueChart
              data={recentRevenueSeries}
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
              stroke="#FFFFFF"
              fillTop="#FFFFFF"
              fillStartOpacity={0.4}
              fillEndOpacity={0}
              tooltipVariant="light" // white body like the mock
            />
          </div>
        </div>

        <div className="col-span-12 xl:col-span-4 rounded-lg border border-neutral-700 bg-neutral-900 p-5">
          <div className="text-xs text-white/60">PEAK DAYS</div>
          <div className="mt-1 text-lg font-extrabold">SEPTEMBER 2025</div>
          <div className="mt-4 h-[260px]">
            <BarsWeek data={PEAK_BARS} highlightIndex={4} />
          </div>
        </div>
      </section>

      {/* Map + Top locations donut */}
      <section className="grid grid-cols-12 gap-5">
        <div className="col-span-12 xl:col-span-8 rounded-lg border border-neutral-700 bg-neutral-900 p-5">
          <div className="text-xs text-white/60">TOP REVENUE LOCATIONS</div>
          <div className="mt-3 aspect-[16/9] overflow-hidden rounded-lg border border-neutral-700">
            <iframe
              title="Revenue Locations Map"
              className="h-full w-full"
              src="https://www.openstreetmap.org/export/embed.html?bbox=-140.0,5.0,-45.0,70.0&layer=mapnik"
            />
          </div>
        </div>

        <div className="col-span-12 xl:col-span-4 rounded-lg border border-neutral-700 bg-neutral-900 p-5">
          <div className="text-xs text-white/60">TOP REVENUE LOCATIONS</div>
          <div className="mt-1 text-lg font-extrabold">SEPTEMBER 2025</div>

          <DonutFull
            segments={TOP_LOCATIONS}
            height={260}
            thickness={28}
            padAngle={4}
            minSliceAngle={6}
            trackColor="rgba(255,255,255,0.10)"
            showSliceBadges
          />

          <ul className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
            {TOP_LOCATIONS.map((s) => (
              <li
                key={s.label}
                className="flex items-center gap-2 text-white/80"
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: s.color,
                    border:
                      s.color === "#FFFFFF" ? "1px solid #D1D5DB" : undefined,
                  }}
                />
                <span className="mr-auto">{s.label}</span>
                <span className="text-white/60">{s.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Activity – reusing RevenueChart */}
      <section className="rounded-lg border border-neutral-700 bg-neutral-900 p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs text-white/60">ACTIVITY</div>
          <div className="rounded-lg border border-white/10 bg-[#1A1C29] px-3 py-2 text-xs text-white/70">
            Day
          </div>
        </div>
        <div className="mt-3 h-[260px]">
          <RevenueChart
            data={ACTIVITY_VALUES}
            xLabels={ACTIVITY_LABELS}
            domain={[0, 600]}
            yTicks={[0, 100, 200, 300, 400, 500, 600]}
            stroke="#45FF79"
            fillTop="#45FF79"
            valuePrefix=""
            valueSuffix=""
            showDateInTooltip={false}
            tooltipVariant="dark" // neutral/dark tooltip for activity
          />
        </div>
      </section>
    </div>
  );
}
