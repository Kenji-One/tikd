import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";
import { z } from "zod";
import { Types } from "mongoose";

import { auth } from "@/lib/auth";
import OrgRole, { type IOrgRole } from "@/models/OrgRole";
import OrgTeam from "@/models/OrgTeam";
import {
  ORG_PERMISSION_KEYS,
  normalizePermissions,
} from "@/lib/orgPermissions";
import { ROLE_ICON_KEYS } from "@/lib/roleIcons";
import { requireOrgPermission } from "@/lib/orgAccess";
import { shapeRoleResponse } from "@/lib/orgRoles";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Ctx = { params: Promise<{ id: string; roleId: string }> };
const isObjectId = (val: string) => /^[a-f\d]{24}$/i.test(val);

type PermissionsMap = Record<string, boolean>;

type RoleLean = Pick<
  IOrgRole,
  "_id" | "key" | "name" | "color" | "isSystem" | "order" | "permissions"
> & {
  iconKey?: string | null;
  iconUrl?: string | null;
};

const permissionsSchema = z
  .record(z.string(), z.boolean())
  .superRefine((obj, ctx) => {
    for (const key of Object.keys(obj)) {
      if (!(ORG_PERMISSION_KEYS as readonly string[]).includes(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unknown permission key: ${key}`,
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

async function computeMembersCount(
  orgId: string,
  role: Pick<IOrgRole, "_id" | "key" | "isSystem">,
) {
  if (role.isSystem) {
    return OrgTeam.countDocuments({
      organizationId: new Types.ObjectId(orgId),
      status: "active",
      role: role.key,
      $or: [{ roleId: { $exists: false } }, { roleId: null }],
    });
  }

  return OrgTeam.countDocuments({
    organizationId: new Types.ObjectId(orgId),
    status: "active",
    roleId: new Types.ObjectId(String(role._id)),
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, roleId } = await ctx.params;
  if (!isObjectId(id) || !isObjectId(roleId)) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
  }

  const canManage = await requireOrgPermission({
    organizationId: id,
    userId: session.user.id,
    email: session.user.email ?? undefined,
    permission: "members.assignRoles",
  });

  if (!canManage.ok) {
    return NextResponse.json(
      { error: canManage.error },
      { status: canManage.status },
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

  if (!existing) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

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

  if (parsed.data.iconKey !== undefined) update.iconKey = parsed.data.iconKey;
  if (parsed.data.iconUrl !== undefined) update.iconUrl = parsed.data.iconUrl;

  if (parsed.data.iconKey) update.iconUrl = null;
  if (parsed.data.iconUrl) update.iconKey = null;

  if (typeof parsed.data.order === "number") update.order = parsed.data.order;
  if (parsed.data.permissions) {
    update.permissions = normalizePermissions(parsed.data.permissions);
  }

  const updated = await OrgRole.findOneAndUpdate(
    {
      _id: new Types.ObjectId(roleId),
      organizationId: new Types.ObjectId(id),
    },
    { $set: update },
    { new: true },
  ).lean<RoleLean | null>();

  if (!updated) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  const membersCount = await computeMembersCount(id, {
    _id: updated._id,
    key: updated.key,
    isSystem: updated.isSystem,
  });

  return NextResponse.json(shapeRoleResponse(updated, membersCount));
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, roleId } = await ctx.params;
  if (!isObjectId(id) || !isObjectId(roleId)) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
  }

  const canManage = await requireOrgPermission({
    organizationId: id,
    userId: session.user.id,
    email: session.user.email ?? undefined,
    permission: "members.assignRoles",
  });

  if (!canManage.ok) {
    return NextResponse.json(
      { error: canManage.error },
      { status: canManage.status },
    );
  }

  const role = await OrgRole.findOne({
    _id: new Types.ObjectId(roleId),
    organizationId: new Types.ObjectId(id),
  })
    .select("_id isSystem")
    .lean<{ _id: Types.ObjectId; isSystem: boolean } | null>();

  if (!role) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

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
