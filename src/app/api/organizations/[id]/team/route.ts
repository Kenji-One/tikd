import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";
import { z } from "zod";
import { Types } from "mongoose";

import { auth } from "@/lib/auth";
import Organization from "@/models/Organization";
import User from "@/models/User";
import OrgTeam from "@/models/OrgTeam";
import OrgRole from "@/models/OrgRole";
import { requireOrgPermission, hasOrgPermission } from "@/lib/orgAccess";
import {
  createInviteTokenPair,
  sendOrganizationInviteEmail,
} from "@/lib/orgInvites";
import { getSystemRoleFallback } from "@/lib/orgRoles";

type Ctx = { params: Promise<{ id: string }> };
const isObjectId = (val: string) => /^[a-f\d]{24}$/i.test(val);

type SystemRole = "admin" | "promoter" | "scanner" | "collaborator" | "member";
type SafeRole = SystemRole | "owner";

type OrgTeamLean = {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  email: string;
  userId?: Types.ObjectId | null;
  name?: string;
  role: SystemRole;
  roleId?: Types.ObjectId | null;
  status: "invited" | "active" | "revoked" | "expired";
  temporaryAccess: boolean;
  expiresAt?: Date | null;
  invitedBy: Types.ObjectId;
  inviteExpiresAt?: Date | null;
  acceptedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const SAFE_MEMBER_SELECT =
  "_id organizationId email userId name role roleId status temporaryAccess expiresAt invitedBy inviteExpiresAt acceptedAt createdAt updatedAt";

/* ------------------------------ Zod ------------------------------- */
const inviteSchema = z
  .object({
    email: z.string().email(),
    role: z
      .enum(["admin", "promoter", "scanner", "collaborator", "member"])
      .optional(),
    roleId: z
      .string()
      .regex(/^[a-f\d]{24}$/i)
      .optional(),
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
  .superRefine((v, ctx) => {
    if (!v.role && !v.roleId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either role or roleId is required",
        path: ["role"],
      });
    }

    if (v.role && v.roleId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide either role or roleId, not both",
        path: ["roleId"],
      });
    }

    if (v.temporaryAccess && !v.expiresAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "expiresAt is required for temporary access",
        path: ["expiresAt"],
      });
    }

    if (
      v.temporaryAccess &&
      v.expiresAt &&
      v.expiresAt.getTime() <= Date.now()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "expiresAt must be in the future",
        path: ["expiresAt"],
      });
    }
  });

function toSafeMemberResponse(
  member: OrgTeamLean,
  ownerId?: Types.ObjectId | string,
) {
  const ownerIdStr = ownerId ? String(ownerId) : "";
  const isOwnerMember =
    ownerIdStr && member.userId && String(member.userId) === ownerIdStr;

  return {
    _id: String(member._id),
    organizationId: String(member.organizationId),
    email: member.email,
    userId: member.userId ? String(member.userId) : null,
    name: member.name || "",
    role: (isOwnerMember ? "owner" : member.role) as SafeRole,
    roleId: member.roleId ? String(member.roleId) : null,
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

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!isObjectId(id)) {
    return NextResponse.json(
      { error: "Invalid organization id" },
      { status: 400 },
    );
  }

  const permission = await requireOrgPermission({
    organizationId: id,
    userId: session.user.id,
    email: session.user.email ?? undefined,
    permission: "members.view",
  });

  if (!permission.ok) {
    return NextResponse.json(
      { error: permission.error },
      { status: permission.status },
    );
  }

  const org = await Organization.findById(id).select("_id ownerId").lean<{
    _id: Types.ObjectId;
    ownerId?: Types.ObjectId | string;
  } | null>();

  if (!org) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 },
    );
  }

  await OrgTeam.updateMany(
    {
      organizationId: id,
      temporaryAccess: true,
      expiresAt: { $lt: new Date() },
      status: { $ne: "revoked" },
    },
    { $set: { status: "expired" } },
  );

  const members = await OrgTeam.find({ organizationId: id })
    .select(SAFE_MEMBER_SELECT)
    .sort({ createdAt: 1 })
    .lean<OrgTeamLean[]>();

  const shaped = members.map((member) =>
    toSafeMemberResponse(member, org.ownerId),
  );

  return NextResponse.json(shaped);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!isObjectId(id)) {
    return NextResponse.json(
      { error: "Invalid organization id" },
      { status: 400 },
    );
  }

  const canInvite = await requireOrgPermission({
    organizationId: id,
    userId: session.user.id,
    email: session.user.email ?? undefined,
    permission: "members.invite",
  });

  if (!canInvite.ok) {
    return NextResponse.json(
      { error: canInvite.error },
      { status: canInvite.status },
    );
  }

  const jsonBody: unknown = await req.json().catch(() => null);
  const parsed = inviteSchema.safeParse(jsonBody);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const { email, role, roleId, temporaryAccess, expiresAt } = parsed.data;
  const emailLower = email.trim().toLowerCase();

  const org = await Organization.findById(id).select("_id ownerId name").lean<{
    _id: Types.ObjectId;
    ownerId: Types.ObjectId;
    name?: string;
  } | null>();

  if (!org) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 },
    );
  }

  const ownerUser = await User.findById(org.ownerId)
    .select("_id email firstName lastName username")
    .lean<{
      _id: Types.ObjectId;
      email?: string;
      firstName?: string;
      lastName?: string;
      username?: string;
    } | null>();

  const ownerEmail = String(ownerUser?.email ?? "")
    .trim()
    .toLowerCase();

  if (ownerEmail && ownerEmail === emailLower) {
    return NextResponse.json(
      { error: "The organization owner already has access" },
      { status: 400 },
    );
  }

  let resolvedRole: SystemRole = role ?? "member";
  let resolvedRoleId: Types.ObjectId | null = null;
  let resolvedRoleName =
    getSystemRoleFallback(resolvedRole)?.name ??
    resolvedRole.charAt(0).toUpperCase() + resolvedRole.slice(1);

  const assigningNonDefault = !!roleId || (role && role !== "member");

  if (
    assigningNonDefault &&
    !hasOrgPermission(canInvite.access, "members.assignRoles")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (roleId) {
    const customRole = await OrgRole.findOne({
      _id: new Types.ObjectId(roleId),
      organizationId: new Types.ObjectId(id),
    })
      .select("_id name")
      .lean<{ _id: Types.ObjectId; name: string } | null>();

    if (!customRole) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    resolvedRole = "member";
    resolvedRoleId = customRole._id;
    resolvedRoleName = customRole.name;
  }

  const existingUser = await User.findOne({ email: emailLower })
    .select("_id email firstName lastName username")
    .lean<{
      _id: Types.ObjectId;
      email?: string;
      firstName?: string;
      lastName?: string;
      username?: string;
    } | null>();

  if (existingUser && String(existingUser._id) === String(org.ownerId)) {
    return NextResponse.json(
      { error: "The organization owner already has access" },
      { status: 400 },
    );
  }

  const displayName =
    existingUser?.firstName || existingUser?.lastName
      ? `${existingUser?.firstName ?? ""} ${existingUser?.lastName ?? ""}`.trim()
      : (existingUser?.username ?? "");

  const existingMember = await OrgTeam.findOne({
    organizationId: id,
    email: emailLower,
  })
    .select("_id userId status temporaryAccess expiresAt")
    .lean<{
      _id: Types.ObjectId;
      userId?: Types.ObjectId | null;
      status: string;
      temporaryAccess?: boolean;
      expiresAt?: Date | null;
    } | null>();

  if (
    existingMember?.userId &&
    String(existingMember.userId) === String(org.ownerId)
  ) {
    return NextResponse.json(
      { error: "The organization owner already has access" },
      { status: 400 },
    );
  }

  const isExpiredActive =
    existingMember?.status === "active" &&
    existingMember.temporaryAccess === true &&
    !!existingMember.expiresAt &&
    existingMember.expiresAt.getTime() < Date.now();

  const isAlreadyActive =
    existingMember?.status === "active" && !isExpiredActive;

  const tokenData = isAlreadyActive ? null : createInviteTokenPair();

  const setUpdate: Record<string, unknown> = {
    role: resolvedRole,
    roleId: resolvedRoleId,
    temporaryAccess: !!temporaryAccess,
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
    unsetUpdate.acceptedAt = "";
  } else {
    unsetUpdate.inviteTokenHash = "";
    unsetUpdate.inviteToken = "";
    unsetUpdate.inviteExpiresAt = "";
  }

  const updateDoc: {
    $set: Record<string, unknown>;
    $unset?: Record<string, "">;
  } = {
    $set: setUpdate,
  };

  if (Object.keys(unsetUpdate).length) {
    updateDoc.$unset = unsetUpdate;
  }

  const member = await OrgTeam.findOneAndUpdate(
    { organizationId: id, email: emailLower },
    updateDoc,
    { new: true, upsert: true, setDefaultsOnInsert: true },
  )
    .select(SAFE_MEMBER_SELECT)
    .lean<OrgTeamLean | null>();

  if (!member) {
    return NextResponse.json(
      { error: "Could not save member" },
      { status: 500 },
    );
  }

  let inviteDelivery: "sent" | "skipped" | "failed" = "skipped";

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
        ? `${inviterUser?.firstName ?? ""} ${inviterUser?.lastName ?? ""}`.trim()
        : (inviterUser?.username ?? inviterUser?.email ?? "");

    const mailResult = await sendOrganizationInviteEmail({
      to: emailLower,
      organizationName: org.name || "Organization",
      roleName: resolvedRoleName,
      inviterName,
      rawToken: tokenData.rawToken,
      expiresAt: tokenData.expiresAt,
    });

    inviteDelivery = mailResult.ok ? "sent" : "failed";
  }

  return NextResponse.json(
    {
      member: toSafeMemberResponse(member, org.ownerId),
      inviteDelivery,
    },
    { status: 201 },
  );
}
