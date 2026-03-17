import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";

import { auth } from "@/lib/auth";
import { requireEventPermission } from "@/lib/eventAccess";

import TicketType from "@/models/TicketType";
import { ticketTypeBodySchema } from "../schema";

const partialSchema = ticketTypeBodySchema.partial();

/* ------------------------------ GET ------------------------------ */

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; ticketTypeId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId, ticketTypeId } = await params;

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

  const doc = await TicketType.findOne({
    _id: ticketTypeId,
    eventId,
  })
    .lean()
    .exec();

  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(doc);
}

/* ------------------------------ PATCH ------------------------------ */

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; ticketTypeId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId, ticketTypeId } = await params;

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

  const update: Record<string, unknown> = { ...rest };

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
    { _id: ticketTypeId, eventId },
    update,
    { new: true },
  )
    .lean()
    .exec();

  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(doc);
}

/* ------------------------------ DELETE ------------------------------ */

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; ticketTypeId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId, ticketTypeId } = await params;

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

  await TicketType.deleteOne({
    _id: ticketTypeId,
    eventId,
  }).exec();

  return NextResponse.json({ ok: true });
}
