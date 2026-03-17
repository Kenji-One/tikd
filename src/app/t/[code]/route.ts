import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import "@/lib/mongoose";

import TrackingLink from "@/models/TrackingLink";
import {
  applyTrackingAttributionCookie,
  createTrackingAttributionSession,
} from "@/lib/trackingAttribution";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type TrackingLinkLean = {
  _id: Types.ObjectId;
  code: string;
  organizationId: Types.ObjectId;
  destinationKind: "Event" | "Organization";
  destinationId: Types.ObjectId;
  status: "Active" | "Paused" | "Disabled";
  createdByUserId: Types.ObjectId;
};

function makeDestinationPath(
  kind: "Event" | "Organization",
  id: string,
): string {
  if (kind === "Event") {
    return `/events/${id}`;
  }

  return `/org/${id}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  const normalizedCode = String(code ?? "").trim();
  if (!normalizedCode) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const link = await TrackingLink.findOne({
    code: normalizedCode,
    archived: false,
  })
    .select(
      "_id code organizationId destinationKind destinationId status createdByUserId",
    )
    .lean<TrackingLinkLean | null>();

  if (!link) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (link.status !== "Active") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { rawToken, expiresAt } = await createTrackingAttributionSession({
    trackingLinkId: String(link._id),
    trackingCode: link.code,
    organizationId: String(link.organizationId),
    destinationKind: link.destinationKind,
    destinationId: String(link.destinationId),
    trackingCreatorUserId: String(link.createdByUserId),
  });

  await TrackingLink.updateOne(
    { _id: link._id },
    {
      $inc: { views: 1 },
      $set: { lastViewedAt: new Date() },
    },
  ).catch(() => {
    // best-effort analytics only; redirect should still work
  });

  const destinationPath = makeDestinationPath(
    link.destinationKind,
    String(link.destinationId),
  );

  const targetUrl = new URL(destinationPath, req.nextUrl.origin);
  const response = NextResponse.redirect(targetUrl, 302);

  applyTrackingAttributionCookie(response, rawToken, expiresAt);

  return response;
}
