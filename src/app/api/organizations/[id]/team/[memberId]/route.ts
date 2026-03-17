import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";
import { z } from "zod";
import { Types } from "mongoose";

import { auth } from "@/lib/auth";
import Organization from "@/models/Organization";
import OrgTeam from "@/models/OrgTeam";
import OrgRole from "@/models/OrgRole";
import User from "@/models/User";
import { requireOrgPermission } from "@/lib/orgAccess";
import {
  createInviteTokenPair,
  sendOrganizationInviteEmail,
} from "@/lib/orgInvites";
import { getSystemRoleFallback } from "@/lib/orgRoles";

type Ctx = { params: Promise<{ id: string; memberId: string }> };
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

const patchSchema = z
  .object({
    role: z
      .enum(["admin", "promoter", "scanner", "collaborator", "member"])
      .optional(),
    roleId: z
      .string()
      .regex(/^[a-f\d]{24}$/i)
      .optional(),
    status: z.enum(["revoked"]).optional(),
    temporaryAccess: z.boolean().optional(),
    expiresAt: z.coerce.date().optional(),
    action: z.enum(["resend"]).optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.action) {
      if (
        v.role ||
        v.roleId ||
        v.status ||
        typeof v.temporaryAccess === "boolean" ||
        v.expiresAt
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "action cannot be combined with other update fields",
          path: ["action"],
        });
      }
    }

    if (v.role && v.roleId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide either role or roleId, not both",
        path: ["roleId"],
      });
    }

    if (v.temporaryAccess === true && !v.expiresAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "expiresAt is required when temporaryAccess is true",
        path: ["expiresAt"],
      });
    }

    if (v.expiresAt && v.expiresAt.getTime() <= Date.now()) {
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

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, memberId } = await ctx.params;
  if (!isObjectId(id) || !isObjectId(memberId)) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
  }

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

  const member = await OrgTeam.findOne({
    _id: new Types.ObjectId(memberId),
    organizationId: new Types.ObjectId(id),
  })
    .select(SAFE_MEMBER_SELECT)
    .lean<OrgTeamLean | null>();

  if (!member) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (member.userId && String(member.userId) === String(org.ownerId)) {
    return NextResponse.json(
      { error: "Owner membership cannot be modified" },
      { status: 400 },
    );
  }

  const jsonBody: unknown = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(jsonBody);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const { role, roleId, status, temporaryAccess, expiresAt, action } =
    parsed.data;

  if (action === "resend") {
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

    if (member.status === "active") {
      return NextResponse.json(
        { error: "Active members do not need an invite resend" },
        { status: 400 },
      );
    }

    const tokenData = createInviteTokenPair();

    const updated = await OrgTeam.findOneAndUpdate(
      { _id: member._id, organizationId: org._id },
      {
        $set: {
          status: "invited",
          inviteTokenHash: tokenData.tokenHash,
          inviteExpiresAt: tokenData.expiresAt,
        },
        $unset: {
          inviteToken: "",
          acceptedAt: "",
        },
      },
      { new: true },
    )
      .select(SAFE_MEMBER_SELECT)
      .lean<OrgTeamLean | null>();

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
        ? `${inviterUser?.firstName ?? ""} ${inviterUser?.lastName ?? ""}`.trim()
        : (inviterUser?.username ?? inviterUser?.email ?? "");

    const resolvedRoleName = member.roleId
      ? ((
          await OrgRole.findById(member.roleId)
            .select("name")
            .lean<{ name?: string } | null>()
        )?.name ?? "Member")
      : (getSystemRoleFallback(member.role)?.name ??
        member.role.charAt(0).toUpperCase() + member.role.slice(1));

    const delivery = await sendOrganizationInviteEmail({
      to: member.email,
      organizationName: org.name || "Organization",
      roleName: resolvedRoleName,
      inviterName,
      rawToken: tokenData.rawToken,
      expiresAt: tokenData.expiresAt,
    });

    return NextResponse.json({
      member: toSafeMemberResponse(updated, org.ownerId),
      inviteDelivery: delivery.ok ? "sent" : "failed",
    });
  }

  const canAssign = await requireOrgPermission({
    organizationId: id,
    userId: session.user.id,
    email: session.user.email ?? undefined,
    permission: "members.assignRoles",
  });

  if (!canAssign.ok) {
    return NextResponse.json(
      { error: canAssign.error },
      { status: canAssign.status },
    );
  }

  const setUpdate: Record<string, unknown> = {};
  const unsetUpdate: Record<string, ""> = {};

  if (role) {
    setUpdate.role = role;
    setUpdate.roleId = null;
  }

  if (roleId) {
    const customRole = await OrgRole.findOne({
      _id: new Types.ObjectId(roleId),
      organizationId: org._id,
    })
      .select("_id")
      .lean<{ _id: Types.ObjectId } | null>();

    if (!customRole) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    setUpdate.role = "member";
    setUpdate.roleId = customRole._id;
  }

  if (status === "revoked") {
    setUpdate.status = "revoked";
    unsetUpdate.inviteTokenHash = "";
    unsetUpdate.inviteToken = "";
    unsetUpdate.inviteExpiresAt = "";
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

  const updated = await OrgTeam.findOneAndUpdate(
    { _id: member._id, organizationId: org._id },
    updateDoc,
    { new: true },
  )
    .select(SAFE_MEMBER_SELECT)
    .lean<OrgTeamLean | null>();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(toSafeMemberResponse(updated, org.ownerId));
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

  const canRemove = await requireOrgPermission({
    organizationId: id,
    userId: session.user.id,
    email: session.user.email ?? undefined,
    permission: "members.remove",
  });

  if (!canRemove.ok) {
    return NextResponse.json(
      { error: canRemove.error },
      { status: canRemove.status },
    );
  }

  const org = await Organization.findById(id)
    .select("_id ownerId")
    .lean<{ _id: Types.ObjectId; ownerId: Types.ObjectId } | null>();

  if (!org) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 },
    );
  }

  const member = await OrgTeam.findOne({
    _id: new Types.ObjectId(memberId),
    organizationId: org._id,
  })
    .select("_id userId")
    .lean<{ _id: Types.ObjectId; userId?: Types.ObjectId | null } | null>();

  if (!member) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (member.userId && String(member.userId) === String(org.ownerId)) {
    return NextResponse.json(
      { error: "Owner membership cannot be removed" },
      { status: 400 },
    );
  }

  const res = await OrgTeam.deleteOne({
    _id: member._id,
    organizationId: org._id,
  });

  if (res.deletedCount === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
