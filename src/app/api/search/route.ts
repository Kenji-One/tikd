/* ------------------------------------------------------------------ *
 *  /api/search  – global search for events / organizations / teams / friends
 *
 *  Query params:
 *    q=<string>                          (required, trimmed)
 *    type=event|org|team|friend|all      (default: all)
 *    limit=<1..20>                       (default: 6 per type)
 *    scope=public|dashboard              (default: auto)
 *
 *  Behavior:
 *   - public:   search Events + Orgs only (no auth required)
 *              hrefs go to public pages (/events/:id, /organizations/:slug-or-id)
 *   - dashboard: search Events + Orgs + Teams + Friends (auth required)
 *              results are scoped to membership/ownership (OrgTeam/EventTeam/TeamMember)
 *              hrefs go to dashboard pages
 *
 *  Returns:
 *    { success: true, results: { events:[], orgs:[], teams:[], friends:[] } }
 * ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";

import { Types } from "mongoose";
import { z } from "zod";
import { auth } from "@/lib/auth";

import Event from "@/models/Event";
import Organization from "@/models/Organization";
import Team from "@/models/Team";
import User from "@/models/User";
import Friendship from "@/models/Friendship";

import OrgTeam from "@/models/OrgTeam";
import EventTeam from "@/models/EventTeam";
import TeamMember from "@/models/TeamMember";

/* ---------- shared result item types (client shape) ---------------- */
type SearchItemEvent = {
  id: string;
  type: "event";
  title: string;
  subtitle: string; // org name duplicated here for backwards use
  orgName: string | null; // explicit for UI
  date: string | null;
  image: string | null;
  href: string;
};

type SearchItemOrg = {
  id: string;
  type: "org";
  title: string;
  subtitle: string;
  image: string | null;
  href: string;
};

type SearchItemTeam = {
  id: string;
  type: "team";
  title: string;
  subtitle: string;
  image: string | null;
  href: string;
};

type SearchItemFriend = {
  id: string;
  type: "friend";
  title: string;
  subtitle: string;
  image: string | null;
  href: string;
};

type SearchPayload = {
  success: true;
  results: {
    events: SearchItemEvent[];
    orgs: SearchItemOrg[];
    teams: SearchItemTeam[];
    friends: SearchItemFriend[];
  };
};

type Kind = "event" | "org" | "team" | "friend" | "all";
type Scope = "auto" | "public" | "dashboard";

/* ---------- minimal lean projections (typed) ----------------------- */
type ObjId = Types.ObjectId | string;

interface OrgLean {
  _id: ObjId;
  name: string;
  slug?: string;
  logo?: string | null;
  location?: string | null; // ✅ your model uses location (not city)
}

interface EventLean {
  _id: ObjId;
  title: string;
  image?: string | null;
  date?: Date | string | null;
  location?: string | null;
  organizationId?: ObjId | OrgLean | null;
  createdByUserId?: ObjId | null;
}

interface TeamLean {
  _id: ObjId;
  name: string;
  location?: string | null;
  logo?: string | null;
}

interface FriendLean {
  _id: ObjId;
  username: string;
  email: string;
  image?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  jobTitle?: string | null;
  company?: string | null;
}

/* ------------------------------------------------------------------ */
const qsSchema = z.object({
  q: z.string().trim().min(1),
  type: z.enum(["event", "org", "team", "friend", "all"]).default("all"),
  limit: z.coerce.number().int().min(1).max(20).default(6),
  scope: z.enum(["auto", "public", "dashboard"]).default("auto"),
});

function isObjectIdString(v: string) {
  return /^[a-f\d]{24}$/i.test(v);
}

function safeIso(d: unknown): string | null {
  try {
    if (!d) return null;
    const dt = d instanceof Date ? d : new Date(String(d));
    if (Number.isNaN(dt.getTime())) return null;
    return dt.toISOString();
  } catch {
    return null;
  }
}

function escapeRegex(q: string) {
  return q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function uniqObjectIds(ids: Array<Types.ObjectId | string>) {
  const seen = new Set<string>();
  const out: Types.ObjectId[] = [];
  for (const id of ids) {
    const s = String(id);
    if (!isObjectIdString(s)) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(new Types.ObjectId(s));
  }
  return out;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    const parsed = qsSchema.safeParse({
      q: url.searchParams.get("q") ?? "",
      type: url.searchParams.get("type") ?? "all",
      limit: url.searchParams.get("limit") ?? "6",
      scope: url.searchParams.get("scope") ?? "auto",
    });

    if (!parsed.success) {
      const empty: SearchPayload = {
        success: true,
        results: { events: [], orgs: [], teams: [], friends: [] },
      };
      return NextResponse.json(empty, { status: 200 });
    }

    const { q, type, limit: perType, scope } = parsed.data;

    const rx = new RegExp(escapeRegex(q), "i");

    // Resolve scope:
    // - public: no auth required, only events/orgs
    // - dashboard: auth required, scoped by membership
    let resolvedScope: Exclude<Scope, "auto"> = "public";

    if (scope === "dashboard") resolvedScope = "dashboard";
    else if (scope === "public") resolvedScope = "public";
    else {
      // auto: if user is authed => dashboard behavior, else public behavior
      const session = await auth();
      resolvedScope = session?.user?.id ? "dashboard" : "public";
    }

    // -----------------------------------------
    // PUBLIC SCOPE
    // -----------------------------------------
    if (resolvedScope === "public") {
      const [eventsRaw, orgsRaw] = await Promise.all([
        type === "event" || type === "all"
          ? Event.find<EventLean>(
              { $or: [{ title: rx }, { location: rx }] },
              { _id: 1, title: 1, image: 1, date: 1, organizationId: 1 },
            )
              .sort({ date: 1 })
              .limit(perType)
              .populate({
                path: "organizationId",
                select: "_id name slug logo location",
                model: Organization,
              })
              .lean()
          : ([] as EventLean[]),

        type === "org" || type === "all"
          ? Organization.find<OrgLean>(
              { $or: [{ name: rx }, { location: rx }] },
              { _id: 1, name: 1, slug: 1, logo: 1, location: 1 },
            )
              .limit(perType)
              .lean()
          : ([] as OrgLean[]),
      ]);

      const toEvent = (e: EventLean): SearchItemEvent => {
        const org =
          e.organizationId && typeof e.organizationId === "object"
            ? (e.organizationId as OrgLean)
            : null;

        return {
          id: String(e._id),
          type: "event",
          title: e.title,
          subtitle: org?.name || "",
          orgName: org?.name || null,
          date: safeIso(e.date),
          image: e.image ?? null,
          href: `/events/${e._id}`, // ✅ public
        };
      };

      const toOrg = (o: OrgLean): SearchItemOrg => ({
        id: String(o._id),
        type: "org",
        title: o.name,
        subtitle: o.location || "",
        image: o.logo ?? null,
        href: `/organizations/${o.slug || o._id}`, // ✅ public
      });

      const payload: SearchPayload = {
        success: true,
        results: {
          events: (eventsRaw as EventLean[]).map(toEvent),
          orgs: (orgsRaw as OrgLean[]).map(toOrg),
          teams: [],
          friends: [],
        },
      };

      return NextResponse.json(payload, { status: 200 });
    }

    // -----------------------------------------
    // DASHBOARD SCOPE (membership-scoped)
    // -----------------------------------------
    const session = await auth();
    const meRaw =
      session?.user?.id && isObjectIdString(session.user.id)
        ? session.user.id
        : null;

    if (!meRaw) {
      const empty: SearchPayload = {
        success: true,
        results: { events: [], orgs: [], teams: [], friends: [] },
      };
      return NextResponse.json(empty, { status: 200 });
    }

    const meId = new Types.ObjectId(meRaw);
    const meEmail =
      typeof session?.user?.email === "string"
        ? session.user.email.toLowerCase().trim()
        : null;

    // 1) Allowed orgs: owner OR OrgTeam.active (by userId OR email)
    const [ownedOrgs, orgMemberships] = await Promise.all([
      Organization.find({ ownerId: meId }, { _id: 1 }).lean<
        Array<{ _id: Types.ObjectId }>
      >(),
      OrgTeam.find(
        {
          status: "active",
          $or: [{ userId: meId }, ...(meEmail ? [{ email: meEmail }] : [])],
        },
        { organizationId: 1 },
      ).lean<Array<{ organizationId: Types.ObjectId }>>(),
    ]);

    const allowedOrgIds = uniqObjectIds([
      ...ownedOrgs.map((x) => x._id),
      ...orgMemberships.map((x) => x.organizationId),
    ]);

    // 2) Allowed events: createdByUserId OR in allowedOrgIds OR EventTeam.active
    const eventMemberships = await EventTeam.find(
      {
        status: "active",
        $or: [{ userId: meId }, ...(meEmail ? [{ email: meEmail }] : [])],
      },
      { eventId: 1 },
    ).lean<Array<{ eventId: Types.ObjectId }>>();

    const allowedEventIds = uniqObjectIds(
      eventMemberships.map((x) => x.eventId),
    );

    // 3) Allowed teams: owner OR TeamMember.active
    const teamMemberships = await TeamMember.find(
      {
        status: "active",
        $or: [{ userId: meId }, ...(meEmail ? [{ email: meEmail }] : [])],
      },
      { teamId: 1 },
    ).lean<Array<{ teamId: Types.ObjectId }>>();

    const allowedTeamIds = uniqObjectIds(teamMemberships.map((x) => x.teamId));

    const [eventsRaw, orgsRaw, teamsRaw, friendsRaw] = await Promise.all([
      type === "event" || type === "all"
        ? Event.find<EventLean>(
            {
              $and: [
                { $or: [{ title: rx }, { location: rx }] },
                {
                  $or: [
                    { createdByUserId: meId },
                    ...(allowedOrgIds.length > 0
                      ? [{ organizationId: { $in: allowedOrgIds } }]
                      : []),
                    ...(allowedEventIds.length > 0
                      ? [{ _id: { $in: allowedEventIds } }]
                      : []),
                  ],
                },
              ],
            },
            { _id: 1, title: 1, image: 1, date: 1, organizationId: 1 },
          )
            .sort({ date: 1 })
            .limit(perType)
            .populate({
              path: "organizationId",
              select: "_id name slug logo location",
              model: Organization,
            })
            .lean()
        : ([] as EventLean[]),

      type === "org" || type === "all"
        ? allowedOrgIds.length > 0
          ? Organization.find<OrgLean>(
              {
                $and: [
                  { _id: { $in: allowedOrgIds } },
                  { $or: [{ name: rx }, { location: rx }] },
                ],
              },
              { _id: 1, name: 1, slug: 1, logo: 1, location: 1 },
            )
              .limit(perType)
              .lean()
          : ([] as OrgLean[])
        : ([] as OrgLean[]),

      type === "team" || type === "all"
        ? Team.find<TeamLean>(
            {
              $and: [
                { $or: [{ name: rx }, { location: rx }] },
                {
                  $or: [
                    { ownerId: meId },
                    ...(allowedTeamIds.length > 0
                      ? [{ _id: { $in: allowedTeamIds } }]
                      : []),
                  ],
                },
              ],
            },
            { _id: 1, name: 1, location: 1, logo: 1 },
          )
            .limit(perType)
            .lean()
        : ([] as TeamLean[]),

      // Friends only exist in dashboard scope, and only accepted friendships
      type === "friend" || type === "all"
        ? (async (): Promise<FriendLean[]> => {
            const rels = (await Friendship.find(
              {
                status: "accepted",
                $or: [{ requesterId: meId }, { recipientId: meId }],
              },
              { _id: 0, requesterId: 1, recipientId: 1 },
            ).lean()) as unknown as Array<{
              requesterId: Types.ObjectId;
              recipientId: Types.ObjectId;
            }>;

            const friendIds = uniqObjectIds(
              rels
                .map((r) =>
                  String(r.requesterId) === String(meId)
                    ? r.recipientId
                    : r.requesterId,
                )
                .filter(Boolean),
            );

            if (friendIds.length === 0) return [];

            const raw = await User.find(
              {
                _id: { $in: friendIds },
                $or: [
                  { username: rx },
                  { email: rx },
                  { firstName: rx },
                  { lastName: rx },
                  { jobTitle: rx },
                  { company: rx },
                ],
              },
              {
                _id: 1,
                username: 1,
                email: 1,
                image: 1,
                firstName: 1,
                lastName: 1,
                jobTitle: 1,
                company: 1,
              },
            )
              .limit(perType)
              .lean();

            return raw as unknown as FriendLean[];
          })()
        : ([] as FriendLean[]),
    ]);

    const toEvent = (e: EventLean): SearchItemEvent => {
      const org =
        e.organizationId && typeof e.organizationId === "object"
          ? (e.organizationId as OrgLean)
          : null;

      return {
        id: String(e._id),
        type: "event",
        title: e.title,
        subtitle: org?.name || "",
        orgName: org?.name || null,
        date: safeIso(e.date),
        image: e.image ?? null,
        href: `/dashboard/events/${e._id}`, // ✅ dashboard
      };
    };

    const toOrg = (o: OrgLean): SearchItemOrg => ({
      id: String(o._id),
      type: "org",
      title: o.name,
      subtitle: o.location || "",
      image: o.logo ?? null,
      href: `/dashboard/organizations/${o._id}`, // ✅ dashboard
    });

    const toTeam = (t: TeamLean): SearchItemTeam => ({
      id: String(t._id),
      type: "team",
      title: t.name,
      subtitle: t.location || "",
      image: t.logo ?? null,
      href: `/dashboard/teams/${t._id}`, // ✅ dashboard
    });

    const friendDisplayName = (u: FriendLean) => {
      const first = (u.firstName || "").trim();
      const last = (u.lastName || "").trim();
      const full = `${first} ${last}`.trim();
      return full || u.username || u.email;
    };

    const friendSubtitle = (u: FriendLean) => {
      const job = (u.jobTitle || "").trim();
      const company = (u.company || "").trim();
      const jc = [job, company].filter(Boolean).join(" • ");
      return jc || u.email;
    };

    const toFriend = (u: FriendLean): SearchItemFriend => ({
      id: String(u._id),
      type: "friend",
      title: friendDisplayName(u),
      subtitle: friendSubtitle(u),
      image: u.image ?? null,
      href: `/dashboard/friends?open=${u._id}`,
    });

    const payload: SearchPayload = {
      success: true,
      results: {
        events: (eventsRaw as EventLean[]).map(toEvent),
        orgs: (orgsRaw as OrgLean[]).map(toOrg),
        teams: (teamsRaw as TeamLean[]).map(toTeam),
        friends: (friendsRaw as FriendLean[]).map(toFriend),
      },
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    console.error("[/api/search] error:", err);
    return NextResponse.json(
      { success: false, error: "Search failed" },
      { status: 500 },
    );
  }
}
