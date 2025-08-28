/* ------------------------------------------------------------------ */
/*  src/app/api/events/[id]/route.ts                                  */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";

import Event, { IEvent } from "@/models/Event";
import Artist, { IArtist } from "@/models/Artist";
import Organization, { IOrganization } from "@/models/Organization";
import Ticket from "@/models/Ticket";
import type { Types } from "mongoose";

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

/* ------------------------------------------------------------------ */
/*  GET /api/events/:id                                               */
/*  Note: In Next.js 15, context.params is a Promise.                 */
/* ------------------------------------------------------------------ */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
