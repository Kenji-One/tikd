import { Types, type HydratedDocument } from "mongoose";

import OrgRole, { type IOrgRole } from "@/models/OrgRole";
import { systemRoleDefaults, normalizePermissions } from "@/lib/orgPermissions";
import type { RoleIconKey } from "@/lib/roleIcons";

type SystemRoleKey =
  | "admin"
  | "promoter"
  | "scanner"
  | "collaborator"
  | "member";

export type SystemRoleDefinition = {
  key: SystemRoleKey;
  name: string;
  color: string;
  order: number;
  iconKey: RoleIconKey | null;
};

const defaults = systemRoleDefaults();

export const SYSTEM_ROLE_DEFS: Array<
  SystemRoleDefinition & {
    permissions: ReturnType<typeof normalizePermissions>;
  }
> = [
  {
    key: "admin",
    name: "Admin",
    color: "#EF4444",
    order: 1,
    iconKey: "shield",
    permissions: normalizePermissions(defaults.admin),
  },
  {
    key: "promoter",
    name: "Promoter",
    color: "#06B6D4",
    order: 2,
    iconKey: "megaphone",
    permissions: normalizePermissions(defaults.promoter),
  },
  {
    key: "scanner",
    name: "Scanner",
    color: "#22C55E",
    order: 3,
    iconKey: "scanner",
    permissions: normalizePermissions(defaults.scanner),
  },
  {
    key: "collaborator",
    name: "Collaborator",
    color: "#F97316",
    order: 4,
    iconKey: "users",
    permissions: normalizePermissions(defaults.collaborator),
  },
  {
    key: "member",
    name: "Member",
    color: "#94A3B8",
    order: 5,
    iconKey: "user",
    permissions: normalizePermissions(defaults.member),
  },
];

export function getSystemRoleFallback(key: string) {
  return SYSTEM_ROLE_DEFS.find((role) => role.key === key) ?? null;
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  );
}

export async function ensureSystemRoles(
  organizationId: string,
  actorUserId: string,
): Promise<void> {
  const existing = await OrgRole.find({
    organizationId: new Types.ObjectId(organizationId),
    isSystem: true,
  })
    .select("_id key")
    .lean<Array<{ _id: Types.ObjectId; key: string }>>();

  const have = new Set(existing.map((role) => role.key));

  const missing = SYSTEM_ROLE_DEFS.filter((role) => !have.has(role.key));
  if (!missing.length) return;

  try {
    await OrgRole.insertMany(
      missing.map((role) => ({
        organizationId: new Types.ObjectId(organizationId),
        key: role.key,
        name: role.name,
        color: role.color,
        iconKey: role.iconKey,
        iconUrl: null,
        isSystem: true,
        order: role.order,
        permissions: role.permissions,
        createdBy: new Types.ObjectId(actorUserId),
      })),
      { ordered: false },
    );
  } catch (error: unknown) {
    if (isDuplicateKeyError(error)) return;
    throw error;
  }
}

export function shapeRoleResponse(
  role: Pick<
    IOrgRole,
    "_id" | "key" | "name" | "color" | "isSystem" | "order" | "permissions"
  > & {
    iconKey?: string | null;
    iconUrl?: string | null;
  },
  membersCount: number,
) {
  return {
    _id: role._id,
    key: role.key,
    name: role.name,
    color: role.color || "",
    iconKey: role.iconKey ?? null,
    iconUrl: role.iconUrl ?? null,
    isSystem: role.isSystem,
    order: role.order,
    permissions: normalizePermissions(role.permissions),
    membersCount,
  };
}

export async function createRoleWithUniqueKey(input: {
  organizationId: string;
  actorUserId: string;
  baseKey: string;
  name: string;
  color?: string;
  iconKey?: string | null;
  iconUrl?: string | null;
  order: number;
  permissions: Record<string, boolean>;
}): Promise<HydratedDocument<IOrgRole> | null> {
  const createOnce = async (candidateKey: string) =>
    OrgRole.create({
      organizationId: new Types.ObjectId(input.organizationId),
      key: candidateKey,
      name: input.name,
      color: input.color || "",
      iconKey: input.iconKey ?? null,
      iconUrl: input.iconUrl ?? null,
      isSystem: false,
      order: input.order,
      permissions: normalizePermissions(input.permissions),
      createdBy: new Types.ObjectId(input.actorUserId),
    });

  for (let i = 0; i < 50; i += 1) {
    const candidate = i === 0 ? input.baseKey : `${input.baseKey}-${i + 1}`;

    try {
      const doc = await createOnce(candidate);
      return doc;
    } catch (error: unknown) {
      const maybe = error as { code?: number };
      if (maybe?.code === 11000) continue;
      throw error;
    }
  }

  return null;
}
