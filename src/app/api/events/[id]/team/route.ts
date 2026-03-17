import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";
import { z } from "zod";
import crypto from "crypto";
import { Types } from "mongoose";

import { auth } from "@/lib/auth";
import Event from "@/models/Event";
import User from "@/models/User";
import EventTeam from "@/models/EventTeam";
import { resolveEventActor } from "@/lib/eventAccess";

type Ctx = { params: Promise<{ id: string }> };

const isObjectId = (val: string) => /^[a-f\d]{24}$/i.test(val);

type EventTeamRole = "admin" | "promoter" | "scanner" | "collaborator";

type EventTeamLean = {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  email: string;
  userId?: Types.ObjectId | null;
  name?: string;
  role: EventTeamRole;
  status: "invited" | "active" | "revoked" | "expired";
  temporaryAccess: boolean;
  expiresAt?: Date | null;
  invitedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const SAFE_MEMBER_SELECT =
  "_id eventId email userId name role status temporaryAccess expiresAt invitedBy createdAt updatedAt";

/* ------------------------------ Zod ------------------------------- */
const inviteSchema = z
  .object({
    email: z.string().email(),
    role: z.enum(["admin", "promoter", "scanner", "collaborator"]),
    temporaryAccess: z.boolean().optional().default(false),
    expiresAt: z.coerce.date().optional(),
    applyTo: z
      .object({
        existing: z.boolean().optional().default(false),
        future: z.boolean().optional().default(false),
      })
      .optional()
      .default({ existing: false, future: false }),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.temporaryAccess && !value.expiresAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "expiresAt is required for temporary access",
        path: ["expiresAt"],
      });
    }

    if (
      value.temporaryAccess &&
      value.expiresAt &&
      value.expiresAt.getTime() <= Date.now()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "expiresAt must be in the future",
        path: ["expiresAt"],
      });
    }
  });

type ExistingMemberLean = {
  _id: Types.ObjectId;
  status: "invited" | "active" | "revoked" | "expired";
  temporaryAccess: boolean;
  expiresAt?: Date | null;
};

type ExistingUserLean = {
  _id: Types.ObjectId;
  firstName?: string;
  lastName?: string;
  username?: string;
};

function toSafeMemberResponse(member: EventTeamLean) {
  return {
    _id: String(member._id),
    eventId: String(member.eventId),
    email: member.email,
    userId: member.userId ? String(member.userId) : null,
    name: member.name || "",
    role: member.role,
    status: member.status,
    temporaryAccess: member.temporaryAccess,
    expiresAt: member.expiresAt ? member.expiresAt.toISOString() : null,
    invitedBy: String(member.invitedBy),
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString(),
  };
}

async function assertCanManageEventTeam(input: {
  eventId: string;
  userId: string;
  email?: string | null;
}): Promise<
  | {
      ok: true;
      actor: Awaited<ReturnType<typeof resolveEventActor>>;
    }
  | { ok: false; status: number; error: string }
> {
  const actor = await resolveEventActor(input);

  if (!actor) {
    return { ok: false, status: 404, error: "Event not found" };
  }

  if (actor.isCreator || actor.orgAccess.isOwner) {
    return { ok: true, actor };
  }

  if (actor.orgAccess.effectiveRole?.key === "admin") {
    return { ok: true, actor };
  }

  if (actor.eventTeam?.role === "admin") {
    return { ok: true, actor };
  }

  return { ok: false, status: 403, error: "Forbidden" };
}

async function upsertEventInvite(input: {
  eventId: Types.ObjectId;
  invitedBy: string;
  email: string;
  role: EventTeamRole;
  temporaryAccess: boolean;
  expiresAt?: Date;
  existingUser: ExistingUserLean | null;
  displayName: string;
}): Promise<EventTeamLean | null> {
  const existingMember = await EventTeam.findOne({
    eventId: input.eventId,
    email: input.email,
  })
    .select("_id status temporaryAccess expiresAt")
    .lean<ExistingMemberLean | null>();

  const isExpiredActive =
    existingMember?.status === "active" &&
    existingMember.temporaryAccess === true &&
    !!existingMember.expiresAt &&
    existingMember.expiresAt.getTime() < Date.now();

  const isAlreadyActive =
    existingMember?.status === "active" && !isExpiredActive;

  const setUpdate: Record<string, unknown> = {
    role: input.role,
    temporaryAccess: input.temporaryAccess,
    invitedBy: new Types.ObjectId(input.invitedBy),
    userId: input.existingUser?._id ?? null,
    name: input.displayName,
    status: isAlreadyActive ? "active" : "invited",
  };

  const unsetUpdate: Record<string, ""> = {};

  if (input.temporaryAccess) {
    setUpdate.expiresAt = input.expiresAt;
  } else {
    unsetUpdate.expiresAt = "";
  }

  if (isAlreadyActive) {
    unsetUpdate.inviteToken = "";
  } else {
    setUpdate.inviteToken = crypto.randomBytes(20).toString("hex");
  }

  const updateDoc: {
    $set: Record<string, unknown>;
    $unset?: Record<string, "">;
  } = { $set: setUpdate };

  if (Object.keys(unsetUpdate).length) {
    updateDoc.$unset = unsetUpdate;
  }

  return EventTeam.findOneAndUpdate(
    { eventId: input.eventId, email: input.email },
    updateDoc,
    { new: true, upsert: true, setDefaultsOnInsert: true },
  )
    .select(SAFE_MEMBER_SELECT)
    .lean<EventTeamLean | null>();
}

/* ------------------------------- GET ------------------------------ */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  if (!isObjectId(id)) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }

  const canManage = await assertCanManageEventTeam({
    eventId: id,
    userId: session.user.id,
    email: session.user.email ?? undefined,
  });

  if (!canManage.ok) {
    return NextResponse.json(
      { error: canManage.error },
      { status: canManage.status },
    );
  }

  await EventTeam.updateMany(
    {
      eventId: new Types.ObjectId(id),
      temporaryAccess: true,
      expiresAt: { $lt: new Date() },
      status: { $ne: "revoked" },
    },
    { $set: { status: "expired" } },
  );

  const members = await EventTeam.find({ eventId: new Types.ObjectId(id) })
    .select(SAFE_MEMBER_SELECT)
    .sort({ createdAt: 1 })
    .lean<EventTeamLean[]>();

  return NextResponse.json(members.map(toSafeMemberResponse));
}

/* ------------------------------- POST ----------------------------- */
export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  if (!isObjectId(id)) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }

  const canManage = await assertCanManageEventTeam({
    eventId: id,
    userId: session.user.id,
    email: session.user.email ?? undefined,
  });

  if (!canManage.ok) {
    return NextResponse.json(
      { error: canManage.error },
      { status: canManage.status },
    );
  }

  const json: unknown = await req.json().catch(() => null);
  const parsed = inviteSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const { email, role, temporaryAccess, expiresAt, applyTo } = parsed.data;
  const emailLower = email.trim().toLowerCase();

  const existingUser = await User.findOne({ email: emailLower })
    .select("_id firstName lastName username")
    .lean<ExistingUserLean | null>();

  const displayName =
    existingUser?.firstName || existingUser?.lastName
      ? `${existingUser?.firstName ?? ""} ${existingUser?.lastName ?? ""}`.trim()
      : (existingUser?.username ?? "");

  const member = await upsertEventInvite({
    eventId: canManage.actor!.event._id,
    invitedBy: session.user.id,
    email: emailLower,
    role,
    temporaryAccess,
    expiresAt,
    existingUser,
    displayName,
  });

  if (!member) {
    return NextResponse.json(
      { error: "Could not save event team member" },
      { status: 500 },
    );
  }

  let appliedExisting = 0;

  if (applyTo.existing) {
    const siblingEvents = await Event.find({
      organizationId: canManage.actor!.event.organizationId,
      _id: { $ne: canManage.actor!.event._id },
    })
      .select("_id")
      .lean<Array<{ _id: Types.ObjectId }>>();

    if (siblingEvents.length) {
      const results = await Promise.all(
        siblingEvents.map((eventRow) =>
          upsertEventInvite({
            eventId: eventRow._id,
            invitedBy: session.user.id,
            email: emailLower,
            role,
            temporaryAccess,
            expiresAt,
            existingUser,
            displayName,
          }),
        ),
      );

      appliedExisting = results.filter(Boolean).length;
    }
  }

  return NextResponse.json(
    {
      member: toSafeMemberResponse(member),
      appliedExisting,
      note: applyTo.future ? "future_not_implemented" : undefined,
      inviteDelivery: "not_implemented",
    },
    { status: 201 },
  );
}
