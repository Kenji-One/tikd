import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import "@/lib/mongoose";

import { auth } from "@/lib/auth";
import Event from "@/models/Event";
import Ticket from "@/models/Ticket";
import Organization from "@/models/Organization";
import OrgTeam from "@/models/OrgTeam";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "auto";
export const maxDuration = 10;

const QuerySchema = z
  .object({
    eventId: z.string().length(24).optional(),
    orgId: z.string().length(24).optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  })
  .refine((data) => !(data.eventId && data.orgId), {
    message: "Provide either eventId or orgId, not both.",
    path: ["orgId"],
  });

type Granularity = "day" | "month";

type RevenueSeriesRow = {
  _id: string;
  revenue: number;
  ticketsSold: number;
  customers: number;
};

type HourlyRevenueRow = {
  _id: string;
  revenue: number;
  ticketsSold: number;
  customers: number;
};

type TicketTypeRevenueRow = {
  _id: string;
  value: number;
};

type PeakRevenueRow = {
  _id: string;
  revenue: number;
};

type RevenueTotalsRow = {
  revenue: number;
  ticketsSold: number;
  customers: number;
};

type TotalsSnapshot = {
  revenue: number;
  ticketsSold: number;
  customers: number;
  avgRevenuePerCustomer: number;
  avgTicketPrice: number;
};

type ScopeContext =
  | {
      scope: "event";
      eventId: string;
      eventDoc: { _id: Types.ObjectId; title: string };
      eventIds: Types.ObjectId[];
      organizationDoc: null;
    }
  | {
      scope: "organization";
      eventId: undefined;
      eventDoc: null;
      eventIds: Types.ObjectId[];
      organizationDoc: { _id: Types.ObjectId; name: string };
    }
  | {
      scope: "global";
      eventId: undefined;
      eventDoc: null;
      eventIds: Types.ObjectId[];
      organizationDoc: null;
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
  return String(input.getUTCHours()).padStart(2, "0");
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

function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
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

function revenueSegmentColor(index: number): string {
  const palette = [
    "#9A46FF",
    "#FF7B45",
    "#45FF79",
    "#3B82F6",
    "#FF454A",
    "#C084FC",
    "#14B8A6",
    "#F59E0B",
  ];

  return palette[index % palette.length] ?? "#8C8CA8";
}

function objectIdArray(values: Types.ObjectId[]): Types.ObjectId[] {
  return values.filter((value) => Types.ObjectId.isValid(value));
}

function buildEventScopeMatch(eventIds: Types.ObjectId[]) {
  if (eventIds.length === 0) {
    return {
      eventId: { $in: [] as Types.ObjectId[] },
    };
  }

  if (eventIds.length === 1) {
    return { eventId: eventIds[0] };
  }

  return {
    eventId: { $in: eventIds },
  };
}

function makeRevenueMatch(eventIds: Types.ObjectId[], start: Date, end: Date) {
  return {
    ...buildEventScopeMatch(eventIds),
    status: { $in: ["paid", "scanned"] },
    createdAt: {
      $gte: start,
      $lte: end,
    },
  };
}

async function getTotalsSnapshot(
  eventIds: Types.ObjectId[],
  start: Date,
  end: Date,
): Promise<TotalsSnapshot> {
  const rows = await Ticket.aggregate<RevenueTotalsRow>([
    { $match: makeRevenueMatch(eventIds, start, end) },
    {
      $group: {
        _id: null,
        revenue: { $sum: "$price" },
        ticketsSold: { $sum: 1 },
        customersSet: { $addToSet: "$ownerId" },
      },
    },
    {
      $project: {
        _id: 0,
        revenue: 1,
        ticketsSold: 1,
        customers: { $size: "$customersSet" },
      },
    },
  ]);

  const row = rows[0];
  const revenue = round2(row?.revenue ?? 0);
  const ticketsSold = row?.ticketsSold ?? 0;
  const customers = row?.customers ?? 0;

  return {
    revenue,
    ticketsSold,
    customers,
    avgRevenuePerCustomer: customers > 0 ? round2(revenue / customers) : 0,
    avgTicketPrice: ticketsSold > 0 ? round2(revenue / ticketsSold) : 0,
  };
}

async function getAccessibleOrganizationIds(
  userId: string,
): Promise<Types.ObjectId[]> {
  const [ownedOrgs, teamOrgs] = await Promise.all([
    Organization.find({ ownerId: new Types.ObjectId(userId) })
      .select("_id")
      .lean<{ _id: Types.ObjectId }[]>(),

    OrgTeam.find({
      userId: new Types.ObjectId(userId),
      status: "active",
    })
      .select("organizationId")
      .lean<{ organizationId: Types.ObjectId }[]>(),
  ]);

  const seen = new Set<string>();
  const ids: Types.ObjectId[] = [];

  for (const org of ownedOrgs) {
    const key = String(org._id);
    if (!seen.has(key)) {
      seen.add(key);
      ids.push(org._id);
    }
  }

  for (const member of teamOrgs) {
    const key = String(member.organizationId);
    if (!seen.has(key)) {
      seen.add(key);
      ids.push(member.organizationId);
    }
  }

  return ids;
}

async function resolveScopeContext(input: {
  userId: string;
  eventId?: string;
  orgId?: string;
}): Promise<ScopeContext | { error: string; status: number }> {
  if (input.eventId) {
    const eventDoc = await Event.findById(input.eventId)
      .select("_id title organizationId createdByUserId")
      .lean<{
        _id: Types.ObjectId;
        title: string;
        organizationId: Types.ObjectId;
        createdByUserId: Types.ObjectId;
      } | null>();

    if (!eventDoc) {
      return { error: "Event not found.", status: 404 };
    }

    const accessibleOrgIds = await getAccessibleOrganizationIds(input.userId);
    const canAccess =
      String(eventDoc.createdByUserId) === String(input.userId) ||
      accessibleOrgIds.some(
        (orgId) => String(orgId) === String(eventDoc.organizationId),
      );

    if (!canAccess) {
      return { error: "Forbidden.", status: 403 };
    }

    return {
      scope: "event",
      eventId: input.eventId,
      eventDoc: { _id: eventDoc._id, title: eventDoc.title },
      eventIds: [eventDoc._id],
      organizationDoc: null,
    };
  }

  if (input.orgId) {
    const orgDoc = await Organization.findById(input.orgId)
      .select("_id name ownerId")
      .lean<{
        _id: Types.ObjectId;
        name: string;
        ownerId: Types.ObjectId;
      } | null>();

    if (!orgDoc) {
      return { error: "Organization not found.", status: 404 };
    }

    const accessibleOrgIds = await getAccessibleOrganizationIds(input.userId);
    const canAccess =
      String(orgDoc.ownerId) === String(input.userId) ||
      accessibleOrgIds.some((orgId) => String(orgId) === String(orgDoc._id));

    if (!canAccess) {
      return { error: "Forbidden.", status: 403 };
    }

    const eventIds = await Event.find({ organizationId: orgDoc._id })
      .select("_id")
      .lean<{ _id: Types.ObjectId }[]>();

    return {
      scope: "organization",
      eventId: undefined,
      eventDoc: null,
      eventIds: objectIdArray(eventIds.map((item) => item._id)),
      organizationDoc: { _id: orgDoc._id, name: orgDoc.name },
    };
  }

  const accessibleOrgIds = await getAccessibleOrganizationIds(input.userId);

  const createdEventIds = await Event.find({
    createdByUserId: new Types.ObjectId(input.userId),
  })
    .select("_id")
    .lean<{ _id: Types.ObjectId }[]>();

  const orgEventIds =
    accessibleOrgIds.length > 0
      ? await Event.find({ organizationId: { $in: accessibleOrgIds } })
          .select("_id")
          .lean<{ _id: Types.ObjectId }[]>()
      : [];

  const seen = new Set<string>();
  const merged: Types.ObjectId[] = [];

  for (const item of [...createdEventIds, ...orgEventIds]) {
    const key = String(item._id);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(item._id);
    }
  }

  return {
    scope: "global",
    eventId: undefined,
    eventDoc: null,
    eventIds: merged,
    organizationDoc: null,
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
    orgId: url.searchParams.get("orgId") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid analytics query." },
      { status: 400 },
    );
  }

  const scopeContext = await resolveScopeContext({
    userId: session.user.id,
    eventId: parsed.data.eventId,
    orgId: parsed.data.orgId,
  });

  if ("error" in scopeContext) {
    return NextResponse.json(
      { error: scopeContext.error },
      { status: scopeContext.status },
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

  const granularity = chooseGranularity(start, end);
  const revenueMatch = makeRevenueMatch(scopeContext.eventIds, start, end);

  const todayStart = startOfUtcDay(now);
  const todayEnd = endOfUtcDay(now);
  const previousDayStart = new Date(todayStart.getTime() - 86_400_000);
  const previousDayEnd = new Date(todayEnd.getTime() - 86_400_000);

  const [totalsSnapshot, todaySnapshot, previousDaySnapshot] =
    await Promise.all([
      getTotalsSnapshot(scopeContext.eventIds, start, end),
      getTotalsSnapshot(scopeContext.eventIds, todayStart, todayEnd),
      getTotalsSnapshot(
        scopeContext.eventIds,
        previousDayStart,
        previousDayEnd,
      ),
    ]);

  const [seriesRows, hourlyRows, ticketTypeRows, peakRows] = await Promise.all([
    Ticket.aggregate<RevenueSeriesRow>([
      { $match: revenueMatch },
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
          revenue: { $sum: "$price" },
          ticketsSold: { $sum: 1 },
          customersSet: { $addToSet: "$ownerId" },
        },
      },
      {
        $project: {
          _id: 1,
          revenue: 1,
          ticketsSold: 1,
          customers: { $size: "$customersSet" },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    Ticket.aggregate<HourlyRevenueRow>([
      { $match: makeRevenueMatch(scopeContext.eventIds, todayStart, todayEnd) },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%H",
              date: "$createdAt",
              timezone: "UTC",
            },
          },
          revenue: { $sum: "$price" },
          ticketsSold: { $sum: 1 },
          customersSet: { $addToSet: "$ownerId" },
        },
      },
      {
        $project: {
          _id: 1,
          revenue: 1,
          ticketsSold: 1,
          customers: { $size: "$customersSet" },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    Ticket.aggregate<TicketTypeRevenueRow>([
      { $match: revenueMatch },
      {
        $group: {
          _id: {
            $ifNull: [
              {
                $cond: [
                  {
                    $gt: [
                      { $strLenCP: { $ifNull: ["$ticketTypeLabel", ""] } },
                      0,
                    ],
                  },
                  "$ticketTypeLabel",
                  "$ticketType",
                ],
              },
              "General",
            ],
          },
          value: { $sum: "$price" },
        },
      },
      { $sort: { value: -1 } },
      { $limit: 8 },
    ]),

    Ticket.aggregate<PeakRevenueRow>([
      {
        $match: makeRevenueMatch(
          scopeContext.eventIds,
          startOfUtcDay(
            new Date(Math.max(start.getTime(), end.getTime() - 6 * 86_400_000)),
          ),
          end,
        ),
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
              timezone: "UTC",
            },
          },
          revenue: { $sum: "$price" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const seriesBase = buildSeriesBuckets(start, end, granularity);
  const seriesMap = new Map(seriesRows.map((row) => [row._id, row]));

  const series = seriesBase.map((bucket) => {
    const row = seriesMap.get(bucket.bucket);
    const customers = row?.customers ?? 0;
    const ticketsSold = row?.ticketsSold ?? 0;
    const revenue = round2(row?.revenue ?? 0);

    return {
      bucket: bucket.bucket,
      date: bucket.date,
      label: bucket.label,
      revenue,
      ticketsSold,
      customers,
      avgRevenuePerCustomer: customers > 0 ? round2(revenue / customers) : 0,
      avgTicketPrice: ticketsSold > 0 ? round2(revenue / ticketsSold) : 0,
    };
  });

  const hourlyBase = buildHourlyBuckets(now);
  const hourlyMap = new Map(hourlyRows.map((row) => [row._id, row]));

  const intraday = hourlyBase.map((bucket) => {
    const row = hourlyMap.get(bucket.bucket);
    const customers = row?.customers ?? 0;
    const ticketsSold = row?.ticketsSold ?? 0;
    const revenue = round2(row?.revenue ?? 0);

    return {
      bucket: bucket.bucket,
      date: bucket.date,
      label: bucket.label,
      revenue,
      ticketsSold,
      customers,
      avgRevenuePerCustomer: customers > 0 ? round2(revenue / customers) : 0,
      avgTicketPrice: ticketsSold > 0 ? round2(revenue / ticketsSold) : 0,
    };
  });

  const ticketTypeBreakdown = ticketTypeRows.map((row, index) => ({
    label: row._id || "General",
    value: round2(row.value ?? 0),
    color: revenueSegmentColor(index),
  }));

  const peakBase = buildPeakBuckets(end);
  const peakMap = new Map(
    peakRows.map((row) => [row._id, round2(row.revenue)]),
  );

  const peakDays = peakBase.map((bucket) => ({
    date: bucket.date,
    label: bucket.label,
    revenue: peakMap.get(bucket.bucket) ?? 0,
  }));

  const highestRevenueBucket = [...series].sort(
    (a, b) => b.revenue - a.revenue,
  )[0];

  return NextResponse.json({
    ok: true,
    scope: {
      type: scopeContext.scope,
    },
    ...(scopeContext.eventDoc
      ? {
          event: {
            id: String(scopeContext.eventDoc._id),
            title: scopeContext.eventDoc.title,
          },
        }
      : {}),
    ...(scopeContext.organizationDoc
      ? {
          organization: {
            id: String(scopeContext.organizationDoc._id),
            name: scopeContext.organizationDoc.name,
          },
        }
      : {}),
    range: {
      start: start.toISOString(),
      end: end.toISOString(),
      granularity,
    },
    totals: {
      revenue: totalsSnapshot.revenue,
      ticketsSold: totalsSnapshot.ticketsSold,
      customers: totalsSnapshot.customers,
      avgRevenuePerCustomer: totalsSnapshot.avgRevenuePerCustomer,
      avgTicketPrice: totalsSnapshot.avgTicketPrice,
    },
    comparisons: {
      revenuePct: percentDeltaVsPrevious(
        todaySnapshot.revenue,
        previousDaySnapshot.revenue,
      ),
      ticketsSoldPct: percentDeltaVsPrevious(
        todaySnapshot.ticketsSold,
        previousDaySnapshot.ticketsSold,
      ),
      customersPct: percentDeltaVsPrevious(
        todaySnapshot.customers,
        previousDaySnapshot.customers,
      ),
      avgRevenuePerCustomerPct: percentDeltaVsPrevious(
        todaySnapshot.avgRevenuePerCustomer,
        previousDaySnapshot.avgRevenuePerCustomer,
      ),
      avgTicketPricePct: percentDeltaVsPrevious(
        todaySnapshot.avgTicketPrice,
        previousDaySnapshot.avgTicketPrice,
      ),
      baseline: {
        today: todayStart.toISOString(),
        previousDay: previousDayStart.toISOString(),
      },
    },
    today: {
      revenue: todaySnapshot.revenue,
      ticketsSold: todaySnapshot.ticketsSold,
      customers: todaySnapshot.customers,
      avgRevenuePerCustomer: todaySnapshot.avgRevenuePerCustomer,
      avgTicketPrice: todaySnapshot.avgTicketPrice,
    },
    intraday,
    series,
    ticketTypeBreakdown,
    peakDays,
    mapData: [] as Array<{
      key: string;
      label: string;
      revenue: number;
      viewers: number;
      tickets: number;
    }>,
    highlights: {
      highestRevenueBucket: highestRevenueBucket
        ? {
            bucket: highestRevenueBucket.bucket,
            date: highestRevenueBucket.date,
            label: highestRevenueBucket.label,
            revenue: highestRevenueBucket.revenue,
          }
        : null,
      topTicketType: ticketTypeBreakdown[0]
        ? {
            label: ticketTypeBreakdown[0].label,
            revenue: ticketTypeBreakdown[0].value,
          }
        : null,
    },
  });
}
