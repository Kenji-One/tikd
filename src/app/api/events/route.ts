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
  organizationId: z.string().length(24),

  categories: z.array(z.string()).default([]),
  coHosts: z.array(z.string().email()).default([]),
  promotionalTeamEmails: z.array(z.string().email()).default([]),
  promoters: z.array(z.string().email()).default([]),
  message: z.string().optional(),

  artists: z.array(artistInputSchema).default([]),

  status: z.enum(["published", "draft"]).default("draft"),
});

/* --------------------------- GET --------------------------- */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const owned = searchParams.get("owned");

  // ✅ Public events feed (published & upcoming/ongoing) does NOT require auth
  // ✅ Owned feed still requires auth
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

  // Default: published & upcoming/ongoing (PUBLIC)
  const now = new Date();

  const filter = {
    status: "published",
    $or: [
      { endDate: { $gte: now } },
      { endDate: { $exists: false }, date: { $gte: now } },
      { endDate: null, date: { $gte: now } },
    ],
  };

  const events = await Event.find(filter).lean<unknown[]>();

  const orgIds = Array.from(
    new Set(events.map((e) => getOrgIdFromEventLike(e) ?? "").filter(Boolean)),
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

/* --------------------------- POST -------------------------- */
export async function POST(req: Request) {
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
