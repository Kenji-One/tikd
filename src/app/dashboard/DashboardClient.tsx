/* ------------------------------------------------------------------ */
/*  src/app/dashboard/DashboardClient.tsx                              */
/* ------------------------------------------------------------------ */
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Ticket } from "lucide-react";

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

/* Demo data (MONTHLY totals / points) */
const sparkA = [6, 10, 18, 28, 42, 120, 140, 125, 130, 170, 210, 230].map(
  (v) => v * 1000,
);
const sparkB = [120, 240, 180, 220, 260, 180, 320, 260, 380, 300, 260, 120];
const sparkC = [420, 280, 300, 260, 310, 210, 120, 180, 220, 200, 240, 480];

function clampToDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysInMonth(year: number, month0: number) {
  return new Date(year, month0 + 1, 0).getDate();
}

function addDays(d: Date, delta: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + delta);
  return x;
}

function diffDaysInclusive(a: Date, b: Date) {
  const A = clampToDay(a).getTime();
  const B = clampToDay(b).getTime();
  const ms = Math.abs(B - A);
  return Math.floor(ms / (24 * 60 * 60 * 1000)) + 1;
}

function dateIsSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function monthLabels(start: Date, end: Date) {
  const labels: string[] = [];
  const d = new Date(start);
  d.setDate(1);
  while (d <= end) {
    labels.push(d.toLocaleDateString(undefined, { month: "short" }));
    d.setMonth(d.getMonth() + 1);
  }
  return labels;
}

function monthDates(start: Date, end: Date) {
  const out: Date[] = [];
  const d = new Date(start);
  // keep a stable mid-month day for “monthly points”
  d.setDate(21);
  while (d <= end) {
    out.push(new Date(d));
    d.setMonth(d.getMonth() + 1);
  }
  return out;
}

function mapSeriesToCount(vals: number[], count: number) {
  if (count === vals.length) return vals;
  const a = [...vals];
  while (a.length < count) a.push(a[a.length % vals.length]);
  return a.slice(0, count);
}

function buildDailyDates(start: Date, end: Date) {
  const out: Date[] = [];
  const s = clampToDay(start);
  const e = clampToDay(end);
  const forward = s.getTime() <= e.getTime();
  const a = forward ? s : e;
  const b = forward ? e : s;

  let cur = a;
  while (cur <= b) {
    out.push(new Date(cur));
    cur = addDays(cur, 1);
  }
  return forward ? out : out.reverse();
}

function buildDailyLabels(dates: Date[]) {
  const n = dates.length;
  const first = dates[0];
  const last = dates[dates.length - 1];
  const sameMonth = first && last ? dateIsSameMonth(first, last) : false;

  if (n <= 7) {
    return dates.map((d) =>
      d.toLocaleDateString(undefined, { weekday: "short" }),
    );
  }

  if (sameMonth) {
    return dates.map((d) => `${d.getDate()}`);
  }

  return dates.map((d) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  );
}

/**
 * Turn MONTHLY demo series into DAILY values for the selected range.
 */
function dailyizeFromMonthly(monthly: number[], dates: Date[]) {
  return dates.map((d, i) => {
    const m = d.getMonth();
    const y = d.getFullYear();
    const dim = daysInMonth(y, m) || 30;

    const monthTotal = monthly[m % monthly.length] ?? monthly[0] ?? 0;
    const base = monthTotal / dim;

    const wiggle =
      1 +
      0.22 * Math.sin(i * 0.85) +
      0.1 * Math.cos(i * 0.33) +
      0.06 * Math.sin(i * 0.17);

    return Math.max(0, base * wiggle);
  });
}

function niceTicks(maxValue: number, targetCount = 6) {
  const max = Math.max(1, maxValue);
  const pow = Math.pow(10, Math.floor(Math.log10(max)));
  const norm = max / pow;

  let stepNorm = 1;
  if (norm <= 1.2) stepNorm = 0.2;
  else if (norm <= 2.5) stepNorm = 0.5;
  else if (norm <= 6) stepNorm = 1;
  else stepNorm = 2;

  const step = stepNorm * pow;
  const top = Math.ceil(max / step) * step;

  const ticks: number[] = [];
  const count = Math.max(2, Math.min(8, targetCount));
  const actualStep = top / (count - 1);

  for (let i = 0; i < count; i++) ticks.push(Math.round(i * actualStep));

  ticks[0] = 0;
  ticks[ticks.length - 1] = top;

  const uniq: number[] = [];
  for (const t of ticks) {
    if (uniq.length === 0 || uniq[uniq.length - 1] !== t) uniq.push(t);
  }
  return uniq;
}

function fmtMonthYearLong(d: Date) {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/* --------------------------- NEW: Bucketing --------------------------- */
/**
 * Client requirement:
 * - If selected range > 31 days, do NOT jump to months.
 * - Group every 2–3 days into one point.
 *
 * We keep monthly ONLY for "no filter applied" (current year view).
 */
function bucketStepForRangeDays(rangeDays: number) {
  if (rangeDays <= 31) return 1; // 1 point per day
  if (rangeDays <= 62) return 2; // group 2 days
  return 3; // group 3 days
}

function fmtBucketLabel(a: Date, b: Date) {
  const sameDay =
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay) {
    return a.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  const sameMonthYear =
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

  if (sameMonthYear) {
    // Jan 1–3
    const m = a.toLocaleDateString(undefined, { month: "short" });
    return `${m} ${a.getDate()}–${b.getDate()}`;
  }

  // Jan 30 – Feb 2
  const left = a.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const right = b.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  return `${left}–${right}`;
}

type Bucket = { start: Date; end: Date; label: string; repDate: Date };

function makeBuckets(dates: Date[], step: number): Bucket[] {
  if (step <= 1) {
    return dates.map((d) => ({
      start: d,
      end: d,
      label: d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      repDate: d,
    }));
  }

  const out: Bucket[] = [];
  for (let i = 0; i < dates.length; i += step) {
    const start = dates[i];
    const end = dates[Math.min(i + step - 1, dates.length - 1)];
    out.push({
      start,
      end,
      label: fmtBucketLabel(start, end),
      repDate: end, // pin/hover uses the bucket end (common analytics behavior)
    });
  }
  return out;
}

function sumBucket(values: number[], from: number, to: number) {
  let s = 0;
  for (let i = from; i <= to; i++) s += values[i] ?? 0;
  return s;
}

export default function DashboardClient() {
  const router = useRouter();

  const today = useMemo(() => clampToDay(new Date()), []);
  const currentYear = useMemo(() => today.getFullYear(), [today]);

  // ✅ “No filter applied” should represent the CURRENT YEAR (so tooltip shows 2026 now)
  const ALL_TIME_START = useMemo(
    () => new Date(currentYear, 0, 1),
    [currentYear],
  );
  const ALL_TIME_END = useMemo(
    () => new Date(currentYear, 11, 31),
    [currentYear],
  );

  const [dateRange, setDateRange] = useState<DateRangeValue>({
    start: null,
    end: null,
  });

  const hasChosenRange = !!dateRange.start && !!dateRange.end;

  const effectiveStart = useMemo(
    () => (hasChosenRange ? (dateRange.start as Date) : ALL_TIME_START),
    [hasChosenRange, dateRange.start, ALL_TIME_START],
  );

  const effectiveEnd = useMemo(
    () => (hasChosenRange ? (dateRange.end as Date) : ALL_TIME_END),
    [hasChosenRange, dateRange.end, ALL_TIME_END],
  );

  const rangeDays = useMemo(
    () => diffDaysInclusive(effectiveStart, effectiveEnd),
    [effectiveStart, effectiveEnd],
  );

  // Monthly is ONLY for "no filter applied".
  const monthlyMode = useMemo(() => !hasChosenRange, [hasChosenRange]);

  // When user selects range: bucket days into 1 / 2 / 3 day points.
  const dayStep = useMemo(() => {
    if (!hasChosenRange) return 0;
    return bucketStepForRangeDays(rangeDays);
  }, [hasChosenRange, rangeDays]);

  const labels = useMemo(() => {
    if (monthlyMode) return monthLabels(effectiveStart, effectiveEnd);

    const dailyDates = buildDailyDates(effectiveStart, effectiveEnd);

    // step=1 → keep the existing “daily label” logic (weekday / day / month-day)
    if (dayStep === 1) return buildDailyLabels(dailyDates);

    // step=2/3 → show ranges like “Jan 1–3”
    return makeBuckets(dailyDates, dayStep).map((b) => b.label);
  }, [monthlyMode, effectiveStart, effectiveEnd, dayStep]);

  const dates = useMemo(() => {
    if (monthlyMode) return monthDates(effectiveStart, effectiveEnd);

    const dailyDates = buildDailyDates(effectiveStart, effectiveEnd);

    if (dayStep === 1) return dailyDates;

    // representative date per bucket (end-of-bucket)
    return makeBuckets(dailyDates, dayStep).map((b) => b.repDate);
  }, [monthlyMode, effectiveStart, effectiveEnd, dayStep]);

  const revenueData = useMemo(() => {
    if (monthlyMode) return mapSeriesToCount(sparkA, labels.length);

    const dailyDates = buildDailyDates(effectiveStart, effectiveEnd);
    const dailyValues = dailyizeFromMonthly(sparkA, dailyDates);

    if (dayStep === 1) return dailyValues;

    const buckets = makeBuckets(dailyDates, dayStep);
    return buckets.map((b) => {
      const from = dailyDates.findIndex(
        (d) => d.getTime() === b.start.getTime(),
      );
      const to = dailyDates.findIndex((d) => d.getTime() === b.end.getTime());
      return sumBucket(dailyValues, from, to);
    });
  }, [monthlyMode, labels.length, effectiveStart, effectiveEnd, dayStep]);

  const pageViewsData = useMemo(() => {
    if (monthlyMode) return mapSeriesToCount(sparkB, labels.length);

    const dailyDates = buildDailyDates(effectiveStart, effectiveEnd);
    const dailyValues = dailyizeFromMonthly(sparkB, dailyDates).map((v) =>
      Math.round(v),
    );

    if (dayStep === 1) return dailyValues;

    const buckets = makeBuckets(dailyDates, dayStep);
    return buckets.map((b) => {
      const from = dailyDates.findIndex(
        (d) => d.getTime() === b.start.getTime(),
      );
      const to = dailyDates.findIndex((d) => d.getTime() === b.end.getTime());
      return Math.round(sumBucket(dailyValues, from, to));
    });
  }, [monthlyMode, labels.length, effectiveStart, effectiveEnd, dayStep]);

  const ticketsSoldData = useMemo(() => {
    if (monthlyMode) return mapSeriesToCount(sparkC, labels.length);

    const dailyDates = buildDailyDates(effectiveStart, effectiveEnd);
    const dailyValues = dailyizeFromMonthly(sparkC, dailyDates).map((v) =>
      Math.round(v),
    );

    if (dayStep === 1) return dailyValues;

    const buckets = makeBuckets(dailyDates, dayStep);
    return buckets.map((b) => {
      const from = dailyDates.findIndex(
        (d) => d.getTime() === b.start.getTime(),
      );
      const to = dailyDates.findIndex((d) => d.getTime() === b.end.getTime());
      return Math.round(sumBucket(dailyValues, from, to));
    });
  }, [monthlyMode, labels.length, effectiveStart, effectiveEnd, dayStep]);

  const revenueMax = useMemo(() => Math.max(0, ...revenueData), [revenueData]);
  const revenueDomain = useMemo<[number, number]>(
    () => [0, Math.max(1, revenueMax)],
    [revenueMax],
  );
  const revenueTicks = useMemo(
    () => niceTicks(revenueDomain[1], 6),
    [revenueDomain],
  );

  const pvMax = useMemo(() => Math.max(0, ...pageViewsData), [pageViewsData]);
  const pvDomain = useMemo<[number, number]>(
    () => [0, Math.max(1, pvMax)],
    [pvMax],
  );
  const pvTicks = useMemo(() => niceTicks(pvDomain[1], 4), [pvDomain]);

  const tsMax = useMemo(
    () => Math.max(0, ...ticketsSoldData),
    [ticketsSoldData],
  );
  const tsDomain = useMemo<[number, number]>(
    () => [0, Math.max(1, tsMax)],
    [tsMax],
  );
  const tsTicks = useMemo(() => niceTicks(tsDomain[1], 4), [tsDomain]);

  // ✅ Pin the “active” dot to:
  // - current month if NO date filter (monthly mode)
  // - otherwise the last point in the selected range (daily or bucketed)
  const pinnedIndex = useMemo(() => {
    const len = revenueData.length;
    if (len <= 0) return 0;

    if (!hasChosenRange && monthlyMode) {
      return Math.min(Math.max(today.getMonth(), 0), len - 1);
    }

    return len - 1;
  }, [revenueData.length, hasChosenRange, monthlyMode, today]);

  const pinnedSubLabel = useMemo(() => {
    const d = dates[pinnedIndex];
    if (!d) return "";

    // monthly => Month Year (no day)
    if (monthlyMode) return fmtMonthYearLong(d);

    // selected range => keep full date on pin (bucketed uses end-of-bucket date)
    return d.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [dates, pinnedIndex, monthlyMode]);

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-[3.10fr_1.51fr] gap-5">
        <div className="grid grid-cols-[3.15fr_1.74fr] rounded-lg border border-neutral-700 bg-neutral-900 pl-4">
          <KpiCard
            title="Total Revenue"
            value="$240.8K"
            delta="+24.6%"
            accent="from-[#7C3AED] to-[#9333EA]"
            className="pr-6 py-5 border-r border-neutral-700"
            stretchChart
            detailsHref="/dashboard/finances/revenue"
            toolbar={
              <div className="max-w-[210px]">
                <DateRangePicker value={dateRange} onChange={setDateRange} />
              </div>
            }
          >
            <RevenueChart
              data={revenueData}
              dates={dates}
              domain={revenueDomain}
              yTicks={revenueTicks}
              xLabels={labels}
              tooltip={{
                index: pinnedIndex,
                valueLabel: "$240.8K",
                subLabel: pinnedSubLabel,
                deltaText: "+24.6%",
                deltaPositive: true,
              }}
              // ✅ monthly hover should show Month Year (no day)
              tooltipDateMode={monthlyMode ? "monthYear" : "full"}
              stroke="#9A46FF"
              fillTop="#9A46FF"
            />
          </KpiCard>

          <div>
            <KpiCard
              title="Total Page Views"
              value="400"
              valueIcon={
                <Eye className="h-5 w-5 shrink-0 text-white/90" aria-hidden />
              }
              delta="+24.6%"
              accent="from-[#7C3AED] to-[#9A46FF]"
              className="p-5 border-b border-neutral-700"
              detailsHref="/dashboard/finances/page-views"
            >
              <SmallKpiChart
                data={pageViewsData}
                dates={dates}
                pinnedIndex={pinnedIndex}
                tooltipIcon="eye"
                tooltipDateMode={monthlyMode ? "monthYear" : "full"}
                domain={pvDomain}
                yTicks={pvTicks}
                xLabels={labels}
                stroke="#9A46FF"
                deltaText="+24.6%"
                deltaPositive
              />
            </KpiCard>

            <KpiCard
              title="Total Tickets Sold"
              value="400"
              valueIcon={
                <Ticket
                  className="h-5 w-5 shrink-0 text-white/90"
                  aria-hidden
                />
              }
              delta="-24.6%"
              accent="from-[#7C3AED] to-[#9A46FF]"
              className="p-5"
              detailsHref="/dashboard/finances/tickets-sold"
            >
              <SmallKpiChart
                data={ticketsSoldData}
                dates={dates}
                pinnedIndex={pinnedIndex}
                tooltipIcon="ticket"
                tooltipDateMode={monthlyMode ? "monthYear" : "full"}
                domain={tsDomain}
                yTicks={tsTicks}
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

      <section className="grid gap-5 grid-cols-[3.10fr_1.51fr]">
        <UpcomingEventsTable />

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
