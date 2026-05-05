// src\app\api\events\[id]\team\[memberId]\route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";

import "@/lib/mongoose";
import { auth } from "@/lib/auth";
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

type Ctx = { params: Promise<{ id: string; memberId: string }> };

const ObjectIdZ = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

const ParamsZ = z.object({
  id: ObjectIdZ,
  memberId: ObjectIdZ,
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

const SAFE_MEMBER_SELECT =
  "_id eventId email userId name role status temporaryAccess expiresAt invitedBy inviteExpiresAt acceptedAt createdAt updatedAt";

const patchSchema = z
  .object({
    role: EventTeamRoleZ.optional(),
    status: z.enum(["revoked"]).optional(),
    temporaryAccess: z.boolean().optional(),
    expiresAt: z.coerce.date().optional(),
    action: z.enum(["resend"]).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.action) {
      if (
        value.role ||
        value.status ||
        typeof value.temporaryAccess === "boolean" ||
        value.expiresAt
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "action cannot be combined with other update fields",
          path: ["action"],
        });
      }
    }

    if (
      value.status === "revoked" &&
      (value.role ||
        typeof value.temporaryAccess === "boolean" ||
        value.expiresAt)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "revoked status cannot be combined with other update fields",
        path: ["status"],
      });
    }

    if (value.temporaryAccess === true && !value.expiresAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "expiresAt is required when temporaryAccess is true",
        path: ["expiresAt"],
      });
    }

    if (value.temporaryAccess === false && value.expiresAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "expiresAt cannot be used when temporaryAccess is false",
        path: ["expiresAt"],
      });
    }

    if (value.expiresAt && value.expiresAt.getTime() <= Date.now()) {
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

function canAssignEventTeam(
  actor: Awaited<ReturnType<typeof resolveEventActor>>,
): boolean {
  if (!actor) return false;
  if (actor.isCreator) return true;
  if (actor.orgAccess.isOwner) return true;
  if (hasOrgPermission(actor.orgAccess, "members.assignRoles")) return true;
  if (actor.eventTeam?.role === "admin") return true;
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

function canRemoveEventTeam(
  actor: Awaited<ReturnType<typeof resolveEventActor>>,
): boolean {
  if (!actor) return false;
  if (actor.isCreator) return true;
  if (actor.orgAccess.isOwner) return true;
  if (hasOrgPermission(actor.orgAccess, "members.remove")) return true;
  if (actor.eventTeam?.role === "admin") return true;
  return false;
}

async function assertCanAssignEventTeam(input: {
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

  if (!canAssignEventTeam(actor)) {
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

async function assertCanRemoveEventTeam(input: {
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

  if (!canRemoveEventTeam(actor)) {
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

function isProtectedEventAccess(input: {
  member: EventTeamLean;
  createdByUserId: Types.ObjectId;
  orgOwnerId?: Types.ObjectId | null;
  protectedEmails: Set<string>;
}): boolean {
  if (
    input.member.userId &&
    String(input.member.userId) === String(input.createdByUserId)
  ) {
    return true;
  }

  if (
    input.member.userId &&
    input.orgOwnerId &&
    String(input.member.userId) === String(input.orgOwnerId)
  ) {
    return true;
  }

  return input.protectedEmails.has(normalizeEmail(input.member.email));
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsedParams = ParamsZ.safeParse(await ctx.params);

  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
  }

  const { id, memberId } = parsedParams.data;

  const body: unknown = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const { role, status, temporaryAccess, expiresAt, action } = parsed.data;

  const access =
    action === "resend"
      ? await assertCanInviteEventTeam({
          eventId: id,
          userId: session.user.id,
          email: session.user.email ?? undefined,
        })
      : status === "revoked"
        ? await assertCanRemoveEventTeam({
            eventId: id,
            userId: session.user.id,
            email: session.user.email ?? undefined,
          })
        : await assertCanAssignEventTeam({
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

  const member = await EventTeam.findOne({
    _id: new Types.ObjectId(memberId),
    eventId: access.actor.event._id,
  })
    .select(SAFE_MEMBER_SELECT)
    .lean<EventTeamLean | null>();

  if (!member) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const protectedEmails = await loadProtectedEventEmails({
    createdByUserId: access.actor.event.createdByUserId,
    orgOwnerId: access.actor.orgAccess.org?.ownerId ?? null,
  });

  if (
    isProtectedEventAccess({
      member,
      createdByUserId: access.actor.event.createdByUserId,
      orgOwnerId: access.actor.orgAccess.org?.ownerId ?? null,
      protectedEmails,
    })
  ) {
    return NextResponse.json(
      { error: "Protected event access cannot be modified" },
      { status: 400 },
    );
  }

  if (action === "resend") {
    if (member.status === "active") {
      return NextResponse.json(
        { error: "Active members do not need an invite resend" },
        { status: 400 },
      );
    }

    const tokenData = createInviteTokenPair();

    const updated = await EventTeam.findOneAndUpdate(
      { _id: member._id, eventId: access.actor.event._id },
      {
        $set: {
          inviteTokenHash: tokenData.tokenHash,
          inviteExpiresAt: tokenData.expiresAt,
          status: "invited",
        },
        $unset: {
          inviteToken: "",
          acceptedAt: "",
        },
      },
      { new: true },
    )
      .select(SAFE_MEMBER_SELECT)
      .lean<EventTeamLean | null>();

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

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

    const delivery = await sendEventInviteEmail({
      to: member.email,
      eventTitle: access.actor.event.title || "Event",
      roleName: roleLabel(member.role),
      inviterName,
      rawToken: tokenData.rawToken,
      expiresAt: tokenData.expiresAt,
    });

    return NextResponse.json({
      member: toSafeMemberResponse(updated),
      inviteDelivery: delivery.ok ? "sent" : "failed",
    });
  }

  const setUpdate: Record<string, unknown> = {};
  const unsetUpdate: Record<string, ""> = {};

  if (role) {
    setUpdate.role = role;
  }

  if (status === "revoked") {
    setUpdate.status = "revoked";
    unsetUpdate.inviteToken = "";
    unsetUpdate.inviteTokenHash = "";
    unsetUpdate.inviteExpiresAt = "";
  }

  if (typeof temporaryAccess === "boolean") {
    setUpdate.temporaryAccess = temporaryAccess;

    if (!temporaryAccess) {
      unsetUpdate.expiresAt = "";

      if (member.status === "expired") {
        setUpdate.status = "active";
      }
    }
  }

  if (expiresAt && temporaryAccess !== false) {
    setUpdate.expiresAt = expiresAt;
    setUpdate.temporaryAccess = true;

    if (member.status === "expired") {
      setUpdate.status = "active";
    }
  }

  if (
    Object.keys(setUpdate).length === 0 &&
    Object.keys(unsetUpdate).length === 0
  ) {
    return NextResponse.json(
      { error: "No valid update fields provided" },
      { status: 400 },
    );
  }

  const updateDoc: {
    $set?: Record<string, unknown>;
    $unset?: Record<string, "">;
  } = {};

  if (Object.keys(setUpdate).length > 0) {
    updateDoc.$set = setUpdate;
  }

  if (Object.keys(unsetUpdate).length > 0) {
    updateDoc.$unset = unsetUpdate;
  }

  const updated = await EventTeam.findOneAndUpdate(
    { _id: member._id, eventId: access.actor.event._id },
    updateDoc,
    { new: true },
  )
    .select(SAFE_MEMBER_SELECT)
    .lean<EventTeamLean | null>();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(toSafeMemberResponse(updated));
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsedParams = ParamsZ.safeParse(await ctx.params);

  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
  }

  const { id, memberId } = parsedParams.data;

  const access = await assertCanRemoveEventTeam({
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

  const member = await EventTeam.findOne({
    _id: new Types.ObjectId(memberId),
    eventId: access.actor.event._id,
  })
    .select(SAFE_MEMBER_SELECT)
    .lean<EventTeamLean | null>();

  if (!member) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const protectedEmails = await loadProtectedEventEmails({
    createdByUserId: access.actor.event.createdByUserId,
    orgOwnerId: access.actor.orgAccess.org?.ownerId ?? null,
  });

  if (
    isProtectedEventAccess({
      member,
      createdByUserId: access.actor.event.createdByUserId,
      orgOwnerId: access.actor.orgAccess.org?.ownerId ?? null,
      protectedEmails,
    })
  ) {
    return NextResponse.json(
      { error: "Protected event access cannot be removed" },
      { status: 400 },
    );
  }

  const res = await EventTeam.deleteOne({
    _id: member._id,
    eventId: access.actor.event._id,
  });

  if (res.deletedCount === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
