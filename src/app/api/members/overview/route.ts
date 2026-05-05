// src/app/api/members/overview/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";

import "@/lib/mongoose";
import { auth } from "@/lib/auth";
import Event from "@/models/Event";
import EventTeam from "@/models/EventTeam";
import Organization from "@/models/Organization";
import OrgRole from "@/models/OrgRole";
import OrgTeam from "@/models/OrgTeam";
import Team from "@/models/Team";
import TeamMember from "@/models/TeamMember";
import User from "@/models/User";
import { listAuthorizedOrganizationIdsForUser } from "@/lib/orgAccess";
import { getSystemRoleFallback } from "@/lib/orgRoles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const preferredRegion = "auto";
export const maxDuration = 15;

const ObjectIdZ = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

const QuerySchema = z
  .object({
    scope: z
      .enum(["global", "team", "organization", "event"])
      .default("global"),
    teamId: ObjectIdZ.optional(),
    orgId: ObjectIdZ.optional(),
    eventId: ObjectIdZ.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.scope === "team" && !value.teamId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "teamId is required for team scope",
        path: ["teamId"],
      });
    }

    if (value.scope === "organization" && !value.orgId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "orgId is required for organization scope",
        path: ["orgId"],
      });
    }

    if (value.scope === "event" && !value.eventId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "eventId is required for event scope",
        path: ["eventId"],
      });
    }
  });

type ScopeType = "global" | "team" | "organization" | "event";
type SourceType = "team" | "organization" | "event";
type TeamRole = "admin" | "promoter" | "scanner" | "collaborator" | "member";
type EventRole = "admin" | "promoter" | "scanner" | "collaborator";
type OrgRoleKey =
  | "owner"
  | "admin"
  | "promoter"
  | "scanner"
  | "collaborator"
  | "member";
type MemberStatus = "invited" | "active" | "revoked" | "expired";

type TeamLean = {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  name: string;
};

type OrganizationLean = {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  name: string;
};

type EventLean = {
  _id: Types.ObjectId;
  title: string;
  organizationId: Types.ObjectId;
  createdByUserId: Types.ObjectId;
};

type UserLean = {
  _id: Types.ObjectId;
  email?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  image?: string;
};

type TeamMemberLean = {
  _id: Types.ObjectId;
  teamId: Types.ObjectId;
  email: string;
  userId?: Types.ObjectId | null;
  name?: string;
  role: TeamRole;
  status: MemberStatus;
  temporaryAccess: boolean;
  expiresAt?: Date | null;
  acceptedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type EventMemberLean = {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  email: string;
  userId?: Types.ObjectId | null;
  name?: string;
  role: EventRole;
  status: MemberStatus;
  temporaryAccess: boolean;
  expiresAt?: Date | null;
  acceptedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type OrgMemberLean = {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  email: string;
  userId?: Types.ObjectId | null;
  name?: string;
  role: OrgRoleKey;
  roleId?: Types.ObjectId | null;
  status: MemberStatus;
  temporaryAccess: boolean;
  expiresAt?: Date | null;
  acceptedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type ScopeRecord = {
  sourceType: SourceType;
  sourceId: string;
  sourceName: string;
  membershipId: string;
  role: string;
  roleLabel: string;
  status: MemberStatus;
  temporaryAccess: boolean;
  expiresAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type AggregatedMember = {
  id: string;
  userId: string | null;
  email: string;
  name: string;
  avatarUrl: string | null;
  avatarText: string;
  role: string;
  roleLabel: string;
  primaryStatus: MemberStatus;
  activeScopeCount: number;
  invitedScopeCount: number;
  expiredScopeCount: number;
  revokedScopeCount: number;
  latestActivityAt: string | null;
  createdAt: string | null;
  scopes: ScopeRecord[];
};

const TEAM_MEMBER_SELECT =
  "_id teamId email userId name role status temporaryAccess expiresAt acceptedAt createdAt updatedAt";

const EVENT_MEMBER_SELECT =
  "_id eventId email userId name role status temporaryAccess expiresAt acceptedAt createdAt updatedAt";

const ORG_MEMBER_SELECT =
  "_id organizationId email userId name role roleId status temporaryAccess expiresAt acceptedAt createdAt updatedAt";

function normalizeEmail(email?: string | null): string {
  return String(email ?? "")
    .trim()
    .toLowerCase();
}

function toObjectId(value: string): Types.ObjectId {
  return new Types.ObjectId(value);
}

function objectIdArray(
  values: Array<Types.ObjectId | null | undefined>,
): Types.ObjectId[] {
  return values.filter(
    (value): value is Types.ObjectId =>
      !!value && Types.ObjectId.isValid(value),
  );
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

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}

function teamRoleLabel(role: TeamRole): string {
  return capitalize(role);
}

function eventRoleLabel(role: EventRole): string {
  return capitalize(role);
}

function toIso(date?: Date | null): string | null {
  return date instanceof Date ? date.toISOString() : null;
}

function displayNameFromUser(
  user: UserLean | null | undefined,
  fallbackName?: string | null,
  fallbackEmail?: string | null,
): string {
  const fromUser =
    user?.firstName || user?.lastName
      ? `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim()
      : (user?.username ?? "");

  if (fromUser) return fromUser.trim();
  if (fallbackName && fallbackName.trim()) return fallbackName.trim();

  const email = normalizeEmail(user?.email ?? fallbackEmail);
  if (email) return email.split("@")[0] ?? email;

  return "Member";
}

function avatarTextFromName(name: string, email?: string | null): string {
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (initials) return initials;

  const normalizedEmail = normalizeEmail(email);
  return normalizedEmail.slice(0, 2).toUpperCase() || "M";
}

function rolePriority(role: string): number {
  switch (role) {
    case "owner":
      return 6;
    case "admin":
      return 5;
    case "promoter":
      return 4;
    case "scanner":
      return 3;
    case "collaborator":
      return 2;
    case "member":
      return 1;
    default:
      return 0;
  }
}

function statusPriority(status: MemberStatus): number {
  switch (status) {
    case "active":
      return 0;
    case "invited":
      return 1;
    case "expired":
      return 2;
    case "revoked":
      return 3;
    default:
      return 4;
  }
}

function parseDateSafe(value: string | null): number {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

function isWithinLastDays(value: string | null, days: number): boolean {
  if (!value) return false;
  const ts = parseDateSafe(value);
  if (!ts) return false;
  return ts >= Date.now() - days * 24 * 60 * 60 * 1000;
}

async function getAuthorizedTeamDocs(input: {
  userId: string;
  email?: string | null;
}): Promise<TeamLean[]> {
  const ownedTeamsPromise = Team.find({
    ownerId: new Types.ObjectId(input.userId),
  })
    .select("_id ownerId name")
    .lean<TeamLean[]>();

  const identity = buildIdentityMatch(input.userId, input.email);

  const joinedTeamIdsPromise = identity.length
    ? TeamMember.find({
        status: "active",
        $and: [{ $or: identity }, buildActiveMembershipTimeClause(new Date())],
      })
        .select("teamId")
        .lean<Array<{ teamId: Types.ObjectId }>>()
    : Promise.resolve([] as Array<{ teamId: Types.ObjectId }>);

  const [ownedTeams, joinedTeamRows] = await Promise.all([
    ownedTeamsPromise,
    joinedTeamIdsPromise,
  ]);

  const joinedTeamIds = objectIdArray(joinedTeamRows.map((row) => row.teamId));
  const ownedTeamIds = objectIdArray(ownedTeams.map((team) => team._id));

  const seen = new Set<string>();
  const allIds: Types.ObjectId[] = [];

  for (const id of [...ownedTeamIds, ...joinedTeamIds]) {
    const key = String(id);
    if (seen.has(key)) continue;
    seen.add(key);
    allIds.push(id);
  }

  if (!allIds.length) return ownedTeams;

  const docs = await Team.find({ _id: { $in: allIds } })
    .select("_id ownerId name")
    .lean<TeamLean[]>();

  return docs;
}

async function getAuthorizedOrganizationDocs(input: {
  userId: string;
  email?: string | null;
}): Promise<OrganizationLean[]> {
  const orgIds = await listAuthorizedOrganizationIdsForUser({
    userId: input.userId,
    email: input.email ?? undefined,
  });

  if (!orgIds.length) return [];

  const docs = await Organization.find({ _id: { $in: orgIds } })
    .select("_id ownerId name")
    .lean<OrganizationLean[]>();

  return docs;
}

async function getAuthorizedEventDocs(input: {
  userId: string;
  email?: string | null;
  authorizedOrgIds: Types.ObjectId[];
}): Promise<EventLean[]> {
  const createdEventsPromise = Event.find({
    createdByUserId: new Types.ObjectId(input.userId),
  })
    .select("_id title organizationId createdByUserId")
    .lean<EventLean[]>();

  const orgEventsPromise = input.authorizedOrgIds.length
    ? Event.find({
        organizationId: { $in: input.authorizedOrgIds },
      })
        .select("_id title organizationId createdByUserId")
        .lean<EventLean[]>()
    : Promise.resolve([] as EventLean[]);

  const identity = buildIdentityMatch(input.userId, input.email);

  const memberEventIdsPromise = identity.length
    ? EventTeam.find({
        status: "active",
        $and: [{ $or: identity }, buildActiveMembershipTimeClause(new Date())],
      })
        .select("eventId")
        .lean<Array<{ eventId: Types.ObjectId }>>()
    : Promise.resolve([] as Array<{ eventId: Types.ObjectId }>);

  const [createdEvents, orgEvents, memberEventRows] = await Promise.all([
    createdEventsPromise,
    orgEventsPromise,
    memberEventIdsPromise,
  ]);

  const memberEventIds = objectIdArray(
    memberEventRows.map((row) => row.eventId),
  );

  const memberEvents = memberEventIds.length
    ? await Event.find({ _id: { $in: memberEventIds } })
        .select("_id title organizationId createdByUserId")
        .lean<EventLean[]>()
    : [];

  const seen = new Set<string>();
  const merged: EventLean[] = [];

  for (const event of [...createdEvents, ...orgEvents, ...memberEvents]) {
    const key = String(event._id);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(event);
  }

  return merged;
}

function pickPrimaryScope(scopes: ScopeRecord[]): ScopeRecord {
  return [...scopes].sort((a, b) => {
    const statusDiff = statusPriority(a.status) - statusPriority(b.status);
    if (statusDiff !== 0) return statusDiff;

    const roleDiff = rolePriority(b.role) - rolePriority(a.role);
    if (roleDiff !== 0) return roleDiff;

    return parseDateSafe(b.createdAt) - parseDateSafe(a.createdAt);
  })[0]!;
}

function makeGlobalAggregateKey(input: {
  userId?: string | null;
  email?: string | null;
  membershipId: string;
}): string {
  if (input.userId) return `user:${input.userId}`;

  const normalizedEmail = normalizeEmail(input.email);
  if (normalizedEmail) return `email:${normalizedEmail}`;

  return `membership:${input.membershipId}`;
}

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = QuerySchema.safeParse({
    scope: req.nextUrl.searchParams.get("scope") ?? "global",
    teamId: req.nextUrl.searchParams.get("teamId") ?? undefined,
    orgId: req.nextUrl.searchParams.get("orgId") ?? undefined,
    eventId: req.nextUrl.searchParams.get("eventId") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const { scope, teamId, orgId, eventId } = parsed.data;
  const now = new Date();
  const currentUserId = session.user.id;
  const currentUserEmail = session.user.email ?? undefined;

  const authorizedTeamDocs = await getAuthorizedTeamDocs({
    userId: currentUserId,
    email: currentUserEmail,
  });

  const authorizedOrgDocs = await getAuthorizedOrganizationDocs({
    userId: currentUserId,
    email: currentUserEmail,
  });

  const authorizedOrgIds = objectIdArray(
    authorizedOrgDocs.map((org) => org._id),
  );

  const authorizedEventDocs = await getAuthorizedEventDocs({
    userId: currentUserId,
    email: currentUserEmail,
    authorizedOrgIds,
  });

  const teamMap = new Map(
    authorizedTeamDocs.map((team) => [String(team._id), team] as const),
  );
  const orgMap = new Map(
    authorizedOrgDocs.map((org) => [String(org._id), org] as const),
  );
  const eventMap = new Map(
    authorizedEventDocs.map((event) => [String(event._id), event] as const),
  );

  if (scope === "team") {
    const team = await Team.findById(teamId)
      .select("_id ownerId name")
      .lean<TeamLean | null>();

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    if (!teamMap.has(String(team._id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (scope === "organization") {
    const org = await Organization.findById(orgId)
      .select("_id ownerId name")
      .lean<OrganizationLean | null>();

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    if (!orgMap.has(String(org._id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (scope === "event") {
    const event = await Event.findById(eventId)
      .select("_id title organizationId createdByUserId")
      .lean<EventLean | null>();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (!eventMap.has(String(event._id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const scopedTeamIds =
    scope === "global"
      ? objectIdArray(authorizedTeamDocs.map((team) => team._id))
      : scope === "team" && teamId
        ? [toObjectId(teamId)]
        : [];

  const scopedOrgIds =
    scope === "global"
      ? objectIdArray(authorizedOrgDocs.map((org) => org._id))
      : scope === "organization" && orgId
        ? [toObjectId(orgId)]
        : [];

  const scopedEventIds =
    scope === "global"
      ? objectIdArray(authorizedEventDocs.map((event) => event._id))
      : scope === "event" && eventId
        ? [toObjectId(eventId)]
        : [];

  await Promise.all([
    scopedTeamIds.length
      ? TeamMember.updateMany(
          {
            teamId: { $in: scopedTeamIds },
            temporaryAccess: true,
            expiresAt: { $lt: now },
            status: { $ne: "revoked" },
          },
          { $set: { status: "expired" } },
        )
      : Promise.resolve(),

    scopedOrgIds.length
      ? OrgTeam.updateMany(
          {
            organizationId: { $in: scopedOrgIds },
            temporaryAccess: true,
            expiresAt: { $lt: now },
            status: { $ne: "revoked" },
          },
          { $set: { status: "expired" } },
        )
      : Promise.resolve(),

    scopedEventIds.length
      ? EventTeam.updateMany(
          {
            eventId: { $in: scopedEventIds },
            temporaryAccess: true,
            expiresAt: { $lt: now },
            status: { $ne: "revoked" },
          },
          { $set: { status: "expired" } },
        )
      : Promise.resolve(),
  ]);

  const [teamMembers, orgMembers, eventMembers] = await Promise.all([
    scopedTeamIds.length
      ? TeamMember.find({ teamId: { $in: scopedTeamIds } })
          .select(TEAM_MEMBER_SELECT)
          .sort({ createdAt: 1 })
          .lean<TeamMemberLean[]>()
      : Promise.resolve([] as TeamMemberLean[]),

    scopedOrgIds.length
      ? OrgTeam.find({ organizationId: { $in: scopedOrgIds } })
          .select(ORG_MEMBER_SELECT)
          .sort({ createdAt: 1 })
          .lean<OrgMemberLean[]>()
      : Promise.resolve([] as OrgMemberLean[]),

    scopedEventIds.length
      ? EventTeam.find({ eventId: { $in: scopedEventIds } })
          .select(EVENT_MEMBER_SELECT)
          .sort({ createdAt: 1 })
          .lean<EventMemberLean[]>()
      : Promise.resolve([] as EventMemberLean[]),
  ]);

  const orgRoleIds = objectIdArray(
    orgMembers.map((member) => member.roleId ?? null),
  );
  const orgRoles = orgRoleIds.length
    ? await OrgRole.find({ _id: { $in: orgRoleIds } })
        .select("_id name")
        .lean<Array<{ _id: Types.ObjectId; name: string }>>()
    : [];

  const orgRoleMap = new Map(
    orgRoles.map((role) => [String(role._id), role.name] as const),
  );

  const rawUserIds = [
    ...teamMembers.map((member) => member.userId ?? null),
    ...orgMembers.map((member) => member.userId ?? null),
    ...eventMembers.map((member) => member.userId ?? null),
  ];

  const userIds = objectIdArray(rawUserIds);
  const fallbackEmails = Array.from(
    new Set(
      [
        ...teamMembers.map((member) => normalizeEmail(member.email)),
        ...orgMembers.map((member) => normalizeEmail(member.email)),
        ...eventMembers.map((member) => normalizeEmail(member.email)),
      ].filter(Boolean),
    ),
  );

  const users = await User.find({
    $or: [
      ...(userIds.length ? [{ _id: { $in: userIds } }] : []),
      ...(fallbackEmails.length ? [{ email: { $in: fallbackEmails } }] : []),
    ],
  })
    .select("_id email firstName lastName username image")
    .lean<UserLean[]>();

  const userById = new Map(
    users.map((user) => [String(user._id), user] as const),
  );
  const userByEmail = new Map(
    users
      .filter((user) => normalizeEmail(user.email))
      .map((user) => [normalizeEmail(user.email), user] as const),
  );

  const scopedRows: Array<{
    aggregateKey: string;
    userId: string | null;
    email: string;
    name: string;
    avatarUrl: string | null;
    avatarText: string;
    scope: ScopeRecord;
  }> = [];

  for (const member of teamMembers) {
    const user =
      (member.userId ? userById.get(String(member.userId)) : null) ??
      userByEmail.get(normalizeEmail(member.email)) ??
      null;

    const team = teamMap.get(String(member.teamId));
    if (!team) continue;

    const email = normalizeEmail(user?.email ?? member.email);
    const name = displayNameFromUser(user, member.name, member.email);
    const scopeRecord: ScopeRecord = {
      sourceType: "team",
      sourceId: String(member.teamId),
      sourceName: team.name || "Team",
      membershipId: String(member._id),
      role: member.role,
      roleLabel: teamRoleLabel(member.role),
      status: member.status,
      temporaryAccess: member.temporaryAccess,
      expiresAt: toIso(member.expiresAt),
      acceptedAt: toIso(member.acceptedAt),
      createdAt: member.createdAt.toISOString(),
      updatedAt: member.updatedAt.toISOString(),
    };

    scopedRows.push({
      aggregateKey: makeGlobalAggregateKey({
        userId: user
          ? String(user._id)
          : member.userId
            ? String(member.userId)
            : null,
        email,
        membershipId: String(member._id),
      }),
      userId: user
        ? String(user._id)
        : member.userId
          ? String(member.userId)
          : null,
      email,
      name,
      avatarUrl: user?.image?.trim() ? user.image : null,
      avatarText: avatarTextFromName(name, email),
      scope: scopeRecord,
    });
  }

  for (const member of orgMembers) {
    const user =
      (member.userId ? userById.get(String(member.userId)) : null) ??
      userByEmail.get(normalizeEmail(member.email)) ??
      null;

    const org = orgMap.get(String(member.organizationId));
    if (!org) continue;

    const isOwner =
      (member.userId && String(member.userId) === String(org.ownerId)) ||
      (user && String(user._id) === String(org.ownerId));

    const role = isOwner ? "owner" : member.role;
    const roleLabel = isOwner
      ? "Owner"
      : member.roleId
        ? (orgRoleMap.get(String(member.roleId)) ?? "Member")
        : (getSystemRoleFallback(member.role)?.name ?? capitalize(member.role));

    const email = normalizeEmail(user?.email ?? member.email);
    const name = displayNameFromUser(user, member.name, member.email);
    const scopeRecord: ScopeRecord = {
      sourceType: "organization",
      sourceId: String(member.organizationId),
      sourceName: org.name || "Organization",
      membershipId: String(member._id),
      role,
      roleLabel,
      status: member.status,
      temporaryAccess: member.temporaryAccess,
      expiresAt: toIso(member.expiresAt),
      acceptedAt: toIso(member.acceptedAt),
      createdAt: member.createdAt.toISOString(),
      updatedAt: member.updatedAt.toISOString(),
    };

    scopedRows.push({
      aggregateKey: makeGlobalAggregateKey({
        userId: user
          ? String(user._id)
          : member.userId
            ? String(member.userId)
            : null,
        email,
        membershipId: String(member._id),
      }),
      userId: user
        ? String(user._id)
        : member.userId
          ? String(member.userId)
          : null,
      email,
      name,
      avatarUrl: user?.image?.trim() ? user.image : null,
      avatarText: avatarTextFromName(name, email),
      scope: scopeRecord,
    });
  }

  for (const member of eventMembers) {
    const user =
      (member.userId ? userById.get(String(member.userId)) : null) ??
      userByEmail.get(normalizeEmail(member.email)) ??
      null;

    const event = eventMap.get(String(member.eventId));
    if (!event) continue;

    const email = normalizeEmail(user?.email ?? member.email);
    const name = displayNameFromUser(user, member.name, member.email);
    const scopeRecord: ScopeRecord = {
      sourceType: "event",
      sourceId: String(member.eventId),
      sourceName: event.title || "Event",
      membershipId: String(member._id),
      role: member.role,
      roleLabel: eventRoleLabel(member.role),
      status: member.status,
      temporaryAccess: member.temporaryAccess,
      expiresAt: toIso(member.expiresAt),
      acceptedAt: toIso(member.acceptedAt),
      createdAt: member.createdAt.toISOString(),
      updatedAt: member.updatedAt.toISOString(),
    };

    scopedRows.push({
      aggregateKey: makeGlobalAggregateKey({
        userId: user
          ? String(user._id)
          : member.userId
            ? String(member.userId)
            : null,
        email,
        membershipId: String(member._id),
      }),
      userId: user
        ? String(user._id)
        : member.userId
          ? String(member.userId)
          : null,
      email,
      name,
      avatarUrl: user?.image?.trim() ? user.image : null,
      avatarText: avatarTextFromName(name, email),
      scope: scopeRecord,
    });
  }

  const aggregateMap = new Map<string, AggregatedMember>();

  for (const row of scopedRows) {
    const existing = aggregateMap.get(row.aggregateKey);

    if (!existing) {
      aggregateMap.set(row.aggregateKey, {
        id: row.aggregateKey,
        userId: row.userId,
        email: row.email,
        name: row.name,
        avatarUrl: row.avatarUrl,
        avatarText: row.avatarText,
        role: row.scope.role,
        roleLabel: row.scope.roleLabel,
        primaryStatus: row.scope.status,
        activeScopeCount: row.scope.status === "active" ? 1 : 0,
        invitedScopeCount: row.scope.status === "invited" ? 1 : 0,
        expiredScopeCount: row.scope.status === "expired" ? 1 : 0,
        revokedScopeCount: row.scope.status === "revoked" ? 1 : 0,
        latestActivityAt: row.scope.updatedAt,
        createdAt: row.scope.createdAt,
        scopes: [row.scope],
      });
      continue;
    }

    existing.scopes.push(row.scope);

    if (!existing.userId && row.userId) {
      existing.userId = row.userId;
    }

    if (!existing.avatarUrl && row.avatarUrl) {
      existing.avatarUrl = row.avatarUrl;
    }

    if ((!existing.name || existing.name === "Member") && row.name) {
      existing.name = row.name;
    }

    existing.activeScopeCount += row.scope.status === "active" ? 1 : 0;
    existing.invitedScopeCount += row.scope.status === "invited" ? 1 : 0;
    existing.expiredScopeCount += row.scope.status === "expired" ? 1 : 0;
    existing.revokedScopeCount += row.scope.status === "revoked" ? 1 : 0;

    if (
      parseDateSafe(row.scope.updatedAt) >
      parseDateSafe(existing.latestActivityAt)
    ) {
      existing.latestActivityAt = row.scope.updatedAt;
    }

    if (
      parseDateSafe(row.scope.createdAt) > parseDateSafe(existing.createdAt)
    ) {
      existing.createdAt = row.scope.createdAt;
    }
  }

  const members = Array.from(aggregateMap.values())
    .map((member) => {
      const primary = pickPrimaryScope(member.scopes);

      return {
        ...member,
        role: primary.role,
        roleLabel: primary.roleLabel,
        primaryStatus: primary.status,
        scopes: [...member.scopes].sort(
          (a, b) => parseDateSafe(b.createdAt) - parseDateSafe(a.createdAt),
        ),
      };
    })
    .sort((a, b) => {
      const statusDiff =
        statusPriority(a.primaryStatus) - statusPriority(b.primaryStatus);
      if (statusDiff !== 0) return statusDiff;

      const roleDiff = rolePriority(b.role) - rolePriority(a.role);
      if (roleDiff !== 0) return roleDiff;

      return (
        parseDateSafe(b.latestActivityAt) - parseDateSafe(a.latestActivityAt)
      );
    });

  const summary = {
    totalMembers: members.length,
    activeMembers: members.filter((member) => member.activeScopeCount > 0)
      .length,
    invitedMembers: members.filter((member) => member.invitedScopeCount > 0)
      .length,
    expiredMembers: members.filter((member) => member.expiredScopeCount > 0)
      .length,
    revokedMembers: members.filter((member) => member.revokedScopeCount > 0)
      .length,
    newMembers30d: members.filter((member) =>
      isWithinLastDays(member.createdAt, 30),
    ).length,
    resignedMembers: members.filter(
      (member) =>
        member.activeScopeCount === 0 &&
        member.invitedScopeCount === 0 &&
        (member.revokedScopeCount > 0 || member.expiredScopeCount > 0),
    ).length,
  };

  return NextResponse.json({
    ok: true,
    scope: {
      type: scope as ScopeType,
      teamId: teamId ?? null,
      orgId: orgId ?? null,
      eventId: eventId ?? null,
    },
    performanceAttribution: {
      available: false,
      reason:
        "Member directory is live. Revenue, tickets sold, and page-view attribution need the ticket/order/tracking linkage model before they can be computed correctly.",
    },
    summary,
    members,
  });
}
