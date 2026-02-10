// src/app/api/tracking-links/route.ts
import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";
import mongoose from "mongoose";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { serialize } from "@/lib/serialize";
import Organization from "@/models/Organization";
import Event from "@/models/Event";
import TrackingLink from "@/models/TrackingLink";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ObjectId = mongoose.Types.ObjectId;

type DestinationKind = "Event" | "Organization";
type LinkStatus = "Active" | "Paused" | "Disabled";

type TrackingLinkLean = {
  _id: ObjectId;
  name: string;

  organizationId: ObjectId;

  destinationKind: DestinationKind;
  destinationId: ObjectId;

  code: string;
  path: string;

  status: LinkStatus;

  iconKey?: string | null;
  iconUrl?: string | null;

  views?: number;
  ticketsSold?: number;
  revenue?: number;

  archived?: boolean;

  createdAt: Date;
};

type EventTitleLean = {
  _id: ObjectId;
  title?: string;
  organizationId: ObjectId;
};

type OrgNameLean = {
  _id: ObjectId;
  name?: string;
};

type OwnedOrgLean = { _id: ObjectId };

const isObjectId = (val: string) => mongoose.Types.ObjectId.isValid(val);

function makeTrackingPath(code: string) {
  return `/t/${code}/`;
}

function randomCode(len = 8) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

async function generateUniqueCode(organizationId: ObjectId) {
  for (let i = 0; i < 12; i++) {
    const code = randomCode(8);
    const exists = await TrackingLink.exists({ organizationId, code });
    if (!exists) return code;
  }
  // extremely unlikely
  return `${randomCode(10)}${Date.now().toString(36).slice(2, 6)}`;
}

const createSchema = z.object({
  name: z.string().min(2),

  destinationKind: z.enum(["Event", "Organization"]),
  destinationId: z.string().refine(isObjectId, "Invalid destination id"),

  status: z.enum(["Active", "Paused", "Disabled"]).default("Active"),

  iconKey: z
    .enum([
      "instagram",
      "facebook",
      "x",
      "linkedin",
      "google",
      "youtube",
      "snapchat",
      "reddit",
      "tiktok",
      "telegram",
    ])
    .nullable()
    .optional(),

  iconUrl: z.string().url().nullable().optional(),
});

type UiRow = {
  id: string;
  name: string;

  // ✅ NEW: lets the frontend filter “org page = this org + its events”
  organizationId: string;

  destinationKind: DestinationKind;
  destinationId: string;
  destinationTitle: string;

  url: string; // tracking path: /t/:code/
  iconKey?: string | null;
  iconUrl?: string | null;

  views: number;
  ticketsSold: number;
  revenue: number;
  status: LinkStatus;
  created: string; // ISO
};

async function toUiRow(doc: TrackingLinkLean): Promise<UiRow> {
  const destinationKind = doc.destinationKind;

  let destinationTitle = "";

  try {
    if (destinationKind === "Event") {
      const e = (await Event.findById(doc.destinationId)
        .select("title")
        .lean()) as EventTitleLean | null;

      destinationTitle = e?.title ?? "";
    } else {
      const o = (await Organization.findById(doc.destinationId)
        .select("name")
        .lean()) as OrgNameLean | null;

      destinationTitle = o?.name ?? "";
    }
  } catch {
    destinationTitle = "";
  }

  return {
    id: String(doc._id),
    name: doc.name,

    organizationId: String(doc.organizationId),

    destinationKind,
    destinationId: String(doc.destinationId),
    destinationTitle,

    url: doc.path,

    iconKey: doc.iconKey ?? null,
    iconUrl: doc.iconUrl ?? null,

    views: doc.views ?? 0,
    ticketsSold: doc.ticketsSold ?? 0,
    revenue: doc.revenue ?? 0,
    status: doc.status,
    created: new Date(doc.createdAt).toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/* GET /api/tracking-links                                            */
/* - default: all non-archived links for orgs owned by this user       */
/* - scope=event&eventId=... : only links for that event               */
/* - scope=organization&organizationId=... : links for that org + its  */
/*   events (since links store organizationId)                         */
/* ------------------------------------------------------------------ */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scope = (req.nextUrl.searchParams.get("scope") || "").trim();
  const organizationIdParam = (
    req.nextUrl.searchParams.get("organizationId") || ""
  ).trim();
  const eventIdParam = (req.nextUrl.searchParams.get("eventId") || "").trim();

  const ownedOrgs = (await Organization.find({ ownerId: session.user.id })
    .select("_id")
    .lean()) as OwnedOrgLean[];

  const ownedOrgIds: ObjectId[] = ownedOrgs.map((o) => o._id);

  // Base permissions: only within orgs user owns
  const baseFilter: Record<string, unknown> = {
    organizationId: { $in: ownedOrgIds },
    archived: false,
  };

  // ✅ Scoped filters
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
  }

  const links = (await TrackingLink.find(baseFilter)
    .sort({ createdAt: -1 })
    .lean()) as unknown as TrackingLinkLean[];

  const rows = await Promise.all(links.map(toUiRow));
  return NextResponse.json({ rows });
}

/* ------------------------------------------------------------------ */
/* POST /api/tracking-links                                           */
/* - create a tracking link                                           */
/* ------------------------------------------------------------------ */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json: unknown = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const { name, destinationKind, destinationId, status, iconKey, iconUrl } =
    parsed.data;

  const destObjId = new mongoose.Types.ObjectId(destinationId);

  // Resolve organizationId + permission checks:
  let organizationId: ObjectId;

  if (destinationKind === "Organization") {
    const org = await Organization.findById(destObjId).select("_id ownerId");
    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }
    if (String(org.ownerId) !== String(session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    organizationId = org._id as ObjectId;
  } else {
    const event = await Event.findById(destObjId).select("_id organizationId");
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const org = await Organization.findById(event.organizationId).select(
      "_id ownerId",
    );
    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }
    if (String(org.ownerId) !== String(session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    organizationId = org._id as ObjectId;
  }

  const code = await generateUniqueCode(organizationId);
  const path = makeTrackingPath(code);

  const doc = await TrackingLink.create({
    name,
    organizationId,
    destinationKind,
    destinationId: destObjId,
    code,
    path,
    status,
    iconKey: iconKey ?? null,
    iconUrl: iconUrl ?? null,
    createdByUserId: new mongoose.Types.ObjectId(session.user.id),
  });

  const lean = serialize(doc.toObject()) as TrackingLinkLean;
  const row = await toUiRow(lean);

  return NextResponse.json({ row });
}
