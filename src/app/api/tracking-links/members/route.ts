// src/app/api/tracking-links/members/route.ts
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

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ObjectId = mongoose.Types.ObjectId;

type Scope = "all" | "organization" | "event";

type MemberRow = {
  userId: string;

  name: string;
  email: string;
  image?: string | null;

  // only returned for organization/event scopes
  role?: string;
  status?: string;

  links: number;
  views: number;
  ticketsSold: number;
  revenue: number;

  lastLinkCreatedAt?: string | null;
};

type OwnedOrgLean = { _id: ObjectId };

type Aggregated = {
  _id: ObjectId; // createdByUserId
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

function displayNameFromUser(u?: UserLean | null) {
  if (!u) return "";
  const fn = (u.firstName ?? "").trim();
  const ln = (u.lastName ?? "").trim();
  const full = `${fn} ${ln}`.trim();
  return full || (u.username ?? "") || (u.email ?? "") || "";
}

/* ------------------------------------------------------------------ */
/* GET /api/tracking-links/members                                    */
/* - scope=all (default): all links across owned orgs (non-archived)   */
/* - scope=organization&organizationId=...                             */
/* - scope=event&eventId=...                                           */
/* Returns aggregated metrics grouped by createdByUserId               */
/* ------------------------------------------------------------------ */
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

  // Owned orgs only (matches your current tracking-links permission model)
  const ownedOrgs = (await Organization.find({ ownerId: session.user.id })
    .select("_id")
    .lean()) as OwnedOrgLean[];

  const ownedOrgIds: ObjectId[] = ownedOrgs.map((o) => o._id);

  if (!ownedOrgIds.length) {
    return NextResponse.json({ rows: [] as MemberRow[] });
  }

  // Base filter: within owned orgs + not archived
  const baseFilter: Record<string, unknown> = {
    organizationId: { $in: ownedOrgIds },
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

    const orgObjId = new mongoose.Types.ObjectId(organizationIdParam);
    const isOwned = ownedOrgIds.some((id) => String(id) === String(orgObjId));
    if (!isOwned) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    baseFilter.organizationId = orgObjId;
    scopedOrgId = orgObjId;
  }

  if (scope === "event") {
    if (!isObjectId(eventIdParam)) {
      return NextResponse.json({ error: "Invalid eventId" }, { status: 400 });
    }

    const eventObjId = new mongoose.Types.ObjectId(eventIdParam);

    const ev = (await Event.findById(eventObjId)
      .select("_id organizationId")
      .lean()) as { _id: ObjectId; organizationId: ObjectId } | null;

    if (!ev) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const isOwned = ownedOrgIds.some(
      (id) => String(id) === String(ev.organizationId),
    );
    if (!isOwned) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    baseFilter.organizationId = ev.organizationId;
    baseFilter.destinationKind = "Event";
    baseFilter.destinationId = ev._id;

    scopedOrgId = ev.organizationId;
    scopedEventId = ev._id;
  }

  // Aggregate by creator
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
    // sort by revenue desc, then views desc, then links desc
    { $sort: { revenue: -1, views: -1, links: -1 } },
    { $limit: 200 }, // safety cap (adjust if you want)
  ])) as Aggregated[];

  if (!agg.length) {
    return NextResponse.json({ rows: [] as MemberRow[] });
  }

  const creatorIds = agg
    .map((a) => a._id)
    .filter(Boolean) as unknown as ObjectId[];

  // Load users in one go
  const users = await User.find({ _id: { $in: creatorIds } })
    .select("_id email username firstName lastName image")
    .lean<UserLean[]>();

  const userById = new Map<string, UserLean>(
    users.map((u) => [String(u._id), u]),
  );

  // Optional role/status (only for scoped org/event)
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

    for (const m of members) {
      if (!m.userId) continue;
      roleByUserId.set(String(m.userId), {
        role: m.role,
        status: m.status,
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

    for (const m of members) {
      if (!m.userId) continue;
      roleByUserId.set(String(m.userId), {
        role: m.role,
        status: m.status,
      });
    }
  }

  const rows: MemberRow[] = agg.map((a) => {
    const uid = String(a._id);
    const u = userById.get(uid);

    const base: MemberRow = {
      userId: uid,
      name: displayNameFromUser(u) || uid,
      email: (u?.email ?? "").toLowerCase(),
      image: u?.image ?? null,

      links: safeNumber(a.links),
      views: safeNumber(a.views),
      ticketsSold: safeNumber(a.ticketsSold),
      revenue: safeNumber(a.revenue),

      lastLinkCreatedAt: a.lastLinkCreatedAt
        ? new Date(a.lastLinkCreatedAt).toISOString()
        : null,
    };

    if (scope !== "all") {
      const r = roleByUserId.get(uid);
      base.role = r?.role ?? "—";
      base.status = r?.status ?? "—";
    }

    return base;
  });

  return NextResponse.json({ rows });
}
