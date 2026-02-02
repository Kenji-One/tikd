// src/app/dashboard/events/[eventId]/summary/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Eye, Ticket } from "lucide-react";

import { fetchEventById, type EventWithMeta } from "@/lib/api/events";

import KpiCard from "@/components/dashboard/cards/KpiCard";
import RevenueChart from "@/components/dashboard/charts/RevenueChart";
import SmallKpiChart from "@/components/dashboard/charts/SmallKpiChart";
import RecentSalesTable from "@/components/dashboard/tables/RecentSalesTable";
import TrackingLinksTable from "@/components/dashboard/tables/TrackingLinksTable";
import MyTeamTable, {
  DEMO_MY_TEAM,
} from "@/components/dashboard/tables/MyTeamTable";
import BreakdownCard from "@/components/dashboard/cards/BreakdownCard";
import DateRangePicker, {
  type DateRangeValue,
} from "@/components/ui/DateRangePicker";

/* ----------------------------- Date helpers (same logic style as main dashboard) ----------------------------- */
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

/* ----------------------------- Event-metrics + breakdown demo ----------------------------- */
type EventMetrics = {
  ticketsSold: number;
  pageViews: number;
  revenue: number;
};

function deriveEventMetrics(event?: EventWithMeta): EventMetrics {
  // Keep your current (real-ish) metrics logic
  const ticketsSold = event?.attendingCount ?? 0;

  const pageViews =
    ticketsSold > 0 ? Math.max(ticketsSold * 3, ticketsSold + 10) : 0;

  const assumedAvgTicket = 25; // USD demo
  const revenue = ticketsSold * assumedAvgTicket;

  return { ticketsSold, pageViews, revenue };
}

function splitByPercent(total: number, percents: number[]) {
  const safeTotal = Math.max(0, total);
  if (safeTotal === 0) return percents.map(() => 0);

  const raw = percents.map((p) => (safeTotal * p) / 100);
  const floors = raw.map((x) => Math.floor(x));
  let remainder = safeTotal - floors.reduce((a, b) => a + b, 0);

  const fracIdx = raw
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac)
    .map((x) => x.i);

  const out = [...floors];
  let k = 0;
  while (remainder > 0 && fracIdx.length > 0) {
    out[fracIdx[k % fracIdx.length]] += 1;
    remainder -= 1;
    k += 1;
  }
  return out;
}

/** ✅ Deterministic dummy total per event (so it doesn't jump on rerenders) */
function stableDummyTotal(seed: string, min = 8000, max = 48000) {
  let h = 2166136261; // FNV-ish
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const n = Math.abs(h) % (max - min + 1);
  return min + n;
}

export default function EventSummaryPage() {
  const { eventId } = useParams() as { eventId?: string };

  const { data: event } = useQuery<EventWithMeta>({
    queryKey: ["event", eventId],
    queryFn: () => fetchEventById(eventId!),
    enabled: !!eventId,
  });

  const metrics = useMemo(() => deriveEventMetrics(event), [event]);

  /* ---------- Use same dashboard layout + date range picker UX ---------- */
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

  const rangeDays = useMemo(
    () => diffDaysInclusive(effectiveStart, effectiveEnd),
    [effectiveStart, effectiveEnd],
  );

  const dailyMode = useMemo(() => {
    if (!hasChosenRange) return false;
    return rangeDays <= 31;
  }, [hasChosenRange, rangeDays]);

  const labels = useMemo(() => {
    if (!dailyMode) return monthLabels(effectiveStart, effectiveEnd);
    const ds = buildDailyDates(effectiveStart, effectiveEnd);
    return buildDailyLabels(ds);
  }, [dailyMode, effectiveStart, effectiveEnd]);

  const dates = useMemo(() => {
    if (!dailyMode) return monthDates(effectiveStart, effectiveEnd);
    return buildDailyDates(effectiveStart, effectiveEnd);
  }, [dailyMode, effectiveStart, effectiveEnd]);

  const scale = useMemo(() => {
    const t = metrics.ticketsSold;
    if (t <= 0) return 0.15;
    if (t <= 25) return 0.35;
    if (t <= 150) return 0.75;
    return Math.min(2.2, 0.6 + t / 250);
  }, [metrics.ticketsSold]);

  const sparkRevenueMonthly = useMemo(
    () =>
      [6, 10, 18, 28, 42, 120, 140, 125, 130, 170, 210, 230].map((v) =>
        Math.round(v * 1000 * scale),
      ),
    [scale],
  );

  const sparkPageViewsMonthly = useMemo(
    () =>
      [120, 240, 180, 220, 260, 180, 320, 260, 380, 300, 260, 120].map((v) =>
        Math.max(1, Math.round(v * scale)),
      ),
    [scale],
  );

  const sparkTicketsMonthly = useMemo(
    () =>
      [420, 280, 300, 260, 310, 210, 120, 180, 220, 200, 240, 480].map((v) =>
        Math.max(1, Math.round(v * scale)),
      ),
    [scale],
  );

  const revenueData = useMemo(() => {
    if (!dailyMode) return mapSeriesToCount(sparkRevenueMonthly, labels.length);
    return dailyizeFromMonthly(sparkRevenueMonthly, dates);
  }, [dailyMode, labels.length, dates, sparkRevenueMonthly]);

  const pageViewsData = useMemo(() => {
    if (!dailyMode)
      return mapSeriesToCount(sparkPageViewsMonthly, labels.length);
    return dailyizeFromMonthly(sparkPageViewsMonthly, dates).map((v) =>
      Math.round(v),
    );
  }, [dailyMode, labels.length, dates, sparkPageViewsMonthly]);

  const ticketsSoldData = useMemo(() => {
    if (!dailyMode) return mapSeriesToCount(sparkTicketsMonthly, labels.length);
    return dailyizeFromMonthly(sparkTicketsMonthly, dates).map((v) =>
      Math.round(v),
    );
  }, [dailyMode, labels.length, dates, sparkTicketsMonthly]);

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

    if (!hasChosenRange && !dailyMode) {
      return Math.min(Math.max(today.getMonth(), 0), len - 1);
    }

    return len - 1;
  }, [revenueData.length, hasChosenRange, dailyMode, today]);

  const pinnedSubLabel = useMemo(() => {
    const d = dates[pinnedIndex];
    if (!d) return "";
    if (!dailyMode) return fmtMonthYearLong(d);
    return d.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [dates, pinnedIndex, dailyMode]);

  /* ---------- ✅ Dummy demographics: always non-zero (until real analytics exists) ---------- */
  const breakdownTotal = useMemo(() => {
    return stableDummyTotal(eventId ?? "no-event");
  }, [eventId]);

  const genderSegments = useMemo(() => {
    const total = breakdownTotal;
    const [male, female, other] = splitByPercent(total, [66, 23, 11]);
    return [
      { label: "Male", value: male, color: "#3B82F6" }, // Blue
      { label: "Female", value: female, color: "#EC4899" }, // Pink
      { label: "Other", value: other, color: "#9CA3AF" }, // Gray
    ];
  }, [breakdownTotal]);

  const ageSegments = useMemo(() => {
    const total = breakdownTotal;
    const [a, b, c] = splitByPercent(total, [62, 27, 11]);
    return [
      { label: "18–24", value: a, color: "#FF7A45" },
      { label: "25–34", value: b, color: "#FF3B4A" },
      { label: "Other", value: c, color: "#9A46FF" },
    ];
  }, [breakdownTotal]);

  const kpiRevenueValue = useMemo(() => {
    const v = metrics.revenue;
    if (!Number.isFinite(v)) return "$0";
    if (v >= 1000) return `$${(v / 1000).toFixed(1)}K`;
    return `$${v.toFixed(0)}`;
  }, [metrics.revenue]);

  return (
    <div className="space-y-5 px-4 md:px-6 lg:px-8">
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[3.10fr_1.51fr]">
        <div className="grid grid-cols-1 rounded-lg border border-neutral-700 bg-neutral-900 pl-4 lg:grid-cols-[3.15fr_1.74fr]">
          <KpiCard
            title="Total Revenue"
            value={kpiRevenueValue}
            delta="+24.6%"
            accent="from-[#7C3AED] to-[#9333EA]"
            className="border-neutral-700 pr-6 py-5 lg:border-r"
            stretchChart
            detailsHref={`/dashboard/events/${eventId ?? ""}/summary`}
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
                valueLabel: kpiRevenueValue,
                subLabel: pinnedSubLabel,
                deltaText: "+24.6%",
                deltaPositive: true,
              }}
              tooltipDateMode={dailyMode ? "full" : "monthYear"}
              stroke="#9A46FF"
              fillTop="#9A46FF"
            />
          </KpiCard>

          <div>
            <KpiCard
              title="Total Page Views"
              value={metrics.pageViews.toLocaleString()}
              valueIcon={
                <Eye className="h-5 w-5 shrink-0 text-white/90" aria-hidden />
              }
              delta="+24.6%"
              accent="from-[#7C3AED] to-[#9A46FF]"
              className="border-neutral-700 p-5 lg:border-b"
              detailsHref={`/dashboard/events/${eventId ?? ""}/summary`}
            >
              <SmallKpiChart
                data={pageViewsData}
                dates={dates}
                pinnedIndex={pinnedIndex}
                tooltipIcon="eye"
                tooltipDateMode={dailyMode ? "full" : "monthYear"}
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
              value={metrics.ticketsSold.toLocaleString()}
              valueIcon={
                <Ticket
                  className="h-5 w-5 shrink-0 text-white/90"
                  aria-hidden
                />
              }
              delta="-24.6%"
              accent="from-[#7C3AED] to-[#9A46FF]"
              className="p-5"
              detailsHref={`/dashboard/events/${eventId ?? ""}/summary`}
            >
              <SmallKpiChart
                data={ticketsSoldData}
                dates={dates}
                pinnedIndex={pinnedIndex}
                tooltipIcon="ticket"
                tooltipDateMode={dailyMode ? "full" : "monthYear"}
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

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[3.10fr_1.51fr]">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <BreakdownCard
            title="Gender Breakdown"
            segments={genderSegments}
            donutProps={{ height: 180, thickness: 22 }}
            onDetailedView={() => {
              console.log("Gender breakdown detailed view");
            }}
          />

          <BreakdownCard
            title="Age Breakdown"
            segments={ageSegments}
            donutProps={{ height: 180, thickness: 22 }}
            onDetailedView={() => {
              console.log("Age breakdown detailed view");
            }}
          />
        </div>

        <MyTeamTable
          members={DEMO_MY_TEAM}
          onDetailedView={() => {
            console.log("Team detailed view clicked");
          }}
        />
      </section>

      {/* ✅ Scoped to this event */}
      <TrackingLinksTable scope="event" eventId={eventId} showViewAll />
    </div>
  );
}
