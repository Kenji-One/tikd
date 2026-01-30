// src/app/t/[code]/route.ts
import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";

import TrackingLink from "@/models/TrackingLink";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function makeDestinationPath(kind: "Event" | "Organization", id: string) {
  const base = kind === "Event" ? "/events" : "/organizations";
  const p = `${base}/${id}/`;
  return p.startsWith("/") ? p : `/${p}`;
}

// minimal lean shape we need here (keeps TS happy + avoids FlattenMaps weirdness)
type TrackingLinkLean = {
  _id: unknown;
  status?: "Active" | "Paused" | "Disabled" | string;
  destinationKind?: "Event" | "Organization" | string;
  destinationId?: unknown;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  const link = await TrackingLink.findOne({
    code,
    archived: false,
  }).lean<TrackingLinkLean | null>();

  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // respect status
  if (link.status !== "Active") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // validate destination fields (defensive: avoids redirecting with junk data)
  const kind = link.destinationKind;
  if (kind !== "Event" && kind !== "Organization") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const destId = link.destinationId;
  if (!destId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // increment views (best-effort)
  try {
    await TrackingLink.updateOne(
      { _id: link._id },
      { $inc: { views: 1 }, $set: { lastViewedAt: new Date() } },
    );
  } catch {
    // ignore metric errors
  }

  const dest = makeDestinationPath(kind, String(destId));

  const url = new URL(dest, req.nextUrl.origin);
  return NextResponse.redirect(url, 302);
}
