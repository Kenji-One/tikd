export type PageViewTrafficSegment = {
  label: string;
  value: number;
  color: string;
};

export type PageViewMapDatum = {
  key: string;
  label: string;
  viewers: number;
  revenue: number;
  tickets: number;
};

export type PageViewSeriesPoint = {
  bucket: string;
  date: string;
  label: string;
  views: number;
  uniqueViewers: number;
  recurringViewers: number;
  ticketsSold: number;
  conversionRate: number;
};

export type PageViewPeakDay = {
  date: string;
  label: string;
  views: number;
};

export type PageViewsAnalyticsResponse = {
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
    pageViews: number;
    uniqueViewers: number;
    recurringViewers: number;
    liveViewers: number;
    ticketsSold: number;
    conversionRate: number;
  };
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
  intraday?: Array<{
    bucket: string;
    date: string;
    label: string;
    views: number;
    uniqueViewers: number;
    recurringViewers: number;
    ticketsSold: number;
    liveViewers: number;
    conversionRate: number;
  }>;
  series: PageViewSeriesPoint[];
  trafficSources: PageViewTrafficSegment[];
  mapData: PageViewMapDatum[];
  peakDays: PageViewPeakDay[];
};

export type FetchPageViewsAnalyticsParams = {
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

export async function fetchPageViewsAnalytics(
  input: FetchPageViewsAnalyticsParams,
): Promise<PageViewsAnalyticsResponse> {
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

  const res = await fetch(`/api/analytics/page-views?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    let message = "Failed to fetch page-views analytics.";
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

  return (await res.json()) as PageViewsAnalyticsResponse;
}
