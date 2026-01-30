// src/app/api/tracking-links/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";
import mongoose from "mongoose";
import { z } from "zod";

import { auth } from "@/lib/auth";
import Organization from "@/models/Organization";
import Event from "@/models/Event";
import TrackingLink from "@/models/TrackingLink";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const isObjectId = (val: string) => mongoose.Types.ObjectId.isValid(val);

const patchSchema = z.object({
  name: z.string().min(2).optional(),

  destinationKind: z.enum(["Event", "Organization"]).optional(),
  destinationId: z
    .string()
    .refine(isObjectId, "Invalid destination id")
    .optional(),

  status: z.enum(["Active", "Paused", "Disabled"]).optional(),

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

async function assertOwner(sessionUserId: string, organizationId: any) {
  const org = await Organization.findById(organizationId).select("_id ownerId");
  if (!org)
    return { ok: false as const, status: 404, error: "Organization not found" };
  if (String(org.ownerId) !== String(sessionUserId)) {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }
  return { ok: true as const, org };
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
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const json = await req.json();
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const link = await TrackingLink.findById(id);
  if (!link || link.archived) {
    return NextResponse.json(
      { error: "Tracking link not found" },
      { status: 404 },
    );
  }

  // Must be owner of the organization that owns this link
  const perm = await assertOwner(session.user.id, link.organizationId);
  if (!perm.ok) {
    return NextResponse.json({ error: perm.error }, { status: perm.status });
  }

  const data = parsed.data;

  if (data.name !== undefined) link.name = data.name;
  if (data.status !== undefined) link.status = data.status;
  if (data.iconKey !== undefined) link.iconKey = data.iconKey ?? null;
  if (data.iconUrl !== undefined) link.iconUrl = data.iconUrl ?? null;

  // Destination change
  if (data.destinationKind !== undefined || data.destinationId !== undefined) {
    const nextKind = (data.destinationKind ?? link.destinationKind) as
      | "Event"
      | "Organization";

    const nextId = data.destinationId
      ? new mongoose.Types.ObjectId(data.destinationId)
      : (link.destinationId as any);

    // Verify destination exists + still owned
    if (nextKind === "Organization") {
      const org =
        await Organization.findById(nextId).select("_id ownerId name");
      if (!org) {
        return NextResponse.json(
          { error: "Organization not found" },
          { status: 404 },
        );
      }
      if (String(org.ownerId) !== String(session.user.id)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      link.destinationKind = "Organization";
      link.destinationId = org._id as any;
      link.organizationId = org._id as any; // keep aligned
    } else {
      const event = await Event.findById(nextId).select(
        "_id organizationId title",
      );
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

      link.destinationKind = "Event";
      link.destinationId = event._id as any;
      link.organizationId = org._id as any;
    }
  }

  await link.save();

  return NextResponse.json({ ok: true });
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
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const link = await TrackingLink.findById(id);
  if (!link || link.archived) {
    return NextResponse.json(
      { error: "Tracking link not found" },
      { status: 404 },
    );
  }

  const perm = await assertOwner(session.user.id, link.organizationId);
  if (!perm.ok) {
    return NextResponse.json({ error: perm.error }, { status: perm.status });
  }

  link.archived = true;
  await link.save();

  return NextResponse.json({ ok: true });
}
