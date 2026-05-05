import { NextResponse } from "next/server";
import { z } from "zod";

import "@/lib/mongoose";
import { auth } from "@/lib/auth";
import { acceptTeamInviteByToken } from "@/lib/teamInvites";
import { acceptEventInviteByToken } from "@/lib/eventInvites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const preferredRegion = "auto";
export const maxDuration = 10;

const ParamsZ = z.object({
  scope: z.enum(["team", "event"]),
  token: z.string().trim().min(16).max(512),
});

export async function POST(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{ scope: string; token: string }>;
  },
) {
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsedParams = ParamsZ.safeParse(await params);

  if (!parsedParams.success) {
    return NextResponse.json(
      { error: "Invalid invite token" },
      { status: 400 },
    );
  }

  const { scope, token } = parsedParams.data;

  const result =
    scope === "team"
      ? await acceptTeamInviteByToken({
          rawToken: token,
          userId: session.user.id,
          email: session.user.email,
        })
      : await acceptEventInviteByToken({
          rawToken: token,
          userId: session.user.id,
          email: session.user.email,
        });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({
    ok: true,
    redirectTo: result.redirectTo,
  });
}
