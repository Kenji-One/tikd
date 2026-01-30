// src/app/api/friends/[userId]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { Types } from "mongoose";
import { auth } from "@/lib/auth";
import "@/lib/mongoose";
import Friendship from "@/models/Friendship";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const isObjectId = (v: string) => /^[a-f\d]{24}$/i.test(v);

type RouteContext = { params: Record<string, string | string[]> };

function getParam(
  params: Record<string, string | string[]>,
  key: string,
): string | null {
  const val = params[key];
  if (!val) return null;
  return Array.isArray(val) ? val[0] : val;
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const session = await auth();
  const me = session?.user?.id;

  if (!me || !isObjectId(me)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = getParam(ctx.params, "userId");
  if (!userId || !isObjectId(userId)) {
    return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
  }

  const meId = new Types.ObjectId(me);
  const otherId = new Types.ObjectId(userId);

  const existing = await Friendship.findOne({
    status: "accepted",
    $or: [
      { requesterId: meId, recipientId: otherId },
      { requesterId: otherId, recipientId: meId },
    ],
  });

  if (!existing) {
    return NextResponse.json({ ok: true }); // idempotent
  }

  await Friendship.deleteOne({ _id: existing._id });
  return NextResponse.json({ ok: true });
}
