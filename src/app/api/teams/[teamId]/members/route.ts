// src\app\api\teams\[teamId]\members\route.ts
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

type Ctx = { params: Promise<{ teamId: string }> };

const ObjectIdZ = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

const ParamsZ = z.object({
  teamId: ObjectIdZ,
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

type ExistingUserLean = {
  _id: Types.ObjectId;
  email?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
};

type TeamLean = {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  name?: string;
};

const SAFE_MEMBER_SELECT =
  "_id teamId email userId name role status temporaryAccess expiresAt invitedBy inviteExpiresAt acceptedAt createdAt updatedAt";

const inviteSchema = z
  .object({
    email: z.string().email(),
    role: TeamRoleZ.default("member"),
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

async function assertCanViewTeamMembers(input: {
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

  const member = await TeamMember.findOne({
    teamId: team._id,
    status: "active",
    $and: [{ $or: identity }, buildActiveMembershipTimeClause(new Date())],
  })
    .select("_id")
    .lean<{ _id: Types.ObjectId } | null>();

  if (!member) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true, team };
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

/* ------------------------------- GET ------------------------------ */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsedParams = ParamsZ.safeParse(await ctx.params);

  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid team id" }, { status: 400 });
  }

  const { teamId } = parsedParams.data;

  const access = await assertCanViewTeamMembers({
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

  await TeamMember.updateMany(
    {
      teamId: new Types.ObjectId(teamId),
      temporaryAccess: true,
      expiresAt: { $lt: new Date() },
      status: { $ne: "revoked" },
    },
    { $set: { status: "expired" } },
  );

  const members = await TeamMember.find({
    teamId: new Types.ObjectId(teamId),
  })
    .select(SAFE_MEMBER_SELECT)
    .sort({ createdAt: 1 })
    .lean<TeamMemberLean[]>();

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
    return NextResponse.json({ error: "Invalid team id" }, { status: 400 });
  }

  const { teamId } = parsedParams.data;

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

  const jsonBody: unknown = await req.json().catch(() => null);
  const parsed = inviteSchema.safeParse(jsonBody);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const { email, role, temporaryAccess, expiresAt } = parsed.data;
  const emailLower = normalizeEmail(email);

  const ownerEmail = await loadOwnerEmail(access.team.ownerId);
  if (ownerEmail && ownerEmail === emailLower) {
    return NextResponse.json(
      { error: "The team owner already has access" },
      { status: 400 },
    );
  }

  const existingUser = await User.findOne({ email: emailLower })
    .select("_id email firstName lastName username")
    .lean<ExistingUserLean | null>();

  if (
    existingUser &&
    String(existingUser._id) === String(access.team.ownerId)
  ) {
    return NextResponse.json(
      { error: "The team owner already has access" },
      { status: 400 },
    );
  }

  const displayName =
    existingUser?.firstName || existingUser?.lastName
      ? `${existingUser.firstName ?? ""} ${existingUser.lastName ?? ""}`.trim()
      : (existingUser?.username ?? "");

  const existingMember = await TeamMember.findOne({
    teamId: access.team._id,
    email: emailLower,
  })
    .select("_id status temporaryAccess expiresAt")
    .lean<{
      _id: Types.ObjectId;
      status: TeamMemberStatus;
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

  const setUpdate: Record<string, unknown> = {
    role,
    temporaryAccess,
    invitedBy: new Types.ObjectId(session.user.id),
    userId: existingUser?._id ?? null,
    name: displayName,
    status: isAlreadyActive ? "active" : "invited",
  };

  const unsetUpdate: Record<string, ""> = {};

  if (temporaryAccess) {
    setUpdate.expiresAt = expiresAt;
  } else {
    unsetUpdate.expiresAt = "";
  }

  if (tokenData) {
    setUpdate.inviteTokenHash = tokenData.tokenHash;
    setUpdate.inviteExpiresAt = tokenData.expiresAt;
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

  const member = await TeamMember.findOneAndUpdate(
    { teamId: access.team._id, email: emailLower },
    updateDoc,
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  )
    .select(SAFE_MEMBER_SELECT)
    .lean<TeamMemberLean | null>();

  if (!member) {
    return NextResponse.json(
      { error: "Could not save team member" },
      { status: 500 },
    );
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

    const mailResult = await sendTeamInviteEmail({
      to: emailLower,
      teamName: access.team.name || "Team",
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
      inviteDelivery,
      appliedExisting: 0,
    },
    { status: existingMember ? 200 : 201 },
  );
}
