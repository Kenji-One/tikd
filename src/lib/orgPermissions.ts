import type { OrgPermissions, OrgPermissionKey } from "@/models/OrgRole";

export const ORG_PERMISSION_KEYS: OrgPermissionKey[] = [
  "members.view",
  "members.invite",
  "members.remove",
  "members.assignRoles",

  "events.create",
  "events.edit",
  "events.publish",
  "events.delete",

  "links.createTrackingLinks",
];

export function emptyPermissions(): OrgPermissions {
  return ORG_PERMISSION_KEYS.reduce((acc, key) => {
    acc[key] = false;
    return acc;
  }, {} as OrgPermissions);
}

export function allPermissions(): OrgPermissions {
  return ORG_PERMISSION_KEYS.reduce((acc, key) => {
    acc[key] = true;
    return acc;
  }, {} as OrgPermissions);
}

export function normalizePermissions(
  input?: Partial<Record<string, boolean>> | null,
): OrgPermissions {
  const base = emptyPermissions();

  if (!input) return base;

  for (const key of ORG_PERMISSION_KEYS) {
    const value = input[key];
    if (typeof value === "boolean") {
      base[key] = value;
    }
  }

  return base;
}

/**
 * Defaults aligned with the org dashboard model:
 * - Admin: full access
 * - Promoter: can view members, edit events, create tracking links
 * - Scanner: no org-dashboard management permissions by default
 * - Collaborator: can edit events
 * - Member: no org-dashboard management permissions by default
 */
export function systemRoleDefaults(): Record<
  "admin" | "promoter" | "scanner" | "collaborator" | "member",
  OrgPermissions
> {
  const admin = allPermissions();

  const promoter = emptyPermissions();
  promoter["members.view"] = true;
  promoter["events.edit"] = true;
  promoter["links.createTrackingLinks"] = true;

  const scanner = emptyPermissions();

  const collaborator = emptyPermissions();
  collaborator["events.edit"] = true;

  const member = emptyPermissions();

  return {
    admin,
    promoter,
    scanner,
    collaborator,
    member,
  };
}
