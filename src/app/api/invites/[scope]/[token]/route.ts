import { NextResponse } from "next/server";
import { z } from "zod";

import "@/lib/mongoose";
import { getTeamInvitePreviewByToken } from "@/lib/teamInvites";
import { getEventInvitePreviewByToken } from "@/lib/eventInvites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const preferredRegion = "auto";
export const maxDuration = 10;

const ParamsZ = z.object({
  scope: z.enum(["team", "event"]),
  token: z.string().trim().min(16).max(512),
});

export async function GET(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{ scope: string; token: string }>;
  },
) {
  const parsedParams = ParamsZ.safeParse(await params);

  if (!parsedParams.success) {
    return NextResponse.json(
      { error: "Invalid invite token" },
      { status: 400 },
    );
  }

  const { scope, token } = parsedParams.data;

  const invite =
    scope === "team"
      ? await getTeamInvitePreviewByToken(token)
      : await getEventInvitePreviewByToken(token);

  if (!invite) {
    return NextResponse.json(
      { error: "Invite not found or expired" },
      { status: 404 },
    );
  }

  return NextResponse.json({ invite });
}
