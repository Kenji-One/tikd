// src/app/api/tracking-links/members/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";
import mongoose from "mongoose";

import { auth } from "@/lib/auth";
import Organization from "@/models/Organization";
import TrackingLink from "@/models/TrackingLink";
import User from "@/models/User";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ObjectId = mongoose.Types.ObjectId;

type OwnedOrgLean = { _id: ObjectId };

type UserLean = {
  _id: ObjectId;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  image?: string | null;
};

const isObjectId = (val: string) => mongoose.Types.ObjectId.isValid(val);

function displayNameFromUser(u?: UserLean | null) {
  if (!u) return "";
  const fn = (u.firstName ?? "").trim();
  const ln = (u.lastName ?? "").trim();
  const full = `${fn} ${ln}`.trim();
  return full || (u.username ?? "") || (u.email ?? "") || "";
}

/**
 * GET /api/tracking-links/members/:id
 * Returns minimal member profile for the member detail page (name + email + image).
 * Permission: only if that member has tracking links inside orgs owned by current user.
 */
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
    return NextResponse.json({ error: "Invalid member id" }, { status: 400 });
  }

  // Owned orgs only
  const ownedOrgs = (await Organization.find({ ownerId: session.user.id })
    .select("_id")
    .lean()) as OwnedOrgLean[];

  const ownedOrgIds: ObjectId[] = ownedOrgs.map((o) => o._id);

  if (!ownedOrgIds.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Ensure this member has at least one link in the user's owned orgs (privacy boundary)
  const memberObjId = new mongoose.Types.ObjectId(id);

  const hasAny = await TrackingLink.exists({
    organizationId: { $in: ownedOrgIds },
    archived: false,
    createdByUserId: memberObjId,
  });

  if (!hasAny) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const u = (await User.findById(memberObjId)
    .select("_id email username firstName lastName image")
    .lean()) as UserLean | null;

  if (!u) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const member = {
    id: String(u._id),
    name: displayNameFromUser(u) || "Member",
    email: (u.email ?? "").toLowerCase(),
    image: u.image ?? null,
  };

  return NextResponse.json({ member });
}
