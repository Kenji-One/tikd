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
  // Note: assumes tickets store a currency amount in the same unit you want to display.
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

/**
 * Best-effort revenue extraction:
 * We try common numeric fields on Ticket docs (amount/total/price/paidAmount/totalAmount),
 * convert to double safely, and sum.
 *
 * If your Ticket schema uses cents (e.g. 12345 = $123.45), adjust conversion here.
 */
async function getTicketMetrics(eventId: Types.ObjectId) {
  const ticketsSold = await Ticket.countDocuments({
    eventId,
    status: "paid",
  });

  const revenueAgg = await Ticket.aggregate<{
    _id: null;
    sum: number;
  }>([
    { $match: { eventId, status: "paid" } },
    {
      $project: {
        _amt: {
          $ifNull: [
            "$amount",
            {
              $ifNull: [
                "$total",
                {
                  $ifNull: [
                    "$price",
                    {
                      $ifNull: [
                        "$paidAmount",
                        { $ifNull: ["$totalAmount", 0] },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    },
    {
      $project: {
        amt: {
          $convert: {
            input: "$_amt",
            to: "double",
            onError: 0,
            onNull: 0,
          },
        },
      },
    },
    { $group: { _id: null, sum: { $sum: "$amt" } } },
  ]);

  const revenueNumber = revenueAgg?.[0]?.sum ?? 0;

  return { ticketsSold, revenueNumber };
}

/* ------------------------------- GET ------------------------------- */
/**
 * GET /api/dashboard/upcoming-events?limit=4
 * Returns rows ready for the UpcomingEventsTable.
 *
 * Shows events created by the current user that are upcoming:
 * - date in the future, OR
 * - multi-day event with endDate still in the future
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = clampInt(Number(searchParams.get("limit") ?? 4), 1, 20);

  const now = new Date();

  // Upcoming filter (supports multi-day)
  const upcomingFilter = {
    $or: [
      { endDate: { $gte: now } },
      { endDate: { $exists: false }, date: { $gte: now } },
      { endDate: null as unknown as undefined, date: { $gte: now } },
    ],
  };

  const events = await Event.find({
    createdByUserId: session.user.id,
    ...upcomingFilter,
  })
    .sort({ date: 1 })
    .limit(limit)
    .lean<
      {
        _id: Types.ObjectId;
        title: string;
        date: Date;
        endDate?: Date;
        image?: string;
        pageViews?: number;
        views?: number;
      }[]
    >();

  const rows = await Promise.all(
    events.map(async (e) => {
      const eventId = new Types.ObjectId(e._id);

      const { ticketsSold, revenueNumber } = await getTicketMetrics(eventId);

      const pageViews =
        (typeof e.pageViews === "number" ? e.pageViews : undefined) ??
        (typeof e.views === "number" ? e.views : undefined) ??
        0;

      const dateObj = new Date(e.date);
      const eventDateMs = dateObj.getTime();

      return {
        id: String(e._id),
        title: e.title,
        dateLabel: formatDateTimeLabel(dateObj),
        pageViews,
        tickets: ticketsSold,
        revenue: formatCurrency(revenueNumber),
        eventDateLabel: formatEventDateLabel(dateObj),
        eventDateMs,
        img: e.image ?? null,
      };
    }),
  );

  return NextResponse.json({ rows });
}
