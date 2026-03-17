import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";
import mongoose from "mongoose";

import { auth } from "@/lib/auth";
import TrackingLink from "@/models/TrackingLink";
import User from "@/models/User";
import { listAuthorizedOrganizationIdsForUser } from "@/lib/orgAccess";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ObjectId = mongoose.Types.ObjectId;

type UserLean = {
  _id: ObjectId;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  image?: string | null;
};

const isObjectId = (val: string) => mongoose.Types.ObjectId.isValid(val);

function displayNameFromUser(user?: UserLean | null) {
  if (!user) return "";
  const fn = (user.firstName ?? "").trim();
  const ln = (user.lastName ?? "").trim();
  const full = `${fn} ${ln}`.trim();
  return full || (user.username ?? "") || (user.email ?? "") || "";
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
    return NextResponse.json({ error: "Invalid member id" }, { status: 400 });
  }

  const authorizedOrgIds = await listAuthorizedOrganizationIdsForUser({
    userId: session.user.id,
    email: session.user.email ?? undefined,
    permission: "members.view",
  });

  if (!authorizedOrgIds.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const memberObjId = new mongoose.Types.ObjectId(id);

  const hasAny = await TrackingLink.exists({
    organizationId: { $in: authorizedOrgIds },
    archived: false,
    createdByUserId: memberObjId,
  });

  if (!hasAny) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const user = (await User.findById(memberObjId)
    .select("_id email username firstName lastName image")
    .lean()) as UserLean | null;

  if (!user) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  return NextResponse.json({
    member: {
      id: String(user._id),
      name: displayNameFromUser(user) || "Member",
      email: (user.email ?? "").toLowerCase(),
      image: user.image ?? null,
    },
  });
}
