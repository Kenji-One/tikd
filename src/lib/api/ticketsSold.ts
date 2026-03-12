// src/lib/api/ticketsSold.ts
export type TicketsSoldScope = "event" | "organization" | "global";
export type TicketsSoldGranularity = "month" | "day";

export type TicketsSoldSeriesPoint = {
  date: string;
  label: string;
  ticketsSold: number;
  uniqueCustomers: number;
  recurringCustomers: number;
  avgTicketsPerOrder: number;
  conversionRate: number;
};

export type TicketsSoldIntradayPoint = {
  bucket: string;
  date: string;
  label: string;
  ticketsSold: number;
  uniqueCustomers: number;
  recurringCustomers: number;
  avgTicketsPerOrder: number;
  conversionRate: number;
};

export type TicketsSoldTrafficSource = {
  label: string;
  value: number;
  color: string;
};

export type TicketsSoldPeakDay = {
  key: string;
  label: string;
  ticketsSold: number;
};

export type TicketsSoldMapDatum = {
  key: string;
  label?: string;
  revenue: number;
  viewers: number;
  tickets: number;
};

export type TicketsSoldAnalyticsResponse = {
  scope: {
    type: TicketsSoldScope;
    eventId?: string | null;
    orgId?: string | null;
  };
  event?: {
    id: string;
    title: string;
  } | null;
  organization?: {
    id: string;
    name?: string;
  } | null;
  range: {
    start: string;
    end: string;
    granularity: TicketsSoldGranularity;
  };
  totals: {
    ticketsSold: number;
    uniqueCustomers: number;
    recurringCustomers: number;
    avgTicketsPerOrder: number;
    conversionRate: number;
  };
  comparisons: {
    ticketsSoldPct: number;
    uniqueCustomersPct: number;
    recurringCustomersPct: number;
    avgTicketsPerOrderPct: number;
    conversionRatePct: number;
    baseline: {
      currentStart: string;
      currentEnd: string;
      previousStart: string;
      previousEnd: string;
    };
  };
  today: {
    ticketsSold: number;
    uniqueCustomers: number;
    recurringCustomers: number;
    avgTicketsPerOrder: number;
    conversionRate: number;
  };
  series: TicketsSoldSeriesPoint[];
  intraday: TicketsSoldIntradayPoint[];
  peakDays: TicketsSoldPeakDay[];
  trafficSources: TicketsSoldTrafficSource[];
  mapData: TicketsSoldMapDatum[];
};

type FetchTicketsSoldAnalyticsInput = {
  eventId?: string | null;
  orgId?: string | null;
  start: Date;
  end: Date;
};

function buildUrl(params: FetchTicketsSoldAnalyticsInput) {
  const url = new URL("/api/analytics/tickets-sold", window.location.origin);

  if (params.eventId) url.searchParams.set("eventId", params.eventId);
  if (params.orgId) url.searchParams.set("orgId", params.orgId);
  url.searchParams.set("start", params.start.toISOString());
  url.searchParams.set("end", params.end.toISOString());

  return url.toString();
}

export async function fetchTicketsSoldAnalytics(
  params: FetchTicketsSoldAnalyticsInput,
): Promise<TicketsSoldAnalyticsResponse> {
  const res = await fetch(buildUrl(params), {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      text || `Failed to fetch tickets sold analytics (${res.status})`,
    );
  }

  return (await res.json()) as TicketsSoldAnalyticsResponse;
}
