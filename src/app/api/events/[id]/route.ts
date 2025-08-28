/* ------------------------------------------------------------------ */
/*  src/app/api/events/[id]/route.ts                                  */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from "next/server";
import type { RouteContext } from "next";
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

type Params = { id: string };
type Ctx = RouteContext<Params>;

/** Normalise Next 14 (object) and Next 15 (async function) params */
async function resolveParams(ctx: Ctx): Promise<Params> {
  const p = ctx.params;
  return typeof p === "function" ? await p() : p;
}

/* ------------------------------------------------------------------ */
/*  GET /api/events/:id                                               */
/* ------------------------------------------------------------------ */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await resolveParams(ctx);

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
