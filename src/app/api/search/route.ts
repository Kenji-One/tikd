// src/app/api/search/route.ts
/* ------------------------------------------------------------------ *
 *  /api/search  – global search for events / organizations / teams / friends
 *  Query params:
 *    q=<string>                          (required, trimmed)
 *    type=event|org|team|friend|all      (default: all)
 *    limit=<1..20>                       (default: 6 per type)
 *  Returns:
 *    { success: true, results: { events:[], orgs:[], teams:[], friends:[] } }
 * ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";

import Event from "@/models/Event";
import Organization from "@/models/Organization";
import Team from "@/models/Team";
import User from "@/models/User";

import type { Types } from "mongoose";

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
  subtitle: string; // location or short descriptor
  image: string | null;
  href: string;
};

type SearchItemFriend = {
  id: string;
  type: "friend";
  title: string; // display name
  subtitle: string; // job/company or email
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

/* ---------- minimal lean projections (typed) ----------------------- */
type ObjId = Types.ObjectId | string;

interface OrgLean {
  _id: ObjId;
  name: string;
  slug?: string;
  logo?: string | null;
  city?: string | null;
}

interface EventLean {
  _id: ObjId;
  title: string;
  image?: string | null;
  date?: Date | string | null;
  location?: string | null;
  organizationId?: ObjId | OrgLean | null;
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
const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const type = (url.searchParams.get("type") || "all") as Kind;
    const limitParam = parseInt(url.searchParams.get("limit") || "6", 10);
    const perType = clamp(Number.isNaN(limitParam) ? 6 : limitParam, 1, 20);

    if (!q) {
      const empty: SearchPayload = {
        success: true,
        results: { events: [], orgs: [], teams: [], friends: [] },
      };
      return NextResponse.json(empty, { status: 200 });
    }

    // Safe regex (escape special chars)
    const pattern = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(pattern, "i");

    const [eventsRaw, orgsRaw, teamsRaw, friendsRaw] = await Promise.all([
      type === "event" || type === "all"
        ? Event.find<EventLean>(
            { $or: [{ title: rx }, { location: rx }] },
            { _id: 1, title: 1, image: 1, date: 1, organizationId: 1 },
          )
            .sort({ date: 1 })
            .limit(perType)
            .populate({
              path: "organizationId",
              select: "_id name slug logo city",
              model: Organization,
            })
            .lean()
        : ([] as EventLean[]),

      type === "org" || type === "all"
        ? Organization.find<OrgLean>(
            { $or: [{ name: rx }, { city: rx }] },
            { _id: 1, name: 1, slug: 1, logo: 1, city: 1 },
          )
            .limit(perType)
            .lean()
        : ([] as OrgLean[]),

      type === "team" || type === "all"
        ? Team.find<TeamLean>(
            { $or: [{ name: rx }, { location: rx }] },
            { _id: 1, name: 1, location: 1, logo: 1 },
          )
            .limit(perType)
            .lean()
        : ([] as TeamLean[]),

      type === "friend" || type === "all"
        ? User.find<FriendLean>(
            {
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
            .lean()
        : ([] as FriendLean[]),
    ]);

    // Uniform client shape + hrefs
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
        date: e.date ? new Date(e.date).toISOString() : null,
        image: e.image ?? null,
        href: `/events/${e._id}`,
      };
    };

    const toOrg = (o: OrgLean): SearchItemOrg => ({
      id: String(o._id),
      type: "org",
      title: o.name,
      subtitle: o.city || "",
      image: o.logo ?? null,
      href: `/organizations/${o.slug || o._id}`,
    });

    const toTeam = (t: TeamLean): SearchItemTeam => ({
      id: String(t._id),
      type: "team",
      title: t.name,
      subtitle: t.location || "",
      image: t.logo ?? null,
      // ✅ you just created /api/teams/[teamId], but UI href should be page route.
      // If you don't have a /teams/[id] page yet, keep it consistent with your dashboard paths.
      href: `/dashboard/teams/${t._id}`,
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

/* Index suggestions (create in Mongo/Atlas for perf)
  db.events.createIndex({ title: "text", location: "text", date: 1 })
  db.organizations.createIndex({ name: "text", city: "text" })
  db.teams.createIndex({ name: "text", location: "text" })
  db.users.createIndex({ username: "text", email: "text", firstName: "text", lastName: "text", jobTitle: "text", company: "text" })
*/
