import { NextResponse } from "next/server";
import "@/lib/mongoose";

import { auth } from "@/lib/auth";
import {
  requireOrgMembership,
  canManageOrganizationProfile,
} from "@/lib/orgAccess";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const isObjectId = (val: string) => /^[a-f\d]{24}$/i.test(val);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!isObjectId(id)) {
    return NextResponse.json(
      { error: "Invalid organization id" },
      { status: 400 },
    );
  }

  const access = await requireOrgMembership({
    organizationId: id,
    userId: session.user.id,
    email: session.user.email ?? undefined,
  });

  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  return NextResponse.json({
    organization: {
      id: String(access.access.org?._id ?? ""),
      name: access.access.org?.name ?? "",
      ownerId: String(access.access.org?.ownerId ?? ""),
    },
    access: {
      hasAccess: access.access.hasAccess,
      isOwner: access.access.isOwner,
      membershipStatus: access.access.membership?.status ?? null,
      role: access.access.effectiveRole,
      permissions: access.access.permissions,
      canManageProfile: canManageOrganizationProfile(access.access),
    },
  });
}
