import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";
import mongoose from "mongoose";

import { auth } from "@/lib/auth";
import Organization from "@/models/Organization";
import Event from "@/models/Event";
import TrackingLink from "@/models/TrackingLink";
import User from "@/models/User";
import OrgTeam from "@/models/OrgTeam";
import EventTeam from "@/models/EventTeam";
import {
  listAuthorizedOrganizationIdsForUser,
  requireOrgPermission,
} from "@/lib/orgAccess";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ObjectId = mongoose.Types.ObjectId;

type Scope = "all" | "organization" | "event";

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

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scopeRaw = (req.nextUrl.searchParams.get("scope") || "all").trim();
  const scope: Scope =
    scopeRaw === "organization" || scopeRaw === "event" ? scopeRaw : "all";

  const organizationIdParam = (
    req.nextUrl.searchParams.get("organizationId") || ""
  ).trim();

  const eventIdParam = (req.nextUrl.searchParams.get("eventId") || "").trim();

  const baseFilter: Record<string, unknown> = {
    archived: false,
  };

  let scopedOrgId: ObjectId | null = null;
  let scopedEventId: ObjectId | null = null;

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
    baseFilter.organizationId = orgObjId;
    scopedOrgId = orgObjId;
  }

  if (scope === "event") {
    if (!isObjectId(eventIdParam)) {
      return NextResponse.json({ error: "Invalid eventId" }, { status: 400 });
    }

    const eventObjId = new mongoose.Types.ObjectId(eventIdParam);

    const event = (await Event.findById(eventObjId)
      .select("_id organizationId")
      .lean()) as { _id: ObjectId; organizationId: ObjectId } | null;

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
  }

  if (scope === "all") {
    const authorizedOrgIds = await listAuthorizedOrganizationIdsForUser({
      userId: session.user.id,
      email: session.user.email ?? undefined,
      permission: "members.view",
    });

    if (!authorizedOrgIds.length) {
      return NextResponse.json({ rows: [] as MemberRow[] });
    }

    baseFilter.organizationId = { $in: authorizedOrgIds };
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
    { $limit: 200 },
  ])) as Aggregated[];

  if (!agg.length) {
    return NextResponse.json({ rows: [] as MemberRow[] });
  }

  const creatorIds = agg.map((a) => a._id).filter(Boolean) as ObjectId[];

  const users = await User.find({ _id: { $in: creatorIds } })
    .select("_id email username firstName lastName image")
    .lean<UserLean[]>();

  const userById = new Map<string, UserLean>(
    users.map((user) => [String(user._id), user]),
  );

  const roleByUserId = new Map<string, { role?: string; status?: string }>();

  if (scope === "organization" && scopedOrgId) {
    const members = await OrgTeam.find({
      organizationId: scopedOrgId,
      userId: { $in: creatorIds },
    })
      .select("userId role status")
      .lean<
        Array<{ userId?: ObjectId | null; role?: string; status?: string }>
      >();

    for (const member of members) {
      if (!member.userId) continue;
      roleByUserId.set(String(member.userId), {
        role: member.role,
        status: member.status,
      });
    }
  }

  if (scope === "event" && scopedEventId) {
    const members = await EventTeam.find({
      eventId: scopedEventId,
      userId: { $in: creatorIds },
    })
      .select("userId role status")
      .lean<
        Array<{ userId?: ObjectId | null; role?: string; status?: string }>
      >();

    for (const member of members) {
      if (!member.userId) continue;
      roleByUserId.set(String(member.userId), {
        role: member.role,
        status: member.status,
      });
    }
  }

  const rows: MemberRow[] = agg.map((entry) => {
    const uid = String(entry._id);
    const user = userById.get(uid);

    const row: MemberRow = {
      userId: uid,
      name: displayNameFromUser(user) || uid,
      email: (user?.email ?? "").toLowerCase(),
      image: user?.image ?? null,
      links: safeNumber(entry.links),
      views: safeNumber(entry.views),
      ticketsSold: safeNumber(entry.ticketsSold),
      revenue: safeNumber(entry.revenue),
      lastLinkCreatedAt: entry.lastLinkCreatedAt
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

  return NextResponse.json({ rows });
}
