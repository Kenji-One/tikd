import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";

import { auth } from "@/lib/auth";
import { requireEventPermission } from "@/lib/eventAccess";

import PromoCode from "@/models/PromoCode";
import { Types } from "mongoose";

import { promoBodySchema } from "./schema";

/* --------------------------- helper --------------------------- */

function isMongoDuplicateKeyError(
  err: unknown,
): err is { code: number; keyValue?: unknown } {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as Record<string, unknown>).code === 11000
  );
}

/* ------------------------------ GET ------------------------------ */

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

  const promos = await PromoCode.find({ eventId })
    .sort({ createdAt: 1 })
    .lean()
    .exec();

  return NextResponse.json(promos);
}

/* ------------------------------ POST ------------------------------ */

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
  const parsed = promoBodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const { validFrom, validUntil, applicableTicketTypeIds, ...rest } =
    parsed.data;

  try {
    const doc = await PromoCode.create({
      ...rest,
      code: rest.code.trim().toUpperCase(),
      organizationId: access.actor.event.organizationId,
      eventId: access.actor.event._id,
      createdByUserId: new Types.ObjectId(session.user.id),
      validFrom: validFrom ? new Date(validFrom) : null,
      validUntil: validUntil ? new Date(validUntil) : null,
      applicableTicketTypeIds: applicableTicketTypeIds.map(
        (id) => new Types.ObjectId(id),
      ),
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (err: unknown) {
    if (isMongoDuplicateKeyError(err)) {
      return NextResponse.json(
        { error: "Code already exists for this event." },
        { status: 409 },
      );
    }

    console.error("Failed to create promo code", err);
    return NextResponse.json(
      { error: "Failed to create promo code" },
      { status: 500 },
    );
  }
}
