import { Types } from "mongoose";

import Organization from "@/models/Organization";
import OrgTeam, {
  type OrgTeamRole,
  type OrgTeamStatus,
} from "@/models/OrgTeam";
import OrgRole from "@/models/OrgRole";
import type { OrgPermissionKey, OrgPermissions } from "@/models/OrgRole";
import {
  allPermissions,
  emptyPermissions,
  normalizePermissions,
} from "@/lib/orgPermissions";
import { getSystemRoleFallback } from "@/lib/orgRoles";

type OrgLean = {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  name?: string;
};

type MembershipLean = {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  email: string;
  userId?: Types.ObjectId | null;
  name?: string;
  role: OrgTeamRole;
  roleId?: Types.ObjectId | null;
  status: OrgTeamStatus;
  temporaryAccess: boolean;
  expiresAt?: Date | null;
  invitedBy: Types.ObjectId;
};

type RoleLean = {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  key: string;
  name: string;
  color?: string;
  iconKey?: string | null;
  iconUrl?: string | null;
  isSystem: boolean;
  permissions?: Partial<Record<OrgPermissionKey, boolean>>;
};

export type ResolvedOrgAccess = {
  org: OrgLean | null;
  hasAccess: boolean;
  isOwner: boolean;
  membership: MembershipLean | null;
  permissions: OrgPermissions;
  effectiveRole: {
    key: string;
    name: string;
    color?: string;
    iconKey?: string | null;
    iconUrl?: string | null;
    isSystem: boolean;
    roleId?: string | null;
  } | null;
};

function normalizeEmail(email?: string | null): string {
  return String(email ?? "")
    .trim()
    .toLowerCase();
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

function resolvePermissionsFromMembership(
  membership: MembershipLean | null,
  roleDoc: RoleLean | null,
): {
  permissions: OrgPermissions;
  effectiveRole: ResolvedOrgAccess["effectiveRole"];
} {
  if (!membership) {
    return {
      permissions: emptyPermissions(),
      effectiveRole: null,
    };
  }

  if (roleDoc) {
    return {
      permissions: normalizePermissions(roleDoc.permissions),
      effectiveRole: {
        key: roleDoc.key,
        name: roleDoc.name,
        color: roleDoc.color || "",
        iconKey: roleDoc.iconKey ?? null,
        iconUrl: roleDoc.iconUrl ?? null,
        isSystem: roleDoc.isSystem,
        roleId: String(roleDoc._id),
      },
    };
  }

  const fallback = getSystemRoleFallback(membership.role);
  if (!fallback) {
    return {
      permissions: emptyPermissions(),
      effectiveRole: {
        key: membership.role,
        name:
          membership.role.charAt(0).toUpperCase() + membership.role.slice(1),
        color: "",
        iconKey: null,
        iconUrl: null,
        isSystem: true,
        roleId: null,
      },
    };
  }

  return {
    permissions: normalizePermissions(fallback.permissions),
    effectiveRole: {
      key: fallback.key,
      name: fallback.name,
      color: fallback.color,
      iconKey: fallback.iconKey,
      iconUrl: null,
      isSystem: true,
      roleId: null,
    },
  };
}

export async function resolveOrgAccess(input: {
  organizationId: string;
  userId: string;
  email?: string | null;
}): Promise<ResolvedOrgAccess> {
  const org = await Organization.findById(input.organizationId)
    .select("_id ownerId name")
    .lean<OrgLean | null>();

  if (!org) {
    return {
      org: null,
      hasAccess: false,
      isOwner: false,
      membership: null,
      permissions: emptyPermissions(),
      effectiveRole: null,
    };
  }

  if (String(org.ownerId) === String(input.userId)) {
    return {
      org,
      hasAccess: true,
      isOwner: true,
      membership: null,
      permissions: allPermissions(),
      effectiveRole: {
        key: "owner",
        name: "Owner",
        color: "#F7C948",
        iconKey: "owner",
        iconUrl: null,
        isSystem: true,
        roleId: null,
      },
    };
  }

  const identity = buildIdentityMatch(input.userId, input.email);
  if (!identity.length) {
    return {
      org,
      hasAccess: false,
      isOwner: false,
      membership: null,
      permissions: emptyPermissions(),
      effectiveRole: null,
    };
  }

  const now = new Date();

  const membership = await OrgTeam.findOne({
    organizationId: org._id,
    status: "active",
    $and: [{ $or: identity }, buildActiveMembershipTimeClause(now)],
  })
    .select(
      "_id organizationId email userId name role roleId status temporaryAccess expiresAt invitedBy",
    )
    .lean<MembershipLean | null>();

  if (!membership) {
    return {
      org,
      hasAccess: false,
      isOwner: false,
      membership: null,
      permissions: emptyPermissions(),
      effectiveRole: null,
    };
  }

  let roleDoc: RoleLean | null = null;

  if (membership.roleId && Types.ObjectId.isValid(membership.roleId)) {
    roleDoc = await OrgRole.findOne({
      _id: membership.roleId,
      organizationId: org._id,
    })
      .select(
        "_id organizationId key name color iconKey iconUrl isSystem permissions",
      )
      .lean<RoleLean | null>();
  }

  const resolved = resolvePermissionsFromMembership(membership, roleDoc);

  return {
    org,
    hasAccess: true,
    isOwner: false,
    membership,
    permissions: resolved.permissions,
    effectiveRole: resolved.effectiveRole,
  };
}

export function hasOrgPermission(
  access: ResolvedOrgAccess,
  permission: OrgPermissionKey,
): boolean {
  if (!access.hasAccess) return false;
  if (access.isOwner) return true;
  return !!access.permissions[permission];
}

export function hasAnyOrgEventPermission(access: ResolvedOrgAccess): boolean {
  if (!access.hasAccess) return false;
  if (access.isOwner) return true;

  return (
    !!access.permissions["events.create"] ||
    !!access.permissions["events.edit"] ||
    !!access.permissions["events.publish"] ||
    !!access.permissions["events.delete"]
  );
}

export function canManageOrganizationProfile(
  access: ResolvedOrgAccess,
): boolean {
  if (!access.hasAccess) return false;
  if (access.isOwner) return true;
  return access.effectiveRole?.key === "admin";
}

export async function requireOrgMembership(input: {
  organizationId: string;
  userId: string;
  email?: string | null;
}): Promise<
  | { ok: true; access: ResolvedOrgAccess }
  | { ok: false; status: number; error: string }
> {
  const access = await resolveOrgAccess(input);

  if (!access.org) {
    return { ok: false, status: 404, error: "Organization not found" };
  }

  if (!access.hasAccess) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true, access };
}

export async function requireOrgPermission(input: {
  organizationId: string;
  userId: string;
  email?: string | null;
  permission: OrgPermissionKey;
}): Promise<
  | { ok: true; access: ResolvedOrgAccess }
  | { ok: false; status: number; error: string }
> {
  const access = await resolveOrgAccess({
    organizationId: input.organizationId,
    userId: input.userId,
    email: input.email,
  });

  if (!access.org) {
    return { ok: false, status: 404, error: "Organization not found" };
  }

  if (!access.hasAccess) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  if (!hasOrgPermission(access, input.permission)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true, access };
}

export async function listAuthorizedOrganizationIdsForUser(input: {
  userId: string;
  email?: string | null;
  permission?: OrgPermissionKey;
}): Promise<Types.ObjectId[]> {
  const ownedOrgs = await Organization.find({ ownerId: input.userId })
    .select("_id")
    .lean<Array<{ _id: Types.ObjectId }>>();

  const out = new Map<string, Types.ObjectId>();

  for (const org of ownedOrgs) {
    out.set(String(org._id), org._id);
  }

  const identity = buildIdentityMatch(input.userId, input.email);
  if (!identity.length) {
    return Array.from(out.values());
  }

  const now = new Date();

  const memberships = await OrgTeam.find({
    status: "active",
    $and: [{ $or: identity }, buildActiveMembershipTimeClause(now)],
  })
    .select("organizationId role roleId")
    .lean<
      Array<{
        organizationId: Types.ObjectId;
        role: OrgTeamRole;
        roleId?: Types.ObjectId | null;
      }>
    >();

  const customRoleIds = memberships
    .map((row) => row.roleId)
    .filter((id): id is Types.ObjectId => !!id && Types.ObjectId.isValid(id));

  const membershipOrgIds = Array.from(
    new Set(memberships.map((row) => String(row.organizationId))),
  ).map((id) => new Types.ObjectId(id));

  const roleDocs =
    customRoleIds.length && membershipOrgIds.length
      ? await OrgRole.find({
          _id: { $in: customRoleIds },
          organizationId: { $in: membershipOrgIds },
        })
          .select("_id organizationId key permissions")
          .lean<
            Array<{
              _id: Types.ObjectId;
              organizationId: Types.ObjectId;
              key: string;
              permissions?: Partial<Record<OrgPermissionKey, boolean>>;
            }>
          >()
      : [];

  const roleByCompositeKey = new Map(
    roleDocs.map((role) => [
      `${String(role.organizationId)}:${String(role._id)}`,
      role,
    ]),
  );

  for (const membership of memberships) {
    const orgKey = String(membership.organizationId);

    if (!input.permission) {
      out.set(orgKey, membership.organizationId);
      continue;
    }

    const customRole = membership.roleId
      ? (roleByCompositeKey.get(`${orgKey}:${String(membership.roleId)}`) ??
        null)
      : null;

    const permissions = customRole
      ? normalizePermissions(customRole.permissions)
      : normalizePermissions(
          getSystemRoleFallback(membership.role)?.permissions,
        );

    if (permissions[input.permission]) {
      out.set(orgKey, membership.organizationId);
    }
  }

  return Array.from(out.values());
}
