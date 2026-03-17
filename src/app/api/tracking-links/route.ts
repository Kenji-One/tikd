import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";
import mongoose from "mongoose";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { serialize } from "@/lib/serialize";
import Organization from "@/models/Organization";
import Event from "@/models/Event";
import TrackingLink from "@/models/TrackingLink";
import {
  listAuthorizedOrganizationIdsForUser,
  requireOrgPermission,
} from "@/lib/orgAccess";

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
  organizationId: string;
  destinationKind: DestinationKind;
  destinationId: string;
  destinationTitle: string;
  url: string;
  iconKey?: string | null;
  iconUrl?: string | null;
  views: number;
  ticketsSold: number;
  revenue: number;
  status: LinkStatus;
  created: string;
};

async function toUiRow(doc: TrackingLinkLean): Promise<UiRow> {
  let destinationTitle = "";

  try {
    if (doc.destinationKind === "Event") {
      const event = (await Event.findById(doc.destinationId)
        .select("title")
        .lean()) as EventTitleLean | null;

      destinationTitle = event?.title ?? "";
    } else {
      const org = (await Organization.findById(doc.destinationId)
        .select("name")
        .lean()) as OrgNameLean | null;

      destinationTitle = org?.name ?? "";
    }
  } catch {
    destinationTitle = "";
  }

  return {
    id: String(doc._id),
    name: doc.name,
    organizationId: String(doc.organizationId),
    destinationKind: doc.destinationKind,
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

  if (scope === "organization") {
    if (!isObjectId(organizationIdParam)) {
      return NextResponse.json(
        { error: "Invalid organizationId" },
        { status: 400 },
      );
    }

    const canAccess = await requireOrgPermission({
      organizationId: organizationIdParam,
      userId: session.user.id,
      email: session.user.email ?? undefined,
      permission: "links.createTrackingLinks",
    });

    if (!canAccess.ok) {
      return NextResponse.json(
        { error: canAccess.error },
        { status: canAccess.status },
      );
    }

    const links = (await TrackingLink.find({
      organizationId: new mongoose.Types.ObjectId(organizationIdParam),
      archived: false,
    })
      .sort({ createdAt: -1 })
      .lean()) as unknown as TrackingLinkLean[];

    const rows = await Promise.all(links.map(toUiRow));
    return NextResponse.json({ rows });
  }

  if (scope === "event") {
    if (!isObjectId(eventIdParam)) {
      return NextResponse.json({ error: "Invalid eventId" }, { status: 400 });
    }

    const event = (await Event.findById(eventIdParam)
      .select("_id organizationId")
      .lean()) as { _id: ObjectId; organizationId: ObjectId } | null;

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const canAccess = await requireOrgPermission({
      organizationId: String(event.organizationId),
      userId: session.user.id,
      email: session.user.email ?? undefined,
      permission: "links.createTrackingLinks",
    });

    if (!canAccess.ok) {
      return NextResponse.json(
        { error: canAccess.error },
        { status: canAccess.status },
      );
    }

    const links = (await TrackingLink.find({
      organizationId: event.organizationId,
      destinationKind: "Event",
      destinationId: event._id,
      archived: false,
    })
      .sort({ createdAt: -1 })
      .lean()) as unknown as TrackingLinkLean[];

    const rows = await Promise.all(links.map(toUiRow));
    return NextResponse.json({ rows });
  }

  const authorizedOrgIds = await listAuthorizedOrganizationIdsForUser({
    userId: session.user.id,
    email: session.user.email ?? undefined,
    permission: "links.createTrackingLinks",
  });

  const links = (await TrackingLink.find({
    organizationId: { $in: authorizedOrgIds },
    archived: false,
  })
    .sort({ createdAt: -1 })
    .lean()) as unknown as TrackingLinkLean[];

  const rows = await Promise.all(links.map(toUiRow));
  return NextResponse.json({ rows });
}

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

  let organizationId: ObjectId;

  if (destinationKind === "Organization") {
    const org = await Organization.findById(destObjId).select("_id");
    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    const canCreate = await requireOrgPermission({
      organizationId: String(org._id),
      userId: session.user.id,
      email: session.user.email ?? undefined,
      permission: "links.createTrackingLinks",
    });

    if (!canCreate.ok) {
      return NextResponse.json(
        { error: canCreate.error },
        { status: canCreate.status },
      );
    }

    organizationId = org._id as ObjectId;
  } else {
    const event = await Event.findById(destObjId).select("_id organizationId");
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const canCreate = await requireOrgPermission({
      organizationId: String(event.organizationId),
      userId: session.user.id,
      email: session.user.email ?? undefined,
      permission: "links.createTrackingLinks",
    });

    if (!canCreate.ok) {
      return NextResponse.json(
        { error: canCreate.error },
        { status: canCreate.status },
      );
    }

    organizationId = event.organizationId as ObjectId;
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
