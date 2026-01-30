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

async function generateUniqueCode(organizationId: mongoose.Types.ObjectId) {
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
      "twitter",
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

  destinationKind: "Event" | "Organization";
  destinationId: string;
  destinationTitle: string;

  url: string; // tracking path: /t/:code/
  iconKey?: string | null;
  iconUrl?: string | null;

  views: number;
  ticketsSold: number;
  revenue: number;
  status: "Active" | "Paused" | "Disabled";
  created: string; // ISO
};

async function toUiRow(doc: any): Promise<UiRow> {
  const destinationKind = doc.destinationKind as "Event" | "Organization";

  let destinationTitle = "";
  try {
    if (destinationKind === "Event") {
      const e = await Event.findById(doc.destinationId).select("title").lean();
      destinationTitle = (e as any)?.title ?? "";
    } else {
      const o = await Organization.findById(doc.destinationId)
        .select("name")
        .lean();
      destinationTitle = (o as any)?.name ?? "";
    }
  } catch {
    destinationTitle = "";
  }

  return {
    id: String(doc._id),
    name: doc.name,

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
/* - returns all non-archived links for orgs owned by this user        */
/* ------------------------------------------------------------------ */
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownedOrgs = await Organization.find({ ownerId: session.user.id })
    .select("_id")
    .lean();

  const orgIds = ownedOrgs.map((o: any) => o._id);

  const links = await TrackingLink.find({
    organizationId: { $in: orgIds },
    archived: false,
  })
    .sort({ createdAt: -1 })
    .lean();

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

  const json = await req.json();
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const { name, destinationKind, destinationId, status, iconKey, iconUrl } =
    parsed.data;

  const destObjId = new mongoose.Types.ObjectId(destinationId);

  // Resolve organizationId + permission checks:
  // NOTE: non-nullable because both branches either assign or return.
  let organizationId: mongoose.Types.ObjectId;

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
    organizationId = org._id;
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
    organizationId = org._id;
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

  const lean = serialize(doc.toObject());
  const row = await toUiRow(lean);

  return NextResponse.json({ row });
}
