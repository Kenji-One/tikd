import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";

import { connectDB } from "@/lib/db";
import { auth } from "@/lib/auth";
import Event from "@/models/Event";
import Ticket from "@/models/Ticket";
import Order from "@/models/Order";
import { listAuthorizedOrganizationIdsForUser } from "@/lib/orgAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "auto";
export const maxDuration = 15;

const QuerySchema = z
  .object({
    eventId: z.string().trim().optional(),
    orgId: z.string().trim().optional(),
    start: z.string().datetime(),
    end: z.string().datetime(),
  })
  .refine((data) => !(data.eventId && data.orgId), {
    message: "Provide either eventId or orgId, not both.",
    path: ["orgId"],
  });

type SoldTicketLean = {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  ownerId: Types.ObjectId;
  orderId?: Types.ObjectId | null;
  ticketTypeLabel?: string;
  ticketType?: string;
  status: "reserved" | "paid" | "scanned" | "cancelled" | "refunded";
  createdAt: Date;
};

type PaidOrderLean = {
  _id: Types.ObjectId;
  createdAt: Date;
};

type EventPreview = {
  _id: Types.ObjectId;
  title: string;
  organizationId: Types.ObjectId;
  createdByUserId: Types.ObjectId;
};

type MetricSet = {
  ticketsSold: number;
  uniqueCustomers: number;
  recurringCustomers: number;
  avgTicketsPerOrder: number;
  conversionRate: number;
};

const SOLD_STATUSES = new Set(["paid", "scanned"] as const);

const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const WEEKDAY_LABELS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;

const DONUT_COLORS = [
  "#FF7B45",
  "#FF454A",
  "#9A46FF",
  "#45FF79",
  "#3B82F6",
  "#F59E0B",
  "#EC4899",
  "#14B8A6",
] as const;

function isValidObjectId(value?: string | null): boolean {
  return !!value && Types.ObjectId.isValid(value);
}

function toObjectId(value: string): Types.ObjectId {
  return new Types.ObjectId(value);
}

function toUtcStartOfDay(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );
}

function toUtcEndOfDay(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function diffDaysInclusive(start: Date, end: Date): number {
  const ms = toUtcStartOfDay(end).getTime() - toUtcStartOfDay(start).getTime();
  return Math.floor(ms / 86_400_000) + 1;
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: "short",
  });
}

function formatHourLabel(hour: number): string {
  const date = new Date(Date.UTC(2026, 0, 1, hour, 0, 0, 0));
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    hour12: true,
  });
}

function formatDateKeyDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDateKeyMonth(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function percentDelta(current: number, previous: number): number {
  const safeCurrent = Number.isFinite(current) ? current : 0;
  const safePrevious = Number.isFinite(previous) ? previous : 0;

  if (safePrevious <= 0) {
    if (safeCurrent <= 0) return 0;
    return 100;
  }

  return Number(
    (((safeCurrent - safePrevious) / safePrevious) * 100).toFixed(1),
  );
}

function roundOne(value: number): number {
  return Number((Number.isFinite(value) ? value : 0).toFixed(1));
}

function getScopeType(eventId?: string, orgId?: string) {
  if (eventId) return "event" as const;
  if (orgId) return "organization" as const;
  return "global" as const;
}

function buildEmptyPeakDays() {
  return WEEKDAY_KEYS.map((key, index) => ({
    key,
    label: WEEKDAY_LABELS[index]!,
    ticketsSold: 0,
  }));
}

function safeTicketTypeLabel(ticket: SoldTicketLean): string {
  const raw = (ticket.ticketTypeLabel || ticket.ticketType || "General").trim();
  return raw || "General";
}

function computeMetrics(
  tickets: SoldTicketLean[],
  orders: PaidOrderLean[],
  pageViewsForConversion = 0,
): MetricSet {
  const ticketsSold = tickets.length;

  const customerCounts = new Map<string, number>();
  for (const ticket of tickets) {
    const ownerKey = String(ticket.ownerId);
    customerCounts.set(ownerKey, (customerCounts.get(ownerKey) ?? 0) + 1);
  }

  const uniqueCustomers = customerCounts.size;
  const recurringCustomers = Array.from(customerCounts.values()).filter(
    (count) => count > 1,
  ).length;

  const avgTicketsPerOrder =
    orders.length > 0 ? roundOne(ticketsSold / orders.length) : 0;

  const conversionRate =
    pageViewsForConversion > 0
      ? roundOne((ticketsSold / pageViewsForConversion) * 100)
      : 0;

  return {
    ticketsSold,
    uniqueCustomers,
    recurringCustomers,
    avgTicketsPerOrder,
    conversionRate,
  };
}

function createSeriesBuckets(
  start: Date,
  end: Date,
  granularity: "day" | "month",
): Array<{ key: string; date: Date; label: string }> {
  const buckets: Array<{ key: string; date: Date; label: string }> = [];

  if (granularity === "day") {
    let current = toUtcStartOfDay(start);
    const last = toUtcStartOfDay(end);

    while (current.getTime() <= last.getTime()) {
      buckets.push({
        key: formatDateKeyDay(current),
        date: new Date(current),
        label: current.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
      });
      current = addUtcDays(current, 1);
    }

    return buckets;
  }

  let current = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1, 0, 0, 0, 0),
  );
  const last = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1, 0, 0, 0, 0),
  );

  while (current.getTime() <= last.getTime()) {
    buckets.push({
      key: formatDateKeyMonth(current),
      date: new Date(current),
      label: formatMonthLabel(current),
    });

    current = new Date(
      Date.UTC(
        current.getUTCFullYear(),
        current.getUTCMonth() + 1,
        1,
        0,
        0,
        0,
        0,
      ),
    );
  }

  return buckets;
}

function weekdayIndexMondayFirst(date: Date): number {
  const day = date.getUTCDay();
  return day === 0 ? 6 : day - 1;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = QuerySchema.safeParse(
      Object.fromEntries(req.nextUrl.searchParams.entries()),
    );

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { eventId, orgId, start, end } = parsed.data;

    if (eventId && !isValidObjectId(eventId)) {
      return NextResponse.json({ error: "Invalid eventId" }, { status: 400 });
    }

    if (orgId && !isValidObjectId(orgId)) {
      return NextResponse.json({ error: "Invalid orgId" }, { status: 400 });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (
      !Number.isFinite(startDate.getTime()) ||
      !Number.isFinite(endDate.getTime())
    ) {
      return NextResponse.json(
        { error: "Invalid date range" },
        { status: 400 },
      );
    }

    const normalizedStart =
      startDate.getTime() <= endDate.getTime() ? startDate : endDate;
    const normalizedEnd =
      startDate.getTime() <= endDate.getTime() ? endDate : startDate;

    await connectDB();

    const accessibleOrgIds = await listAuthorizedOrganizationIdsForUser({
      userId: session.user.id,
      email: session.user.email ?? undefined,
    });

    const accessibleOrgIdSet = new Set(
      accessibleOrgIds.map((id) => String(id)),
    );

    const scopeType = getScopeType(eventId, orgId);

    let scopedEventIds: Types.ObjectId[] | null = null;
    let scopedEvent: { _id: Types.ObjectId; title: string } | null = null;

    if (eventId) {
      const foundEvent = await Event.findById(eventId)
        .select("_id title organizationId createdByUserId")
        .lean<EventPreview | null>();

      if (!foundEvent) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }

      const canAccess =
        String(foundEvent.createdByUserId) === String(session.user.id) ||
        accessibleOrgIdSet.has(String(foundEvent.organizationId));

      if (!canAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      scopedEvent = { _id: foundEvent._id, title: foundEvent.title };
      scopedEventIds = [foundEvent._id];
    } else if (orgId) {
      const orgIdStr = String(orgId);
      if (!accessibleOrgIdSet.has(orgIdStr)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const events = await Event.find({ organizationId: toObjectId(orgId) })
        .select("_id")
        .lean<Array<{ _id: Types.ObjectId }>>();

      scopedEventIds = events.map((event) => event._id);
    } else {
      const [createdEvents, orgEvents] = await Promise.all([
        Event.find({ createdByUserId: session.user.id })
          .select("_id")
          .lean<Array<{ _id: Types.ObjectId }>>(),
        accessibleOrgIds.length
          ? Event.find({ organizationId: { $in: accessibleOrgIds } })
              .select("_id")
              .lean<Array<{ _id: Types.ObjectId }>>()
          : Promise.resolve([] as Array<{ _id: Types.ObjectId }>),
      ]);

      const seen = new Set<string>();
      const merged: Types.ObjectId[] = [];

      for (const row of [...createdEvents, ...orgEvents]) {
        const key = String(row._id);
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(row._id);
      }

      scopedEventIds = merged;
    }

    const soldMatch: Record<string, unknown> = {
      status: { $in: Array.from(SOLD_STATUSES) },
      createdAt: {
        $gte: normalizedStart,
        $lte: normalizedEnd,
      },
    };

    const paidOrdersMatch: Record<string, unknown> = {
      status: "paid",
      createdAt: {
        $gte: normalizedStart,
        $lte: normalizedEnd,
      },
    };

    if (scopedEventIds) {
      soldMatch.eventId =
        scopedEventIds.length === 1
          ? scopedEventIds[0]
          : { $in: scopedEventIds };

      paidOrdersMatch.eventId =
        scopedEventIds.length === 1
          ? scopedEventIds[0]
          : { $in: scopedEventIds };
    }

    const soldTickets = await Ticket.find(soldMatch)
      .select(
        "_id eventId ownerId orderId ticketTypeLabel ticketType status createdAt",
      )
      .sort({ createdAt: 1 })
      .lean<SoldTicketLean[]>();

    const paidOrders = await Order.find(paidOrdersMatch)
      .select("_id createdAt")
      .sort({ createdAt: 1 })
      .lean<PaidOrderLean[]>();

    const granularity: "day" | "month" =
      diffDaysInclusive(normalizedStart, normalizedEnd) <= 31 ? "day" : "month";

    const buckets = createSeriesBuckets(
      normalizedStart,
      normalizedEnd,
      granularity,
    );

    const bucketTickets = new Map<string, SoldTicketLean[]>();
    const bucketOrders = new Map<string, PaidOrderLean[]>();

    for (const bucket of buckets) {
      bucketTickets.set(bucket.key, []);
      bucketOrders.set(bucket.key, []);
    }

    for (const ticket of soldTickets) {
      const key =
        granularity === "day"
          ? formatDateKeyDay(ticket.createdAt)
          : formatDateKeyMonth(ticket.createdAt);

      const arr = bucketTickets.get(key);
      if (arr) arr.push(ticket);
    }

    for (const order of paidOrders) {
      const key =
        granularity === "day"
          ? formatDateKeyDay(order.createdAt)
          : formatDateKeyMonth(order.createdAt);

      const arr = bucketOrders.get(key);
      if (arr) arr.push(order);
    }

    const series = buckets.map((bucket) => {
      const metrics = computeMetrics(
        bucketTickets.get(bucket.key) ?? [],
        bucketOrders.get(bucket.key) ?? [],
      );

      return {
        date: bucket.date.toISOString(),
        label: bucket.label,
        ticketsSold: metrics.ticketsSold,
        uniqueCustomers: metrics.uniqueCustomers,
        recurringCustomers: metrics.recurringCustomers,
        avgTicketsPerOrder: metrics.avgTicketsPerOrder,
        conversionRate: metrics.conversionRate,
      };
    });

    const totals = computeMetrics(soldTickets, paidOrders);

    const currentEndDay = toUtcStartOfDay(normalizedEnd);
    const currentStartDay = toUtcStartOfDay(normalizedEnd);
    const previousEndDay = addUtcDays(currentEndDay, -1);
    const previousStartDay = previousEndDay;

    const currentDayTickets = soldTickets.filter(
      (ticket) =>
        formatDateKeyDay(ticket.createdAt) ===
        formatDateKeyDay(currentStartDay),
    );

    const previousDayTickets = soldTickets.filter(
      (ticket) =>
        formatDateKeyDay(ticket.createdAt) ===
        formatDateKeyDay(previousStartDay),
    );

    const currentDayOrders = paidOrders.filter(
      (order) =>
        formatDateKeyDay(order.createdAt) === formatDateKeyDay(currentStartDay),
    );

    const previousDayOrders = paidOrders.filter(
      (order) =>
        formatDateKeyDay(order.createdAt) ===
        formatDateKeyDay(previousStartDay),
    );

    const todayMetrics = computeMetrics(currentDayTickets, currentDayOrders);
    const previousMetrics = computeMetrics(
      previousDayTickets,
      previousDayOrders,
    );

    const comparisons = {
      ticketsSoldPct: percentDelta(
        todayMetrics.ticketsSold,
        previousMetrics.ticketsSold,
      ),
      uniqueCustomersPct: percentDelta(
        todayMetrics.uniqueCustomers,
        previousMetrics.uniqueCustomers,
      ),
      recurringCustomersPct: percentDelta(
        todayMetrics.recurringCustomers,
        previousMetrics.recurringCustomers,
      ),
      avgTicketsPerOrderPct: percentDelta(
        todayMetrics.avgTicketsPerOrder,
        previousMetrics.avgTicketsPerOrder,
      ),
      conversionRatePct: percentDelta(
        todayMetrics.conversionRate,
        previousMetrics.conversionRate,
      ),
      baseline: {
        currentStart: currentStartDay.toISOString(),
        currentEnd: toUtcEndOfDay(currentEndDay).toISOString(),
        previousStart: previousStartDay.toISOString(),
        previousEnd: toUtcEndOfDay(previousEndDay).toISOString(),
      },
    };

    const intradayBuckets = Array.from({ length: 24 }, (_, hour) => ({
      bucket: String(hour),
      date: new Date(
        Date.UTC(
          currentEndDay.getUTCFullYear(),
          currentEndDay.getUTCMonth(),
          currentEndDay.getUTCDate(),
          hour,
          0,
          0,
          0,
        ),
      ),
      label: formatHourLabel(hour),
    }));

    const intradayTicketsMap = new Map<number, SoldTicketLean[]>();
    const intradayOrdersMap = new Map<number, PaidOrderLean[]>();

    for (let hour = 0; hour < 24; hour++) {
      intradayTicketsMap.set(hour, []);
      intradayOrdersMap.set(hour, []);
    }

    for (const ticket of currentDayTickets) {
      const hour = ticket.createdAt.getUTCHours();
      intradayTicketsMap.get(hour)?.push(ticket);
    }

    for (const order of currentDayOrders) {
      const hour = order.createdAt.getUTCHours();
      intradayOrdersMap.get(hour)?.push(order);
    }

    const intraday = intradayBuckets.map((bucket, hour) => {
      const metrics = computeMetrics(
        intradayTicketsMap.get(hour) ?? [],
        intradayOrdersMap.get(hour) ?? [],
      );

      return {
        bucket: bucket.bucket,
        date: bucket.date.toISOString(),
        label: bucket.label,
        ticketsSold: metrics.ticketsSold,
        uniqueCustomers: metrics.uniqueCustomers,
        recurringCustomers: metrics.recurringCustomers,
        avgTicketsPerOrder: metrics.avgTicketsPerOrder,
        conversionRate: metrics.conversionRate,
      };
    });

    const peakDaysSeed = buildEmptyPeakDays();
    for (const ticket of soldTickets) {
      const idx = weekdayIndexMondayFirst(ticket.createdAt);
      peakDaysSeed[idx]!.ticketsSold += 1;
    }

    const trafficTypeCounts = new Map<string, number>();
    for (const ticket of soldTickets) {
      const label = safeTicketTypeLabel(ticket);
      trafficTypeCounts.set(label, (trafficTypeCounts.get(label) ?? 0) + 1);
    }

    const trafficSources =
      trafficTypeCounts.size > 0
        ? Array.from(trafficTypeCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([label, value], index) => ({
              label,
              value,
              color: DONUT_COLORS[index % DONUT_COLORS.length]!,
            }))
        : [{ label: "No Data", value: 0, color: "#8C8CA8" }];

    return NextResponse.json({
      scope: {
        type: scopeType,
        eventId: eventId ?? null,
        orgId: orgId ?? null,
      },
      event: scopedEvent
        ? {
            id: String(scopedEvent._id),
            title: scopedEvent.title,
          }
        : null,
      organization: orgId
        ? {
            id: orgId,
          }
        : null,
      range: {
        start: normalizedStart.toISOString(),
        end: normalizedEnd.toISOString(),
        granularity,
      },
      totals,
      comparisons,
      today: todayMetrics,
      series,
      intraday,
      peakDays: peakDaysSeed,
      trafficSources,
      mapData: [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "Failed to load tickets sold analytics",
        details: message,
      },
      { status: 500 },
    );
  }
}
