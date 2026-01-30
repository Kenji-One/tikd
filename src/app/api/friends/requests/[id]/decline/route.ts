// src/app/api/friends/requests/[id]/decline/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { Types } from "mongoose";
import { auth } from "@/lib/auth";
import "@/lib/mongoose";
import Friendship from "@/models/Friendship";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const isObjectId = (v: string) => /^[a-f\d]{24}$/i.test(v);

type RouteParams = { id: string };

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<RouteParams> },
) {
  const session = await auth();
  const me = session?.user?.id;

  if (!me || !isObjectId(me)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

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

  reqDoc.status = "declined";
  await reqDoc.save();

  return NextResponse.json({ ok: true });
}
