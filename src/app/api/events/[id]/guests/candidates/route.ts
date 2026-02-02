import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";

import { auth } from "@/lib/auth";
import Event from "@/models/Event";
import Organization from "@/models/Organization";
import Ticket from "@/models/Ticket";
import User from "@/models/User";
import EventGuest from "@/models/EventGuest";
import type { Types } from "mongoose";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */
const isObjectId = (val: string): boolean => /^[a-f\d]{24}$/i.test(val);

type SessionLike = {
  user?: {
    id?: string | null;
  } | null;
} | null;

type EventPermLean = {
  _id: Types.ObjectId;
  organizationId?: Types.ObjectId | null;
  createdByUserId?: Types.ObjectId | null;
};

type OrgPermLean = {
  _id: Types.ObjectId;
  ownerId?: Types.ObjectId | null;
};

type ManualGuestLean = {
  userId?: Types.ObjectId | null;
};

async function ensureCanManageEvent(eventId: string, userId: string) {
  const event = await Event.findById(eventId)
    .select({ _id: 1, organizationId: 1, createdByUserId: 1 })
    .lean<EventPermLean | null>()
    .exec();

  if (!event) {
    return {
      ok: false as const,
      res: NextResponse.json({ error: "Event not found" }, { status: 404 }),
    };
  }

  const isCreator =
    event.createdByUserId != null &&
    String(event.createdByUserId) === String(userId);

  let isOrgOwner = false;

  if (event.organizationId) {
    const org = await Organization.findById(event.organizationId)
      .select({ _id: 1, ownerId: 1 })
      .lean<OrgPermLean | null>()
      .exec();

    isOrgOwner = org?.ownerId != null && String(org.ownerId) === String(userId);
  }

  if (!isCreator && !isOrgOwner) {
    return {
      ok: false as const,
      res: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true as const };
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type UserLean = {
  _id: Types.ObjectId;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
  image?: string | null;
};

function userDisplayName(u: UserLean) {
  const first = String(u?.firstName || "").trim();
  const last = String(u?.lastName || "").trim();
  const full = `${first} ${last}`.trim();
  return full || u?.username || u?.email || "User";
}

/* ------------------------------------------------------------------ */
/* GET /api/events/:id/guests/candidates?q=...                         */
/* ------------------------------------------------------------------ */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = (await auth()) as SessionLike;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;
  if (!isObjectId(eventId)) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }

  const perm = await ensureCanManageEvent(eventId, String(session.user.id));
  if (!perm.ok) return perm.res;

  const { searchParams } = new URL(req.url);
  const qRaw = (searchParams.get("q") || "").trim();
  const q = qRaw.slice(0, 120);

  // Exclude users who are already ticket-buyers (paid/scanned)
  const ticketOwners = (await Ticket.distinct("ownerId", {
    eventId,
    status: { $in: ["paid", "scanned"] },
  })) as Array<Types.ObjectId | string>;

  // Exclude users already added manually
  const manual = await EventGuest.find({ eventId, userId: { $ne: null } })
    .select("userId")
    .lean<ManualGuestLean[]>()
    .exec();

  const exclude = new Set<string>([
    ...ticketOwners.map((x) => String(x)),
    ...manual.map((x) => String(x.userId ?? "")),
  ]);

  const filter: Record<string, unknown> = {
    _id: { $nin: Array.from(exclude) },
  };

  if (q) {
    const rx = new RegExp(escapeRegExp(q), "i");
    filter.$or = [
      { email: rx },
      { username: rx },
      { phone: rx },
      { firstName: rx },
      { lastName: rx },
    ];
  }

  const users = await User.find(filter)
    .select("firstName lastName username email phone image")
    .sort({ createdAt: -1 })
    .limit(30)
    .lean<UserLean[]>()
    .exec();

  const result = users.map((u) => ({
    id: String(u._id),
    name: userDisplayName(u),
    email: u.email ?? "",
    phone: u.phone || undefined,
    avatarUrl: u.image || undefined,
  }));

  return NextResponse.json(result);
}
