import { NextResponse } from "next/server";
import { z } from "zod";

import "@/lib/mongoose";
import { auth } from "@/lib/auth";
import {
  acceptEventInviteByToken,
  getEventInvitePreviewByToken,
} from "@/lib/eventInvites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const preferredRegion = "auto";
export const maxDuration = 10;

type Ctx = { params: Promise<{ token: string }> };

const ParamsZ = z.object({
  token: z.string().trim().min(16).max(512),
});

export async function GET(_req: Request, ctx: Ctx) {
  const parsedParams = ParamsZ.safeParse(await ctx.params);

  if (!parsedParams.success) {
    return NextResponse.json(
      { error: "Invalid invite token" },
      { status: 400 },
    );
  }

  const { token } = parsedParams.data;

  const preview = await getEventInvitePreviewByToken(token);
  if (!preview) {
    return NextResponse.json(
      { error: "Invite not found or expired" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    invite: preview,
    legacy: true,
  });
}

export async function POST(_req: Request, ctx: Ctx) {
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsedParams = ParamsZ.safeParse(await ctx.params);

  if (!parsedParams.success) {
    return NextResponse.json(
      { error: "Invalid invite token" },
      { status: 400 },
    );
  }

  const { token } = parsedParams.data;

  const accepted = await acceptEventInviteByToken({
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
    redirectTo: accepted.redirectTo,
    legacy: true,
  });
}
