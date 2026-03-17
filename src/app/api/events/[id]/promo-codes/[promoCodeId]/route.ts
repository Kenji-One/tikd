import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";

import { auth } from "@/lib/auth";
import { requireEventPermission } from "@/lib/eventAccess";

import PromoCode from "@/models/PromoCode";
import { Types } from "mongoose";
import { promoBodySchema } from "../schema";

const partialSchema = promoBodySchema.partial();

/* ------------------------------ GET ------------------------------ */

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; promoCodeId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId, promoCodeId } = await params;

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

  const promo = await PromoCode.findOne({
    _id: promoCodeId,
    eventId,
  })
    .lean()
    .exec();

  if (!promo) {
    return NextResponse.json(
      { error: "Promo code not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(promo);
}

/* ------------------------------ PATCH ------------------------------ */

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; promoCodeId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId, promoCodeId } = await params;

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
      (id) => new Types.ObjectId(id),
    );
  }

  if (typeof update.code === "string") {
    update.code = update.code.trim().toUpperCase();
  }

  const promo = await PromoCode.findOneAndUpdate(
    { _id: promoCodeId, eventId },
    update,
    { new: true },
  )
    .lean()
    .exec();

  if (!promo) {
    return NextResponse.json(
      { error: "Promo code not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(promo);
}

/* ------------------------------ DELETE ------------------------------ */

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; promoCodeId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId, promoCodeId } = await params;

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

  await PromoCode.deleteOne({
    _id: promoCodeId,
    eventId,
  }).exec();

  return NextResponse.json({ ok: true });
}
