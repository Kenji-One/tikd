// src/app/api/events/[id]/team/route.ts
/* ------------------------------------------------------------------ */
/*  /api/events/[id]/team – List & Invite team members                */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";
import { z } from "zod";
import crypto from "crypto";
import { Types } from "mongoose";

import { auth } from "@/lib/auth";
import Event from "@/models/Event";
import User from "@/models/User";
import EventTeam, { IEventTeam } from "@/models/EventTeam";

/* Next.js 15: params is a Promise */
type Ctx = { params: Promise<{ id: string }> };
const isObjectId = (val: string) => /^[a-f\d]{24}$/i.test(val);

/* ------------------------------ Zod ------------------------------- */
const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "promoter", "scanner", "collaborator"]),
  temporaryAccess: z.boolean().optional().default(false),
  expiresAt: z.coerce.date().optional(), // required if temporaryAccess=true (validated below)
  applyTo: z
    .object({
      existing: z.boolean().optional().default(false),
      future: z.boolean().optional().default(false),
    })
    .optional()
    .default({ existing: false, future: false }),
});

/* ----------------------- Permission helpers ----------------------- */
async function assertCanManage(eventId: string, userId: string) {
  // Owner can always manage
  const event = await Event.findOne({
    _id: eventId,
    createdByUserId: userId,
  }).lean();
  if (event) return true;

  // Otherwise, must be an ACTIVE admin on the event team
  const teamAdmin = await EventTeam.findOne({
    eventId,
    userId,
    role: "admin",
    status: "active",
  }).lean();

  return !!teamAdmin;
}

/* ------------------------------- GET ------------------------------ */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  if (!isObjectId(id))
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });

  const can = await assertCanManage(id, session.user.id);
  if (!can) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Mark expired on the fly
  await EventTeam.updateMany(
    {
      eventId: id,
      temporaryAccess: true,
      expiresAt: { $lt: new Date() },
      status: { $ne: "revoked" },
    },
    { $set: { status: "expired" } }
  );

  const members = await EventTeam.find({ eventId: id }).lean<IEventTeam[]>();
  return NextResponse.json(members);
}

/* ------------------------------- POST ----------------------------- */
export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  if (!isObjectId(id))
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });

  const allowed = await assertCanManage(id, session.user.id);
  if (!allowed)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const json = await req.json();
  const parsed = inviteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const { email, role, temporaryAccess, expiresAt, applyTo } = parsed.data;
  if (temporaryAccess && !expiresAt) {
    return NextResponse.json(
      { error: "expiresAt is required for temporary access" },
      { status: 400 }
    );
  }

  // Find the event (for org linkage / cross-apply)
  const event = await Event.findById(id)
    .select("_id organizationId")
    .lean<{ _id: Types.ObjectId; organizationId?: Types.ObjectId }>();
  if (!event)
    return NextResponse.json({ error: "Event not found" }, { status: 404 });

  // Link user if exists
  const existingUser = await User.findOne({ email })
    .select("_id firstName lastName username")
    .lean();
  const name =
    existingUser?.firstName || existingUser?.lastName
      ? `${existingUser?.firstName ?? ""} ${existingUser?.lastName ?? ""}`.trim()
      : (existingUser?.username ?? "");

  const inviteToken = crypto.randomBytes(20).toString("hex");

  // Upsert membership for this event
  const member = await EventTeam.findOneAndUpdate(
    { eventId: id, email: email.toLowerCase() },
    {
      $set: {
        role,
        temporaryAccess: !!temporaryAccess,
        expiresAt: temporaryAccess ? expiresAt : undefined,
        invitedBy: session.user.id,
        inviteToken,
        userId: existingUser?._id ?? null,
        name,
        status: "invited",
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  /* Optionally apply to all existing events in the same organization */
  let appliedExisting = 0;
  if (applyTo?.existing && event.organizationId) {
    const siblings = await Event.find({
      organizationId: event.organizationId,
      _id: { $ne: event._id },
    })
      .select("_id")
      .lean<Array<{ _id: Types.ObjectId }>>();

    if (siblings.length) {
      const ops = siblings.map((e) => ({
        updateOne: {
          filter: { eventId: e._id, email: email.toLowerCase() },
          update: {
            $set: {
              role,
              temporaryAccess: !!temporaryAccess,
              expiresAt: temporaryAccess ? expiresAt : undefined,
              invitedBy: session.user.id,
              status: "invited",
              userId: existingUser?._id ?? null,
              name,
            },
          },
          upsert: true,
        },
      }));
      const res = await EventTeam.bulkWrite(ops, { ordered: false });
      appliedExisting =
        (res.upsertedCount ?? 0) +
        (res.modifiedCount ?? 0) +
        (res.matchedCount ?? 0);
    }
  }

  // NOTE: applyTo.future would require an org-level rule; not persisted here.
  return NextResponse.json(
    {
      member,
      appliedExisting,
      note: applyTo?.future ? "future_not_implemented" : undefined,
    },
    { status: 201 }
  );
}
