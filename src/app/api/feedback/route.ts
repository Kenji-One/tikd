/* ------------------------------------------------------------------ */
/*  src/app/api/feedback/route.ts                                     */
/* ------------------------------------------------------------------ */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const schema = z.object({
  message: z.string().trim().min(1).max(500),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Message must be between 1 and 500 characters." },
      { status: 400 },
    );
  }

  // TODO: persist (Mongo) or forward (email/Slack/Discord)
  // For now: accept, so UI works flawlessly.
  return NextResponse.json({ success: true }, { status: 200 });
}
