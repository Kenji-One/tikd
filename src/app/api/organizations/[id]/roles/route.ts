import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";
import { z } from "zod";
import { Types } from "mongoose";

import { auth } from "@/lib/auth";
import OrgRole, { type IOrgRole } from "@/models/OrgRole";
import {
  ORG_PERMISSION_KEYS,
  emptyPermissions,
  normalizePermissions,
} from "@/lib/orgPermissions";
import { ROLE_ICON_KEYS } from "@/lib/roleIcons";
import { requireOrgPermission } from "@/lib/orgAccess";
import {
  ensureSystemRoles,
  shapeRoleResponse,
  createRoleWithUniqueKey,
} from "@/lib/orgRoles";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Ctx = { params: Promise<{ id: string }> };
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

const createRoleSchema = z
  .object({
    name: z.string().min(2).max(64),
    key: z
      .string()
      .min(2)
      .max(48)
      .regex(/^[a-z0-9][a-z0-9-]*$/, "Invalid role key")
      .optional(),
    color: z
      .string()
      .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Invalid hex color")
      .optional()
      .or(z.literal("")),
    iconKey: iconKeySchema.nullable().optional(),
    iconUrl: z.string().url().nullable().optional(),
    permissions: permissionsSchema.optional(),
  })
  .strict();

function slugify(input: string) {
  return String(input || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
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

  const canView = await requireOrgPermission({
    organizationId: id,
    userId: session.user.id,
    email: session.user.email ?? undefined,
    permission: "members.view",
  });

  if (!canView.ok) {
    return NextResponse.json(
      { error: canView.error },
      { status: canView.status },
    );
  }

  await ensureSystemRoles(id, session.user.id);

  const roles = await OrgRole.find({ organizationId: id })
    .sort({ order: 1, createdAt: 1 })
    .lean<RoleLean[]>();

  const teamAgg = await (
    await import("@/models/OrgTeam")
  ).default.aggregate<{
    _id: { kind: "system" | "custom"; key: string };
    total: number;
  }>([
    {
      $match: {
        organizationId: new Types.ObjectId(id),
        status: "active",
      },
    },
    {
      $project: {
        role: 1,
        roleId: 1,
        kind: {
          $cond: [{ $ifNull: ["$roleId", false] }, "custom", "system"],
        },
        key: {
          $cond: [
            { $ifNull: ["$roleId", false] },
            { $toString: "$roleId" },
            "$role",
          ],
        },
      },
    },
    { $group: { _id: { kind: "$kind", key: "$key" }, total: { $sum: 1 } } },
  ]);

  const counts = new Map<string, number>();
  for (const row of teamAgg) {
    counts.set(`${row._id.kind}:${row._id.key}`, row.total);
  }

  const shaped = roles.map((role) => {
    const countKey = role.isSystem
      ? `system:${role.key}`
      : `custom:${String(role._id)}`;

    return shapeRoleResponse(role, counts.get(countKey) ?? 0);
  });

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

  await ensureSystemRoles(id, session.user.id);

  const body: unknown = await req.json().catch(() => null);
  const parsed = createRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const roleData = parsed.data;

  const derivedKey =
    (roleData.key ? slugify(roleData.key) : slugify(roleData.name)) ||
    "new-role";

  const max = await OrgRole.findOne({ organizationId: id })
    .sort({ order: -1 })
    .select("order")
    .lean<{ order: number } | null>();

  const perms = roleData.permissions
    ? normalizePermissions(roleData.permissions)
    : emptyPermissions();

  const doc = await createRoleWithUniqueKey({
    organizationId: id,
    actorUserId: session.user.id,
    baseKey: derivedKey,
    name: roleData.name,
    color: roleData.color || "",
    iconKey: roleData.iconKey ?? null,
    iconUrl: roleData.iconUrl ?? null,
    order: (max?.order ?? 5) + 1,
    permissions: perms as PermissionsMap,
  });

  if (!doc) {
    return NextResponse.json(
      { error: "Could not generate a unique role key" },
      { status: 409 },
    );
  }

  return NextResponse.json(shapeRoleResponse(doc, 0), { status: 201 });
}
