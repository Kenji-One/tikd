import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";
import { z } from "zod";
import crypto from "crypto";
import { Types } from "mongoose";

import { auth } from "@/lib/auth";
import EventTeam from "@/models/EventTeam";
import { resolveEventActor } from "@/lib/eventAccess";

type Ctx = { params: Promise<{ id: string; memberId: string }> };

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

const patchSchema = z
  .object({
    role: z.enum(["admin", "promoter", "scanner", "collaborator"]).optional(),
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

    if (value.temporaryAccess === true && !value.expiresAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "expiresAt is required when temporaryAccess is true",
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

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, memberId } = await ctx.params;

  if (!isObjectId(id) || !isObjectId(memberId)) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
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

  const member = await EventTeam.findOne({
    _id: new Types.ObjectId(memberId),
    eventId: new Types.ObjectId(id),
  })
    .select(SAFE_MEMBER_SELECT)
    .lean<EventTeamLean | null>();

  if (!member) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body: unknown = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const { role, status, temporaryAccess, expiresAt, action } = parsed.data;

  if (action === "resend") {
    if (member.status === "active") {
      return NextResponse.json(
        { error: "Active members do not need an invite resend" },
        { status: 400 },
      );
    }

    const updated = await EventTeam.findOneAndUpdate(
      { _id: member._id, eventId: member.eventId },
      {
        $set: {
          inviteToken: crypto.randomBytes(20).toString("hex"),
          status: "invited",
        },
      },
      { new: true },
    )
      .select(SAFE_MEMBER_SELECT)
      .lean<EventTeamLean | null>();

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      member: toSafeMemberResponse(updated),
      inviteDelivery: "not_implemented",
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
  }

  if (typeof temporaryAccess === "boolean") {
    setUpdate.temporaryAccess = temporaryAccess;

    if (temporaryAccess === false) {
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

  if (Object.keys(setUpdate).length) {
    updateDoc.$set = setUpdate;
  }

  if (Object.keys(unsetUpdate).length) {
    updateDoc.$unset = unsetUpdate;
  }

  const updated = await EventTeam.findOneAndUpdate(
    { _id: member._id, eventId: member.eventId },
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

  const { id, memberId } = await ctx.params;

  if (!isObjectId(id) || !isObjectId(memberId)) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
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

  const res = await EventTeam.deleteOne({
    _id: new Types.ObjectId(memberId),
    eventId: new Types.ObjectId(id),
  });

  if (res.deletedCount === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
