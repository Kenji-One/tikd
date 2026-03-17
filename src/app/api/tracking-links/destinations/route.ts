import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";
import { Types, type FilterQuery } from "mongoose";

import { auth } from "@/lib/auth";
import Organization from "@/models/Organization";
import Event from "@/models/Event";
import {
  listAuthorizedOrganizationIdsForUser,
  requireOrgPermission,
} from "@/lib/orgAccess";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type DestinationKind = "Event" | "Organization";

type DestinationResult = {
  kind: DestinationKind;
  id: string;
  title: string;
};

type OrgLean = {
  _id: Types.ObjectId;
  name?: string;
};

type EventLean = {
  _id: Types.ObjectId;
  title?: string;
  organizationId: Types.ObjectId;
};

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scope = String(req.nextUrl.searchParams.get("scope") || "").trim();
  const organizationId = String(
    req.nextUrl.searchParams.get("organizationId") || "",
  ).trim();
  const eventId = String(req.nextUrl.searchParams.get("eventId") || "").trim();
  const q = String(req.nextUrl.searchParams.get("q") || "").trim();

  const qRx = q ? new RegExp(escapeRegex(q), "i") : null;

  let authorizedOrgIds: Types.ObjectId[] = [];

  if (scope === "organization") {
    if (!Types.ObjectId.isValid(organizationId)) {
      return NextResponse.json(
        { error: "Invalid organizationId" },
        { status: 400 },
      );
    }

    const canAccess = await requireOrgPermission({
      organizationId,
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

    authorizedOrgIds = [new Types.ObjectId(organizationId)];
  } else if (scope === "event") {
    if (!Types.ObjectId.isValid(eventId)) {
      return NextResponse.json({ error: "Invalid eventId" }, { status: 400 });
    }

    const event = await Event.findById(eventId)
      .select("_id organizationId")
      .lean<{ _id: Types.ObjectId; organizationId: Types.ObjectId } | null>();

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

    authorizedOrgIds = [event.organizationId];
  } else {
    authorizedOrgIds = await listAuthorizedOrganizationIdsForUser({
      userId: session.user.id,
      email: session.user.email ?? undefined,
      permission: "links.createTrackingLinks",
    });
  }

  if (!authorizedOrgIds.length) {
    return NextResponse.json({ results: [] as DestinationResult[] });
  }

  const orgs = (await Organization.find({
    _id: { $in: authorizedOrgIds },
    ...(qRx ? { name: qRx } : {}),
  })
    .select("_id name")
    .sort({ name: 1 })
    .limit(20)
    .lean()) as OrgLean[];

  const eventFilter: FilterQuery<{
    organizationId: Types.ObjectId;
    title?: RegExp;
  }> = {
    organizationId: { $in: authorizedOrgIds },
  };

  if (qRx) {
    eventFilter.title = qRx;
  }

  const events = await Event.find(eventFilter)
    .select("_id title organizationId")
    .sort({ date: -1 })
    .limit(30)
    .lean<EventLean[]>();

  const results: DestinationResult[] = [
    ...orgs.map((org) => ({
      kind: "Organization" as const,
      id: String(org._id),
      title: String(org.name ?? ""),
    })),
    ...events.map((event) => ({
      kind: "Event" as const,
      id: String(event._id),
      title: String(event.title ?? ""),
    })),
  ].slice(0, 40);

  return NextResponse.json({ results });
}
