import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import "@/lib/mongoose";

import { auth } from "@/lib/auth";
import EventPageView from "@/models/EventPageView";
import Event from "@/models/Event";
import Ticket from "@/models/Ticket";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "auto";
export const maxDuration = 10;

const QuerySchema = z.object({
  eventId: z.string().length(24).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

type Granularity = "day" | "month";

type SeriesRow = {
  _id: string;
  views: number;
  uniqueViewers: number;
  recurringViewers: number;
};

type TicketSeriesRow = {
  _id: string;
  ticketsSold: number;
};

type HourlyViewsRow = {
  _id: string;
  views: number;
  uniqueViewers: number;
  recurringViewers: number;
};

type HourlyTicketsRow = {
  _id: string;
  ticketsSold: number;
};

type TrafficRow = {
  _id: string;
  value: number;
};

type MapRow = {
  _id: string;
  viewers: number;
};

type CountRow = {
  total: number;
};

type PeakRow = {
  _id: string;
  views: number;
};

type TotalsSnapshot = {
  uniqueViewers: number;
  recurringViewers: number;
  ticketsSold: number;
  conversionRate: number;
};

function startOfUtcDay(input: Date): Date {
  const d = new Date(input);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function endOfUtcDay(input: Date): Date {
  const d = new Date(input);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

function startOfUtcMonth(input: Date): Date {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), 1));
}

function endOfUtcMonth(input: Date): Date {
  return new Date(
    Date.UTC(
      input.getUTCFullYear(),
      input.getUTCMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    ),
  );
}

function startOfUtcHour(input: Date): Date {
  const d = new Date(input);
  d.setUTCMinutes(0, 0, 0);
  return d;
}

function dayKey(input: Date): string {
  const y = input.getUTCFullYear();
  const m = String(input.getUTCMonth() + 1).padStart(2, "0");
  const d = String(input.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function monthKey(input: Date): string {
  const y = input.getUTCFullYear();
  const m = String(input.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function hourKey(input: Date): string {
  const h = String(input.getUTCHours()).padStart(2, "0");
  return h;
}

function daysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.floor(ms / 86_400_000) + 1);
}

function chooseGranularity(start: Date, end: Date): Granularity {
  return daysBetween(start, end) <= 31 ? "day" : "month";
}

function buildSeriesBuckets(
  start: Date,
  end: Date,
  granularity: Granularity,
): Array<{ bucket: string; date: string; label: string }> {
  const out: Array<{ bucket: string; date: string; label: string }> = [];

  if (granularity === "day") {
    let cursor = startOfUtcDay(start);
    const max = endOfUtcDay(end);

    while (cursor <= max) {
      const bucket = dayKey(cursor);
      out.push({
        bucket,
        date: new Date(cursor).toISOString(),
        label: bucket,
      });
      cursor = new Date(cursor.getTime() + 86_400_000);
    }

    return out;
  }

  let cursor = startOfUtcMonth(start);
  const endMonth = startOfUtcMonth(end);

  while (cursor <= endMonth) {
    const bucket = monthKey(cursor);
    out.push({
      bucket,
      date: new Date(cursor).toISOString(),
      label: bucket,
    });

    cursor = new Date(
      Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1),
    );
  }

  return out;
}

function buildHourlyBuckets(day: Date): Array<{
  bucket: string;
  date: string;
  label: string;
}> {
  const out: Array<{ bucket: string; date: string; label: string }> = [];
  const base = startOfUtcDay(day);

  for (let i = 0; i < 24; i += 1) {
    const cursor = new Date(base.getTime() + i * 3_600_000);
    const bucket = hourKey(cursor);

    out.push({
      bucket,
      date: cursor.toISOString(),
      label: cursor.toLocaleTimeString("en-US", {
        hour: "numeric",
        hour12: true,
        timeZone: "UTC",
      }),
    });
  }

  return out;
}

function buildPeakBuckets(
  end: Date,
): Array<{ bucket: string; label: string; date: string }> {
  const last = endOfUtcDay(end);
  const first = new Date(last.getTime() - 6 * 86_400_000);

  const out: Array<{ bucket: string; label: string; date: string }> = [];
  let cursor = first;

  while (cursor <= last) {
    const bucket = dayKey(cursor);
    out.push({
      bucket,
      label: new Date(cursor).toLocaleDateString("en-US", {
        weekday: "short",
        timeZone: "UTC",
      }),
      date: new Date(cursor).toISOString(),
    });
    cursor = new Date(cursor.getTime() + 86_400_000);
  }

  return out;
}

function formatPercent(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 10) / 10;
}

function percentDeltaVsPrevious(current: number, previous: number): number {
  const safeCurrent = Number.isFinite(current) ? current : 0;
  const safePrevious = Number.isFinite(previous) ? previous : 0;

  if (safePrevious <= 0) {
    return safeCurrent > 0 ? 100 : 0;
  }

  return formatPercent(((safeCurrent - safePrevious) / safePrevious) * 100);
}

function trafficColor(label: string): string {
  switch (label) {
    case "Direct":
      return "#FF7B45";
    case "Search":
      return "#9A46FF";
    case "Social":
      return "#FF454A";
    case "Referral":
      return "#45FF79";
    case "Internal":
      return "#3B82F6";
    default:
      return "#8C8CA8";
  }
}

function sourceLabel(value: string): string {
  switch (value) {
    case "direct":
      return "Direct";
    case "search":
      return "Search";
    case "social":
      return "Social";
    case "referral":
      return "Referral";
    case "internal":
      return "Internal";
    default:
      return "Unknown";
  }
}

function makeViewMatch(eventId: string | undefined, start: Date, end: Date) {
  return {
    ...(eventId ? { eventId: new Types.ObjectId(eventId) } : {}),
    viewedAt: {
      $gte: start,
      $lte: end,
    },
  };
}

function makeTicketMatch(eventId: string | undefined, start: Date, end: Date) {
  return {
    ...(eventId ? { eventId: new Types.ObjectId(eventId) } : {}),
    status: "paid",
    createdAt: {
      $gte: start,
      $lte: end,
    },
  };
}

async function getDistinctViewerCount(
  eventId: string | undefined,
  start: Date,
  end: Date,
): Promise<number> {
  const rows = await EventPageView.aggregate<CountRow>([
    { $match: makeViewMatch(eventId, start, end) },
    { $group: { _id: "$visitorId" } },
    { $count: "total" },
  ]);

  return rows[0]?.total ?? 0;
}

async function getRecurringViewerCount(
  eventId: string | undefined,
  start: Date,
  end: Date,
): Promise<number> {
  const rows = await EventPageView.aggregate<CountRow>([
    { $match: makeViewMatch(eventId, start, end) },
    {
      $group: {
        _id: "$visitorId",
        count: { $sum: 1 },
      },
    },
    {
      $match: {
        count: { $gt: 1 },
      },
    },
    {
      $count: "total",
    },
  ]);

  return rows[0]?.total ?? 0;
}

async function getTicketsSoldCount(
  eventId: string | undefined,
  start: Date,
  end: Date,
): Promise<number> {
  return Ticket.countDocuments(makeTicketMatch(eventId, start, end));
}

async function getTotalsSnapshot(
  eventId: string | undefined,
  start: Date,
  end: Date,
): Promise<TotalsSnapshot> {
  const [uniqueViewers, recurringViewers, ticketsSold] = await Promise.all([
    getDistinctViewerCount(eventId, start, end),
    getRecurringViewerCount(eventId, start, end),
    getTicketsSoldCount(eventId, start, end),
  ]);

  const conversionRate =
    uniqueViewers > 0 ? formatPercent((ticketsSold / uniqueViewers) * 100) : 0;

  return {
    uniqueViewers,
    recurringViewers,
    ticketsSold,
    conversionRate,
  };
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = request.nextUrl;
  const parsed = QuerySchema.safeParse({
    eventId: url.searchParams.get("eventId") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid analytics query." },
      { status: 400 },
    );
  }

  const now = new Date();
  const rawEnd = parsed.data.to ? new Date(parsed.data.to) : now;
  const rawStart = parsed.data.from
    ? new Date(parsed.data.from)
    : new Date(rawEnd.getTime() - 29 * 86_400_000);

  const start = startOfUtcDay(
    rawStart.getTime() <= rawEnd.getTime() ? rawStart : rawEnd,
  );
  const end = endOfUtcDay(
    rawStart.getTime() <= rawEnd.getTime() ? rawEnd : rawStart,
  );

  const eventId = parsed.data.eventId;
  const granularity = chooseGranularity(start, end);
  const viewMatch = makeViewMatch(eventId, start, end);

  const todayStart = startOfUtcDay(now);
  const todayEnd = endOfUtcDay(now);
  const previousDayStart = new Date(todayStart.getTime() - 86_400_000);
  const previousDayEnd = new Date(todayEnd.getTime() - 86_400_000);

  const liveStart = new Date(now.getTime() - 5 * 60_000);
  const previousLiveStart = new Date(liveStart.getTime() - 86_400_000);
  const previousLiveEnd = new Date(now.getTime() - 86_400_000);

  const [eventDoc, totalPageViews, liveRows, previousLiveRows] =
    await Promise.all([
      eventId
        ? Event.findById(eventId)
            .select("_id title")
            .lean<{ _id: Types.ObjectId; title: string } | null>()
        : Promise.resolve(null),

      EventPageView.countDocuments(viewMatch),

      EventPageView.aggregate<CountRow>([
        {
          $match: makeViewMatch(eventId, liveStart, now),
        },
        {
          $group: {
            _id: "$visitorId",
          },
        },
        {
          $count: "total",
        },
      ]),

      EventPageView.aggregate<CountRow>([
        {
          $match: makeViewMatch(eventId, previousLiveStart, previousLiveEnd),
        },
        {
          $group: {
            _id: "$visitorId",
          },
        },
        {
          $count: "total",
        },
      ]),
    ]);

  const [totalsSnapshot, todaySnapshot, previousDaySnapshot] =
    await Promise.all([
      getTotalsSnapshot(eventId, start, end),
      getTotalsSnapshot(eventId, todayStart, todayEnd),
      getTotalsSnapshot(eventId, previousDayStart, previousDayEnd),
    ]);

  const [seriesRows, ticketSeriesRows, trafficRows, mapRows, peakRows] =
    await Promise.all([
      EventPageView.aggregate<SeriesRow>([
        { $match: viewMatch },
        {
          $group: {
            _id: {
              bucket:
                granularity === "day"
                  ? {
                      $dateToString: {
                        format: "%Y-%m-%d",
                        date: "$viewedAt",
                        timezone: "UTC",
                      },
                    }
                  : {
                      $dateToString: {
                        format: "%Y-%m",
                        date: "$viewedAt",
                        timezone: "UTC",
                      },
                    },
              visitorId: "$visitorId",
            },
            views: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: "$_id.bucket",
            views: { $sum: "$views" },
            uniqueViewers: { $sum: 1 },
            recurringViewers: {
              $sum: {
                $cond: [{ $gt: ["$views", 1] }, 1, 0],
              },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      Ticket.aggregate<TicketSeriesRow>([
        { $match: makeTicketMatch(eventId, start, end) },
        {
          $group: {
            _id:
              granularity === "day"
                ? {
                    $dateToString: {
                      format: "%Y-%m-%d",
                      date: "$createdAt",
                      timezone: "UTC",
                    },
                  }
                : {
                    $dateToString: {
                      format: "%Y-%m",
                      date: "$createdAt",
                      timezone: "UTC",
                    },
                  },
            ticketsSold: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      EventPageView.aggregate<TrafficRow>([
        { $match: viewMatch },
        {
          $group: {
            _id: "$sourceType",
            value: { $sum: 1 },
          },
        },
        { $sort: { value: -1 } },
      ]),

      EventPageView.aggregate<MapRow>([
        { $match: viewMatch },
        {
          $match: {
            countryCode: {
              $nin: ["", null, "XX"],
            },
          },
        },
        {
          $group: {
            _id: "$countryCode",
            viewers: { $sum: 1 },
          },
        },
        { $sort: { viewers: -1 } },
        { $limit: 30 },
      ]),

      EventPageView.aggregate<PeakRow>([
        {
          $match: makeViewMatch(
            eventId,
            startOfUtcDay(
              new Date(
                Math.max(start.getTime(), end.getTime() - 6 * 86_400_000),
              ),
            ),
            end,
          ),
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$viewedAt",
                timezone: "UTC",
              },
            },
            views: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

  const [hourlyViewRows, hourlyTicketRows] = await Promise.all([
    EventPageView.aggregate<HourlyViewsRow>([
      { $match: makeViewMatch(eventId, todayStart, todayEnd) },
      {
        $group: {
          _id: {
            bucket: {
              $dateToString: {
                format: "%H",
                date: "$viewedAt",
                timezone: "UTC",
              },
            },
            visitorId: "$visitorId",
          },
          views: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.bucket",
          views: { $sum: "$views" },
          uniqueViewers: { $sum: 1 },
          recurringViewers: {
            $sum: {
              $cond: [{ $gt: ["$views", 1] }, 1, 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    Ticket.aggregate<HourlyTicketsRow>([
      { $match: makeTicketMatch(eventId, todayStart, todayEnd) },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%H",
              date: "$createdAt",
              timezone: "UTC",
            },
          },
          ticketsSold: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const seriesBase = buildSeriesBuckets(start, end, granularity);
  const seriesMap = new Map(seriesRows.map((row) => [row._id, row]));
  const ticketSeriesMap = new Map(
    ticketSeriesRows.map((row) => [row._id, row.ticketsSold]),
  );

  const series = seriesBase.map((bucket) => {
    const row = seriesMap.get(bucket.bucket);
    const ticketsSold = ticketSeriesMap.get(bucket.bucket) ?? 0;
    const uniqueViewers = row?.uniqueViewers ?? 0;

    return {
      bucket: bucket.bucket,
      date: bucket.date,
      label: bucket.label,
      views: row?.views ?? 0,
      uniqueViewers,
      recurringViewers: row?.recurringViewers ?? 0,
      ticketsSold,
      conversionRate:
        uniqueViewers > 0
          ? formatPercent((ticketsSold / uniqueViewers) * 100)
          : 0,
    };
  });

  const trafficSources = trafficRows.map((row) => {
    const label = sourceLabel(row._id);
    return {
      label,
      value: row.value,
      color: trafficColor(label),
    };
  });

  const mapData = mapRows.map((row) => ({
    key: row._id,
    label: row._id,
    viewers: row.viewers,
    revenue: 0,
    tickets: 0,
  }));

  const peakBase = buildPeakBuckets(end);
  const peakMap = new Map(peakRows.map((row) => [row._id, row.views]));

  const peakDays = peakBase.map((bucket) => ({
    date: bucket.date,
    label: bucket.label,
    views: peakMap.get(bucket.bucket) ?? 0,
  }));

  const hourlyBase = buildHourlyBuckets(now);
  const hourlyViewsMap = new Map(hourlyViewRows.map((row) => [row._id, row]));
  const hourlyTicketsMap = new Map(
    hourlyTicketRows.map((row) => [row._id, row.ticketsSold]),
  );

  const intraday = hourlyBase.map((bucket, index) => {
    const row = hourlyViewsMap.get(bucket.bucket);
    const ticketsSold = hourlyTicketsMap.get(bucket.bucket) ?? 0;
    const uniqueViewers = row?.uniqueViewers ?? 0;

    return {
      bucket: bucket.bucket,
      date: bucket.date,
      label: bucket.label,
      views: row?.views ?? 0,
      uniqueViewers,
      recurringViewers: row?.recurringViewers ?? 0,
      ticketsSold,
      liveViewers:
        index === hourlyBase.length - 1 ? (liveRows[0]?.total ?? 0) : 0,
      conversionRate:
        uniqueViewers > 0
          ? formatPercent((ticketsSold / uniqueViewers) * 100)
          : 0,
    };
  });

  const liveViewers = liveRows[0]?.total ?? 0;
  const previousLiveViewers = previousLiveRows[0]?.total ?? 0;

  return NextResponse.json({
    ok: true,
    ...(eventDoc
      ? {
          event: {
            id: String(eventDoc._id),
            title: eventDoc.title,
          },
        }
      : {}),
    range: {
      start: start.toISOString(),
      end: end.toISOString(),
      granularity,
    },
    totals: {
      pageViews: totalPageViews,
      uniqueViewers: totalsSnapshot.uniqueViewers,
      recurringViewers: totalsSnapshot.recurringViewers,
      liveViewers,
      ticketsSold: totalsSnapshot.ticketsSold,
      conversionRate: totalsSnapshot.conversionRate,
    },
    comparisons: {
      uniqueViewersPct: percentDeltaVsPrevious(
        todaySnapshot.uniqueViewers,
        previousDaySnapshot.uniqueViewers,
      ),
      recurringViewersPct: percentDeltaVsPrevious(
        todaySnapshot.recurringViewers,
        previousDaySnapshot.recurringViewers,
      ),
      conversionRatePct: percentDeltaVsPrevious(
        todaySnapshot.conversionRate,
        previousDaySnapshot.conversionRate,
      ),
      liveViewersPct: percentDeltaVsPrevious(liveViewers, previousLiveViewers),
      baseline: {
        today: todayStart.toISOString(),
        previousDay: previousDayStart.toISOString(),
      },
    },
    today: {
      uniqueViewers: todaySnapshot.uniqueViewers,
      recurringViewers: todaySnapshot.recurringViewers,
      ticketsSold: todaySnapshot.ticketsSold,
      conversionRate: todaySnapshot.conversionRate,
      liveViewers,
    },
    intraday,
    series,
    trafficSources,
    mapData,
    peakDays,
  });
}
