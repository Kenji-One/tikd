import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";
import { z } from "zod";
import { Types } from "mongoose";

import { auth } from "@/lib/auth";
import Organization from "@/models/Organization";
import OrgTeam from "@/models/OrgTeam";
import OrgRole, { type IOrgRole } from "@/models/OrgRole";
import { ORG_PERMISSION_KEYS } from "@/lib/orgPermissions";
import { ROLE_ICON_KEYS } from "@/lib/roleIcons";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Ctx = { params: Promise<{ id: string; roleId: string }> };
const isObjectId = (val: string) => /^[a-f\d]{24}$/i.test(val);

type PermissionsMap = Record<string, boolean>;

type RoleLean = Pick<
  IOrgRole,
  "_id" | "key" | "name" | "color" | "isSystem"
> & {
  order?: number;
  permissions?: PermissionsMap;
  iconKey?: string | null;
  iconUrl?: string | null;
};

/* ------------------------------ Zod ------------------------------ */
const permissionsSchema = z
  .record(z.string(), z.boolean())
  .superRefine((obj, ctx) => {
    for (const k of Object.keys(obj)) {
      if (!(ORG_PERMISSION_KEYS as readonly string[]).includes(k)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unknown permission key: ${k}`,
        });
      }
    }
  });

const iconKeySchema = z
  .enum(ROLE_ICON_KEYS as unknown as [string, ...string[]])
  .optional();

const patchSchema = z
  .object({
    name: z.string().min(2).max(64).optional(),
    color: z
      .string()
      .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Invalid hex color")
      .optional()
      .or(z.literal("")),
    iconKey: iconKeySchema.nullable().optional(),
    iconUrl: z.string().url().nullable().optional(),
    order: z.number().int().min(0).max(9999).optional(),
    permissions: permissionsSchema.optional(),
  })
  .strict();

/* ------------------------ Permission guards ----------------------- */
async function assertCanManageRoles(orgId: string, userId: string) {
  const org = await Organization.findById(orgId).select("_id ownerId").lean<{
    _id: Types.ObjectId;
    ownerId: Types.ObjectId;
  } | null>();

  if (!org) return { ok: false as const, status: 404 };

  if (String(org.ownerId) === String(userId)) return { ok: true as const, org };

  const admin = await OrgTeam.findOne({
    organizationId: orgId,
    userId,
    role: "admin",
    status: "active",
  })
    .select("_id")
    .lean();

  if (admin) return { ok: true as const, org };

  return { ok: false as const, status: 403 };
}

/* --------------------- Helpers: members count --------------------- */
async function computeMembersCount(
  orgId: string,
  role: Pick<IOrgRole, "_id" | "key" | "isSystem">,
) {
  if (role.isSystem) {
    // system role: counted by OrgTeam.role where roleId is null/absent
    return OrgTeam.countDocuments({
      organizationId: new Types.ObjectId(orgId),
      status: "active",
      role: role.key,
      $or: [{ roleId: { $exists: false } }, { roleId: null }],
    });
  }

  // custom role: counted by OrgTeam.roleId
  return OrgTeam.countDocuments({
    organizationId: new Types.ObjectId(orgId),
    status: "active",
    roleId: new Types.ObjectId(String(role._id)),
  });
}

function shapeRoleRow(role: RoleLean, membersCount: number) {
  return {
    _id: role._id,
    key: role.key,
    name: role.name,
    color: role.color || "",
    iconKey: role.iconKey ?? null,
    iconUrl: role.iconUrl ?? null,
    isSystem: !!role.isSystem,
    order: role.order ?? 0,
    permissions: role.permissions ?? {},
    membersCount,
  };
}

/* ------------------------------- PATCH ---------------------------- */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, roleId } = await ctx.params;
  if (!isObjectId(id) || !isObjectId(roleId)) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
  }

  const can = await assertCanManageRoles(id, session.user.id);
  if (!can.ok) {
    return NextResponse.json(
      { error: can.status === 404 ? "Organization not found" : "Forbidden" },
      { status: can.status },
    );
  }

  const body: unknown = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const existing = await OrgRole.findOne({
    _id: new Types.ObjectId(roleId),
    organizationId: new Types.ObjectId(id),
  })
    .select("_id key isSystem")
    .lean<{ _id: Types.ObjectId; key: string; isSystem: boolean } | null>();

  if (!existing)
    return NextResponse.json({ error: "Role not found" }, { status: 404 });

  const update: Partial<{
    name: string;
    color: string;
    iconKey: string | null;
    iconUrl: string | null;
    order: number;
    permissions: PermissionsMap;
  }> = {};

  if (typeof parsed.data.name === "string") update.name = parsed.data.name;
  if (typeof parsed.data.color === "string") update.color = parsed.data.color;

  // icon updates (keep them mutually exclusive)
  if (parsed.data.iconKey !== undefined) update.iconKey = parsed.data.iconKey;
  if (parsed.data.iconUrl !== undefined) update.iconUrl = parsed.data.iconUrl;

  // if iconKey is explicitly set to a truthy key, clear iconUrl
  if (parsed.data.iconKey) update.iconUrl = null;

  // if iconUrl is explicitly set to a truthy URL, clear iconKey
  if (parsed.data.iconUrl) update.iconKey = null;

  if (typeof parsed.data.order === "number") update.order = parsed.data.order;
  if (parsed.data.permissions) update.permissions = parsed.data.permissions;

  const updated = await OrgRole.findOneAndUpdate(
    {
      _id: new Types.ObjectId(roleId),
      organizationId: new Types.ObjectId(id),
    },
    { $set: update },
    { new: true },
  ).lean<RoleLean | null>();

  if (!updated)
    return NextResponse.json({ error: "Role not found" }, { status: 404 });

  const membersCount = await computeMembersCount(id, {
    _id: updated._id,
    key: updated.key,
    isSystem: updated.isSystem,
  });

  return NextResponse.json(shapeRoleRow(updated, membersCount));
}

/* ------------------------------- DELETE --------------------------- */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, roleId } = await ctx.params;
  if (!isObjectId(id) || !isObjectId(roleId)) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
  }

  const can = await assertCanManageRoles(id, session.user.id);
  if (!can.ok) {
    return NextResponse.json(
      { error: can.status === 404 ? "Organization not found" : "Forbidden" },
      { status: can.status },
    );
  }

  const role = await OrgRole.findOne({
    _id: new Types.ObjectId(roleId),
    organizationId: new Types.ObjectId(id),
  })
    .select("_id isSystem")
    .lean<{ _id: Types.ObjectId; isSystem: boolean } | null>();

  if (!role)
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  if (role.isSystem) {
    return NextResponse.json(
      { error: "System roles cannot be deleted" },
      { status: 400 },
    );
  }

  await OrgTeam.updateMany(
    {
      organizationId: new Types.ObjectId(id),
      roleId: new Types.ObjectId(roleId),
    },
    { $set: { role: "member" }, $unset: { roleId: "" } },
  );

  const res = await OrgRole.deleteOne({
    _id: new Types.ObjectId(roleId),
    organizationId: new Types.ObjectId(id),
    isSystem: false,
  });

  if (res.deletedCount === 0) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
