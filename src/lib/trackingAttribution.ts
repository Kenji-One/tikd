import crypto from "crypto";
import type { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import TrackingAttributionSession from "@/models/TrackingAttributionSession";

export type ResolvedTrackingAttribution = {
  sessionId: string;
  trackingLinkId: string;
  trackingCode: string;
  organizationId: string;
  destinationKind: "Event" | "Organization";
  destinationId: string;
  trackingCreatorUserId: string;
  firstSeenAt: string;
  lastSeenAt: string;
  expiresAt: string;
};

type TrackingSessionLean = {
  _id: Types.ObjectId;
  cookieTokenHash: string;
  trackingLinkId: Types.ObjectId;
  trackingCode: string;
  organizationId: Types.ObjectId;
  destinationKind: "Event" | "Organization";
  destinationId: Types.ObjectId;
  trackingCreatorUserId: Types.ObjectId;
  firstSeenAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
};

const TRACKING_ATTRIBUTION_COOKIE = "tikd_ta";
const TRACKING_ATTRIBUTION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashCookieToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function createRawCookieToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function isValidObjectId(value: string): boolean {
  return Types.ObjectId.isValid(value);
}

function toResolved(session: TrackingSessionLean): ResolvedTrackingAttribution {
  return {
    sessionId: String(session._id),
    trackingLinkId: String(session.trackingLinkId),
    trackingCode: session.trackingCode,
    organizationId: String(session.organizationId),
    destinationKind: session.destinationKind,
    destinationId: String(session.destinationId),
    trackingCreatorUserId: String(session.trackingCreatorUserId),
    firstSeenAt: session.firstSeenAt.toISOString(),
    lastSeenAt: session.lastSeenAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
  };
}

export function trackingAttributionCookieName(): string {
  return TRACKING_ATTRIBUTION_COOKIE;
}

export async function createTrackingAttributionSession(input: {
  trackingLinkId: string;
  trackingCode: string;
  organizationId: string;
  destinationKind: "Event" | "Organization";
  destinationId: string;
  trackingCreatorUserId: string;
}): Promise<{ rawToken: string; expiresAt: Date }> {
  if (
    !isValidObjectId(input.trackingLinkId) ||
    !isValidObjectId(input.organizationId) ||
    !isValidObjectId(input.destinationId) ||
    !isValidObjectId(input.trackingCreatorUserId)
  ) {
    throw new Error("Invalid tracking attribution identifiers.");
  }

  const rawToken = createRawCookieToken();
  const expiresAt = new Date(Date.now() + TRACKING_ATTRIBUTION_TTL_MS);

  await TrackingAttributionSession.create({
    cookieTokenHash: hashCookieToken(rawToken),
    trackingLinkId: new Types.ObjectId(input.trackingLinkId),
    trackingCode: input.trackingCode,
    organizationId: new Types.ObjectId(input.organizationId),
    destinationKind: input.destinationKind,
    destinationId: new Types.ObjectId(input.destinationId),
    trackingCreatorUserId: new Types.ObjectId(input.trackingCreatorUserId),
    firstSeenAt: new Date(),
    lastSeenAt: new Date(),
    expiresAt,
  });

  return { rawToken, expiresAt };
}

export function applyTrackingAttributionCookie(
  response: NextResponse,
  rawToken: string,
  expiresAt: Date,
): void {
  response.cookies.set({
    name: TRACKING_ATTRIBUTION_COOKIE,
    value: rawToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
    maxAge: Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
  });
}

export function clearTrackingAttributionCookie(response: NextResponse): void {
  response.cookies.set({
    name: TRACKING_ATTRIBUTION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  });
}

export async function getTrackingAttributionFromRequest(
  request: NextRequest,
): Promise<ResolvedTrackingAttribution | null> {
  const rawToken = request.cookies.get(TRACKING_ATTRIBUTION_COOKIE)?.value;

  if (!rawToken || rawToken.length < 16) {
    return null;
  }

  const now = new Date();

  const session = await TrackingAttributionSession.findOne({
    cookieTokenHash: hashCookieToken(rawToken),
    expiresAt: { $gt: now },
  })
    .select(
      "_id trackingLinkId trackingCode organizationId destinationKind destinationId trackingCreatorUserId firstSeenAt lastSeenAt expiresAt",
    )
    .lean<TrackingSessionLean | null>();

  if (!session) {
    return null;
  }

  void TrackingAttributionSession.updateOne(
    { _id: session._id },
    { $set: { lastSeenAt: now } },
  ).catch(() => {
    // best-effort touch only
  });

  return toResolved(session);
}

export function isTrackingAttributionApplicableToEvent(input: {
  attribution: ResolvedTrackingAttribution | null;
  eventId: string;
  organizationId: string;
}): boolean {
  const { attribution, eventId, organizationId } = input;

  if (!attribution) return false;
  if (!isValidObjectId(eventId) || !isValidObjectId(organizationId)) {
    return false;
  }

  const expiresAt = new Date(attribution.expiresAt);
  if (
    !Number.isFinite(expiresAt.getTime()) ||
    expiresAt.getTime() <= Date.now()
  ) {
    return false;
  }

  if (attribution.destinationKind === "Event") {
    return attribution.destinationId === eventId;
  }

  return attribution.organizationId === organizationId;
}
