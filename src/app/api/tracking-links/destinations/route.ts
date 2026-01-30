// src/app/api/tracking-links/destinations/route.ts
import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";

import { auth } from "@/lib/auth";
import Organization from "@/models/Organization";
import Event from "@/models/Event";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Destination = {
  kind: "Event" | "Organization";
  id: string;
  title: string;
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  const qRx = q
    ? new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
    : null;

  // Owned orgs only
  const ownedOrgs = await Organization.find({ ownerId: session.user.id })
    .select("_id name")
    .limit(30)
    .lean();

  const orgIds = ownedOrgs.map((o: any) => o._id);

  // Filter orgs by query
  const orgMatches = qRx
    ? ownedOrgs.filter((o: any) => qRx.test(String(o.name || "")))
    : ownedOrgs;

  // Events under owned orgs
  const eventFilter: any = { organizationId: { $in: orgIds } };
  if (qRx) eventFilter.title = qRx;

  const events = await Event.find(eventFilter)
    .select("_id title")
    .sort({ date: -1 })
    .limit(30)
    .lean();

  const out: Destination[] = [
    ...events.map((e: any) => ({
      kind: "Event" as const,
      id: String(e._id),
      title: String(e.title || ""),
    })),
    ...orgMatches.map((o: any) => ({
      kind: "Organization" as const,
      id: String(o._id),
      title: String(o.name || ""),
    })),
  ].slice(0, 40);

  return NextResponse.json({ destinations: out });
}
