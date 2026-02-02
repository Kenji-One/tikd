// src/app/api/events/[id]/guests/route.ts
import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";

import { auth } from "@/lib/auth";
import Event from "@/models/Event";
import Organization from "@/models/Organization";
import Ticket from "@/models/Ticket";
import EventGuest from "@/models/EventGuest";
import User from "@/models/User";
import type { Types } from "mongoose";

/* ------------------------------------------------------------------ */
/* Config                                                             */
/* ------------------------------------------------------------------ */
export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */
const isObjectId = (val: string): boolean => /^[a-f\d]{24}$/i.test(val);

type SessionLike = {
  user?: { id?: string | null } | null;
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

type GuestStatus = "checked_in" | "pending_arrival";

type GuestRow = {
  id: string;

  orderNumber: string;
  fullName: string;
  handle?: string;
  igFollowers?: number;
  gender?: "Male" | "Female";
  age?: number;
  phone?: string;
  email?: string;

  amount: number;
  ticketType: string;
  status: GuestStatus;

  referrer?: string;
  quantity?: number;
  dateTimeISO?: string;

  source: "ticket" | "manual";
  canRemove?: boolean;
};

function toGuestStatusFromTicketStatus(
  s: string | null | undefined,
): GuestStatus {
  // your PATCH route uses: checked_in => scanned, pending_arrival => paid
  return s === "scanned" ? "checked_in" : "pending_arrival";
}

function safeStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function safeNum(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function last4(hexish: string): string {
  const s = String(hexish || "");
  return s.length >= 4 ? s.slice(-4) : s;
}

function buildOrderNumber(prefix: string, id: string) {
  // UI expects "#1527"-like strings; we’ll generate stable-ish values from ObjectIds
  return `${prefix}${last4(id)}`;
}

function pickFullName(u: {
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
}) {
  const fn = safeStr(u.firstName).trim();
  const ln = safeStr(u.lastName).trim();
  const name = `${fn} ${ln}`.trim();
  if (name) return name;
  const un = safeStr(u.username).trim();
  if (un) return un;
  return safeStr(u.email).trim() || "Guest";
}

/* ------------------------------------------------------------------ */
/* GET /api/events/:id/guests                                          */
/* Returns: GuestRow[]                                                 */
/* ------------------------------------------------------------------ */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = (await auth()) as SessionLike;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;
  if (!isObjectId(eventId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const perm = await ensureCanManageEvent(eventId, String(session.user.id));
  if (!perm.ok) return perm.res;

  // 1) Tickets (paid/scanned) -> grouped into "order rows"
  const tickets = await Ticket.find({
    eventId,
    status: { $in: ["paid", "scanned"] },
  })
    .select({
      _id: 1,
      ownerId: 1,
      orderId: 1,
      ticketType: 1,
      ticketTypeLabel: 1,
      price: 1,
      status: 1,
      createdAt: 1,
      updatedAt: 1,
    })
    .populate("ownerId", "firstName lastName username email phone")
    .lean<
      Array<{
        _id: Types.ObjectId;
        ownerId:
          | {
              _id: Types.ObjectId;
              firstName?: string;
              lastName?: string;
              username?: string;
              email?: string;
              phone?: string;
            }
          | Types.ObjectId;
        orderId?: Types.ObjectId | null;
        ticketType?: string;
        ticketTypeLabel?: string;
        price?: number;
        status?: string;
        createdAt?: Date;
        updatedAt?: Date;
      }>
    >()
    .exec();

  type GroupKey = string; // `${ownerId}:${orderIdOrNone}`
  const groups = new Map<
    GroupKey,
    {
      firstTicketId: string;
      owner: {
        firstName?: string;
        lastName?: string;
        username?: string;
        email?: string;
        phone?: string;
      };
      ownerIdStr: string;
      orderIdStr: string | null;
      prices: number[];
      statuses: GuestStatus[];
      ticketLabels: string[];
      latestISO?: string;
      quantity: number;
    }
  >();

  for (const t of tickets) {
    const ownerObj =
      typeof t.ownerId === "object" && t.ownerId != null && "_id" in t.ownerId
        ? (t.ownerId as {
            _id: Types.ObjectId;
            firstName?: string;
            lastName?: string;
            username?: string;
            email?: string;
            phone?: string;
          })
        : null;

    if (!ownerObj) continue;

    const ownerIdStr = String(ownerObj._id);
    const orderIdStr = t.orderId ? String(t.orderId) : null;

    const key: GroupKey = `${ownerIdStr}:${orderIdStr ?? "none"}`;

    const labelRaw = safeStr(t.ticketTypeLabel).trim();
    const legacy = safeStr(t.ticketType).trim();
    const label = labelRaw || legacy || "Ticket";

    const price = typeof t.price === "number" ? t.price : 0;
    const status = toGuestStatusFromTicketStatus(t.status);

    const updated =
      t.updatedAt instanceof Date
        ? t.updatedAt.toISOString()
        : t.createdAt instanceof Date
          ? t.createdAt.toISOString()
          : undefined;

    const prev = groups.get(key);
    if (!prev) {
      groups.set(key, {
        firstTicketId: String(t._id),
        owner: {
          firstName: ownerObj.firstName,
          lastName: ownerObj.lastName,
          username: ownerObj.username,
          email: ownerObj.email,
          phone: ownerObj.phone,
        },
        ownerIdStr,
        orderIdStr,
        prices: [price],
        statuses: [status],
        ticketLabels: [label],
        latestISO: updated,
        quantity: 1,
      });
    } else {
      prev.prices.push(price);
      prev.statuses.push(status);
      prev.ticketLabels.push(label);
      prev.quantity += 1;

      // Keep latest time
      if (updated && (!prev.latestISO || updated > prev.latestISO)) {
        prev.latestISO = updated;
      }
    }
  }

  const ticketRows: GuestRow[] = Array.from(groups.values()).map((g) => {
    const amount = g.prices.reduce((a, b) => a + b, 0);

    // checked_in if ANY scanned in the group
    const status: GuestStatus = g.statuses.includes("checked_in")
      ? "checked_in"
      : "pending_arrival";

    const uniqueLabels = Array.from(new Set(g.ticketLabels.filter(Boolean)));
    const ticketType =
      uniqueLabels.length === 0
        ? "Ticket"
        : uniqueLabels.length === 1
          ? uniqueLabels[0]
          : "Multiple";

    const fullName = pickFullName(g.owner);
    const handle = g.owner.username ? `@${g.owner.username}` : undefined;

    const orderNumber = g.orderIdStr
      ? buildOrderNumber("#", g.orderIdStr)
      : buildOrderNumber("#", g.firstTicketId);

    return {
      id: g.firstTicketId,
      orderNumber,
      fullName,
      handle,
      phone: safeStr(g.owner.phone) || undefined,
      email: safeStr(g.owner.email) || undefined,
      amount,
      ticketType,
      status,
      quantity: g.quantity,
      dateTimeISO: g.latestISO,
      source: "ticket",
      canRemove: false,
    };
  });

  // 2) Manual guests (EventGuest docs) -> direct rows
  const manualGuests = await EventGuest.find({ eventId })
    .select({
      _id: 1,
      fullName: 1,
      name: 1,
      email: 1,
      phone: 1,
      status: 1,
      createdAt: 1,
      updatedAt: 1,
    })
    .lean<
      Array<{
        _id: Types.ObjectId;
        fullName?: unknown;
        name?: unknown;
        email?: unknown;
        phone?: unknown;
        status?: unknown;
        createdAt?: Date;
        updatedAt?: Date;
      }>
    >()
    .exec();

  const manualRows: GuestRow[] = manualGuests.map((m) => {
    const name =
      safeStr(m.fullName).trim() || safeStr(m.name).trim() || "Guest";

    const rawStatus = safeStr(m.status).trim();
    const status: GuestStatus =
      rawStatus === "checked_in" ? "checked_in" : "pending_arrival";

    const updated =
      m.updatedAt instanceof Date
        ? m.updatedAt.toISOString()
        : m.createdAt instanceof Date
          ? m.createdAt.toISOString()
          : undefined;

    return {
      id: String(m._id),
      orderNumber: buildOrderNumber("#M", String(m._id)),
      fullName: name,
      phone: safeStr(m.phone) || undefined,
      email: safeStr(m.email) || undefined,
      amount: 0,
      ticketType: "Manual",
      status,
      quantity: 1,
      dateTimeISO: updated,
      source: "manual",
      canRemove: true,
    };
  });

  const merged = [...ticketRows, ...manualRows];

  // Sort newest first (fallback stable)
  merged.sort((a, b) => {
    const ta = a.dateTimeISO ?? "";
    const tb = b.dateTimeISO ?? "";
    if (ta === tb) return a.orderNumber.localeCompare(b.orderNumber);
    return tb.localeCompare(ta);
  });

  return NextResponse.json(merged);
}

/* ------------------------------------------------------------------ */
/* POST /api/events/:id/guests                                         */
/* Body: { userIds: string[] }                                         */
/* Adds manual guests based on existing users                           */
/* ------------------------------------------------------------------ */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = (await auth()) as SessionLike;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;
  if (!isObjectId(eventId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const perm = await ensureCanManageEvent(eventId, String(session.user.id));
  if (!perm.ok) return perm.res;

  const body = (await req.json().catch(() => null)) as {
    userIds?: unknown;
  } | null;

  const userIdsRaw = body?.userIds;
  const userIds = Array.isArray(userIdsRaw)
    ? userIdsRaw.filter((x) => typeof x === "string")
    : [];

  if (!userIds.length || userIds.some((id) => !isObjectId(id))) {
    return NextResponse.json({ error: "Invalid userIds" }, { status: 400 });
  }

  // Fetch users (so we can snapshot name/email/phone into EventGuest)
  const users = await User.find({ _id: { $in: userIds } })
    .select({
      _id: 1,
      firstName: 1,
      lastName: 1,
      username: 1,
      email: 1,
      phone: 1,
    })
    .lean<
      Array<{
        _id: Types.ObjectId;
        firstName?: string;
        lastName?: string;
        username?: string;
        email?: string;
        phone?: string;
      }>
    >()
    .exec();

  // Create manual guests; we’ll avoid duplicates by checking existing EventGuest docs by email
  // (If your EventGuest schema has a better unique key like userId, you can switch to that.)
  const emails = users.map((u) => safeStr(u.email)).filter(Boolean);

  const existing = await EventGuest.find({
    eventId,
    email: { $in: emails },
  })
    .select({ email: 1 })
    .lean<Array<{ email?: unknown }>>()
    .exec();

  const existingSet = new Set(existing.map((e) => safeStr(e.email)));

  const toInsert = users
    .filter((u) => {
      const email = safeStr(u.email);
      return email && !existingSet.has(email);
    })
    .map((u) => {
      const fullName = pickFullName(u);
      return {
        eventId,
        fullName,
        email: safeStr(u.email),
        phone: safeStr(u.phone),
        status: "pending_arrival" as const,
      };
    });

  if (toInsert.length) {
    await EventGuest.insertMany(toInsert, { ordered: false }).catch(() => {
      // ignore duplicate insert races; GET will reflect final state
    });
  }

  return NextResponse.json({ ok: true });
}
