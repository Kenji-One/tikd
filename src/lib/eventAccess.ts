import { Types } from "mongoose";

import Event from "@/models/Event";
import EventTeam, { type EventTeamRole } from "@/models/EventTeam";
import {
  hasOrgPermission,
  listAuthorizedOrganizationIdsForUser,
  resolveOrgAccess,
  type ResolvedOrgAccess,
} from "@/lib/orgAccess";

export type EventPermissionKey =
  | "events.create"
  | "events.edit"
  | "events.publish"
  | "events.delete";

type EventLean = {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  createdByUserId: Types.ObjectId;
  status: "published" | "draft";
  title?: string;
};

type EventTeamLean = {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  email: string;
  userId?: Types.ObjectId | null;
  role: EventTeamRole;
  status: "invited" | "active" | "revoked" | "expired";
  temporaryAccess: boolean;
  expiresAt?: Date | null;
};

export type ResolvedEventActor = {
  event: EventLean;
  isCreator: boolean;
  orgAccess: ResolvedOrgAccess;
  eventTeam: EventTeamLean | null;
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

function buildActiveEventTeamTimeClause(now: Date) {
  return {
    $or: [
      { temporaryAccess: false },
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gte: now } },
    ],
  };
}

function eventTeamHasEventPermission(
  role: EventTeamRole,
  permission: EventPermissionKey,
): boolean {
  switch (role) {
    case "admin":
      return true;
    case "promoter":
      return permission === "events.edit";
    case "collaborator":
      return permission === "events.edit";
    case "scanner":
      return false;
    default:
      return false;
  }
}

function hasAnyOrgEventPermission(access: ResolvedOrgAccess): boolean {
  return (
    hasOrgPermission(access, "events.create") ||
    hasOrgPermission(access, "events.edit") ||
    hasOrgPermission(access, "events.publish") ||
    hasOrgPermission(access, "events.delete")
  );
}

function canViewDraft(actor: ResolvedEventActor): boolean {
  if (actor.isCreator) return true;
  if (actor.orgAccess.isOwner) return true;
  if (hasAnyOrgEventPermission(actor.orgAccess)) return true;
  if (actor.eventTeam) return true;
  return false;
}

function canViewGuests(actor: ResolvedEventActor): boolean {
  if (actor.isCreator) return true;
  if (actor.orgAccess.isOwner) return true;
  if (hasAnyOrgEventPermission(actor.orgAccess)) return true;
  if (actor.eventTeam) return true;
  return false;
}

function canCheckInGuests(actor: ResolvedEventActor): boolean {
  if (actor.isCreator) return true;
  if (actor.orgAccess.isOwner) return true;
  if (hasOrgPermission(actor.orgAccess, "events.edit")) return true;

  if (
    actor.eventTeam &&
    ["admin", "promoter", "scanner", "collaborator"].includes(
      actor.eventTeam.role,
    )
  ) {
    return true;
  }

  return false;
}

function canManageGuests(actor: ResolvedEventActor): boolean {
  if (actor.isCreator) return true;
  if (actor.orgAccess.isOwner) return true;
  if (hasOrgPermission(actor.orgAccess, "events.edit")) return true;

  if (
    actor.eventTeam &&
    ["admin", "promoter", "collaborator"].includes(actor.eventTeam.role)
  ) {
    return true;
  }

  return false;
}

export async function resolveEventActor(input: {
  eventId: string;
  userId: string;
  email?: string | null;
}): Promise<ResolvedEventActor | null> {
  const event = await Event.findById(input.eventId)
    .select("_id organizationId createdByUserId status title")
    .lean<EventLean | null>();

  if (!event) return null;

  const isCreator = String(event.createdByUserId) === String(input.userId);

  const orgAccess = await resolveOrgAccess({
    organizationId: String(event.organizationId),
    userId: input.userId,
    email: input.email,
  });

  const identity = buildIdentityMatch(input.userId, input.email);
  let eventTeam: EventTeamLean | null = null;

  if (identity.length > 0) {
    eventTeam = await EventTeam.findOne({
      eventId: event._id,
      status: "active",
      $and: [{ $or: identity }, buildActiveEventTeamTimeClause(new Date())],
    })
      .select("_id eventId email userId role status temporaryAccess expiresAt")
      .lean<EventTeamLean | null>();
  }

  return {
    event,
    isCreator,
    orgAccess,
    eventTeam,
  };
}

export async function requireCreateEventForOrg(input: {
  organizationId: string;
  userId: string;
  email?: string | null;
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

  if (access.isOwner || hasOrgPermission(access, "events.create")) {
    return { ok: true, access };
  }

  return { ok: false, status: 403, error: "Forbidden" };
}

export async function requireEventPermission(input: {
  eventId: string;
  userId: string;
  email?: string | null;
  permission: EventPermissionKey;
}): Promise<
  | { ok: true; actor: ResolvedEventActor }
  | { ok: false; status: number; error: string }
> {
  const actor = await resolveEventActor({
    eventId: input.eventId,
    userId: input.userId,
    email: input.email,
  });

  if (!actor) {
    return { ok: false, status: 404, error: "Event not found" };
  }

  if (actor.isCreator) {
    return { ok: true, actor };
  }

  if (actor.orgAccess.isOwner) {
    return { ok: true, actor };
  }

  if (hasOrgPermission(actor.orgAccess, input.permission)) {
    return { ok: true, actor };
  }

  if (
    actor.eventTeam &&
    eventTeamHasEventPermission(actor.eventTeam.role, input.permission)
  ) {
    return { ok: true, actor };
  }

  return { ok: false, status: 403, error: "Forbidden" };
}

export async function requireViewEventDraft(input: {
  eventId: string;
  userId: string;
  email?: string | null;
}): Promise<
  | { ok: true; actor: ResolvedEventActor }
  | { ok: false; status: number; error: string }
> {
  const actor = await resolveEventActor({
    eventId: input.eventId,
    userId: input.userId,
    email: input.email,
  });

  if (!actor) {
    return { ok: false, status: 404, error: "Event not found" };
  }

  if (canViewDraft(actor)) {
    return { ok: true, actor };
  }

  return { ok: false, status: 403, error: "Forbidden" };
}

export async function requireEventGuestViewAccess(input: {
  eventId: string;
  userId: string;
  email?: string | null;
}): Promise<
  | { ok: true; actor: ResolvedEventActor }
  | { ok: false; status: number; error: string }
> {
  const actor = await resolveEventActor({
    eventId: input.eventId,
    userId: input.userId,
    email: input.email,
  });

  if (!actor) {
    return { ok: false, status: 404, error: "Event not found" };
  }

  if (canViewGuests(actor)) {
    return { ok: true, actor };
  }

  return { ok: false, status: 403, error: "Forbidden" };
}

export async function requireEventGuestCheckInAccess(input: {
  eventId: string;
  userId: string;
  email?: string | null;
}): Promise<
  | { ok: true; actor: ResolvedEventActor }
  | { ok: false; status: number; error: string }
> {
  const actor = await resolveEventActor({
    eventId: input.eventId,
    userId: input.userId,
    email: input.email,
  });

  if (!actor) {
    return { ok: false, status: 404, error: "Event not found" };
  }

  if (canCheckInGuests(actor)) {
    return { ok: true, actor };
  }

  return { ok: false, status: 403, error: "Forbidden" };
}

export async function requireEventGuestManageAccess(input: {
  eventId: string;
  userId: string;
  email?: string | null;
}): Promise<
  | { ok: true; actor: ResolvedEventActor }
  | { ok: false; status: number; error: string }
> {
  const actor = await resolveEventActor({
    eventId: input.eventId,
    userId: input.userId,
    email: input.email,
  });

  if (!actor) {
    return { ok: false, status: 404, error: "Event not found" };
  }

  if (canManageGuests(actor)) {
    return { ok: true, actor };
  }

  return { ok: false, status: 403, error: "Forbidden" };
}

export async function listOrganizationsWithAnyEventPermission(input: {
  userId: string;
  email?: string | null;
}): Promise<Types.ObjectId[]> {
  const permissionBuckets = await Promise.all([
    listAuthorizedOrganizationIdsForUser({
      userId: input.userId,
      email: input.email,
      permission: "events.create",
    }),
    listAuthorizedOrganizationIdsForUser({
      userId: input.userId,
      email: input.email,
      permission: "events.edit",
    }),
    listAuthorizedOrganizationIdsForUser({
      userId: input.userId,
      email: input.email,
      permission: "events.publish",
    }),
    listAuthorizedOrganizationIdsForUser({
      userId: input.userId,
      email: input.email,
      permission: "events.delete",
    }),
  ]);

  const map = new Map<string, Types.ObjectId>();

  for (const ids of permissionBuckets) {
    for (const id of ids) {
      map.set(String(id), id);
    }
  }

  return Array.from(map.values());
}
