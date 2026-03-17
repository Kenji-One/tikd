import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import "@/lib/mongoose";

import { auth } from "@/lib/auth";
import Organization from "@/models/Organization";
import Event from "@/models/Event";
import TrackingLink from "@/models/TrackingLink";
import { requireOrgPermission } from "@/lib/orgAccess";

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
};

type OrgNameLean = {
  _id: ObjectId;
  name?: string;
};

const isObjectId = (val: string) => mongoose.Types.ObjectId.isValid(val);

const patchSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    destinationKind: z.enum(["Event", "Organization"]).optional(),
    destinationId: z
      .string()
      .trim()
      .refine(isObjectId, "Invalid destination id")
      .optional(),
    status: z.enum(["Active", "Paused", "Disabled"]).optional(),
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
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      (value.destinationKind && !value.destinationId) ||
      (!value.destinationKind && value.destinationId)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "destinationKind and destinationId must be provided together",
        path: ["destinationId"],
      });
    }
  });

async function toUiRow(doc: TrackingLinkLean) {
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

async function resolveScopedDestination(input: {
  organizationId: ObjectId;
  destinationKind: DestinationKind;
  destinationId: string;
}): Promise<
  | { ok: true; destinationId: ObjectId }
  | { ok: false; status: number; error: string }
> {
  const destinationObjectId = new mongoose.Types.ObjectId(input.destinationId);

  if (input.destinationKind === "Organization") {
    const org = await Organization.findById(destinationObjectId)
      .select("_id")
      .lean<{ _id: ObjectId } | null>();

    if (!org) {
      return { ok: false, status: 404, error: "Organization not found" };
    }

    if (String(org._id) !== String(input.organizationId)) {
      return {
        ok: false,
        status: 400,
        error: "Organization links must point to the same organization",
      };
    }

    return { ok: true, destinationId: org._id };
  }

  const event = await Event.findOne({
    _id: destinationObjectId,
    organizationId: input.organizationId,
  })
    .select("_id")
    .lean<{ _id: ObjectId } | null>();

  if (!event) {
    return { ok: false, status: 404, error: "Event not found" };
  }

  return { ok: true, destinationId: event._id };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!isObjectId(id)) {
    return NextResponse.json(
      { error: "Invalid tracking link id" },
      { status: 400 },
    );
  }

  const doc = await TrackingLink.findById(id).lean<TrackingLinkLean | null>();

  if (!doc || doc.archived) {
    return NextResponse.json(
      { error: "Tracking link not found" },
      { status: 404 },
    );
  }

  const canAccess = await requireOrgPermission({
    organizationId: String(doc.organizationId),
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

  const row = await toUiRow(doc);
  return NextResponse.json({ row });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!isObjectId(id)) {
    return NextResponse.json(
      { error: "Invalid tracking link id" },
      { status: 400 },
    );
  }

  const existing = await TrackingLink.findById(
    id,
  ).lean<TrackingLinkLean | null>();

  if (!existing || existing.archived) {
    return NextResponse.json(
      { error: "Tracking link not found" },
      { status: 404 },
    );
  }

  const canManage = await requireOrgPermission({
    organizationId: String(existing.organizationId),
    userId: session.user.id,
    email: session.user.email ?? undefined,
    permission: "links.createTrackingLinks",
  });

  if (!canManage.ok) {
    return NextResponse.json(
      { error: canManage.error },
      { status: canManage.status },
    );
  }

  const body: unknown = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const data = parsed.data;
  const update: Record<string, unknown> = {};

  if (typeof data.name === "string") {
    update.name = data.name;
  }

  if (typeof data.status === "string") {
    update.status = data.status;
  }

  if (data.iconKey !== undefined) {
    update.iconKey = data.iconKey ?? null;
  }

  if (data.iconUrl !== undefined) {
    update.iconUrl = data.iconUrl ?? null;
  }

  if (data.iconKey) {
    update.iconUrl = null;
  }

  if (data.iconUrl) {
    update.iconKey = null;
  }

  if (data.destinationKind && data.destinationId) {
    const resolvedDestination = await resolveScopedDestination({
      organizationId: existing.organizationId,
      destinationKind: data.destinationKind,
      destinationId: data.destinationId,
    });

    if (!resolvedDestination.ok) {
      return NextResponse.json(
        { error: resolvedDestination.error },
        { status: resolvedDestination.status },
      );
    }

    update.destinationKind = data.destinationKind;
    update.destinationId = resolvedDestination.destinationId;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "No valid update fields provided" },
      { status: 400 },
    );
  }

  const updated = await TrackingLink.findOneAndUpdate(
    { _id: existing._id, archived: false },
    { $set: update },
    { new: true },
  ).lean<TrackingLinkLean | null>();

  if (!updated) {
    return NextResponse.json(
      { error: "Tracking link not found" },
      { status: 404 },
    );
  }

  const row = await toUiRow(updated);
  return NextResponse.json({ row });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!isObjectId(id)) {
    return NextResponse.json(
      { error: "Invalid tracking link id" },
      { status: 400 },
    );
  }

  const existing = await TrackingLink.findById(id)
    .select("_id organizationId archived")
    .lean<{
      _id: ObjectId;
      organizationId: ObjectId;
      archived?: boolean;
    } | null>();

  if (!existing || existing.archived) {
    return NextResponse.json(
      { error: "Tracking link not found" },
      { status: 404 },
    );
  }

  const canManage = await requireOrgPermission({
    organizationId: String(existing.organizationId),
    userId: session.user.id,
    email: session.user.email ?? undefined,
    permission: "links.createTrackingLinks",
  });

  if (!canManage.ok) {
    return NextResponse.json(
      { error: canManage.error },
      { status: canManage.status },
    );
  }

  await TrackingLink.updateOne(
    { _id: existing._id },
    {
      $set: {
        archived: true,
        status: "Disabled",
      },
    },
  );

  return NextResponse.json({ ok: true });
}
