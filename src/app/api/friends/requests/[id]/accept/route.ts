// src/app/api/friends/requests/[id]/accept/route.ts
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

export async function POST(_req: NextRequest, ctx: RouteContext) {
  const session = await auth();
  const me = session?.user?.id;

  if (!me || !isObjectId(me)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = getParam(ctx.params, "id");
  if (!id || !isObjectId(id)) {
    return NextResponse.json({ error: "Invalid request id" }, { status: 400 });
  }

  const meId = new Types.ObjectId(me);

  const reqDoc = await Friendship.findById(id);
  if (!reqDoc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (String(reqDoc.recipientId) !== String(meId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (reqDoc.status !== "pending") {
    return NextResponse.json({ ok: true }); // idempotent
  }

  reqDoc.status = "accepted";
  await reqDoc.save();

  return NextResponse.json({ ok: true });
}
