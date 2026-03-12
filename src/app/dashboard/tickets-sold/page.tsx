"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Ticket, UserRound, CalendarArrowUp, MapPin } from "lucide-react";

import DetailedViewShell from "@/components/dashboard/finances/DetailedViewShell";
import type { DonutSegment } from "@/components/dashboard/charts/DonutFull";
import type { DateRangeValue } from "@/components/ui/DateRangePicker";
import {
  fetchTicketsSoldAnalytics,
  type TicketsSoldAnalyticsResponse,
} from "@/lib/api/ticketsSold";

type ExtendedAnalytics = TicketsSoldAnalyticsResponse;

function clampToDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
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

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatTooltipDate(input: string) {
  const d = new Date(input);
  return d.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function buildXAxisLabels(data?: ExtendedAnalytics) {
  if (!data?.series?.length) return ["Jan"];

  const isDaily = data.range.granularity === "day";

  return data.series.map((item, index, arr) => {
    const d = new Date(item.date);

    if (!isDaily) {
      return d.toLocaleDateString(undefined, { month: "short" });
    }

    const total = arr.length;
    if (total <= 7) {
      return d.toLocaleDateString(undefined, { weekday: "short" });
    }

    return index % 3 === 0
      ? d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
      : `${d.getDate()}`;
  });
}

function formatDeltaPct(value?: number, suffix = "vs prev day") {
  const safe = Number.isFinite(value) ? Number(value) : 0;
  const rounded = Math.round(safe * 10) / 10;
  return `${rounded >= 0 ? "+" : ""}${rounded}% ${suffix}`;
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

function buildIntradayXAxisLabels(points: ExtendedAnalytics["intraday"]) {
  if (!points.length) return ["12AM"];

  const majorHours = new Set([0, 4, 8, 12, 16, 20, 23]);

  return points.map((point) => {
    const hour = Number(point.bucket);
    return majorHours.has(hour) ? point.label : "";
  });
}

function buildMiniCards(analytics?: ExtendedAnalytics) {
  const intraday = analytics?.intraday ?? [];
  const intradayDates = intraday.map((item) => new Date(item.date));
  const intradayXAxis = buildIntradayXAxisLabels(intraday);
  const pinnedIndex = Math.max(0, intraday.length - 1);

  const uniqueSeries = intraday.map((item) => item.uniqueCustomers);
  const recurringSeries = intraday.map((item) => item.recurringCustomers);
  const conversionSeries = intraday.map((item) => item.conversionRate);
  const avgSeries = intraday.map((item) => item.avgTicketsPerOrder);

  return [
    {
      title: "Unique Customers",
      value: String(
        analytics?.today?.uniqueCustomers ??
          analytics?.totals.uniqueCustomers ??
          0,
      ),
      delta: formatDeltaPct(analytics?.comparisons?.uniqueCustomersPct),
      series: uniqueSeries.length ? uniqueSeries : [0],
      xLabels: uniqueSeries.length ? intradayXAxis : ["12AM"],
      dates: intradayDates.length ? intradayDates : [new Date()],
      pinnedIndex,
      icon: <UserRound className="h-4.5 w-4.5" aria-hidden />,
    },
    {
      title: "Reoccurring Customers",
      value: String(
        analytics?.today?.recurringCustomers ??
          analytics?.totals.recurringCustomers ??
          0,
      ),
      delta: formatDeltaPct(analytics?.comparisons?.recurringCustomersPct),
      series: recurringSeries.length ? recurringSeries : [0],
      xLabels: recurringSeries.length ? intradayXAxis : ["12AM"],
      dates: intradayDates.length ? intradayDates : [new Date()],
      pinnedIndex,
      icon: <MapPin className="h-4.5 w-4.5" aria-hidden />,
    },
    {
      title: "Conversion Rate",
      value: `${analytics?.today?.conversionRate ?? analytics?.totals.conversionRate ?? 0}%`,
      delta: formatDeltaPct(analytics?.comparisons?.conversionRatePct),
      series: conversionSeries.length ? conversionSeries : [0],
      xLabels: conversionSeries.length ? intradayXAxis : ["12AM"],
      dates: intradayDates.length ? intradayDates : [new Date()],
      pinnedIndex,
      icon: <CalendarArrowUp className="h-4.5 w-4.5" aria-hidden />,
    },
    {
      title: "Avg Tickets Per Order",
      value: String(
        analytics?.today?.avgTicketsPerOrder ??
          analytics?.totals.avgTicketsPerOrder ??
          0,
      ),
      delta: formatDeltaPct(analytics?.comparisons?.avgTicketsPerOrderPct),
      series: avgSeries.length ? avgSeries : [0],
      xLabels: avgSeries.length ? intradayXAxis : ["12AM"],
      dates: intradayDates.length ? intradayDates : [new Date()],
      pinnedIndex,
      icon: <Ticket className="h-4.5 w-4.5" aria-hidden />,
    },
  ];
}

function fallbackTrafficSegments(): DonutSegment[] {
  return [{ value: 0, label: "No Data", color: "#8C8CA8" }];
}

function buildHeading(analytics?: ExtendedAnalytics) {
  if (!analytics) return "Tickets Sold Detailed View";

  if (analytics.scope?.type === "event" && analytics.event?.title) {
    return `${analytics.event.title} Tickets Sold`;
  }

  if (
    analytics.scope?.type === "organization" &&
    analytics.organization?.name
  ) {
    return `${analytics.organization.name} Tickets Sold`;
  }

  if (analytics.scope?.type === "global") {
    return "All Tickets Sold";
  }

  return "Tickets Sold Detailed View";
}

export default function FinancesTicketsSoldDetailedPage() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");
  const orgId = searchParams.get("orgId");

  const [dateRange, setDateRange] = useState<DateRangeValue>(() => {
    const end = clampToDay(new Date());
    const start = new Date(end);
    start.setDate(end.getDate() - 29);
    return { start, end };
  });

  const analyticsStart = useMemo(() => {
    const start =
      dateRange.start instanceof Date ? dateRange.start : new Date();
    return normalizeRangeDateForAnalytics(start, "start");
  }, [dateRange.start]);

  const analyticsEnd = useMemo(() => {
    const end = dateRange.end instanceof Date ? dateRange.end : new Date();
    return normalizeRangeDateForAnalytics(end, "end");
  }, [dateRange.end]);

  const analyticsQuery = useQuery<ExtendedAnalytics>({
    queryKey: [
      "tickets-sold-analytics",
      eventId ?? "no-event",
      orgId ?? "no-org",
      analyticsStart.toISOString(),
      analyticsEnd.toISOString(),
    ],
    queryFn: () =>
      fetchTicketsSoldAnalytics({
        eventId,
        orgId,
        start: analyticsStart,
        end: analyticsEnd,
      }),
    enabled: dateRange.start instanceof Date && dateRange.end instanceof Date,
  });

  const analytics = analyticsQuery.data;

  const chartSeries = analytics?.series ?? [];
  const chartLabels = useMemo(() => buildXAxisLabels(analytics), [analytics]);
  const chartDates = useMemo(
    () => chartSeries.map((item) => new Date(item.date)),
    [chartSeries],
  );

  const bigSeries = useMemo(
    () => chartSeries.map((item) => item.ticketsSold),
    [chartSeries],
  );

  const pinnedIndex = Math.max(0, bigSeries.length - 1);
  const pinnedPoint = chartSeries[pinnedIndex];

  const rangeDelta = useMemo(() => {
    if (bigSeries.length >= 2) {
      return deltaFromPrevious(
        bigSeries[pinnedIndex] ?? 0,
        bigSeries[pinnedIndex - 1] ?? 0,
      );
    }

    const fallback = analytics?.comparisons?.ticketsSoldPct ?? 0;
    return {
      text: formatPercentValue(fallback),
      positive: fallback >= 0,
    };
  }, [analytics?.comparisons?.ticketsSoldPct, bigSeries, pinnedIndex]);

  const trafficSource: DonutSegment[] = analytics?.trafficSources.length
    ? analytics.trafficSources
    : fallbackTrafficSegments();

  const peakDays = analytics?.peakDays ?? [];
  const barsData =
    peakDays.length === 7
      ? peakDays.map((item) => item.ticketsSold)
      : [0, 0, 0, 0, 0, 0, 0];

  const barsLabels =
    peakDays.length === 7
      ? peakDays.map((item) => item.label)
      : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const barsHighlightIndex =
    peakDays.length === 7
      ? peakDays.reduce((bestIdx, item, idx, arr) => {
          const best = arr[bestIdx]?.ticketsSold ?? -1;
          return item.ticketsSold > best ? idx : bestIdx;
        }, 0)
      : undefined;

  const heading = buildHeading(analytics);
  const miniCards = useMemo(() => buildMiniCards(analytics), [analytics]);

  return (
    <DetailedViewShell
      heading={heading}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      isLoading={analyticsQuery.isLoading || analyticsQuery.isFetching}
      chartLabels={chartLabels}
      chartDates={chartDates}
      miniCards={miniCards}
      bigCard={{
        label: "TOTAL TICKETS SOLD",
        value: formatCompactNumber(analytics?.totals.ticketsSold ?? 0),
        delta: `${rangeDelta.positive ? "+" : "-"}${rangeDelta.text}`,
        deltaPositive: rangeDelta.positive,
        series: bigSeries.length ? bigSeries : [0],
        tooltip: {
          index: pinnedIndex,
          valueLabel: formatCompactNumber(pinnedPoint?.ticketsSold ?? 0),
          subLabel: pinnedPoint ? formatTooltipDate(pinnedPoint.date) : "",
          deltaText: rangeDelta.text,
          deltaPositive: rangeDelta.positive,
        },
        valuePrefix: "",
        valueSuffix: "",
      }}
      donut={{
        label: "TICKET TYPE BREAKDOWN",
        heading: "",
        segments: trafficSource,
      }}
      mapLabel="TOP TICKETS SOLD LOCATIONS"
      barsLabel="PEAK DAYS"
      barsHeading=""
      barsData={barsData}
      barsLabels={barsLabels}
      barsHighlightIndex={barsHighlightIndex}
      mode="tickets"
      mapData={analytics?.mapData ?? []}
    />
  );
}
