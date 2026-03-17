import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";

import { auth } from "@/lib/auth";
import { requireEventPermission } from "@/lib/eventAccess";

import TicketType from "@/models/TicketType";
import { ticketTypeBodySchema } from "./schema";
import { z } from "zod";

const reorderSchema = z.object({
  order: z.array(z.string().regex(/^[a-f\d]{24}$/i, "Invalid id")).min(1),
});

/* ------------------------------ GET ----------------------------- */

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;

  const access = await requireEventPermission({
    eventId,
    userId: session.user.id,
    email: session.user.email ?? undefined,
    permission: "events.edit",
  });

  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  const ticketTypes = await TicketType.find({ eventId })
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean()
    .exec();

  return NextResponse.json(ticketTypes);
}

/* ------------------------------ POST ----------------------------- */

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;

  const access = await requireEventPermission({
    eventId,
    userId: session.user.id,
    email: session.user.email ?? undefined,
    permission: "events.edit",
  });

  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  const json = await req.json().catch(() => null);
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

  const last = await TicketType.findOne({ eventId })
    .sort({ sortOrder: -1, createdAt: -1 })
    .select("sortOrder")
    .lean<{ sortOrder?: number } | null>()
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
    organizationId: access.actor.event.organizationId,
    eventId: access.actor.event._id,
    createdByUserId: session.user.id,
  });

  return NextResponse.json(doc, { status: 201 });
}

/* ------------------------------ PATCH (reorder) ----------------------------- */

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;

  const access = await requireEventPermission({
    eventId,
    userId: session.user.id,
    email: session.user.email ?? undefined,
    permission: "events.edit",
  });

  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = reorderSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const order = parsed.data.order;
  const unique = new Set(order);
  if (unique.size !== order.length) {
    return NextResponse.json(
      { error: "Order contains duplicate ids." },
      { status: 400 },
    );
  }

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
