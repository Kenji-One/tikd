/* ------------------------------------------------------------------ *
 *  /api/search  – global search for events / artists / organizations
 *  Query params:
 *    q=<string>                (required, trimmed)
 *    type=event|artist|org|all (default: all)
 *    limit=<1..20>             (default: 6 per type)
 *  Returns:
 *    { success: true, results: { events:[], artists:[], orgs:[] } }
 *
 *  Notes:
 *   - Uses case-insensitive regex (fallback) and tight projection.
 *   - Add proper text/Atlas indexes in production (see notes below).
 * ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";

import Event from "@/models/Event";
import Artist from "@/models/Artist";
import Organization from "@/models/Organization";

type Kind = "event" | "artist" | "org" | "all";

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const type = (url.searchParams.get("type") || "all") as Kind;
    const limitParam = parseInt(url.searchParams.get("limit") || "6", 10);
    const perType = clamp(isNaN(limitParam) ? 6 : limitParam, 1, 20);

    if (!q) {
      return NextResponse.json(
        { success: true, results: { events: [], artists: [], orgs: [] } },
        { status: 200 }
      );
    }

    // Very safe regex (escape special chars)
    const pattern = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(pattern, "i");

    const [events, artists, orgs] = await Promise.all([
      type === "event" || type === "all"
        ? Event.find(
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
        : Promise.resolve([]),
      type === "artist" || type === "all"
        ? Artist.find(
            { $or: [{ name: rx }, { genres: rx }] },
            { _id: 1, name: 1, slug: 1, avatar: 1, genres: 1 }
          )
            .limit(perType)
            .lean()
        : Promise.resolve([]),
      type === "org" || type === "all"
        ? Organization.find(
            { $or: [{ name: rx }, { city: rx }] },
            { _id: 1, name: 1, slug: 1, logo: 1, city: 1 }
          )
            .limit(perType)
            .lean()
        : Promise.resolve([]),
    ]);

    // Uniform client shape + hrefs
    const toEvent = (e: any) => ({
      id: String(e._id),
      type: "event" as const,
      title: e.title,
      subtitle: e.venue?.name || e.location?.city || "",
      date: e.startsAt ? new Date(e.startsAt).toISOString() : null,
      image: e.images?.cover || null,
      href: `/events/${e.slug || e._id}`,
    });

    const toArtist = (a: any) => ({
      id: String(a._id),
      type: "artist" as const,
      title: a.name,
      subtitle: Array.isArray(a.genres) ? a.genres.slice(0, 2).join(" • ") : "",
      image: a.avatar || null,
      href: `/artists/${a.slug || a._id}`,
    });

    const toOrg = (o: any) => ({
      id: String(o._id),
      type: "org" as const,
      title: o.name,
      subtitle: o.city || "",
      image: o.logo || null,
      href: `/organizations/${o.slug || o._id}`,
    });

    return NextResponse.json({
      success: true,
      results: {
        events: events.map(toEvent),
        artists: artists.map(toArtist),
        orgs: orgs.map(toOrg),
      },
    });
  } catch (err) {
    console.error("[/api/search] error:", err);
    return NextResponse.json(
      { success: false, error: "Search failed" },
      { status: 500 }
    );
  }
}

/* --------------------------------- Indexes (recommend) ---------------------
  db.events.createIndex({ title: "text", subtitle: "text", "venue.name": "text", "location.city": "text" })
  db.artists.createIndex({ name: "text", genres: "text" })
  db.organizations.createIndex({ name: "text", city: "text" })

  // Or use Atlas Search (preferred) for scoring/fuzziness.
----------------------------------------------------------------------------- */
