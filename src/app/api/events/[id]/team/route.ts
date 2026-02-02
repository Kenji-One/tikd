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
import Organization from "@/models/Organization";
import OrgTeam from "@/models/OrgTeam";
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
/**
 * Manage Event Team requires:
 * - event creator OR
 * - org owner OR org admin (active) OR
 * - event admin (active)
 */
async function assertCanManageEventTeam(eventId: string, userId: string) {
  const event = await Event.findById(eventId)
    .select("_id organizationId createdByUserId")
    .lean<{
      _id: Types.ObjectId;
      organizationId: Types.ObjectId;
      createdByUserId: Types.ObjectId;
    } | null>();

  if (!event) return { ok: false as const, status: 404 };

  // event creator
  if (String(event.createdByUserId) === String(userId)) {
    return { ok: true as const, event };
  }

  // org owner
  const org = await Organization.findById(event.organizationId)
    .select("_id ownerId")
    .lean<{ _id: Types.ObjectId; ownerId: Types.ObjectId } | null>();

  if (org && String(org.ownerId) === String(userId)) {
    return { ok: true as const, event };
  }

  // org admin
  const orgAdmin = await OrgTeam.findOne({
    organizationId: event.organizationId,
    userId,
    role: "admin",
    status: "active",
  })
    .select("_id")
    .lean();

  if (orgAdmin) return { ok: true as const, event };

  // event admin
  const eventAdmin = await EventTeam.findOne({
    eventId: event._id,
    userId,
    role: "admin",
    status: "active",
  })
    .select("_id")
    .lean();

  if (eventAdmin) return { ok: true as const, event };

  return { ok: false as const, status: 403 };
}

/* ------------------------------- GET ------------------------------ */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  if (!isObjectId(id))
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });

  const can = await assertCanManageEventTeam(id, session.user.id);
  if (!can.ok) {
    return NextResponse.json(
      { error: can.status === 404 ? "Event not found" : "Forbidden" },
      { status: can.status },
    );
  }

  // Mark expired on the fly
  await EventTeam.updateMany(
    {
      eventId: id,
      temporaryAccess: true,
      expiresAt: { $lt: new Date() },
      status: { $ne: "revoked" },
    },
    { $set: { status: "expired" } },
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

  const allowed = await assertCanManageEventTeam(id, session.user.id);
  if (!allowed.ok) {
    return NextResponse.json(
      { error: allowed.status === 404 ? "Event not found" : "Forbidden" },
      { status: allowed.status },
    );
  }

  const json = await req.json();
  const parsed = inviteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const { email, role, temporaryAccess, expiresAt, applyTo } = parsed.data;
  if (temporaryAccess && !expiresAt) {
    return NextResponse.json(
      { error: "expiresAt is required for temporary access" },
      { status: 400 },
    );
  }

  const emailLower = email.trim().toLowerCase();

  // Link user if exists (lowercased to match stored emails)
  const existingUser = await User.findOne({ email: emailLower })
    .select("_id firstName lastName username")
    .lean();

  const name =
    existingUser?.firstName || existingUser?.lastName
      ? `${existingUser?.firstName ?? ""} ${existingUser?.lastName ?? ""}`.trim()
      : (existingUser?.username ?? "");

  const inviteToken = crypto.randomBytes(20).toString("hex");

  // Upsert membership for this event
  const member = await EventTeam.findOneAndUpdate(
    { eventId: id, email: emailLower },
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
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  /* Optionally apply to all existing events in the same organization */
  let appliedExisting = 0;
  if (applyTo?.existing && allowed.event.organizationId) {
    const siblings = await Event.find({
      organizationId: allowed.event.organizationId,
      _id: { $ne: allowed.event._id },
    })
      .select("_id")
      .lean<Array<{ _id: Types.ObjectId }>>();

    if (siblings.length) {
      const ops = siblings.map((e) => ({
        updateOne: {
          filter: { eventId: e._id, email: emailLower },
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
    { status: 201 },
  );
}
