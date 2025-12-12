import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";

import { auth } from "@/lib/auth";
import Event, { type IEvent } from "@/models/Event";
import PromoCode from "@/models/PromoCode";
import { Types } from "mongoose";

import { promoBodySchema } from "./schema";

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

function isMongoDuplicateKeyError(
  err: unknown
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
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;

  const ownership = await ensureEventOwnership(session.user.id, eventId);
  if (!ownership.ok) return ownership.res;

  const promos = await PromoCode.find({ eventId })
    .sort({ createdAt: 1 })
    .lean()
    .exec();

  return NextResponse.json(promos);
}

/* ------------------------------ POST ------------------------------ */

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;

  const ownership = await ensureEventOwnership(session.user.id, eventId);
  if (!ownership.ok) return ownership.res;

  const json = await req.json();
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
      organizationId: ownership.event.organizationId,
      eventId: ownership.event._id,
      createdByUserId: new Types.ObjectId(session.user.id),
      validFrom: validFrom ? new Date(validFrom) : null,
      validUntil: validUntil ? new Date(validUntil) : null,
      applicableTicketTypeIds: applicableTicketTypeIds.map(
        (id) => new Types.ObjectId(id)
      ),
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (err: unknown) {
    if (isMongoDuplicateKeyError(err)) {
      return NextResponse.json(
        { error: "Code already exists for this event." },
        { status: 409 }
      );
    }

    console.error("Failed to create promo code", err);
    return NextResponse.json(
      { error: "Failed to create promo code" },
      { status: 500 }
    );
  }
}
