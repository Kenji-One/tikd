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
  artists: z.array(artistInputSchema).default([]), // ← accept objects
  ticketTypes: z.array(ticketTypeSchema).min(1),
});

/* ------------------------------------------------------------------ */
/*  GET /api/events[?owned=1]                                         */
/* ------------------------------------------------------------------ */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const owned = searchParams.get("owned");

  const filter =
    owned === "1"
      ? { createdByUserId: session.user.id }
      : { date: { $gte: new Date() } };

  const events = await Event.find(filter).lean();
  return NextResponse.json(events);
}

/* ------------------------------------------------------------------ */
/*  POST /api/events                                                  */
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

  /* -------- ensure org belongs to user ---------------------------- */
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

  /* -------- create Artist docs & collect their IDs ---------------- */
  const artistIds = await Promise.all(
    parsed.data.artists.map(async (a) => {
      const doc = await Artist.create({
        stageName: a.name,
        avatar: a.image ?? "",
        // you can set other defaults here (isVerified, socials, …)
      });
      return doc._id;
    })
  );

  /* -------- create the Event -------------------------------------- */
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
