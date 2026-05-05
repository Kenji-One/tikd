// src/app/api/tracking-links/members/route.ts
import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";
import mongoose from "mongoose";

import { auth } from "@/lib/auth";
import Event from "@/models/Event";
import Organization from "@/models/Organization";
import TrackingLink from "@/models/TrackingLink";
import User from "@/models/User";
import OrgTeam from "@/models/OrgTeam";
import EventTeam from "@/models/EventTeam";
import Team from "@/models/Team";
import TeamMember from "@/models/TeamMember";
import {
  listAuthorizedOrganizationIdsForUser,
  requireOrgPermission,
} from "@/lib/orgAccess";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ObjectId = mongoose.Types.ObjectId;

type Scope = "all" | "organization" | "event" | "team";

type MemberRow = {
  userId: string;
  name: string;
  email: string;
  image?: string | null;
  role?: string;
  status?: string;
  links: number;
  views: number;
  ticketsSold: number;
  revenue: number;
  lastLinkCreatedAt?: string | null;
};

type Aggregated = {
  _id: ObjectId;
  links: number;
  views: number;
  ticketsSold: number;
  revenue: number;
  lastLinkCreatedAt?: Date;
};

type UserLean = {
  _id: ObjectId;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  image?: string;
};

type TeamLean = {
  _id: ObjectId;
  ownerId: ObjectId;
  name?: string;
};

type OrganizationLean = {
  _id: ObjectId;
  ownerId: ObjectId;
  name?: string;
};

type EventLean = {
  _id: ObjectId;
  organizationId: ObjectId;
  createdByUserId: ObjectId;
  title?: string;
};

type MembershipMeta = {
  userId?: ObjectId | null;
  role?: string;
  status?: string;
};

const isObjectId = (val: string) => mongoose.Types.ObjectId.isValid(val);

function safeNumber(n: unknown) {
  const x = typeof n === "number" ? n : Number(n);
  return Number.isFinite(x) ? x : 0;
}

function displayNameFromUser(user?: UserLean | null) {
  if (!user) return "";
  const fn = (user.firstName ?? "").trim();
  const ln = (user.lastName ?? "").trim();
  const full = `${fn} ${ln}`.trim();
  return full || (user.username ?? "") || (user.email ?? "") || "";
}

function normalizeEmail(email?: string | null): string {
  return String(email ?? "")
    .trim()
    .toLowerCase();
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

function buildIdentityMatch(userId: string, email?: string | null) {
  const or: Array<Record<string, unknown>> = [];

  if (isObjectId(userId)) {
    or.push({ userId: new mongoose.Types.ObjectId(userId) });
  }

  const emailLower = normalizeEmail(email);
  if (emailLower) {
    or.push({ email: emailLower });
  }

  return or;
}

function pushUniqueObjectId(
  target: ObjectId[],
  seen: Set<string>,
  value?: ObjectId | null,
) {
  if (!value) return;
  const key = String(value);
  if (seen.has(key)) return;
  seen.add(key);
  target.push(value);
}

function addMemberUser(
  target: ObjectId[],
  seen: Set<string>,
  roleMap: Map<string, { role?: string; status?: string }>,
  userId?: ObjectId | null,
  meta?: { role?: string; status?: string },
) {
  if (!userId) return;
  const key = String(userId);

  if (!seen.has(key)) {
    seen.add(key);
    target.push(userId);
  }

  if (meta && !roleMap.has(key)) {
    roleMap.set(key, {
      role: meta.role,
      status: meta.status,
    });
  }
}

function sortRows(a: MemberRow, b: MemberRow) {
  if (b.revenue !== a.revenue) return b.revenue - a.revenue;
  if (b.ticketsSold !== a.ticketsSold) return b.ticketsSold - a.ticketsSold;
  if (b.views !== a.views) return b.views - a.views;
  if (b.links !== a.links) return b.links - a.links;
  return a.name.localeCompare(b.name);
}

async function assertCanViewTeamMembers(input: {
  teamId: string;
  userId: string;
  email?: string | null;
}): Promise<
  { ok: true; team: TeamLean } | { ok: false; status: number; error: string }
> {
  const team = await Team.findById(input.teamId)
    .select("_id ownerId name")
    .lean<TeamLean | null>();

  if (!team) {
    return { ok: false, status: 404, error: "Team not found" };
  }

  if (String(team.ownerId) === String(input.userId)) {
    return { ok: true, team };
  }

  const identity = buildIdentityMatch(input.userId, input.email);
  if (!identity.length) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  const member = await TeamMember.findOne({
    teamId: team._id,
    status: "active",
    $and: [{ $or: identity }, buildActiveMembershipTimeClause(new Date())],
  })
    .select("_id")
    .lean();

  if (!member) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true, team };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scopeRaw = (req.nextUrl.searchParams.get("scope") || "all").trim();
  const scope: Scope =
    scopeRaw === "organization" || scopeRaw === "event" || scopeRaw === "team"
      ? scopeRaw
      : "all";

  const organizationIdParam = (
    req.nextUrl.searchParams.get("organizationId") || ""
  ).trim();

  const eventIdParam = (req.nextUrl.searchParams.get("eventId") || "").trim();
  const teamIdParam = (req.nextUrl.searchParams.get("teamId") || "").trim();

  const baseFilter: Record<string, unknown> = {
    archived: false,
  };

  let scopedOrgId: ObjectId | null = null;
  let scopedEventId: ObjectId | null = null;
  let scopedTeamId: ObjectId | null = null;

  let scopedTeamMembers: MembershipMeta[] = [];
  const scopedUserIds: ObjectId[] = [];
  const scopedUserIdsSeen = new Set<string>();
  const roleByUserId = new Map<string, { role?: string; status?: string }>();

  if (scope === "organization") {
    if (!isObjectId(organizationIdParam)) {
      return NextResponse.json(
        { error: "Invalid organizationId" },
        { status: 400 },
      );
    }

    const canView = await requireOrgPermission({
      organizationId: organizationIdParam,
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

    const orgObjId = new mongoose.Types.ObjectId(organizationIdParam);
    scopedOrgId = orgObjId;
    baseFilter.organizationId = orgObjId;

    const [orgDoc, members] = await Promise.all([
      Organization.findById(orgObjId)
        .select("_id ownerId name")
        .lean<OrganizationLean | null>(),
      OrgTeam.find({
        organizationId: orgObjId,
        userId: { $ne: null },
      })
        .select("userId role status")
        .lean<MembershipMeta[]>(),
    ]);

    if (orgDoc?.ownerId) {
      addMemberUser(
        scopedUserIds,
        scopedUserIdsSeen,
        roleByUserId,
        orgDoc.ownerId,
        {
          role: "owner",
          status: "active",
        },
      );
    }

    for (const member of members) {
      addMemberUser(
        scopedUserIds,
        scopedUserIdsSeen,
        roleByUserId,
        member.userId ?? null,
        {
          role: member.role,
          status: member.status,
        },
      );
    }
  }

  if (scope === "event") {
    if (!isObjectId(eventIdParam)) {
      return NextResponse.json({ error: "Invalid eventId" }, { status: 400 });
    }

    const eventObjId = new mongoose.Types.ObjectId(eventIdParam);

    const event = await Event.findById(eventObjId)
      .select("_id organizationId createdByUserId title")
      .lean<EventLean | null>();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const canView = await requireOrgPermission({
      organizationId: String(event.organizationId),
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

    baseFilter.organizationId = event.organizationId;
    baseFilter.destinationKind = "Event";
    baseFilter.destinationId = event._id;
    scopedOrgId = event.organizationId;
    scopedEventId = event._id;

    const members = await EventTeam.find({
      eventId: event._id,
      userId: { $ne: null },
    })
      .select("userId role status")
      .lean<MembershipMeta[]>();

    addMemberUser(
      scopedUserIds,
      scopedUserIdsSeen,
      roleByUserId,
      event.createdByUserId,
      {
        role: "owner",
        status: "active",
      },
    );

    for (const member of members) {
      addMemberUser(
        scopedUserIds,
        scopedUserIdsSeen,
        roleByUserId,
        member.userId ?? null,
        {
          role: member.role,
          status: member.status,
        },
      );
    }
  }

  if (scope === "team") {
    if (!isObjectId(teamIdParam)) {
      return NextResponse.json({ error: "Invalid teamId" }, { status: 400 });
    }

    const canView = await assertCanViewTeamMembers({
      teamId: teamIdParam,
      userId: session.user.id,
      email: session.user.email ?? undefined,
    });

    if (!canView.ok) {
      return NextResponse.json(
        { error: canView.error },
        { status: canView.status },
      );
    }

    const teamObjId = new mongoose.Types.ObjectId(teamIdParam);
    scopedTeamId = teamObjId;

    const authorizedOrgIds = await listAuthorizedOrganizationIdsForUser({
      userId: session.user.id,
      email: session.user.email ?? undefined,
      permission: "members.view",
    });

    baseFilter.organizationId = { $in: authorizedOrgIds };
    scopedTeamMembers = await TeamMember.find({
      teamId: teamObjId,
      userId: { $ne: null },
    })
      .select("userId role status")
      .lean<MembershipMeta[]>();

    addMemberUser(
      scopedUserIds,
      scopedUserIdsSeen,
      roleByUserId,
      canView.team.ownerId,
      {
        role: "owner",
        status: "active",
      },
    );

    for (const member of scopedTeamMembers) {
      addMemberUser(
        scopedUserIds,
        scopedUserIdsSeen,
        roleByUserId,
        member.userId ?? null,
        {
          role: member.role,
          status: member.status,
        },
      );
    }

    baseFilter.createdByUserId = { $in: scopedUserIds };
  }

  if (scope === "all") {
    const authorizedOrgIds = await listAuthorizedOrganizationIdsForUser({
      userId: session.user.id,
      email: session.user.email ?? undefined,
      permission: "members.view",
    });

    const teamAccessIdentity = buildIdentityMatch(
      session.user.id,
      session.user.email ?? undefined,
    );

    const [
      orgDocs,
      orgMembers,
      events,
      eventMembers,
      ownedTeams,
      joinedTeamRows,
    ] = await Promise.all([
      authorizedOrgIds.length
        ? Organization.find({ _id: { $in: authorizedOrgIds } })
            .select("_id ownerId name")
            .lean<OrganizationLean[]>()
        : Promise.resolve([] as OrganizationLean[]),

      authorizedOrgIds.length
        ? OrgTeam.find({
            organizationId: { $in: authorizedOrgIds },
            userId: { $ne: null },
          })
            .select("userId role status")
            .lean<MembershipMeta[]>()
        : Promise.resolve([] as MembershipMeta[]),

      authorizedOrgIds.length
        ? Event.find({ organizationId: { $in: authorizedOrgIds } })
            .select("_id organizationId createdByUserId title")
            .lean<EventLean[]>()
        : Promise.resolve([] as EventLean[]),

      authorizedOrgIds.length
        ? EventTeam.find({
            eventId: {
              $in: await Event.find({
                organizationId: { $in: authorizedOrgIds },
              })
                .distinct("_id")
                .then((ids) => ids as ObjectId[]),
            },
            userId: { $ne: null },
          })
            .select("userId role status")
            .lean<MembershipMeta[]>()
        : Promise.resolve([] as MembershipMeta[]),

      Team.find({
        ownerId: new mongoose.Types.ObjectId(session.user.id),
      })
        .select("_id ownerId name")
        .lean<TeamLean[]>(),

      teamAccessIdentity.length
        ? TeamMember.find({
            status: "active",
            $and: [
              { $or: teamAccessIdentity },
              buildActiveMembershipTimeClause(new Date()),
            ],
          })
            .select("teamId")
            .lean<Array<{ teamId?: ObjectId | null }>>()
        : Promise.resolve([] as Array<{ teamId?: ObjectId | null }>),
    ]);

    const accessibleTeamIds: ObjectId[] = [];
    const accessibleTeamIdsSeen = new Set<string>();

    for (const team of ownedTeams) {
      pushUniqueObjectId(accessibleTeamIds, accessibleTeamIdsSeen, team._id);
    }
    for (const row of joinedTeamRows) {
      pushUniqueObjectId(
        accessibleTeamIds,
        accessibleTeamIdsSeen,
        row.teamId ?? null,
      );
    }

    const teamDocs =
      accessibleTeamIds.length > 0
        ? await Team.find({ _id: { $in: accessibleTeamIds } })
            .select("_id ownerId name")
            .lean<TeamLean[]>()
        : [];

    const teamMembers =
      accessibleTeamIds.length > 0
        ? await TeamMember.find({
            teamId: { $in: accessibleTeamIds },
            userId: { $ne: null },
          })
            .select("userId role status")
            .lean<MembershipMeta[]>()
        : [];

    baseFilter.organizationId = { $in: authorizedOrgIds };

    for (const org of orgDocs) {
      addMemberUser(
        scopedUserIds,
        scopedUserIdsSeen,
        roleByUserId,
        org.ownerId,
        {
          role: "owner",
          status: "active",
        },
      );
    }

    for (const member of orgMembers) {
      addMemberUser(
        scopedUserIds,
        scopedUserIdsSeen,
        roleByUserId,
        member.userId ?? null,
      );
    }

    for (const event of events) {
      addMemberUser(
        scopedUserIds,
        scopedUserIdsSeen,
        roleByUserId,
        event.createdByUserId,
      );
    }

    for (const member of eventMembers) {
      addMemberUser(
        scopedUserIds,
        scopedUserIdsSeen,
        roleByUserId,
        member.userId ?? null,
      );
    }

    for (const team of teamDocs) {
      addMemberUser(
        scopedUserIds,
        scopedUserIdsSeen,
        roleByUserId,
        team.ownerId,
      );
    }

    for (const member of teamMembers) {
      addMemberUser(
        scopedUserIds,
        scopedUserIdsSeen,
        roleByUserId,
        member.userId ?? null,
      );
    }

    if (!authorizedOrgIds.length && !scopedUserIds.length) {
      return NextResponse.json({ rows: [] as MemberRow[] });
    }
  }

  const agg = (await TrackingLink.aggregate<Aggregated>([
    { $match: baseFilter },
    {
      $group: {
        _id: "$createdByUserId",
        links: { $sum: 1 },
        views: { $sum: { $ifNull: ["$views", 0] } },
        ticketsSold: { $sum: { $ifNull: ["$ticketsSold", 0] } },
        revenue: { $sum: { $ifNull: ["$revenue", 0] } },
        lastLinkCreatedAt: { $max: "$createdAt" },
      },
    },
    { $sort: { revenue: -1, views: -1, links: -1 } },
    { $limit: 400 },
  ])) as Aggregated[];

  const aggByUserId = new Map<string, Aggregated>(
    agg
      .filter((entry) => !!entry._id)
      .map((entry) => [String(entry._id), entry]),
  );

  const allUserIds: ObjectId[] = [];
  const allUserIdsSeen = new Set<string>();

  for (const entry of agg) {
    pushUniqueObjectId(allUserIds, allUserIdsSeen, entry._id);
  }

  for (const userId of scopedUserIds) {
    pushUniqueObjectId(allUserIds, allUserIdsSeen, userId);
  }

  if (!allUserIds.length) {
    return NextResponse.json({ rows: [] as MemberRow[] });
  }

  const users = await User.find({ _id: { $in: allUserIds } })
    .select("_id email username firstName lastName image")
    .lean<UserLean[]>();

  const userById = new Map<string, UserLean>(
    users.map((user) => [String(user._id), user]),
  );

  const rows: MemberRow[] = allUserIds.map((userId) => {
    const uid = String(userId);
    const user = userById.get(uid);
    const entry = aggByUserId.get(uid);

    const row: MemberRow = {
      userId: uid,
      name: displayNameFromUser(user) || uid,
      email: normalizeEmail(user?.email ?? ""),
      image: user?.image ?? null,
      links: safeNumber(entry?.links ?? 0),
      views: safeNumber(entry?.views ?? 0),
      ticketsSold: safeNumber(entry?.ticketsSold ?? 0),
      revenue: safeNumber(entry?.revenue ?? 0),
      lastLinkCreatedAt: entry?.lastLinkCreatedAt
        ? new Date(entry.lastLinkCreatedAt).toISOString()
        : null,
    };

    if (scope !== "all") {
      const meta = roleByUserId.get(uid);
      row.role = meta?.role ?? "—";
      row.status = meta?.status ?? "—";
    }

    return row;
  });

  rows.sort(sortRows);

  return NextResponse.json({ rows });
}
