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
  return ORG_PERMISSION_KEYS.reduce((acc, k) => {
    acc[k] = false;
    return acc;
  }, {} as OrgPermissions);
}

/** Reasonable defaults for system roles (you can tweak any time) */
export function systemRoleDefaults() {
  const admin: OrgPermissions = ORG_PERMISSION_KEYS.reduce((acc, k) => {
    acc[k] = true;
    return acc;
  }, {} as OrgPermissions);

  const promoter = emptyPermissions();
  promoter["members.view"] = true;
  promoter["events.edit"] = true;
  promoter["events.publish"] = true;

  const scanner = emptyPermissions();
  scanner["members.view"] = true;

  const collaborator = emptyPermissions();
  collaborator["members.view"] = true;
  collaborator["events.edit"] = true;

  const member = emptyPermissions();
  member["members.view"] = true;

  return { admin, promoter, scanner, collaborator, member };
}
