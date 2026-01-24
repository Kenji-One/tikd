/* ------------------------------------------------------------------ */
/*  src/app/api/events/[id]/route.ts                                  */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";
import { z } from "zod";

import { auth } from "@/lib/auth";
import Event, { IEvent } from "@/models/Event";
import Artist, { IArtist } from "@/models/Artist";
import Organization, { IOrganization } from "@/models/Organization";
import Ticket from "@/models/Ticket";
import type { HydratedDocument, Types } from "mongoose";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */
const isObjectId = (val: string): boolean => /^[a-f\d]{24}$/i.test(val);

/** Lean shape after populating artists + organization */
type EventLean = Omit<IEvent, "organizationId" | "artists"> & {
  organizationId: Pick<IOrganization, "_id" | "name" | "logo" | "website">;
  artists: Pick<IArtist, "_id" | "stageName" | "avatar" | "isVerified">[];
  _id: Types.ObjectId;
};

type EventDoc = HydratedDocument<IEvent> & {
  internalNotes?: string;
};

/* ------------------------------------------------------------------ */
/*  GET /api/events/:id                                               */
/*  Note: In Next.js 15, context.params is a Promise.                 */
/* ------------------------------------------------------------------ */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!isObjectId(id)) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }

  /* -------- fetch & populate related docs ------------------------- */
  const event = await Event.findById(id)
    .populate({
      path: "artists",
      model: Artist,
      select: "stageName avatar isVerified",
    })
    .populate({
      path: "organizationId",
      model: Organization,
      select: "name logo website",
    })
    .lean<EventLean>();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  /* -------- derive attending count (paid tickets) ----------------- */
  const attendingCount = await Ticket.countDocuments({
    eventId: event._id,
    status: "paid",
  });

  /* 4 random distinct users who already paid */
  const attendeesPreview = await Ticket.aggregate([
    { $match: { eventId: event._id, status: "paid" } },
    { $group: { _id: "$ownerId" } }, // uniques
    { $sample: { size: 4 } }, // random 0-4
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    { $project: { _id: "$user._id", image: "$user.image" } },
  ]);

  /* -------- shape response ---------------------------------------- */
  return NextResponse.json({
    ...event,
    organization: event.organizationId, // front-end friendly key
    attendingCount,
    attendeesPreview,
  });
}

/* ------------------------------------------------------------------ */
/*  PATCH /api/events/:id – update basic event fields                 */
/* ------------------------------------------------------------------ */

const artistInputSchema = z.object({
  name: z.string().min(1),
  image: z.string().url().optional(),
});

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),

  // Start/end datetime (ISO -> Date)
  date: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),

  minAge: z.coerce.number().int().min(0).max(99).optional(),
  location: z.string().min(1).optional(),
  image: z.string().url().optional(),

  categories: z.array(z.string()).optional(),
  promoters: z.array(z.string().email()).optional(),
  message: z.string().optional(),

  artists: z.array(artistInputSchema).optional(),

  status: z.enum(["published", "draft"]).optional(),
  internalNotes: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!isObjectId(id)) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }

  const json = await req.json();
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const event = (await Event.findById(id).exec()) as EventDoc | null;
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Permission: org owner or event creator can edit
  const org = await Organization.findById(event.organizationId).select(
    "_id ownerId",
  );

  const isOwner = !!org && String(org.ownerId) === String(session.user.id);

  const isCreator =
    !!event.createdByUserId &&
    String(event.createdByUserId) === String(session.user.id);

  if (!isOwner && !isCreator) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = parsed.data;

  if (data.title !== undefined) event.title = data.title;
  if (data.description !== undefined) event.description = data.description;

  // date/endDate + derived durationMinutes
  if (data.date !== undefined) event.date = data.date;
  if (data.endDate !== undefined) event.endDate = data.endDate;

  // Recompute durationMinutes if we have a valid endDate and date
  if (event.endDate && event.date) {
    const ms = event.endDate.getTime() - event.date.getTime();
    if (Number.isFinite(ms) && ms > 0) {
      event.durationMinutes = Math.round(ms / 60000);
    } else {
      event.durationMinutes = undefined;
    }
  }

  if (data.minAge !== undefined) event.minAge = data.minAge;
  if (data.location !== undefined) event.location = data.location;
  if (data.image !== undefined) event.image = data.image;

  if (data.categories !== undefined) event.categories = data.categories;
  if (data.promoters !== undefined) event.promoters = data.promoters;
  if (data.message !== undefined) event.message = data.message;

  // Artists: replace list (recreate docs to match POST behavior)
  if (data.artists !== undefined) {
    const prevIds = Array.isArray(event.artists) ? event.artists : [];

    if (prevIds.length > 0) {
      try {
        await Artist.deleteMany({ _id: { $in: prevIds } });
      } catch {
        // ignore cleanup errors; event refs will be overwritten anyway
      }
    }

    const newIds = await Promise.all(
      data.artists.map(async (a) => {
        const doc = await Artist.create({
          stageName: a.name,
          avatar: a.image ?? "",
        });
        return doc._id;
      }),
    );

    event.artists = newIds as unknown as Types.ObjectId[];
  }

  if (data.status !== undefined) event.status = data.status;

  if (data.internalNotes !== undefined) {
    event.internalNotes = data.internalNotes;
  }

  await event.save();

  return NextResponse.json({ ok: true });
}
