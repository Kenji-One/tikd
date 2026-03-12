"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { UserRound, CalendarDays, Trophy, Ticket } from "lucide-react";

import DetailedViewShell from "@/components/dashboard/finances/DetailedViewShell";
import type { DonutSegment } from "@/components/dashboard/charts/DonutFull";
import DateRangePicker, {
  type DateRangeValue,
} from "@/components/ui/DateRangePicker";
import {
  fetchRevenueAnalytics,
  type RevenueAnalyticsResponse,
} from "@/lib/api/revenue";

type IntradayPoint = {
  bucket: string;
  date: string;
  label: string;
  revenue: number;
  ticketsSold: number;
  customers: number;
  avgRevenuePerCustomer: number;
  avgTicketPrice: number;
};

type ExtendedAnalytics = RevenueAnalyticsResponse & {
  intraday?: IntradayPoint[];
  comparisons?: {
    revenuePct?: number;
    ticketsSoldPct?: number;
    customersPct?: number;
    avgRevenuePerCustomerPct?: number;
    avgTicketPricePct?: number;
    baseline?: {
      today: string;
      previousDay: string;
    };
  };
  today?: {
    revenue: number;
    ticketsSold: number;
    customers: number;
    avgRevenuePerCustomer: number;
    avgTicketPrice: number;
  };
};

function formatCompactCurrency(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatFullCurrency(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
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

function buildXAxisLabels(data?: RevenueAnalyticsResponse) {
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

  const customerSeries = intraday.map((item) => item.customers);
  const avgCustomerSeries = intraday.map((item) => item.avgRevenuePerCustomer);
  const avgTicketSeries = intraday.map((item) => item.avgTicketPrice);
  const ticketsSeries = intraday.map((item) => item.ticketsSold);

  const highestRevenueLabel =
    analytics?.highlights?.topTicketType?.label ?? "—";

  return [
    {
      title: "Avg Revenue Per Customer",
      value: formatCompactCurrency(
        analytics?.today?.avgRevenuePerCustomer ??
          analytics?.totals.avgRevenuePerCustomer ??
          0,
      ),
      delta: formatDeltaPct(analytics?.comparisons?.avgRevenuePerCustomerPct),
      series: avgCustomerSeries.length ? avgCustomerSeries : [0],
      xLabels: avgCustomerSeries.length ? intradayXAxis : ["12AM"],
      dates: intradayDates.length ? intradayDates : [new Date()],
      pinnedIndex,
      icon: <UserRound className="h-4.5 w-4.5" aria-hidden />,
    },
    {
      title: "Customers Today",
      value: String(
        analytics?.today?.customers ?? analytics?.totals.customers ?? 0,
      ),
      delta: formatDeltaPct(analytics?.comparisons?.customersPct),
      series: customerSeries.length ? customerSeries : [0],
      xLabels: customerSeries.length ? intradayXAxis : ["12AM"],
      dates: intradayDates.length ? intradayDates : [new Date()],
      pinnedIndex,
      icon: <CalendarDays className="h-4.5 w-4.5" aria-hidden />,
    },
    {
      title: "Highest Earning Ticket Type",
      value: highestRevenueLabel,
      delta: analytics?.highlights?.topTicketType
        ? formatCompactCurrency(analytics.highlights.topTicketType.revenue)
        : formatCompactCurrency(0),
      series: avgTicketSeries.length ? avgTicketSeries : [0],
      xLabels: avgTicketSeries.length ? intradayXAxis : ["12AM"],
      dates: intradayDates.length ? intradayDates : [new Date()],
      pinnedIndex,
      icon: <Trophy className="h-4.5 w-4.5" aria-hidden />,
    },
    {
      title: "Tickets Sold Today",
      value: String(
        analytics?.today?.ticketsSold ?? analytics?.totals.ticketsSold ?? 0,
      ),
      delta: formatDeltaPct(analytics?.comparisons?.ticketsSoldPct),
      series: ticketsSeries.length ? ticketsSeries : [0],
      xLabels: ticketsSeries.length ? intradayXAxis : ["12AM"],
      dates: intradayDates.length ? intradayDates : [new Date()],
      pinnedIndex,
      icon: <Ticket className="h-4.5 w-4.5" aria-hidden />,
    },
  ];
}

function fallbackBreakdownSegments(): DonutSegment[] {
  return [{ value: 0, label: "No Data", color: "#8C8CA8" }];
}

function buildHeading(analytics?: ExtendedAnalytics) {
  if (!analytics) return "Revenue Detailed View";

  if (analytics.scope?.type === "event" && analytics.event?.title) {
    return `${analytics.event.title} Revenue`;
  }

  if (
    analytics.scope?.type === "organization" &&
    analytics.organization?.name
  ) {
    return `${analytics.organization.name} Revenue`;
  }

  if (analytics.scope?.type === "global") {
    return "All Revenue";
  }

  return "Revenue Detailed View";
}

export default function FinancesRevenueDetailedPage() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");
  const orgId = searchParams.get("orgId");

  const [dateRange, setDateRange] = useState<DateRangeValue>(() => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - 29);
    return { start, end };
  });

  const analyticsQuery = useQuery({
    queryKey: [
      "revenue-analytics",
      eventId ?? "no-event",
      orgId ?? "no-org",
      dateRange.start instanceof Date ? dateRange.start.toISOString() : "none",
      dateRange.end instanceof Date ? dateRange.end.toISOString() : "none",
    ],
    queryFn: () =>
      fetchRevenueAnalytics({
        eventId,
        orgId,
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
    () => chartSeries.map((item) => item.revenue),
    [chartSeries],
  );

  const pinnedIndex = Math.max(0, bigSeries.length - 1);
  const pinnedPoint = chartSeries[pinnedIndex];

  const donutSegments: DonutSegment[] = analytics?.ticketTypeBreakdown.length
    ? analytics.ticketTypeBreakdown
    : fallbackBreakdownSegments();

  const peakDays = analytics?.peakDays ?? [];
  const barsData =
    peakDays.length === 7
      ? peakDays.map((item) => item.revenue)
      : [0, 0, 0, 0, 0, 0, 0];

  const barsLabels =
    peakDays.length === 7
      ? peakDays.map((item) => item.label)
      : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const barsHighlightIndex =
    peakDays.length === 7 ? peakDays.length - 1 : undefined;

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
        label: "TOTAL REVENUE",
        value: formatCompactCurrency(analytics?.totals.revenue ?? 0),
        delta: formatDeltaPct(analytics?.comparisons?.revenuePct),
        deltaPositive: (analytics?.comparisons?.revenuePct ?? 0) >= 0,
        series: bigSeries.length ? bigSeries : [0],
        tooltip: {
          index: pinnedIndex,
          valueLabel: formatFullCurrency(pinnedPoint?.revenue ?? 0),
          subLabel: pinnedPoint ? formatTooltipDate(pinnedPoint.date) : "",
          deltaText: pinnedPoint
            ? `${pinnedPoint.ticketsSold} tickets`
            : "0 tickets",
          deltaPositive: true,
        },
        valuePrefix: "",
        valueSuffix: "",
      }}
      donut={{
        label: "REVENUE BY TICKET TYPE",
        heading: "",
        segments: donutSegments,
      }}
      mapLabel="TOP REVENUE LOCATIONS"
      barsLabel="PEAK DAYS"
      barsHeading=""
      barsData={barsData}
      barsLabels={barsLabels}
      barsHighlightIndex={barsHighlightIndex}
      mode="revenue"
      mapData={analytics?.mapData ?? []}
    />
  );
}
