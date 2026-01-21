// src/app/api/events/[id]/ticket-types/route.ts
import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";

import { auth } from "@/lib/auth";
import Event, { type IEvent } from "@/models/Event";
import TicketType from "@/models/TicketType";
import { ticketTypeBodySchema } from "./schema";
import { z } from "zod";

/* -------------------------- Helper: load event ------------------------- */

async function loadOwnedEvent(
  eventId: string,
  userId: string,
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

const reorderSchema = z.object({
  order: z.array(z.string().regex(/^[a-f\d]{24}$/i, "Invalid id")).min(1),
});

/* ------------------------------ GET (list) ----------------------------- */

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;

  const ownership = await loadOwnedEvent(eventId, session.user.id);
  if (!ownership.ok) return ownership.res;

  // Sort by user-defined order first; fallback stable by createdAt
  const ticketTypes = await TicketType.find({ eventId })
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean()
    .exec();

  return NextResponse.json(ticketTypes);
}

/* ------------------------------ POST (create) ----------------------------- */

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

  // Put new ticket types at the end of the list
  const last = await TicketType.findOne({ eventId })
    .sort({ sortOrder: -1, createdAt: -1 })
    .select("sortOrder")
    .lean()
    .exec();

  const nextSortOrder = (Number(last?.sortOrder ?? 0) || 0) + 1;

  const doc = await TicketType.create({
    ...rest,
    checkout,
    design,
    sortOrder: nextSortOrder,
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

/* ------------------------------ PATCH (reorder) ----------------------------- */
/**
 * Body: { order: string[] } // array of ticketTypeIds in the desired order
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;

  const ownership = await loadOwnedEvent(eventId, session.user.id);
  if (!ownership.ok) return ownership.res;

  const json = await req.json();
  const parsed = reorderSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  // Ensure unique ids (prevent duplicates)
  const order = parsed.data.order;
  const unique = new Set(order);
  if (unique.size !== order.length) {
    return NextResponse.json(
      { error: "Order contains duplicate ids." },
      { status: 400 },
    );
  }

  // Ensure all ids belong to this event
  const count = await TicketType.countDocuments({
    eventId,
    _id: { $in: order },
  }).exec();

  if (count !== order.length) {
    return NextResponse.json(
      { error: "Some ticket types do not belong to this event." },
      { status: 400 },
    );
  }

  const ops = order.map((id, idx) => ({
    updateOne: {
      filter: { _id: id, eventId },
      update: { $set: { sortOrder: idx } },
    },
  }));

  await TicketType.bulkWrite(ops, { ordered: false });

  return NextResponse.json({ ok: true });
}
