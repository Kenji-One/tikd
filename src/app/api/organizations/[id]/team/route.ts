/* ------------------------------------------------------------------ */
/*  /api/organizations/[id]/team – List & Invite org team members     */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";
import { z } from "zod";
import crypto from "crypto";
import { Types } from "mongoose";

import { auth } from "@/lib/auth";
import Organization from "@/models/Organization";
import User from "@/models/User";
import OrgTeam, { IOrgTeam } from "@/models/OrgTeam";
import OrgRole from "@/models/OrgRole";

type Ctx = { params: Promise<{ id: string }> };
const isObjectId = (val: string) => /^[a-f\d]{24}$/i.test(val);

type SystemRole = "admin" | "promoter" | "scanner" | "collaborator" | "member";

/* ------------------------------ Zod ------------------------------- */
/**
 * Backwards compatible:
 * - role: system role enum (existing)
 * - roleId: optional custom role id (new)
 * If roleId is provided, we store role="member" and roleId=<ObjectId>
 */
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
    expiresAt: z.coerce.date().optional(), // required if temporaryAccess=true
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
  });

/* ----------------------- Permission helpers ----------------------- */
async function assertCanManageOrg(orgId: string, userId: string) {
  const owner = await Organization.findOne({
    _id: orgId,
    ownerId: userId,
  }).lean();
  if (owner) return true;

  const admin = await OrgTeam.findOne({
    organizationId: orgId,
    userId,
    role: "admin",
    status: "active",
  }).lean();

  return !!admin;
}

type OrgTeamApiRow = Omit<IOrgTeam, "role"> & { role: SystemRole | "owner" };

/* ------------------------------- GET ------------------------------ */
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

  const can = await assertCanManageOrg(id, session.user.id);
  if (!can) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ✅ need ownerId so we can return "owner" display role
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

  const members = await OrgTeam.find({ organizationId: id }).lean<IOrgTeam[]>();

  const ownerIdStr = org.ownerId ? String(org.ownerId) : "";

  // ✅ Display-only: return role="owner" for the org creator.
  //    DB stays role="admin" so permission checks keep working.
  const shaped: OrgTeamApiRow[] = members.map((m) => {
    const isOwnerMember =
      ownerIdStr && m.userId && String(m.userId) === ownerIdStr;

    if (!isOwnerMember) {
      return { ...(m as Omit<IOrgTeam, "role">), role: m.role as SystemRole };
    }

    return { ...(m as Omit<IOrgTeam, "role">), role: "owner" };
  });

  return NextResponse.json(shaped);
}

/* ------------------------------- POST ----------------------------- */
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

  const org = await Organization.findById(id).select("_id ownerId").lean();
  if (!org) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 },
    );
  }

  const allowed = await assertCanManageOrg(id, session.user.id);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const jsonBody: unknown = await req.json().catch(() => null);
  const parsed = inviteSchema.safeParse(jsonBody);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const { email, role, roleId, temporaryAccess, expiresAt } = parsed.data;

  if (temporaryAccess && !expiresAt) {
    return NextResponse.json(
      { error: "expiresAt is required for temporary access" },
      { status: 400 },
    );
  }

  // Validate custom role belongs to org
  let resolvedRole: SystemRole = role ?? "member";
  let resolvedRoleId: Types.ObjectId | null = null;

  if (roleId) {
    const exists = await OrgRole.findOne({
      _id: new Types.ObjectId(roleId),
      organizationId: new Types.ObjectId(id),
    })
      .select("_id")
      .lean();

    if (!exists) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    resolvedRole = "member";
    resolvedRoleId = new Types.ObjectId(roleId);
  }

  const emailLower = email.trim().toLowerCase();

  const existingUser = await User.findOne({ email: emailLower })
    .select("_id firstName lastName username")
    .lean<{
      _id: Types.ObjectId;
      firstName?: string;
      lastName?: string;
      username?: string;
    } | null>();

  const name =
    existingUser?.firstName || existingUser?.lastName
      ? `${existingUser?.firstName ?? ""} ${existingUser?.lastName ?? ""}`.trim()
      : (existingUser?.username ?? "");

  const inviteToken = crypto.randomBytes(20).toString("hex");

  const member = await OrgTeam.findOneAndUpdate(
    { organizationId: id, email: emailLower },
    {
      $set: {
        role: resolvedRole,
        roleId: resolvedRoleId,
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

  return NextResponse.json({ member }, { status: 201 });
}
