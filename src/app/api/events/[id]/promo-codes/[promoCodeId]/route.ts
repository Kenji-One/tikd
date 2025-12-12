import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";

import { auth } from "@/lib/auth";
import Event, { type IEvent } from "@/models/Event";
import PromoCode from "@/models/PromoCode";
import { Types } from "mongoose";
import { promoBodySchema } from "../schema";

const partialSchema = promoBodySchema.partial();

/* --------------------------- helper --------------------------- */

async function ensureEventOwnership(
  userId: string,
  eventId: string
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

/* ------------------------------ GET ------------------------------ */

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; promoCodeId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId, promoCodeId } = await params;

  const ownership = await ensureEventOwnership(session.user.id, eventId);
  if (!ownership.ok) return ownership.res;

  const promo = await PromoCode.findOne({
    _id: promoCodeId,
    eventId,
  })
    .lean()
    .exec();

  if (!promo) {
    return NextResponse.json(
      { error: "Promo code not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(promo);
}

/* ------------------------------ PATCH ------------------------------ */

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; promoCodeId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId, promoCodeId } = await params;

  const ownership = await ensureEventOwnership(session.user.id, eventId);
  if (!ownership.ok) return ownership.res;

  const json = await req.json();
  const parsed = partialSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const { validFrom, validUntil, applicableTicketTypeIds, ...rest } =
    parsed.data;

  const update: Record<string, unknown> = { ...rest };

  if (validFrom !== undefined) {
    update.validFrom = validFrom ? new Date(validFrom) : null;
  }
  if (validUntil !== undefined) {
    update.validUntil = validUntil ? new Date(validUntil) : null;
  }
  if (applicableTicketTypeIds !== undefined) {
    update.applicableTicketTypeIds = (applicableTicketTypeIds || []).map(
      (id) => new Types.ObjectId(id)
    );
  }

  if (typeof update.code === "string") {
    update.code = update.code.trim().toUpperCase();
  }

  const promo = await PromoCode.findOneAndUpdate(
    { _id: promoCodeId, eventId },
    update,
    { new: true }
  )
    .lean()
    .exec();

  if (!promo) {
    return NextResponse.json(
      { error: "Promo code not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(promo);
}

/* ------------------------------ DELETE ------------------------------ */

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; promoCodeId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId, promoCodeId } = await params;

  const ownership = await ensureEventOwnership(session.user.id, eventId);
  if (!ownership.ok) return ownership.res;

  await PromoCode.deleteOne({
    _id: promoCodeId,
    eventId,
  }).exec();

  return NextResponse.json({ ok: true });
}
