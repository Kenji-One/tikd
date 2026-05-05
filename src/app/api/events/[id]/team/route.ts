// src\app\api\events\[id]\team\route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";

import "@/lib/mongoose";
import { auth } from "@/lib/auth";
import Event from "@/models/Event";
import EventTeam from "@/models/EventTeam";
import User from "@/models/User";
import { resolveEventActor } from "@/lib/eventAccess";
import { hasOrgPermission } from "@/lib/orgAccess";
import {
  createInviteTokenPair,
  sendEventInviteEmail,
} from "@/lib/eventInvites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const preferredRegion = "auto";
export const maxDuration = 10;

type Ctx = { params: Promise<{ id: string }> };

const ObjectIdZ = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

const ParamsZ = z.object({
  id: ObjectIdZ,
});

const EventTeamRoleZ = z.enum(["admin", "promoter", "scanner", "collaborator"]);

type EventTeamRole = z.infer<typeof EventTeamRoleZ>;
type EventTeamStatus = "invited" | "active" | "revoked" | "expired";

type EventTeamLean = {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  email: string;
  userId?: Types.ObjectId | null;
  name?: string;
  role: EventTeamRole;
  status: EventTeamStatus;
  temporaryAccess: boolean;
  expiresAt?: Date | null;
  invitedBy: Types.ObjectId;
  inviteExpiresAt?: Date | null;
  acceptedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type ExistingUserLean = {
  _id: Types.ObjectId;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
};

const SAFE_MEMBER_SELECT =
  "_id eventId email userId name role status temporaryAccess expiresAt invitedBy inviteExpiresAt acceptedAt createdAt updatedAt";

/* ------------------------------ Zod ------------------------------- */
const inviteSchema = z
  .object({
    email: z.string().email(),
    role: EventTeamRoleZ,
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

function normalizeEmail(email?: string | null): string {
  return String(email ?? "")
    .trim()
    .toLowerCase();
}

function roleLabel(role: EventTeamRole): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "promoter":
      return "Promoter";
    case "scanner":
      return "Scanner";
    case "collaborator":
      return "Collaborator";
    default:
      return "Collaborator";
  }
}

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
    inviteExpiresAt: member.inviteExpiresAt
      ? member.inviteExpiresAt.toISOString()
      : null,
    acceptedAt: member.acceptedAt ? member.acceptedAt.toISOString() : null,
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString(),
  };
}

function canViewEventTeam(
  actor: Awaited<ReturnType<typeof resolveEventActor>>,
): boolean {
  if (!actor) return false;
  if (actor.isCreator) return true;
  if (actor.orgAccess.isOwner) return true;
  if (hasOrgPermission(actor.orgAccess, "members.view")) return true;
  if (actor.eventTeam) return true;
  return false;
}

function canInviteEventTeam(
  actor: Awaited<ReturnType<typeof resolveEventActor>>,
): boolean {
  if (!actor) return false;
  if (actor.isCreator) return true;
  if (actor.orgAccess.isOwner) return true;
  if (hasOrgPermission(actor.orgAccess, "members.invite")) return true;
  if (actor.eventTeam?.role === "admin") return true;
  return false;
}

async function assertCanViewEventTeam(input: {
  eventId: string;
  userId: string;
  email?: string | null;
}): Promise<
  | {
      ok: true;
      actor: NonNullable<Awaited<ReturnType<typeof resolveEventActor>>>;
    }
  | { ok: false; status: number; error: string }
> {
  const actor = await resolveEventActor(input);

  if (!actor) {
    return { ok: false, status: 404, error: "Event not found" };
  }

  if (!canViewEventTeam(actor)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true, actor };
}

async function assertCanInviteEventTeam(input: {
  eventId: string;
  userId: string;
  email?: string | null;
}): Promise<
  | {
      ok: true;
      actor: NonNullable<Awaited<ReturnType<typeof resolveEventActor>>>;
    }
  | { ok: false; status: number; error: string }
> {
  const actor = await resolveEventActor(input);

  if (!actor) {
    return { ok: false, status: 404, error: "Event not found" };
  }

  if (!canInviteEventTeam(actor)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true, actor };
}

async function loadProtectedEventEmails(input: {
  createdByUserId: Types.ObjectId;
  orgOwnerId?: Types.ObjectId | null;
}): Promise<Set<string>> {
  const ids = [
    String(input.createdByUserId),
    input.orgOwnerId ? String(input.orgOwnerId) : "",
  ].filter((value, index, arr) => value && arr.indexOf(value) === index);

  const objectIds = ids
    .filter((value) => Types.ObjectId.isValid(value))
    .map((value) => new Types.ObjectId(value));

  if (!objectIds.length) {
    return new Set<string>();
  }

  const users = await User.find({
    _id: { $in: objectIds },
  })
    .select("email")
    .lean<Array<{ email?: string }>>();

  return new Set(
    users
      .map((user) => normalizeEmail(user.email))
      .filter((email): email is string => !!email),
  );
}

function buildMemberUpsertUpdate(input: {
  role: EventTeamRole;
  temporaryAccess: boolean;
  expiresAt?: Date;
  invitedByUserId: string;
  existingUserId?: Types.ObjectId | null;
  displayName: string;
  isAlreadyActive: boolean;
  tokenData: ReturnType<typeof createInviteTokenPair> | null;
}) {
  const setUpdate: Record<string, unknown> = {
    role: input.role,
    temporaryAccess: input.temporaryAccess,
    invitedBy: new Types.ObjectId(input.invitedByUserId),
    userId: input.existingUserId ?? null,
    name: input.displayName,
    status: input.isAlreadyActive ? "active" : "invited",
  };

  const unsetUpdate: Record<string, ""> = {};

  if (input.temporaryAccess) {
    setUpdate.expiresAt = input.expiresAt;
  } else {
    unsetUpdate.expiresAt = "";
  }

  if (input.tokenData) {
    setUpdate.inviteTokenHash = input.tokenData.tokenHash;
    setUpdate.inviteExpiresAt = input.tokenData.expiresAt;
    unsetUpdate.inviteToken = "";
    unsetUpdate.acceptedAt = "";
  } else {
    unsetUpdate.inviteToken = "";
    unsetUpdate.inviteTokenHash = "";
    unsetUpdate.inviteExpiresAt = "";
  }

  const updateDoc: {
    $set: Record<string, unknown>;
    $unset?: Record<string, "">;
  } = {
    $set: setUpdate,
  };

  if (Object.keys(unsetUpdate).length > 0) {
    updateDoc.$unset = unsetUpdate;
  }

  return updateDoc;
}

/* ------------------------------- GET ------------------------------ */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsedParams = ParamsZ.safeParse(await ctx.params);

  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }

  const { id } = parsedParams.data;

  const access = await assertCanViewEventTeam({
    eventId: id,
    userId: session.user.id,
    email: session.user.email ?? undefined,
  });

  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
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

  const parsedParams = ParamsZ.safeParse(await ctx.params);

  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }

  const { id } = parsedParams.data;

  const access = await assertCanInviteEventTeam({
    eventId: id,
    userId: session.user.id,
    email: session.user.email ?? undefined,
  });

  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  const jsonBody: unknown = await req.json().catch(() => null);
  const parsed = inviteSchema.safeParse(jsonBody);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const { email, role, temporaryAccess, expiresAt, applyTo } = parsed.data;
  const emailLower = normalizeEmail(email);

  const protectedEmails = await loadProtectedEventEmails({
    createdByUserId: access.actor.event.createdByUserId,
    orgOwnerId: access.actor.orgAccess.org?.ownerId ?? null,
  });

  if (protectedEmails.has(emailLower)) {
    return NextResponse.json(
      { error: "This user already has event access" },
      { status: 400 },
    );
  }

  const orgOwnerId = access.actor.orgAccess.org?.ownerId
    ? String(access.actor.orgAccess.org.ownerId)
    : "";
  const eventCreatorId = String(access.actor.event.createdByUserId);

  const existingUser = await User.findOne({ email: emailLower })
    .select("_id firstName lastName username email")
    .lean<ExistingUserLean | null>();

  if (existingUser) {
    const existingUserId = String(existingUser._id);

    if (existingUserId === eventCreatorId || existingUserId === orgOwnerId) {
      return NextResponse.json(
        { error: "This user already has event access" },
        { status: 400 },
      );
    }
  }

  const displayName =
    existingUser?.firstName || existingUser?.lastName
      ? `${existingUser.firstName ?? ""} ${existingUser.lastName ?? ""}`.trim()
      : (existingUser?.username ?? "");

  const existingMember = await EventTeam.findOne({
    eventId: access.actor.event._id,
    email: emailLower,
  })
    .select("_id status temporaryAccess expiresAt")
    .lean<{
      _id: Types.ObjectId;
      status: EventTeamStatus;
      temporaryAccess: boolean;
      expiresAt?: Date | null;
    } | null>();

  const isExpiredActive =
    existingMember?.status === "active" &&
    existingMember.temporaryAccess === true &&
    !!existingMember.expiresAt &&
    existingMember.expiresAt.getTime() < Date.now();

  const isAlreadyActive =
    existingMember?.status === "active" && !isExpiredActive;

  const tokenData = isAlreadyActive ? null : createInviteTokenPair();

  const memberUpdateDoc = buildMemberUpsertUpdate({
    role,
    temporaryAccess,
    expiresAt,
    invitedByUserId: session.user.id,
    existingUserId: existingUser?._id ?? null,
    displayName,
    isAlreadyActive,
    tokenData,
  });

  const member = await EventTeam.findOneAndUpdate(
    { eventId: access.actor.event._id, email: emailLower },
    memberUpdateDoc,
    { new: true, upsert: true, setDefaultsOnInsert: true },
  )
    .select(SAFE_MEMBER_SELECT)
    .lean<EventTeamLean | null>();

  if (!member) {
    return NextResponse.json(
      { error: "Could not save event team member" },
      { status: 500 },
    );
  }

  let appliedExisting = 0;

  if (applyTo.existing) {
    const siblingEvents = await Event.find({
      organizationId: access.actor.event.organizationId,
      _id: { $ne: access.actor.event._id },
    })
      .select("_id createdByUserId")
      .lean<Array<{ _id: Types.ObjectId; createdByUserId: Types.ObjectId }>>();

    if (siblingEvents.length) {
      const results = await Promise.all(
        siblingEvents.map(async (eventRow) => {
          if (
            existingUser &&
            String(existingUser._id) === String(eventRow.createdByUserId)
          ) {
            return null;
          }

          const siblingExisting = await EventTeam.findOne({
            eventId: eventRow._id,
            email: emailLower,
          })
            .select("_id status temporaryAccess expiresAt")
            .lean<{
              _id: Types.ObjectId;
              status: EventTeamStatus;
              temporaryAccess: boolean;
              expiresAt?: Date | null;
            } | null>();

          const siblingExpiredActive =
            siblingExisting?.status === "active" &&
            siblingExisting.temporaryAccess === true &&
            !!siblingExisting.expiresAt &&
            siblingExisting.expiresAt.getTime() < Date.now();

          const siblingAlreadyActive =
            siblingExisting?.status === "active" && !siblingExpiredActive;

          const siblingToken = siblingAlreadyActive
            ? null
            : createInviteTokenPair();

          const siblingUpdateDoc = buildMemberUpsertUpdate({
            role,
            temporaryAccess,
            expiresAt,
            invitedByUserId: session.user.id,
            existingUserId: existingUser?._id ?? null,
            displayName,
            isAlreadyActive: siblingAlreadyActive,
            tokenData: siblingToken,
          });

          return EventTeam.findOneAndUpdate(
            { eventId: eventRow._id, email: emailLower },
            siblingUpdateDoc,
            { new: true, upsert: true, setDefaultsOnInsert: true },
          )
            .select("_id")
            .lean<{ _id: Types.ObjectId } | null>();
        }),
      );

      appliedExisting = results.filter(Boolean).length;
    }
  }

  let inviteDelivery: "sent" | "failed" | "skipped" = "skipped";

  if (tokenData) {
    const inviterUser = await User.findById(session.user.id)
      .select("firstName lastName username email")
      .lean<{
        firstName?: string;
        lastName?: string;
        username?: string;
        email?: string;
      } | null>();

    const inviterName =
      inviterUser?.firstName || inviterUser?.lastName
        ? `${inviterUser.firstName ?? ""} ${inviterUser.lastName ?? ""}`.trim()
        : (inviterUser?.username ?? inviterUser?.email ?? "");

    const mailResult = await sendEventInviteEmail({
      to: emailLower,
      eventTitle: access.actor.event.title || "Event",
      roleName: roleLabel(role),
      inviterName,
      rawToken: tokenData.rawToken,
      expiresAt: tokenData.expiresAt,
    });

    inviteDelivery = mailResult.ok ? "sent" : "failed";
  }

  return NextResponse.json(
    {
      member: toSafeMemberResponse(member),
      appliedExisting,
      note: applyTo.future ? "future_not_implemented" : undefined,
      inviteDelivery,
    },
    { status: existingMember ? 200 : 201 },
  );
}
