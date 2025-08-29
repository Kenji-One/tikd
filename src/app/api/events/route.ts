/* ------------------------------------------------------------------ */
/*  src/app/api/events/route.ts                                       */
/* ------------------------------------------------------------------ */
import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";
import { z } from "zod";
import { auth } from "@/lib/auth";
import Event from "@/models/Event";
import Organization from "@/models/Organization";
import Artist from "@/models/Artist";
import type { FilterQuery } from "mongoose";
import type { IEvent } from "@/models/Event";

export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ */
/*  Validation schemas                                                */
/* ------------------------------------------------------------------ */
const ticketTypeSchema = z.object({
  slug: z.string().min(1),
  label: z.string().min(1),
  price: z.number().nonnegative(),
  currency: z.string().length(3),
  quantity: z.number().int().nonnegative(),
  feesIncluded: z.boolean().optional(),
});

const artistInputSchema = z.object({
  name: z.string().min(1),
  image: z.string().url().optional(),
});

const bodySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  date: z.coerce.date(),
  location: z.string().min(1),
  image: z.string().url().optional(),
  organizationId: z.string().length(24),
  artists: z.array(artistInputSchema).default([]),
  ticketTypes: z.array(ticketTypeSchema).min(1),
});

/* ------------------------------------------------------------------ */
/*  GET /api/events                                                   */
/*    - Public catalogue by default (no auth)                         */
/*    - When ?owned=1 → require auth and return user’s events         */
/*    - Optional filters: q, skip, limit                              */
/* ------------------------------------------------------------------ */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const owned = searchParams.get("owned");

  // Private view: only my events
  if (owned === "1") {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const mine = await Event.find({ createdByUserId: session.user.id })
      .sort({ date: 1 })
      .lean();
    return NextResponse.json(mine);
  }

  // Public catalogue (no auth)
  const now = new Date();
  const q = searchParams.get("q")?.trim();
  const limitRaw = Number.parseInt(searchParams.get("limit") ?? "50", 10);
  const skipRaw = Number.parseInt(searchParams.get("skip") ?? "0", 10);
  const limit = Math.min(Number.isNaN(limitRaw) ? 50 : limitRaw, 100);
  const skip = Math.max(Number.isNaN(skipRaw) ? 0 : skipRaw, 0);

  const filter: FilterQuery<IEvent> = { date: { $gte: now } };
  if (q) {
    const rx = new RegExp(q, "i");
    filter.$or = [{ title: { $regex: rx } }, { location: { $regex: rx } }];
  }

  const events = await Event.find(filter)
    .sort({ date: 1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return NextResponse.json(events, {
    headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" },
  });
}

/* ------------------------------------------------------------------ */
/*  POST /api/events  (protected)                                     */
/* ------------------------------------------------------------------ */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  // ensure org belongs to user
  const org = await Organization.findOne({
    _id: parsed.data.organizationId,
    ownerId: session.user.id,
  });
  if (!org) {
    return NextResponse.json(
      { error: "Organization not found or not yours" },
      { status: 403 }
    );
  }

  // create artists (if any)
  const artistIds = await Promise.all(
    parsed.data.artists.map(async (a) => {
      const doc = await Artist.create({
        stageName: a.name,
        avatar: a.image ?? "",
      });
      return doc._id;
    })
  );

  // create event
  const event = await Event.create({
    title: parsed.data.title,
    description: parsed.data.description,
    date: parsed.data.date,
    location: parsed.data.location,
    image: parsed.data.image,
    organizationId: parsed.data.organizationId,
    ticketTypes: parsed.data.ticketTypes,
    artists: artistIds,
    createdByUserId: session.user.id,
  });

  return NextResponse.json({ _id: event._id }, { status: 201 });
}
