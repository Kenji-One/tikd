// src/app/api/events/[eventId]/ticket-types/[ticketTypeId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";

import { auth } from "@/lib/auth";
import Event, { type IEvent } from "@/models/Event";
import TicketType from "@/models/TicketType";
import { ticketTypeBodySchema } from "../route";

const partialSchema = ticketTypeBodySchema.partial();

async function ensureEventOwnership(
  userId: string,
  eventId: string
): Promise<boolean> {
  const event = await Event.findOne({
    _id: eventId,
    createdByUserId: userId,
  })
    .lean<IEvent>()
    .exec();

  return !!event;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { eventId: string; ticketTypeId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownsEvent = await ensureEventOwnership(session.user.id, params.eventId);
  if (!ownsEvent) {
    return NextResponse.json(
      { error: "Event not found or not yours" },
      { status: 404 }
    );
  }

  const doc = await TicketType.findOne({
    _id: params.ticketTypeId,
    eventId: params.eventId,
  })
    .lean()
    .exec();

  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(doc);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { eventId: string; ticketTypeId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownsEvent = await ensureEventOwnership(session.user.id, params.eventId);
  if (!ownsEvent) {
    return NextResponse.json(
      { error: "Event not found or not yours" },
      { status: 404 }
    );
  }

  const json = await req.json();
  const parsed = partialSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const {
    salesStartAt,
    salesEndAt,
    totalQuantity,
    minPerOrder,
    maxPerOrder,
    ...rest
  } = parsed.data;

  const update: Record<string, unknown> = {
    ...rest,
  };

  if (salesStartAt !== undefined) {
    update.salesStartAt = salesStartAt ? new Date(salesStartAt) : null;
  }
  if (salesEndAt !== undefined) {
    update.salesEndAt = salesEndAt ? new Date(salesEndAt) : null;
  }
  if (totalQuantity !== undefined) {
    update.totalQuantity = totalQuantity ?? null;
  }
  if (minPerOrder !== undefined) {
    update.minPerOrder = minPerOrder ?? null;
  }
  if (maxPerOrder !== undefined) {
    update.maxPerOrder = maxPerOrder ?? null;
  }

  const doc = await TicketType.findOneAndUpdate(
    { _id: params.ticketTypeId, eventId: params.eventId },
    update,
    { new: true }
  )
    .lean()
    .exec();

  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(doc);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { eventId: string; ticketTypeId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownsEvent = await ensureEventOwnership(session.user.id, params.eventId);
  if (!ownsEvent) {
    return NextResponse.json(
      { error: "Event not found or not yours" },
      { status: 404 }
    );
  }

  await TicketType.deleteOne({
    _id: params.ticketTypeId,
    eventId: params.eventId,
  }).exec();

  return NextResponse.json({ ok: true });
}
