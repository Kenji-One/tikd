import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";

import { auth } from "@/lib/auth";
import Event from "@/models/Event";
import Organization from "@/models/Organization";
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
  } | null;
} | null;

type EventPermLean = {
  _id: Types.ObjectId;
  organizationId?: Types.ObjectId | null;
  createdByUserId?: Types.ObjectId | null;
};

type OrgPermLean = {
  _id: Types.ObjectId;
  ownerId?: Types.ObjectId | null;
};

async function ensureCanManageEvent(eventId: string, userId: string) {
  const event = await Event.findById(eventId)
    .select({ _id: 1, organizationId: 1, createdByUserId: 1 })
    .lean<EventPermLean | null>()
    .exec();

  if (!event) {
    return {
      ok: false as const,
      res: NextResponse.json({ error: "Event not found" }, { status: 404 }),
    };
  }

  const isCreator =
    event.createdByUserId != null &&
    String(event.createdByUserId) === String(userId);

  let isOrgOwner = false;

  if (event.organizationId) {
    const org = await Organization.findById(event.organizationId)
      .select({ _id: 1, ownerId: 1 })
      .lean<OrgPermLean | null>()
      .exec();

    isOrgOwner = org?.ownerId != null && String(org.ownerId) === String(userId);
  }

  if (!isCreator && !isOrgOwner) {
    return {
      ok: false as const,
      res: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true as const };
}

type GuestStatus = "checked_in" | "pending_arrival";

/* ------------------------------------------------------------------ */
/* PATCH /api/events/:id/guests/:guestId                               */
/* Body: { status: "checked_in" | "pending_arrival" }                  */
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

  const perm = await ensureCanManageEvent(eventId, String(session.user.id));
  if (!perm.ok) return perm.res;

  const body = (await req.json().catch(() => null)) as {
    status?: GuestStatus;
  } | null;

  const status = body?.status;

  if (status !== "checked_in" && status !== "pending_arrival") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // 1) Try manual guest first
  const manual = await EventGuest.findOne({ _id: guestId, eventId }).exec();
  if (manual) {
    manual.status = status;
    await manual.save();
    return NextResponse.json({ ok: true });
  }

  // 2) Otherwise treat as a ticket row id (firstTicketId)
  // We'll update *that buyer's* tickets:
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

  // If orderId exists, apply within that order; else apply to all paid/scanned for that owner in event
  if (ticket.orderId) match.orderId = ticket.orderId;

  // checked_in => scanned, pending_arrival => paid
  const nextTicketStatus = status === "checked_in" ? "scanned" : "paid";

  await Ticket.updateMany(match, { $set: { status: nextTicketStatus } }).exec();

  return NextResponse.json({ ok: true });
}

/* ------------------------------------------------------------------ */
/* DELETE /api/events/:id/guests/:guestId                              */
/* Only manual guests can be removed                                   */
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

  const perm = await ensureCanManageEvent(eventId, String(session.user.id));
  if (!perm.ok) return perm.res;

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
