import { NextResponse } from "next/server";
import "@/lib/mongoose";

import { auth } from "@/lib/auth";
import {
  acceptOrganizationInviteByToken,
  getOrganizationInvitePreviewByToken,
} from "@/lib/orgInvites";

type Ctx = { params: Promise<{ token: string }> };

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_req: Request, ctx: Ctx) {
  const { token } = await ctx.params;

  if (!token || token.length < 16) {
    return NextResponse.json(
      { error: "Invalid invite token" },
      { status: 400 },
    );
  }

  const preview = await getOrganizationInvitePreviewByToken(token);
  if (!preview) {
    return NextResponse.json(
      { error: "Invite not found or expired" },
      { status: 404 },
    );
  }

  return NextResponse.json({ invite: preview });
}

export async function POST(_req: Request, ctx: Ctx) {
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await ctx.params;

  if (!token || token.length < 16) {
    return NextResponse.json(
      { error: "Invalid invite token" },
      { status: 400 },
    );
  }

  const accepted = await acceptOrganizationInviteByToken({
    rawToken: token,
    userId: session.user.id,
    email: session.user.email,
  });

  if (!accepted.ok) {
    return NextResponse.json(
      { error: accepted.error },
      { status: accepted.status },
    );
  }

  return NextResponse.json({
    ok: true,
    organizationId: accepted.organizationId,
  });
}
