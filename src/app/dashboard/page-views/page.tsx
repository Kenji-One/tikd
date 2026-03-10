"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChartSpline, UserRound, CalendarArrowUp, MapPin } from "lucide-react";

import DetailedViewShell from "@/components/dashboard/finances/DetailedViewShell";
import type { DonutSegment } from "@/components/dashboard/charts/DonutFull";
import DateRangePicker, {
  type DateRangeValue,
} from "@/components/ui/DateRangePicker";
import {
  fetchPageViewsAnalytics,
  type PageViewsAnalyticsResponse,
} from "@/lib/api/pageViews";

type IntradayPoint = {
  bucket: string;
  date: string;
  label: string;
  views: number;
  uniqueViewers: number;
  recurringViewers: number;
  ticketsSold: number;
  liveViewers: number;
  conversionRate: number;
};

type ExtendedAnalytics = PageViewsAnalyticsResponse & {
  intraday?: IntradayPoint[];
  comparisons?: {
    uniqueViewersPct?: number;
    recurringViewersPct?: number;
    conversionRatePct?: number;
    liveViewersPct?: number;
    baseline?: {
      today: string;
      previousDay: string;
    };
  };
  today?: {
    uniqueViewers: number;
    recurringViewers: number;
    ticketsSold: number;
    conversionRate: number;
    liveViewers: number;
  };
};

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

function buildXAxisLabels(data?: PageViewsAnalyticsResponse) {
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

function formatDeltaPct(value?: number) {
  const safe = Number.isFinite(value) ? Number(value) : 0;
  const rounded = Math.round(safe * 10) / 10;
  return `${rounded >= 0 ? "+" : ""}${rounded}% vs prev day`;
}

function buildIntradayXAxisLabels(points: IntradayPoint[]) {
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

  const uniqueSeries = intraday.map((item) => item.uniqueViewers);
  const recurringSeries = intraday.map((item) => item.recurringViewers);
  const conversionSeries = intraday.map((item) => item.conversionRate);
  const liveSeries = intraday.map((item) => item.liveViewers);

  return [
    {
      title: "Unique Viewers",
      value: String(
        analytics?.today?.uniqueViewers ?? analytics?.totals.uniqueViewers ?? 0,
      ),
      delta: formatDeltaPct(analytics?.comparisons?.uniqueViewersPct),
      series: uniqueSeries.length ? uniqueSeries : [0],
      xLabels: uniqueSeries.length ? intradayXAxis : ["12AM"],
      dates: intradayDates.length ? intradayDates : [new Date()],
      pinnedIndex,
      icon: <UserRound className="h-4.5 w-4.5" aria-hidden />,
    },
    {
      title: "Recurring Viewers",
      value: String(
        analytics?.today?.recurringViewers ??
          analytics?.totals.recurringViewers ??
          0,
      ),
      delta: formatDeltaPct(analytics?.comparisons?.recurringViewersPct),
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
      title: "Live Viewers",
      value: String(
        analytics?.today?.liveViewers ?? analytics?.totals.liveViewers ?? 0,
      ),
      delta: formatDeltaPct(analytics?.comparisons?.liveViewersPct),
      series: liveSeries.length ? liveSeries : [0],
      xLabels: liveSeries.length ? intradayXAxis : ["12AM"],
      dates: intradayDates.length ? intradayDates : [new Date()],
      pinnedIndex,
      icon: <ChartSpline className="h-4.5 w-4.5" aria-hidden />,
    },
  ];
}

function fallbackTrafficSegments(): DonutSegment[] {
  return [{ value: 0, label: "No Data", color: "#8C8CA8" }];
}

export default function FinancesPageViewsDetailedPage() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");

  const [dateRange, setDateRange] = useState<DateRangeValue>(() => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - 29);
    return { start, end };
  });

  const analyticsQuery = useQuery({
    queryKey: [
      "page-views-analytics",
      eventId ?? "all",
      dateRange.start instanceof Date ? dateRange.start.toISOString() : "none",
      dateRange.end instanceof Date ? dateRange.end.toISOString() : "none",
    ],
    queryFn: () =>
      fetchPageViewsAnalytics({
        eventId,
        start: dateRange.start as Date,
        end: dateRange.end as Date,
      }),
    enabled: dateRange.start instanceof Date && dateRange.end instanceof Date,
  });

  const analytics = analyticsQuery.data as ExtendedAnalytics | undefined;

  const chartSeries = analytics?.series ?? [];
  const chartLabels = useMemo(() => buildXAxisLabels(analytics), [analytics]);
  const chartDates = useMemo(
    () => chartSeries.map((item) => new Date(item.date)),
    [chartSeries],
  );

  const bigSeries = useMemo(
    () => chartSeries.map((item) => item.views),
    [chartSeries],
  );

  const pinnedIndex = Math.max(0, bigSeries.length - 1);
  const pinnedPoint = chartSeries[pinnedIndex];

  const trafficSource: DonutSegment[] = analytics?.trafficSources.length
    ? analytics.trafficSources
    : fallbackTrafficSegments();

  const barsData =
    analytics?.peakDays.length === 7
      ? analytics.peakDays.map((item) => item.views)
      : [0, 0, 0, 0, 0, 0, 0];

  const heading = analytics?.event?.title
    ? `${analytics.event.title} Page Views`
    : "Page Views Detailed View";

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
        label: "TOTAL PAGE VIEWS",
        value: formatCompactNumber(analytics?.totals.pageViews ?? 0),
        delta:
          analytics && analytics.totals.liveViewers > 0
            ? `${analytics.totals.liveViewers} live`
            : undefined,
        deltaPositive: true,
        series: bigSeries.length ? bigSeries : [0],
        tooltip: {
          index: pinnedIndex,
          valueLabel: formatCompactNumber(pinnedPoint?.views ?? 0),
          subLabel: pinnedPoint ? formatTooltipDate(pinnedPoint.date) : "",
          deltaText:
            analytics && analytics.totals.uniqueViewers > 0
              ? `${analytics.totals.uniqueViewers} unique`
              : "",
          deltaPositive: true,
        },
        valuePrefix: "",
        valueSuffix: "",
      }}
      donut={{
        label: "TRAFFIC SOURCE",
        heading: "",
        segments: trafficSource,
      }}
      mapLabel="TOP VIEWER LOCATIONS"
      barsLabel="PEAK DAYS"
      barsHeading=""
      barsData={barsData}
      mode="views"
      mapData={analytics?.mapData ?? []}
    />
  );
}
