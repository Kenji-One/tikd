// src/app/api/organizations/[id]/events/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import "@/lib/mongoose";
import Event, { IEvent } from "@/models/Event";
import { serialize } from "@/lib/serialize";

type EventLean = Omit<IEvent, "_id" | "organizationId" | "createdByUserId"> & {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  createdByUserId: mongoose.Types.ObjectId;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  /* --------------- query params -------------------------------------- */
  const search = req.nextUrl.searchParams;
  const page = Math.max(Number(search.get("page") ?? 1), 1);
  const limit = Math.min(Math.max(Number(search.get("limit") ?? 10), 1), 50);
  const status = search.get("status") as "upcoming" | "past" | "all" | null;

  const now = new Date();
  const dateFilter =
    status === "past"
      ? { $lte: now }
      : status === "upcoming"
        ? { $gt: now }
        : undefined;

  const filter: Record<string, unknown> = { organizationId: id };
  if (dateFilter) filter.date = dateFilter;

  /* --------------- query + pagination -------------------------------- */
  const total = await Event.countDocuments(filter);
  const events = await Event.find(filter)
    .sort({ date: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean<EventLean[]>()
    .exec();

  return NextResponse.json({
    page,
    total,
    pages: Math.ceil(total / limit),
    items: events.map(serialize),
  });
}
