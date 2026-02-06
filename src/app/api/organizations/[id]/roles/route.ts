// src/app/api/organizations/[id]/roles/route.ts
import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";
import { z } from "zod";
import { Types } from "mongoose";

import { auth } from "@/lib/auth";
import Organization from "@/models/Organization";
import OrgTeam from "@/models/OrgTeam";
import OrgRole, { type IOrgRole } from "@/models/OrgRole";
import {
  ORG_PERMISSION_KEYS,
  emptyPermissions,
  systemRoleDefaults,
} from "@/lib/orgPermissions";
import { ROLE_ICON_KEYS } from "@/lib/roleIcons";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Ctx = { params: Promise<{ id: string }> };
const isObjectId = (val: string) => /^[a-f\d]{24}$/i.test(val);

/* ------------------------------ Zod ------------------------------ */
const permissionsSchema = z
  .record(z.string(), z.boolean())
  .superRefine((obj, ctx) => {
    for (const k of Object.keys(obj)) {
      if (!ORG_PERMISSION_KEYS.includes(k as any)) {
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

/* ------------------------ Permission guards ----------------------- */
async function assertCanViewRoles(orgId: string, userId: string) {
  const org = await Organization.findById(orgId).select("_id ownerId").lean<{
    _id: Types.ObjectId;
    ownerId: Types.ObjectId;
  } | null>();

  if (!org) return { ok: false as const, status: 404 };

  if (String(org.ownerId) === String(userId)) return { ok: true as const, org };

  const member = await OrgTeam.findOne({
    organizationId: orgId,
    userId,
    status: "active",
  })
    .select("_id")
    .lean();

  if (member) return { ok: true as const, org };

  return { ok: false as const, status: 403 };
}

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

/* ------------------------ Seed system roles ----------------------- */
async function ensureSystemRoles(orgId: string, actorId: string) {
  const existing = await OrgRole.find({ organizationId: orgId, isSystem: true })
    .select("_id key")
    .lean<Array<{ _id: Types.ObjectId; key: string }>>();

  const have = new Set(existing.map((r) => r.key));
  const defaults = systemRoleDefaults();

  const systemDefs: Array<{
    key: string;
    name: string;
    color: string;
    order: number;
    iconKey: string | null;
    permissions: Record<string, boolean>;
  }> = [
    {
      key: "admin",
      name: "Admin",
      color: "#8B5CF6",
      order: 1,
      iconKey: "shield",
      permissions: defaults.admin,
    },
    {
      key: "promoter",
      name: "Promoter",
      color: "#A855F7",
      order: 2,
      iconKey: "megaphone",
      permissions: defaults.promoter,
    },
    {
      key: "scanner",
      name: "Scanner",
      color: "#7C3AED",
      order: 3,
      iconKey: "scanner",
      permissions: defaults.scanner,
    },
    {
      key: "collaborator",
      name: "Collaborator",
      color: "#6D28D9",
      order: 4,
      iconKey: "users",
      permissions: defaults.collaborator,
    },
    {
      key: "member",
      name: "Member",
      color: "#94A3B8",
      order: 5,
      iconKey: "user",
      permissions: defaults.member,
    },
  ];

  const toInsert = systemDefs.filter((d) => !have.has(d.key));
  if (!toInsert.length) return;

  await OrgRole.insertMany(
    toInsert.map((d) => ({
      organizationId: new Types.ObjectId(orgId),
      key: d.key,
      name: d.name,
      color: d.color,
      iconKey: d.iconKey,
      iconUrl: null,
      isSystem: true,
      order: d.order,
      permissions: d.permissions,
      createdBy: new Types.ObjectId(actorId),
    })),
    { ordered: false },
  );
}

/* ------------------------------- GET ------------------------------ */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  if (!isObjectId(id))
    return NextResponse.json(
      { error: "Invalid organization id" },
      { status: 400 },
    );

  const can = await assertCanViewRoles(id, session.user.id);
  if (!can.ok) {
    return NextResponse.json(
      { error: can.status === 404 ? "Organization not found" : "Forbidden" },
      { status: can.status },
    );
  }

  await ensureSystemRoles(id, session.user.id);

  const roles = await OrgRole.find({ organizationId: id })
    .sort({ order: 1, createdAt: 1 })
    .lean<IOrgRole[]>();

  // counts: system roles by OrgTeam.role, custom roles by OrgTeam.roleId
  const teamAgg = await OrgTeam.aggregate<{
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
    const mapKey = `${row._id.kind}:${row._id.key}`;
    counts.set(mapKey, row.total);
  }

  const shaped = roles.map((r) => {
    const isCustom = !r.isSystem;
    const countKey = isCustom ? `custom:${String(r._id)}` : `system:${r.key}`;
    return {
      _id: r._id,
      key: r.key,
      name: r.name,
      color: r.color || "",
      iconKey: (r as any).iconKey ?? null,
      iconUrl: (r as any).iconUrl ?? null,
      isSystem: r.isSystem,
      order: r.order,
      permissions: r.permissions,
      membersCount: counts.get(countKey) ?? 0,
    };
  });

  return NextResponse.json(shaped);
}

/* ------------------------------- POST ----------------------------- */
export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  if (!isObjectId(id))
    return NextResponse.json(
      { error: "Invalid organization id" },
      { status: 400 },
    );

  const can = await assertCanManageRoles(id, session.user.id);
  if (!can.ok) {
    return NextResponse.json(
      { error: can.status === 404 ? "Organization not found" : "Forbidden" },
      { status: can.status },
    );
  }

  await ensureSystemRoles(id, session.user.id);

  const body = await req.json();
  const parsed = createRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const derivedKey =
    (parsed.data?.key ? slugify(parsed.data.key) : slugify(parsed.data.name)) ||
    "new-role";

  const max = await OrgRole.findOne({ organizationId: id })
    .sort({ order: -1 })
    .select("order")
    .lean<{ order: number } | null>();

  const basePerms = emptyPermissions();
  const perms = parsed.data?.permissions
    ? { ...basePerms, ...parsed.data.permissions }
    : basePerms;

  const baseKey = derivedKey;

  async function createWithKey(candidateKey: string) {
    return OrgRole.create({
      organizationId: new Types.ObjectId(id),
      key: candidateKey,
      name: parsed.data?.name,
      color: parsed.data?.color || "",
      iconKey: parsed.data?.iconKey ?? null,
      iconUrl: parsed.data?.iconUrl ?? null,
      isSystem: false,
      order: (max?.order ?? 5) + 1,
      permissions: perms,
      createdBy: new Types.ObjectId(session?.user.id),
    });
  }

  try {
    let doc: any = null;

    for (let i = 0; i < 50; i++) {
      const candidate = i === 0 ? baseKey : `${baseKey}-${i + 1}`;
      try {
        doc = await createWithKey(candidate);
        break;
      } catch (e: any) {
        if (e?.code === 11000) continue;
        throw e;
      }
    }

    if (!doc) {
      return NextResponse.json(
        { error: "Could not generate a unique role key" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        _id: doc._id,
        key: doc.key,
        name: doc.name,
        color: doc.color || "",
        iconKey: doc.iconKey ?? null,
        iconUrl: doc.iconUrl ?? null,
        isSystem: doc.isSystem,
        order: doc.order,
        permissions: doc.permissions,
        membersCount: 0,
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to create role" },
      { status: 500 },
    );
  }
}
