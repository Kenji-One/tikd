import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";

import { auth } from "@/lib/auth";
import Event, { type IEvent } from "@/models/Event";
import TicketType from "@/models/TicketType";
import { ticketTypeBodySchema } from "./schema";

/* -------------------------- Helper: load event ------------------------- */

async function loadOwnedEvent(
  eventId: string,
  userId: string
): Promise<{ ok: true; event: IEvent } | { ok: false; res: NextResponse }> {
  const event = await Event.findById(eventId).lean<IEvent>().exec();

  if (!event) {
    return {
      ok: false,
      res: NextResponse.json({ error: "Event not found" }, { status: 404 }),
    };
  }

  if (event.createdByUserId.toString() !== userId) {
    return {
      ok: false,
      res: NextResponse.json({ error: "Event not yours" }, { status: 403 }),
    };
  }

  return { ok: true, event };
}

/* ------------------------------ GET (list) ----------------------------- */

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;

  const ownership = await loadOwnedEvent(eventId, session.user.id);
  if (!ownership.ok) return ownership.res;

  const ticketTypes = await TicketType.find({ eventId })
    .sort({ createdAt: 1 })
    .lean()
    .exec();

  return NextResponse.json(ticketTypes);
}

/* ------------------------------ POST (create) ----------------------------- */

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;

  const ownership = await loadOwnedEvent(eventId, session.user.id);
  if (!ownership.ok) return ownership.res;

  const json = await req.json();
  const parsed = ticketTypeBodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const {
    salesStartAt,
    salesEndAt,
    totalQuantity,
    minPerOrder,
    maxPerOrder,
    checkout,
    design,
    ...rest
  } = parsed.data;

  const doc = await TicketType.create({
    ...rest,
    checkout,
    design,
    totalQuantity: totalQuantity ?? null,
    minPerOrder: minPerOrder ?? null,
    maxPerOrder: maxPerOrder ?? null,
    salesStartAt: salesStartAt ? new Date(salesStartAt) : null,
    salesEndAt: salesEndAt ? new Date(salesEndAt) : null,
    organizationId: ownership.event.organizationId,
    eventId: ownership.event._id,
    createdByUserId: session.user.id,
  });

  return NextResponse.json(doc, { status: 201 });
}
