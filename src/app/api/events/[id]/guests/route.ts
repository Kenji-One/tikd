import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";

import { auth } from "@/lib/auth";
import {
  requireEventGuestManageAccess,
  requireEventGuestViewAccess,
} from "@/lib/eventAccess";

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
  user?: { id?: string | null; email?: string | null } | null;
} | null;

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
  return s === "scanned" ? "checked_in" : "pending_arrival";
}

function safeStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function last4(hexish: string): string {
  const s = String(hexish || "");
  return s.length >= 4 ? s.slice(-4) : s;
}

function buildOrderNumber(prefix: string, id: string) {
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

function normalizeEmail(s: string) {
  return safeStr(s).trim().toLowerCase();
}

function normalizePhone(s: string) {
  const raw = safeStr(s).trim();
  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return "";
  return hasPlus ? `+${digits}` : digits;
}

function isEmailLike(s: string) {
  const v = safeStr(s).trim();
  if (!v.includes("@")) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function isPhoneLike(s: string) {
  const digits = normalizePhone(s).replace(/^\+/, "");
  return digits.length >= 7 && digits.length <= 15;
}

/* ------------------------------------------------------------------ */
/* GET /api/events/:id/guests                                         */
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

  const access = await requireEventGuestViewAccess({
    eventId,
    userId: String(session.user.id),
    email: session.user.email ?? undefined,
  });

  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

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

  type GroupKey = string;
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

  for (const ticket of tickets) {
    const ownerObj =
      typeof ticket.ownerId === "object" &&
      ticket.ownerId != null &&
      "_id" in ticket.ownerId
        ? (ticket.ownerId as {
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
    const orderIdStr = ticket.orderId ? String(ticket.orderId) : null;
    const key: GroupKey = `${ownerIdStr}:${orderIdStr ?? "none"}`;

    const labelRaw = safeStr(ticket.ticketTypeLabel).trim();
    const legacy = safeStr(ticket.ticketType).trim();
    const label = labelRaw || legacy || "Ticket";

    const price = typeof ticket.price === "number" ? ticket.price : 0;
    const status = toGuestStatusFromTicketStatus(ticket.status);

    const updated =
      ticket.updatedAt instanceof Date
        ? ticket.updatedAt.toISOString()
        : ticket.createdAt instanceof Date
          ? ticket.createdAt.toISOString()
          : undefined;

    const prev = groups.get(key);
    if (!prev) {
      groups.set(key, {
        firstTicketId: String(ticket._id),
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

      if (updated && (!prev.latestISO || updated > prev.latestISO)) {
        prev.latestISO = updated;
      }
    }
  }

  const ticketRows: GuestRow[] = Array.from(groups.values()).map((group) => {
    const amount = group.prices.reduce((a, b) => a + b, 0);

    const status: GuestStatus = group.statuses.includes("checked_in")
      ? "checked_in"
      : "pending_arrival";

    const uniqueLabels = Array.from(
      new Set(group.ticketLabels.filter(Boolean)),
    );
    const ticketType =
      uniqueLabels.length === 0
        ? "Ticket"
        : uniqueLabels.length === 1
          ? uniqueLabels[0]
          : "Multiple";

    const fullName = pickFullName(group.owner);
    const handle = group.owner.username
      ? `@${group.owner.username}`
      : undefined;

    const orderNumber = group.orderIdStr
      ? buildOrderNumber("#", group.orderIdStr)
      : buildOrderNumber("#", group.firstTicketId);

    return {
      id: group.firstTicketId,
      orderNumber,
      fullName,
      handle,
      phone: safeStr(group.owner.phone) || undefined,
      email: safeStr(group.owner.email) || undefined,
      amount,
      ticketType,
      status,
      quantity: group.quantity,
      dateTimeISO: group.latestISO,
      source: "ticket",
      canRemove: false,
    };
  });

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

  const manualRows: GuestRow[] = manualGuests.map((guest) => {
    const name =
      safeStr(guest.fullName).trim() || safeStr(guest.name).trim() || "Guest";

    const rawStatus = safeStr(guest.status).trim();
    const status: GuestStatus =
      rawStatus === "checked_in" ? "checked_in" : "pending_arrival";

    const updated =
      guest.updatedAt instanceof Date
        ? guest.updatedAt.toISOString()
        : guest.createdAt instanceof Date
          ? guest.createdAt.toISOString()
          : undefined;

    return {
      id: String(guest._id),
      orderNumber: buildOrderNumber("#M", String(guest._id)),
      fullName: name,
      phone: safeStr(guest.phone) || undefined,
      email: safeStr(guest.email) || undefined,
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

  merged.sort((a, b) => {
    const ta = a.dateTimeISO ?? "";
    const tb = b.dateTimeISO ?? "";
    if (ta === tb) return a.orderNumber.localeCompare(b.orderNumber);
    return tb.localeCompare(ta);
  });

  return NextResponse.json(merged);
}

/* ------------------------------------------------------------------ */
/* POST /api/events/:id/guests                                        */
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

  const access = await requireEventGuestManageAccess({
    eventId,
    userId: String(session.user.id),
    email: session.user.email ?? undefined,
  });

  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    userIds?: unknown;
    guests?: unknown;
  } | null;

  const userIdsRaw = body?.userIds;
  const guestsRaw = body?.guests;

  const userIds = Array.isArray(userIdsRaw)
    ? userIdsRaw.filter((x) => typeof x === "string")
    : [];

  const guests = Array.isArray(guestsRaw)
    ? guestsRaw
        .filter((x) => x && typeof x === "object")
        .map((x) => x as Record<string, unknown>)
    : [];

  const wantsUserIds = userIds.length > 0;
  const wantsGuests = guests.length > 0;

  if (!wantsUserIds && !wantsGuests) {
    return NextResponse.json(
      { error: "Provide userIds[] or guests[]" },
      { status: 400 },
    );
  }

  if (wantsGuests) {
    const prepared = guests
      .map((g) => {
        const fullName = safeStr(g.fullName).trim().replace(/\s+/g, " ");
        const emailRaw = safeStr(g.email);
        const phoneRaw = safeStr(g.phone);

        const email = isEmailLike(emailRaw) ? normalizeEmail(emailRaw) : "";
        const phone = isPhoneLike(phoneRaw) ? normalizePhone(phoneRaw) : "";

        const validName = fullName.length >= 2 ? fullName : "";
        const finalName = validName || (email ? "Guest" : phone ? "Guest" : "");

        if (!finalName && !email && !phone) return null;

        return {
          eventId,
          userId: null,
          fullName: finalName || "Guest",
          email,
          phone,
          status: "pending_arrival" as const,
        };
      })
      .filter(Boolean) as Array<{
      eventId: string;
      userId: null;
      fullName: string;
      email: string;
      phone: string;
      status: "pending_arrival";
    }>;

    if (!prepared.length) {
      return NextResponse.json(
        { error: "No valid guests provided" },
        { status: 400 },
      );
    }

    const emails = prepared.map((g) => g.email).filter(Boolean);
    const phones = prepared.map((g) => g.phone).filter(Boolean);
    const names = prepared.map((g) => g.fullName).filter(Boolean);

    const existing = await EventGuest.find({
      eventId,
      $or: [
        emails.length ? { email: { $in: emails } } : undefined,
        phones.length ? { phone: { $in: phones } } : undefined,
        names.length ? { fullName: { $in: names } } : undefined,
      ].filter(Boolean) as Record<string, unknown>[],
    })
      .select({ email: 1, phone: 1, fullName: 1 })
      .lean<Array<{ email?: unknown; phone?: unknown; fullName?: unknown }>>()
      .exec();

    const existingEmail = new Set(
      existing.map((e) => normalizeEmail(safeStr(e.email))).filter(Boolean),
    );
    const existingPhone = new Set(
      existing.map((e) => normalizePhone(safeStr(e.phone))).filter(Boolean),
    );
    const existingName = new Set(
      existing
        .map((e) => safeStr(e.fullName).trim().toLowerCase())
        .filter(Boolean),
    );

    const toInsert = prepared.filter((g) => {
      const e = normalizeEmail(g.email);
      const p = normalizePhone(g.phone);
      const n = g.fullName.trim().toLowerCase();

      if (e && existingEmail.has(e)) return false;
      if (!e && p && existingPhone.has(p)) return false;
      if (!e && !p && n && existingName.has(n)) return false;
      return true;
    });

    if (!toInsert.length) {
      return NextResponse.json({ ok: true });
    }

    await EventGuest.insertMany(toInsert, { ordered: false }).catch(() => {
      // ignore duplicate insert races
    });

    return NextResponse.json({ ok: true });
  }

  if (!userIds.length || userIds.some((id) => !isObjectId(id))) {
    return NextResponse.json({ error: "Invalid userIds" }, { status: 400 });
  }

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

  const emails = users
    .map((u) => normalizeEmail(safeStr(u.email)))
    .filter(Boolean);

  const existing = await EventGuest.find({
    eventId,
    email: { $in: emails },
  })
    .select({ email: 1 })
    .lean<Array<{ email?: unknown }>>()
    .exec();

  const existingSet = new Set(
    existing.map((e) => normalizeEmail(safeStr(e.email))).filter(Boolean),
  );

  const toInsert = users
    .filter((u) => {
      const email = normalizeEmail(safeStr(u.email));
      return email && !existingSet.has(email);
    })
    .map((u) => {
      const fullName = pickFullName(u);
      return {
        eventId,
        fullName,
        email: normalizeEmail(safeStr(u.email)),
        phone: normalizePhone(safeStr(u.phone)),
        status: "pending_arrival" as const,
      };
    });

  if (toInsert.length) {
    await EventGuest.insertMany(toInsert, { ordered: false }).catch(() => {
      // ignore duplicate insert races
    });
  }

  return NextResponse.json({ ok: true });
}
