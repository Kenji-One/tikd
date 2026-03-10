"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
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
import {
  fetchPageViewsAnalytics,
  type PageViewsAnalyticsResponse,
} from "@/lib/api/pageViews";

/* Demo data (MONTHLY totals / points) */
const sparkA = [6, 10, 18, 28, 42, 120, 140, 125, 130, 170, 210, 230].map(
  (v) => v * 1000,
);
const sparkC = [420, 280, 300, 260, 310, 210, 120, 180, 220, 200, 240, 480];

type ExtendedAnalytics = PageViewsAnalyticsResponse & {
  comparisons?: {
    uniqueViewersPct?: number;
    recurringViewersPct?: number;
    conversionRatePct?: number;
    liveViewersPct?: number;
  };
};

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
  while (a.length < count) a.push(a[a.length % vals.length] ?? 0);
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

function bucketStepForRangeDays(rangeDays: number) {
  if (rangeDays <= 31) return 1;
  if (rangeDays <= 62) return 2;
  return 3;
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
    const m = a.toLocaleDateString(undefined, { month: "short" });
    return `${m} ${a.getDate()}–${b.getDate()}`;
  }

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
    const start = dates[i]!;
    const end = dates[Math.min(i + step - 1, dates.length - 1)]!;
    out.push({
      start,
      end,
      label: fmtBucketLabel(start, end),
      repDate: end,
    });
  }
  return out;
}

function sumBucket(values: number[], from: number, to: number) {
  let s = 0;
  for (let i = from; i <= to; i++) s += values[i] ?? 0;
  return s;
}

function normalizeRangeDateForAnalytics(
  input: Date,
  boundary: "start" | "end",
): Date {
  return boundary === "start"
    ? new Date(
        Date.UTC(
          input.getFullYear(),
          input.getMonth(),
          input.getDate(),
          0,
          0,
          0,
          0,
        ),
      )
    : new Date(
        Date.UTC(
          input.getFullYear(),
          input.getMonth(),
          input.getDate(),
          23,
          59,
          59,
          999,
        ),
      );
}

function formatPercentValue(value: number) {
  const safe = Math.abs(Number.isFinite(value) ? value : 0);
  const fixed = safe >= 100 ? Math.round(safe).toString() : safe.toFixed(1);
  return `${fixed}%`;
}

function deltaFromPrevious(current: number, previous: number) {
  const safeCurrent = Number.isFinite(current) ? current : 0;
  const safePrevious = Number.isFinite(previous) ? previous : 0;

  if (safePrevious <= 0) {
    if (safeCurrent <= 0) {
      return {
        text: "0%",
        positive: true,
      };
    }

    return {
      text: "100%",
      positive: true,
    };
  }

  const pct = ((safeCurrent - safePrevious) / safePrevious) * 100;

  return {
    text: formatPercentValue(pct),
    positive: pct >= 0,
  };
}

export default function DashboardClient() {
  const router = useRouter();

  const today = useMemo(() => clampToDay(new Date()), []);
  const currentYear = useMemo(() => today.getFullYear(), [today]);

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

  const analyticsStart = useMemo(
    () => normalizeRangeDateForAnalytics(effectiveStart, "start"),
    [effectiveStart],
  );

  const analyticsEnd = useMemo(
    () => normalizeRangeDateForAnalytics(effectiveEnd, "end"),
    [effectiveEnd],
  );

  const analyticsQuery = useQuery({
    queryKey: [
      "global-page-views-analytics",
      analyticsStart.toISOString(),
      analyticsEnd.toISOString(),
    ],
    queryFn: () =>
      fetchPageViewsAnalytics({
        start: analyticsStart,
        end: analyticsEnd,
      }),
  });

  const analytics = analyticsQuery.data as ExtendedAnalytics | undefined;

  const rangeDays = useMemo(
    () => diffDaysInclusive(effectiveStart, effectiveEnd),
    [effectiveStart, effectiveEnd],
  );

  const monthlyMode = useMemo(() => !hasChosenRange, [hasChosenRange]);

  const dayStep = useMemo(() => {
    if (!hasChosenRange) return 0;
    return bucketStepForRangeDays(rangeDays);
  }, [hasChosenRange, rangeDays]);

  const labels = useMemo(() => {
    const liveSeries = analytics?.series ?? [];
    if (liveSeries.length > 0) {
      return liveSeries.map((item, index, arr) => {
        const d = new Date(item.date);

        if (!hasChosenRange) {
          return d.toLocaleDateString(undefined, { month: "short" });
        }

        if (arr.length <= 7) {
          return d.toLocaleDateString(undefined, { weekday: "short" });
        }

        return index % 3 === 0
          ? d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
          : `${d.getDate()}`;
      });
    }

    if (monthlyMode) return monthLabels(effectiveStart, effectiveEnd);

    const dailyDates = buildDailyDates(effectiveStart, effectiveEnd);

    if (dayStep === 1) return buildDailyLabels(dailyDates);

    return makeBuckets(dailyDates, dayStep).map((b) => b.label);
  }, [
    analytics?.series,
    monthlyMode,
    effectiveStart,
    effectiveEnd,
    dayStep,
    hasChosenRange,
  ]);

  const dates = useMemo(() => {
    const liveSeries = analytics?.series ?? [];
    if (liveSeries.length > 0) {
      return liveSeries.map((item) => new Date(item.date));
    }

    if (monthlyMode) return monthDates(effectiveStart, effectiveEnd);

    const dailyDates = buildDailyDates(effectiveStart, effectiveEnd);

    if (dayStep === 1) return dailyDates;

    return makeBuckets(dailyDates, dayStep).map((b) => b.repDate);
  }, [analytics?.series, monthlyMode, effectiveStart, effectiveEnd, dayStep]);

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
    const liveSeries = analytics?.series.map((item) => item.views);
    if (liveSeries?.length) {
      if (liveSeries.length === labels.length) return liveSeries;
      return mapSeriesToCount(liveSeries, labels.length);
    }

    return new Array(labels.length).fill(0);
  }, [analytics?.series, labels.length]);

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

  const pinnedIndex = useMemo(() => {
    const len = revenueData.length;
    if (len <= 0) return 0;

    if (!hasChosenRange && monthlyMode) {
      return Math.min(Math.max(today.getMonth(), 0), len - 1);
    }

    return len - 1;
  }, [revenueData.length, hasChosenRange, monthlyMode, today]);

  const pageViewsPinnedIndex = useMemo(() => {
    const len = pageViewsData.length;
    if (len <= 0) return 0;
    return len - 1;
  }, [pageViewsData.length]);

  const pageViewsMaxInteractiveIndex = useMemo(() => {
    return Math.max(0, pageViewsData.length - 1);
  }, [pageViewsData.length]);

  const pinnedSubLabel = useMemo(() => {
    const d = dates[pinnedIndex];
    if (!d) return "";

    if (monthlyMode) return fmtMonthYearLong(d);

    return d.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [dates, pinnedIndex, monthlyMode]);

  const pageViewsDelta = useMemo(() => {
    const current = pageViewsData[pageViewsPinnedIndex] ?? 0;
    const previous = pageViewsData[pageViewsPinnedIndex - 1] ?? 0;
    return deltaFromPrevious(current, previous);
  }, [pageViewsData, pageViewsPinnedIndex]);

  const pageViewsComparisonLabel = monthlyMode
    ? "vs previous month."
    : "vs previous day.";

  const pageViewsHeaderDeltaLabel = analytics
    ? `${analytics.totals.liveViewers} live`
    : "0 live";

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-[3.10fr_1.51fr] gap-5">
        <div className="grid grid-cols-[3.15fr_1.74fr] rounded-lg border border-neutral-700 bg-neutral-900 pl-4">
          <KpiCard
            title="Total Revenue"
            value="$240.8K"
            delta="+24.6%"
            accent="from-[#7C3AED] to-[#9333EA]"
            className="pr-6 py-5 pb-4 border-r border-neutral-700"
            stretchChart
            detailsHref="/dashboard/revenue"
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
              tooltipDateMode={monthlyMode ? "monthYear" : "full"}
              stroke="#9A46FF"
              fillTop="#9A46FF"
            />
          </KpiCard>

          <div>
            <KpiCard
              title="Total Page Views"
              value={(analytics?.totals.pageViews ?? 0).toLocaleString()}
              valueIcon={
                <Eye className="h-5 w-5 shrink-0 text-white/90" aria-hidden />
              }
              delta={pageViewsHeaderDeltaLabel}
              accent="from-[#7C3AED] to-[#9A46FF]"
              className="p-5 pb-4 border-b border-neutral-700"
              detailsHref="/dashboard/page-views"
            >
              <SmallKpiChart
                data={pageViewsData}
                dates={dates}
                pinnedIndex={pageViewsPinnedIndex}
                maxInteractiveIndex={pageViewsMaxInteractiveIndex}
                tooltipIcon="eye"
                tooltipDateMode={monthlyMode ? "monthYear" : "full"}
                domain={pvDomain}
                yTicks={pvTicks}
                xLabels={labels}
                stroke="#9A46FF"
                deltaText={pageViewsDelta.text}
                deltaPositive={pageViewsDelta.positive}
                comparisonLabel={pageViewsComparisonLabel}
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
              className="p-5 pb-4"
              detailsHref="/dashboard/tickets-sold"
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
          onDetailedView={() => router.push("/dashboard/my-members")}
        />
      </section>

      <TrackingLinksTable />
    </div>
  );
}
