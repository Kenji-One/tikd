// src/app/api/events/route.ts
import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { Types } from "mongoose";

import Event from "@/models/Event";
import Organization from "@/models/Organization";
import Artist from "@/models/Artist";
import User from "@/models/User";
import OrgTeam from "@/models/OrgTeam";
import EventTeam from "@/models/EventTeam";
import { createNotification } from "@/lib/notifications";

/* ------------------------- Helpers ------------------------- */
const isObjectId = (val: string): boolean => /^[a-f\d]{24}$/i.test(val);

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * For preset-like city inputs, match common variants in stored addresses.
 * This prevents "New York City" filter from missing "NYC" / "New York, NY" / etc.
 */
function locationToRegex(input: string): RegExp {
  const v = input.trim().toLowerCase();

  if (v === "new york city" || v === "nyc" || v === "new york") {
    return /(new\s*york(\s*city)?|nyc|new\s*york,\s*ny|manhattan)/i;
  }

  if (v === "los angeles, ca" || v === "los angeles" || v === "la") {
    return /(los\s*angeles|los\s*angeles,\s*ca|\bla\b|\bla,\s*ca\b)/i;
  }

  // Brooklyn is usually present as-is in addresses
  if (v === "brooklyn, ny" || v === "brooklyn") {
    return /(brooklyn)/i;
  }

  // Generic: escape for safe substring match
  return new RegExp(escapeRegex(input), "i");
}

type SessionLike = {
  user?: {
    id?: string | null;
    email?: string | null;
    name?: string | null;
  } | null;
} | null;

type SessionIdentity = {
  userId: string;
  email: string;
  name: string;
};

type OrgHydrated = {
  _id: string;
  name: string;
  logo?: string;
  website?: string;
};

function getOrgIdFromEventLike(e: unknown): string | null {
  if (!e || typeof e !== "object") return null;
  const obj = e as Record<string, unknown>;
  const v = obj.organizationId;

  if (typeof v === "string") return v;
  if (v && typeof v === "object") {
    const maybe = v as { toString?: () => string };
    if (typeof maybe.toString === "function") return maybe.toString();
  }

  return null;
}

function hasOrganizationPayload(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const obj = e as Record<string, unknown>;
  return Boolean(obj.organization || obj.org);
}

async function getSessionIdentity(
  session: SessionLike,
): Promise<SessionIdentity> {
  const userId = String(session?.user?.id || "");

  let email = String(session?.user?.email || "")
    .trim()
    .toLowerCase();

  const sessionName = String(session?.user?.name || "").trim();

  if (!email) {
    const u = await User.findById(userId)
      .select("email firstName lastName username")
      .lean<{
        email?: string;
        firstName?: string;
        lastName?: string;
        username?: string;
      } | null>();

    email = String(u?.email || "")
      .trim()
      .toLowerCase();

    const derivedName =
      (u?.firstName || u?.lastName
        ? `${u?.firstName ?? ""} ${u?.lastName ?? ""}`.trim()
        : u?.username || "") || "";

    return {
      userId,
      email,
      name: sessionName || derivedName || "",
    };
  }

  return {
    userId,
    email,
    name: sessionName || "",
  };
}

async function assertCanCreateEventForOrg(
  organizationId: string,
  userId: string,
): Promise<{ ok: true; isOwner: boolean } | { ok: false; res: NextResponse }> {
  const org = await Organization.findById(organizationId)
    .select("_id ownerId")
    .lean<{ _id: Types.ObjectId; ownerId: Types.ObjectId } | null>();

  if (!org) {
    return {
      ok: false,
      res: NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      ),
    };
  }

  const isOwner = String(org.ownerId) === String(userId);
  if (isOwner) return { ok: true, isOwner: true };

  const admin = await OrgTeam.findOne({
    organizationId: org._id,
    userId,
    role: "admin",
    status: "active",
  })
    .select("_id")
    .lean();

  if (!admin) {
    return {
      ok: false,
      res: NextResponse.json(
        { error: "Forbidden: only organization admins can create events" },
        { status: 403 },
      ),
    };
  }

  return { ok: true, isOwner: false };
}

/* ------------------------- Schemas ------------------------- */
const artistInputSchema = z.object({
  name: z.string().min(1),
  image: z.string().url().optional(),
});

const mediaItemSchema = z.object({
  url: z.string().url(),
  type: z.enum(["image", "video"]),
  caption: z.string().max(120).optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

const bodySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),

  date: z.coerce.date(),
  endDate: z.coerce.date().optional(),

  duration: z
    .string()
    .regex(/^([0-1]\d|2[0-3]):([0-5]\d)$/)
    .optional(),

  minAge: z.number().int().min(0).max(99).optional(),

  location: z.string().min(1),
  image: z.string().url().optional(),

  // ✅ NEW
  media: z.array(mediaItemSchema).max(30).default([]),

  organizationId: z.string().length(24),

  categories: z.array(z.string()).default([]),
  coHosts: z.array(z.string().email()).default([]),
  promotionalTeamEmails: z.array(z.string().email()).default([]),
  promoters: z.array(z.string().email()).default([]),
  message: z.string().optional(),

  artists: z.array(artistInputSchema).default([]),

  status: z.enum(["published", "draft"]).default("draft"),
});

/* ------------------------- Cursor paging (PUBLIC) ------------------------- */
const publicPagingSchema = z.object({
  limit: z.coerce.number().int().min(1).max(60).default(30),
  cursor: z.string().optional(),

  sort: z.enum(["newest"]).optional(),
  when: z.enum(["today", "week", "month", "now"]).optional(),
  location: z.string().trim().min(1).max(120).optional(),
});

function decodeCursor(cursor: string): { d: string; id: string } | null {
  try {
    const raw = Buffer.from(cursor, "base64").toString("utf8");
    const obj = JSON.parse(raw) as { d?: unknown; id?: unknown };
    if (typeof obj?.d !== "string" || typeof obj?.id !== "string") return null;
    if (!isObjectId(obj.id)) return null;
    return { d: obj.d, id: obj.id };
  } catch {
    return null;
  }
}

function encodeCursor(d: Date, id: string): string {
  return Buffer.from(
    JSON.stringify({ d: d.toISOString(), id }),
    "utf8",
  ).toString("base64");
}

function utcStartOfDay(d: Date) {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

function addDays(d: Date, days: number) {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

function addHours(d: Date, hours: number) {
  return new Date(d.getTime() + hours * 60 * 60 * 1000);
}

/* --------------------------- GET --------------------------- */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const owned = searchParams.get("owned");

  const session = (await auth()) as SessionLike;

  if (owned === "1") {
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const me = String(session.user.id);

    const [eventTeamRows, orgAdminRows] = await Promise.all([
      EventTeam.find({ userId: me, status: "active" })
        .select("eventId")
        .lean<Array<{ eventId: Types.ObjectId }>>(),
      OrgTeam.find({ userId: me, role: "admin", status: "active" })
        .select("organizationId")
        .lean<Array<{ organizationId: Types.ObjectId }>>(),
    ]);

    const eventIds = eventTeamRows.map((r) => r.eventId);
    const orgIds = orgAdminRows.map((r) => r.organizationId);

    const filter = {
      $or: [
        { createdByUserId: me },
        ...(eventIds.length ? [{ _id: { $in: eventIds } }] : []),
        ...(orgIds.length ? [{ organizationId: { $in: orgIds } }] : []),
      ],
    };

    const events = await Event.find(filter).lean<unknown[]>();

    const orgIdsHydrate = Array.from(
      new Set(
        events.map((e) => getOrgIdFromEventLike(e) ?? "").filter(Boolean),
      ),
    );

    let orgById = new Map<string, OrgHydrated>();

    if (orgIdsHydrate.length) {
      const orgs = await Organization.find({ _id: { $in: orgIdsHydrate } })
        .select("name logo website")
        .lean<
          Array<{
            _id: Types.ObjectId;
            name?: string;
            logo?: string;
            website?: string;
          }>
        >();

      orgById = new Map(
        orgs.map((o) => [
          String(o._id),
          {
            _id: String(o._id),
            name: o?.name ?? "Organization",
            logo: o?.logo || undefined,
            website: o?.website || undefined,
          },
        ]),
      );
    }

    const hydrated = events.map((e) => {
      if (hasOrganizationPayload(e)) return e;

      const orgId = getOrgIdFromEventLike(e);
      const org = orgId ? orgById.get(orgId) : undefined;

      if (e && typeof e === "object") {
        return { ...(e as Record<string, unknown>), organization: org };
      }
      return e;
    });

    return NextResponse.json(hydrated);
  }

  const now = new Date();

  const wantsPaging =
    searchParams.has("limit") ||
    searchParams.has("cursor") ||
    searchParams.has("page") ||
    searchParams.has("sort") ||
    searchParams.has("when") ||
    searchParams.has("location");

  const parsed = publicPagingSchema.safeParse({
    limit: searchParams.get("limit") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
    sort: searchParams.get("sort") ?? undefined,
    when: searchParams.get("when") ?? undefined,
    location: searchParams.get("location") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const { limit, cursor, sort, when, location } = parsed.data;

  const sortNewest = sort === "newest";
  const sortSpec = sortNewest
    ? { date: -1 as const, _id: -1 as const }
    : { date: 1 as const, _id: 1 as const };

  const baseFilter: Record<string, unknown> = {
    status: "published",
  };

  let timeFilter: Record<string, unknown> = {
    $or: [
      { endDate: { $gte: now } },
      { endDate: { $exists: false }, date: { $gte: now } },
      { endDate: null, date: { $gte: now } },
    ],
  };

  if (when) {
    if (when === "now") {
      const soon = addHours(now, 2);
      timeFilter = {
        $or: [
          { $and: [{ date: { $lte: now } }, { endDate: { $gte: now } }] },
          { $and: [{ date: { $gte: now } }, { date: { $lte: soon } }] },
        ],
      };
    } else if (when === "today") {
      const start = utcStartOfDay(now);
      const end = addDays(start, 1);
      timeFilter = {
        $or: [
          { $and: [{ date: { $gte: start } }, { date: { $lt: end } }] },
          { $and: [{ date: { $lt: end } }, { endDate: { $gte: start } }] },
        ],
      };
    } else if (when === "week") {
      const end = addDays(now, 7);
      timeFilter = {
        $or: [
          { $and: [{ date: { $gte: now } }, { date: { $lte: end } }] },
          { $and: [{ date: { $lte: end } }, { endDate: { $gte: now } }] },
        ],
      };
    } else if (when === "month") {
      const end = addDays(now, 30);
      timeFilter = {
        $or: [
          { $and: [{ date: { $gte: now } }, { date: { $lte: end } }] },
          { $and: [{ date: { $lte: end } }, { endDate: { $gte: now } }] },
        ],
      };
    }
  }

  const locFilter: Record<string, unknown> | null = location
    ? { location: { $regex: locationToRegex(location) } }
    : null;

  let filter: Record<string, unknown> = {
    $and: [baseFilter, timeFilter, ...(locFilter ? [locFilter] : [])],
  };

  const decoded = cursor ? decodeCursor(cursor) : null;

  if (decoded) {
    const d = new Date(decoded.d);
    const id = new Types.ObjectId(decoded.id);

    const cursorClause = sortNewest
      ? { $or: [{ date: { $lt: d } }, { date: d, _id: { $lt: id } }] }
      : { $or: [{ date: { $gt: d } }, { date: d, _id: { $gt: id } }] };

    filter = { $and: [filter, cursorClause] };
  }

  // Paged mode
  const docs = await Event.find(filter)
    .sort(sortSpec)
    .limit(limit + 1)
    .lean<unknown[]>();

  const hasMore = docs.length > limit;
  const pageItems = (hasMore ? docs.slice(0, limit) : docs) as unknown[];

  const orgIds = Array.from(
    new Set(
      pageItems.map((e) => getOrgIdFromEventLike(e) ?? "").filter(Boolean),
    ),
  );

  let orgById = new Map<string, OrgHydrated>();

  if (orgIds.length) {
    const orgs = await Organization.find({ _id: { $in: orgIds } })
      .select("name logo website")
      .lean<
        Array<{
          _id: Types.ObjectId;
          name?: string;
          logo?: string;
          website?: string;
        }>
      >();

    orgById = new Map(
      orgs.map((o) => [
        String(o._id),
        {
          _id: String(o._id),
          name: o?.name ?? "Organization",
          logo: o?.logo || undefined,
          website: o?.website || undefined,
        },
      ]),
    );
  }

  const hydrated = pageItems.map((e) => {
    if (hasOrganizationPayload(e)) return e;

    const orgId = getOrgIdFromEventLike(e);
    const org = orgId ? orgById.get(orgId) : undefined;

    if (e && typeof e === "object") {
      return { ...(e as Record<string, unknown>), organization: org };
    }
    return e;
  });

  let nextCursor: string | null = null;

  if (hasMore && hydrated.length) {
    const last = hydrated[hydrated.length - 1] as Record<string, unknown>;
    const lastDate = last?.date;
    const lastId = last?._id;

    const d =
      typeof lastDate === "string"
        ? new Date(lastDate)
        : new Date(String(lastDate));
    const id = typeof lastId === "string" ? lastId : String(lastId);

    if (!Number.isNaN(d.getTime()) && isObjectId(id)) {
      nextCursor = encodeCursor(d, id);
    }
  }

  return NextResponse.json({ items: hydrated, nextCursor });
}

/* --------------------------- POST -------------------------- */
export async function POST(req: NextRequest) {
  const session = (await auth()) as SessionLike;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json: unknown = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  if (!isObjectId(parsed.data.organizationId)) {
    return NextResponse.json(
      { error: "Invalid organizationId" },
      { status: 400 },
    );
  }

  const perm = await assertCanCreateEventForOrg(
    parsed.data.organizationId,
    String(session.user.id),
  );
  if (!perm.ok) return perm.res;

  const identity = await getSessionIdentity(session);
  if (!identity.email) {
    return NextResponse.json(
      { error: "User email is required to create event team membership" },
      { status: 400 },
    );
  }

  const artistIds = await Promise.all(
    parsed.data.artists.map(async (a) => {
      const doc = await Artist.create({
        stageName: a.name,
        avatar: a.image ?? "",
      });
      return doc._id;
    }),
  );

  const durationMinutes = (() => {
    if (parsed.data.endDate) {
      const ms = parsed.data.endDate.getTime() - parsed.data.date.getTime();
      if (!Number.isFinite(ms) || ms <= 0) return undefined;
      return Math.round(ms / 60000);
    }

    if (parsed.data.duration) {
      const [h, m] = parsed.data.duration
        .split(":")
        .map((n) => parseInt(n, 10));
      return h * 60 + m;
    }

    return undefined;
  })();

  const event = await Event.create({
    title: parsed.data.title,
    description: parsed.data.description,

    date: parsed.data.date,
    endDate: parsed.data.endDate,
    durationMinutes,

    minAge: parsed.data.minAge,
    location: parsed.data.location,
    image: parsed.data.image,

    // ✅ NEW
    media: parsed.data.media,

    categories: parsed.data.categories,
    coHosts: parsed.data.coHosts,
    promotionalTeamEmails: parsed.data.promotionalTeamEmails,
    promoters: parsed.data.promoters,
    message: parsed.data.message,

    organizationId: parsed.data.organizationId,
    artists: artistIds,
    createdByUserId: session.user.id,

    status: parsed.data.status,
  });

  await createNotification({
    recipientUserId: identity.userId,
    type: "event.created",
    title: "Event created",
    message: `Your event “${parsed.data.title}” was created as a draft.`,
    href: `/dashboard/events/${String(event._id)}`,
  });

  await EventTeam.findOneAndUpdate(
    { eventId: event._id, email: identity.email },
    {
      $set: {
        email: identity.email,
        userId: identity.userId,
        name: identity.name,
        role: "admin",
        status: "active",
        temporaryAccess: false,
        invitedBy: identity.userId,
      },
      $unset: {
        expiresAt: "",
        inviteToken: "",
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return NextResponse.json({ _id: event._id }, { status: 201 });
}
