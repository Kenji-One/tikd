// src/app/api/organizations/[id]/team/route.ts
/* ------------------------------------------------------------------ */
/*  /api/organizations/[id]/team – List & Invite org team members     */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";
import { z } from "zod";
import crypto from "crypto";

import { auth } from "@/lib/auth";
import Organization from "@/models/Organization";
import User from "@/models/User";
import OrgTeam, { IOrgTeam } from "@/models/OrgTeam";

type Ctx = { params: Promise<{ id: string }> };
const isObjectId = (val: string) => /^[a-f\d]{24}$/i.test(val);

/* ------------------------------ Zod ------------------------------- */
const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "promoter", "scanner", "collaborator"]),
  temporaryAccess: z.boolean().optional().default(false),
  expiresAt: z.coerce.date().optional(), // required if temporaryAccess=true
  applyTo: z
    .object({
      existing: z.boolean().optional().default(false),
      future: z.boolean().optional().default(false),
    })
    .optional()
    .default({ existing: false, future: false }), // kept for compatibility with InviteTeamModal
});

/* ----------------------- Permission helpers ----------------------- */
async function assertCanManageOrg(orgId: string, userId: string) {
  // Owner of org
  const owner = await Organization.findOne({
    _id: orgId,
    ownerId: userId,
  }).lean();
  if (owner) return true;

  // Or active org admin
  const admin = await OrgTeam.findOne({
    organizationId: orgId,
    userId,
    role: "admin",
    status: "active",
  }).lean();

  return !!admin;
}

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
      { status: 400 }
    );
  }

  const can = await assertCanManageOrg(id, session.user.id);
  if (!can) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Mark expired on the fly
  await OrgTeam.updateMany(
    {
      organizationId: id,
      temporaryAccess: true,
      expiresAt: { $lt: new Date() },
      status: { $ne: "revoked" },
    },
    { $set: { status: "expired" } }
  );

  const members = await OrgTeam.find({ organizationId: id }).lean<IOrgTeam[]>();
  return NextResponse.json(members);
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
      { status: 400 }
    );
  }

  const org = await Organization.findById(id).select("_id ownerId").lean();
  if (!org) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
    );
  }

  const allowed = await assertCanManageOrg(id, session.user.id);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const jsonBody = await req.json();
  const parsed = inviteSchema.safeParse(jsonBody);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const { email, role, temporaryAccess, expiresAt } = parsed.data;

  if (temporaryAccess && !expiresAt) {
    return NextResponse.json(
      { error: "expiresAt is required for temporary access" },
      { status: 400 }
    );
  }

  // Link user if exists (for avatar/name + future permissions)
  const existingUser = await User.findOne({ email })
    .select("_id firstName lastName username")
    .lean();

  const name =
    existingUser?.firstName || existingUser?.lastName
      ? `${existingUser?.firstName ?? ""} ${existingUser?.lastName ?? ""}`.trim()
      : (existingUser?.username ?? "");

  const inviteToken = crypto.randomBytes(20).toString("hex");

  const member = await OrgTeam.findOneAndUpdate(
    { organizationId: id, email: email.toLowerCase() },
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
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  // NOTE: applyTo.existing / future are ignored at org-level right now.
  return NextResponse.json({ member }, { status: 201 });
}
