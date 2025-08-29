/* ------------------------------------------------------------------ *
 *  /api/search  – global search for events / artists / organizations
 *  Query params:
 *    q=<string>                (required, trimmed)
 *    type=event|artist|org|all (default: all)
 *    limit=<1..20>             (default: 6 per type)
 *  Returns:
 *    { success: true, results: { events:[], artists:[], orgs:[] } }
 * ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";
import Event from "@/models/Event";
import Artist from "@/models/Artist";
import Organization from "@/models/Organization";
import type { Types } from "mongoose";

/* ---------- shared result item types (client shape) ---------------- */
type SearchItemEvent = {
  id: string;
  type: "event";
  title: string;
  subtitle: string;
  date: string | null;
  image: string | null;
  href: string;
};
type SearchItemArtist = {
  id: string;
  type: "artist";
  title: string;
  subtitle: string;
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

type SearchPayload = {
  success: true;
  results: {
    events: SearchItemEvent[];
    artists: SearchItemArtist[];
    orgs: SearchItemOrg[];
  };
};

type Kind = "event" | "artist" | "org" | "all";

/* ---------- minimal lean projections (typed) ----------------------- */
type ObjId = Types.ObjectId | string;

interface EventLean {
  _id: ObjId;
  title: string;
  slug?: string;
  images?: { cover?: string | null } | null;
  venue?: { name?: string | null } | null;
  location?: { city?: string | null } | null;
  startsAt?: Date | string | null;
}

interface ArtistLean {
  _id: ObjId;
  name: string;
  slug?: string;
  avatar?: string | null;
  genres?: string[] | null;
}

interface OrgLean {
  _id: ObjId;
  name: string;
  slug?: string;
  logo?: string | null;
  city?: string | null;
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
        results: { events: [], artists: [], orgs: [] },
      };
      return NextResponse.json(empty, { status: 200 });
    }

    // Safe regex (escape special chars)
    const pattern = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(pattern, "i");

    const [eventsRaw, artistsRaw, orgsRaw] = await Promise.all([
      type === "event" || type === "all"
        ? Event.find<EventLean>(
            {
              $or: [
                { title: rx },
                { subtitle: rx },
                { "venue.name": rx },
                { "location.city": rx },
              ],
            },
            {
              _id: 1,
              title: 1,
              slug: 1,
              "images.cover": 1,
              "venue.name": 1,
              "location.city": 1,
              startsAt: 1,
            }
          )
            .sort({ startsAt: 1 })
            .limit(perType)
            .lean()
        : ([] as EventLean[]),
      type === "artist" || type === "all"
        ? Artist.find<ArtistLean>(
            { $or: [{ name: rx }, { genres: rx }] },
            { _id: 1, name: 1, slug: 1, avatar: 1, genres: 1 }
          )
            .limit(perType)
            .lean()
        : ([] as ArtistLean[]),
      type === "org" || type === "all"
        ? Organization.find<OrgLean>(
            { $or: [{ name: rx }, { city: rx }] },
            { _id: 1, name: 1, slug: 1, logo: 1, city: 1 }
          )
            .limit(perType)
            .lean()
        : ([] as OrgLean[]),
    ]);

    // Uniform client shape + hrefs
    const toEvent = (e: EventLean): SearchItemEvent => ({
      id: String(e._id),
      type: "event",
      title: e.title,
      subtitle: e.venue?.name || e.location?.city || "",
      date: e.startsAt ? new Date(e.startsAt).toISOString() : null,
      image: e.images?.cover ?? null,
      href: `/events/${e.slug || e._id}`,
    });

    const toArtist = (a: ArtistLean): SearchItemArtist => ({
      id: String(a._id),
      type: "artist",
      title: a.name,
      subtitle: Array.isArray(a.genres) ? a.genres.slice(0, 2).join(" • ") : "",
      image: a.avatar ?? null,
      href: `/artists/${a.slug || a._id}`,
    });

    const toOrg = (o: OrgLean): SearchItemOrg => ({
      id: String(o._id),
      type: "org",
      title: o.name,
      subtitle: o.city || "",
      image: o.logo ?? null,
      href: `/organizations/${o.slug || o._id}`,
    });

    const payload: SearchPayload = {
      success: true,
      results: {
        events: (eventsRaw as EventLean[]).map(toEvent),
        artists: (artistsRaw as ArtistLean[]).map(toArtist),
        orgs: (orgsRaw as OrgLean[]).map(toOrg),
      },
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error("[/api/search] error:", err);
    return NextResponse.json(
      { success: false, error: "Search failed" },
      { status: 500 }
    );
  }
}

/* Index hints (create in Mongo/Atlas for perf)
  db.events.createIndex({ title: "text", subtitle: "text", "venue.name": "text", "location.city": "text" })
  db.artists.createIndex({ name: "text", genres: "text" })
  db.organizations.createIndex({ name: "text", city: "text" })
*/
