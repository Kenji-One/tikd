/* ------------------------------------------------------------------ */
/*  src/app/api/dashboard/upcoming-events/route.ts                    */
/* ------------------------------------------------------------------ */
import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";
import { Types } from "mongoose";

import { auth } from "@/lib/auth";
import Event from "@/models/Event";
import Ticket from "@/models/Ticket";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ------------------------------ utils ------------------------------ */
const isObjectId = (val: string): boolean => /^[a-f\d]{24}$/i.test(val);

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function formatDateTimeLabel(d: Date) {
  // "May 21, 2025 6:00 PM"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function formatEventDateLabel(d: Date) {
  // "24 JUN, 2026"
  const dd = String(d.getDate()).padStart(2, "0");
  const mon = new Intl.DateTimeFormat("en-US", { month: "short" })
    .format(d)
    .toUpperCase();
  const yyyy = d.getFullYear();
  return `${dd} ${mon}, ${yyyy}`;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

type EventLean = {
  _id: Types.ObjectId;
  title: string;
  date: Date;
  endDate?: Date | null;
  image?: string;
  pageViews?: number;
  views?: number;
};

type TicketAggRow = {
  _id: Types.ObjectId; // eventId
  ticketsSold: number;
  revenueNumber: number;
};

async function getTicketMetricsByEventIds(eventIds: Types.ObjectId[]) {
  const map = new Map<string, { ticketsSold: number; revenueNumber: number }>();
  if (eventIds.length === 0) return map;

  // Best-effort amount expression (same logic you had, but done ONCE for all eventIds)
  const amountExpr = {
    $ifNull: [
      "$amount",
      {
        $ifNull: [
          "$total",
          {
            $ifNull: [
              "$price",
              {
                $ifNull: ["$paidAmount", { $ifNull: ["$totalAmount", 0] }],
              },
            ],
          },
        ],
      },
    ],
  };

  const agg = await Ticket.aggregate<TicketAggRow>([
    { $match: { eventId: { $in: eventIds }, status: "paid" } },
    {
      $project: {
        eventId: 1,
        amt: {
          $convert: {
            input: amountExpr,
            to: "double",
            onError: 0,
            onNull: 0,
          },
        },
      },
    },
    {
      $group: {
        _id: "$eventId",
        ticketsSold: { $sum: 1 },
        revenueNumber: { $sum: "$amt" },
      },
    },
  ]);

  for (const r of agg) {
    map.set(String(r._id), {
      ticketsSold: Number.isFinite(r.ticketsSold) ? r.ticketsSold : 0,
      revenueNumber: Number.isFinite(r.revenueNumber) ? r.revenueNumber : 0,
    });
  }

  return map;
}

/* ------------------------------- GET ------------------------------- */
/**
 * GET /api/dashboard/upcoming-events?limit=4
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userIdRaw = String(session.user.id || "");
    if (!isObjectId(userIdRaw)) {
      return NextResponse.json(
        { error: "Invalid session user id" },
        { status: 400 },
      );
    }
    const userId = new Types.ObjectId(userIdRaw);

    const { searchParams } = new URL(req.url);
    const limit = clampInt(Number(searchParams.get("limit") ?? 4), 1, 20);

    const now = new Date();

    // Upcoming filter (supports multi-day)
    const upcomingFilter = {
      $or: [
        { endDate: { $gte: now } }, // multi-day still ongoing
        { endDate: { $exists: false }, date: { $gte: now } }, // no endDate
        { endDate: null, date: { $gte: now } }, // endDate explicitly null
      ],
    };

    const events = await Event.find({
      createdByUserId: userId,
      ...upcomingFilter,
    })
      .select("_id title date endDate image pageViews views")
      .sort({ date: 1 })
      .limit(limit)
      .lean<EventLean[]>();

    const eventIds = events.map((e) => e._id);
    const metricsByEventId = await getTicketMetricsByEventIds(eventIds);

    const rows = events.map((e) => {
      const m = metricsByEventId.get(String(e._id)) ?? {
        ticketsSold: 0,
        revenueNumber: 0,
      };

      const dateObj = new Date(e.date);
      const eventDateMs = dateObj.getTime();

      const pageViews =
        (typeof e.pageViews === "number" ? e.pageViews : undefined) ??
        (typeof e.views === "number" ? e.views : undefined) ??
        0;

      return {
        id: String(e._id),
        title: e.title,
        dateLabel: formatDateTimeLabel(dateObj),
        pageViews,
        tickets: m.ticketsSold,
        revenue: formatCurrency(m.revenueNumber),
        eventDateLabel: formatEventDateLabel(dateObj),
        eventDateMs,
        img: e.image ?? null,
      };
    });

    // Small private cache helps refresh/back without risking shared-user caching
    return NextResponse.json(
      { rows },
      {
        headers: {
          "Cache-Control": "private, max-age=15, stale-while-revalidate=60",
        },
      },
    );
  } catch (err: unknown) {
    console.error("GET /api/dashboard/upcoming-events failed", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
