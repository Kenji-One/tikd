// src\app\api\teams\[teamId]\members\[memberId]\route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";

import "@/lib/mongoose";
import { auth } from "@/lib/auth";
import Team from "@/models/Team";
import TeamMember from "@/models/TeamMember";
import User from "@/models/User";
import { createInviteTokenPair, sendTeamInviteEmail } from "@/lib/teamInvites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const preferredRegion = "auto";
export const maxDuration = 10;

type Ctx = { params: Promise<{ teamId: string; memberId: string }> };

const ObjectIdZ = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

const ParamsZ = z.object({
  teamId: ObjectIdZ,
  memberId: ObjectIdZ,
});

const TeamRoleZ = z.enum([
  "admin",
  "promoter",
  "scanner",
  "collaborator",
  "member",
]);

type TeamRole = z.infer<typeof TeamRoleZ>;
type TeamMemberStatus = "invited" | "active" | "revoked" | "expired";

type TeamMemberLean = {
  _id: Types.ObjectId;
  teamId: Types.ObjectId;
  email: string;
  userId?: Types.ObjectId | null;
  name?: string;
  role: TeamRole;
  status: TeamMemberStatus;
  temporaryAccess: boolean;
  expiresAt?: Date | null;
  invitedBy: Types.ObjectId;
  inviteToken?: string;
  inviteTokenHash?: string;
  inviteExpiresAt?: Date | null;
  acceptedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type TeamLean = {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  name?: string;
};

const SAFE_MEMBER_SELECT =
  "_id teamId email userId name role status temporaryAccess expiresAt invitedBy inviteExpiresAt acceptedAt createdAt updatedAt";

const patchSchema = z
  .object({
    role: TeamRoleZ.optional(),
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

function normalizeEmail(email?: string | null): string {
  return String(email ?? "")
    .trim()
    .toLowerCase();
}

function buildActiveMembershipTimeClause(now: Date) {
  return {
    $or: [
      { temporaryAccess: false },
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gte: now } },
    ],
  };
}

function buildIdentityMatch(userId: string, email?: string | null) {
  const or: Array<Record<string, unknown>> = [];

  if (Types.ObjectId.isValid(userId)) {
    or.push({ userId: new Types.ObjectId(userId) });
  }

  const emailLower = normalizeEmail(email);
  if (emailLower) {
    or.push({ email: emailLower });
  }

  return or;
}

function toSafeMemberResponse(member: TeamMemberLean) {
  return {
    _id: String(member._id),
    teamId: String(member.teamId),
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

function roleLabel(role: TeamRole): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "promoter":
      return "Promoter";
    case "scanner":
      return "Scanner";
    case "collaborator":
      return "Collaborator";
    case "member":
      return "Member";
    default:
      return "Member";
  }
}

async function loadTeam(teamId: string): Promise<TeamLean | null> {
  return Team.findById(teamId)
    .select("_id ownerId name")
    .lean<TeamLean | null>();
}

async function loadOwnerEmail(ownerId: Types.ObjectId): Promise<string> {
  const owner = await User.findById(ownerId)
    .select("email")
    .lean<{ email?: string } | null>();

  return normalizeEmail(owner?.email);
}

async function assertCanManageTeamMembers(input: {
  teamId: string;
  userId: string;
  email?: string | null;
}): Promise<
  { ok: true; team: TeamLean } | { ok: false; status: number; error: string }
> {
  const team = await loadTeam(input.teamId);

  if (!team) {
    return { ok: false, status: 404, error: "Team not found" };
  }

  if (String(team.ownerId) === String(input.userId)) {
    return { ok: true, team };
  }

  const identity = buildIdentityMatch(input.userId, input.email);
  if (!identity.length) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  const admin = await TeamMember.findOne({
    teamId: team._id,
    role: "admin",
    status: "active",
    $and: [{ $or: identity }, buildActiveMembershipTimeClause(new Date())],
  })
    .select("_id")
    .lean<{ _id: Types.ObjectId } | null>();

  if (!admin) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true, team };
}

function isProtectedOwnerMembership(input: {
  member: TeamMemberLean;
  ownerId: Types.ObjectId;
  ownerEmail: string;
}): boolean {
  if (
    input.member.userId &&
    String(input.member.userId) === String(input.ownerId)
  ) {
    return true;
  }

  return (
    !!input.ownerEmail &&
    normalizeEmail(input.member.email) === input.ownerEmail
  );
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

  const { teamId, memberId } = parsedParams.data;

  const access = await assertCanManageTeamMembers({
    teamId,
    userId: session.user.id,
    email: session.user.email ?? undefined,
  });

  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  const member = await TeamMember.findOne({
    _id: new Types.ObjectId(memberId),
    teamId: access.team._id,
  })
    .select(SAFE_MEMBER_SELECT)
    .lean<TeamMemberLean | null>();

  if (!member) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ownerEmail = await loadOwnerEmail(access.team.ownerId);

  if (
    isProtectedOwnerMembership({
      member,
      ownerId: access.team.ownerId,
      ownerEmail,
    })
  ) {
    return NextResponse.json(
      { error: "Owner membership cannot be modified" },
      { status: 400 },
    );
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

    const tokenData = createInviteTokenPair();

    const updated = await TeamMember.findOneAndUpdate(
      { _id: member._id, teamId: access.team._id },
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
      .lean<TeamMemberLean | null>();

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

    const delivery = await sendTeamInviteEmail({
      to: member.email,
      teamName: access.team.name || "Team",
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

  const updated = await TeamMember.findOneAndUpdate(
    { _id: member._id, teamId: access.team._id },
    updateDoc,
    { new: true },
  )
    .select(SAFE_MEMBER_SELECT)
    .lean<TeamMemberLean | null>();

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

  const { teamId, memberId } = parsedParams.data;

  const access = await assertCanManageTeamMembers({
    teamId,
    userId: session.user.id,
    email: session.user.email ?? undefined,
  });

  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  const member = await TeamMember.findOne({
    _id: new Types.ObjectId(memberId),
    teamId: access.team._id,
  })
    .select(SAFE_MEMBER_SELECT)
    .lean<TeamMemberLean | null>();

  if (!member) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ownerEmail = await loadOwnerEmail(access.team.ownerId);

  if (
    isProtectedOwnerMembership({
      member,
      ownerId: access.team.ownerId,
      ownerEmail,
    })
  ) {
    return NextResponse.json(
      { error: "Owner membership cannot be removed" },
      { status: 400 },
    );
  }

  const res = await TeamMember.deleteOne({
    _id: member._id,
    teamId: access.team._id,
  });

  if (res.deletedCount === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
