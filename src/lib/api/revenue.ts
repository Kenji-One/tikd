export type RevenueBreakdownSegment = {
  label: string;
  value: number;
  color: string;
};

export type RevenueMapDatum = {
  key: string;
  label: string;
  revenue: number;
  viewers: number;
  tickets: number;
};

export type RevenueSeriesPoint = {
  bucket: string;
  date: string;
  label: string;
  revenue: number;
  ticketsSold: number;
  customers: number;
  avgRevenuePerCustomer: number;
  avgTicketPrice: number;
};

export type RevenuePeakDay = {
  date: string;
  label: string;
  revenue: number;
};

export type RevenueAnalyticsResponse = {
  ok: true;
  scope: {
    type: "event" | "organization" | "global";
  };
  event?: {
    id: string;
    title: string;
  };
  organization?: {
    id: string;
    name: string;
  };
  range: {
    start: string;
    end: string;
    granularity: "day" | "month";
  };
  totals: {
    revenue: number;
    ticketsSold: number;
    customers: number;
    avgRevenuePerCustomer: number;
    avgTicketPrice: number;
  };
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
  intraday?: Array<{
    bucket: string;
    date: string;
    label: string;
    revenue: number;
    ticketsSold: number;
    customers: number;
    avgRevenuePerCustomer: number;
    avgTicketPrice: number;
  }>;
  series: RevenueSeriesPoint[];
  ticketTypeBreakdown: RevenueBreakdownSegment[];
  peakDays: RevenuePeakDay[];
  mapData: RevenueMapDatum[];
  highlights?: {
    highestRevenueBucket?: {
      bucket: string;
      date: string;
      label: string;
      revenue: number;
    } | null;
    topTicketType?: {
      label: string;
      revenue: number;
    } | null;
  };
};

export type FetchRevenueAnalyticsParams = {
  eventId?: string | null;
  orgId?: string | null;
  start?: Date | null;
  end?: Date | null;
};

function appendIfPresent(
  params: URLSearchParams,
  key: string,
  value: string | null | undefined,
) {
  if (!value) return;
  params.set(key, value);
}

export async function fetchRevenueAnalytics(
  input: FetchRevenueAnalyticsParams,
): Promise<RevenueAnalyticsResponse> {
  const params = new URLSearchParams();

  appendIfPresent(params, "eventId", input.eventId ?? undefined);
  appendIfPresent(params, "orgId", input.orgId ?? undefined);
  appendIfPresent(
    params,
    "from",
    input.start instanceof Date ? input.start.toISOString() : undefined,
  );
  appendIfPresent(
    params,
    "to",
    input.end instanceof Date ? input.end.toISOString() : undefined,
  );

  const res = await fetch(`/api/analytics/revenue?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    let message = "Failed to fetch revenue analytics.";
    try {
      const data = (await res.json()) as { error?: string };
      if (typeof data?.error === "string" && data.error.trim()) {
        message = data.error;
      }
    } catch {
      // ignore JSON parsing failure
    }
    throw new Error(message);
  }

  return (await res.json()) as RevenueAnalyticsResponse;
}
