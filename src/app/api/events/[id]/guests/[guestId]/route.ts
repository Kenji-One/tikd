import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";

import { auth } from "@/lib/auth";
import {
  requireEventGuestCheckInAccess,
  requireEventGuestManageAccess,
} from "@/lib/eventAccess";

import Ticket from "@/models/Ticket";
import EventGuest from "@/models/EventGuest";
import type { Types } from "mongoose";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */
const isObjectId = (val: string): boolean => /^[a-f\d]{24}$/i.test(val);

type SessionLike = {
  user?: {
    id?: string | null;
    email?: string | null;
  } | null;
} | null;

type GuestStatus = "checked_in" | "pending_arrival";

/* ------------------------------------------------------------------ */
/* PATCH /api/events/:id/guests/:guestId                              */
/* ------------------------------------------------------------------ */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; guestId: string }> },
) {
  const session = (await auth()) as SessionLike;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId, guestId } = await params;
  if (!isObjectId(eventId) || !isObjectId(guestId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const access = await requireEventGuestCheckInAccess({
    eventId,
    userId: String(session.user.id),
    email: session.user.email ?? undefined,
  });

  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    status?: GuestStatus;
  } | null;

  const status = body?.status;

  if (status !== "checked_in" && status !== "pending_arrival") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const manual = await EventGuest.findOne({ _id: guestId, eventId }).exec();
  if (manual) {
    manual.status = status;
    await manual.save();
    return NextResponse.json({ ok: true });
  }

  const ticket = await Ticket.findOne({ _id: guestId, eventId })
    .select({ _id: 1, ownerId: 1, orderId: 1 })
    .lean<{
      _id: Types.ObjectId;
      ownerId: Types.ObjectId;
      orderId?: unknown;
    } | null>()
    .exec();

  if (!ticket) {
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  }

  const match: Record<string, unknown> = {
    eventId,
    ownerId: ticket.ownerId,
    status: { $in: ["paid", "scanned"] },
  };

  if (ticket.orderId) match.orderId = ticket.orderId;

  const nextTicketStatus = status === "checked_in" ? "scanned" : "paid";

  await Ticket.updateMany(match, { $set: { status: nextTicketStatus } }).exec();

  return NextResponse.json({ ok: true });
}

/* ------------------------------------------------------------------ */
/* DELETE /api/events/:id/guests/:guestId                             */
/* ------------------------------------------------------------------ */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; guestId: string }> },
) {
  const session = (await auth()) as SessionLike;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId, guestId } = await params;
  if (!isObjectId(eventId) || !isObjectId(guestId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const access = await requireEventGuestManageAccess({
    eventId,
    userId: String(session.user.id),
    email: session.user.email ?? undefined,
  });

  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  const doc = await EventGuest.findOneAndDelete({
    _id: guestId,
    eventId,
  }).exec();

  if (!doc) {
    return NextResponse.json(
      { error: "Only manual guests can be removed (or guest not found)." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
