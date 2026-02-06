// src/app/api/notifications/[id]/read/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import "@/lib/mongoose";
import { auth } from "@/lib/auth";
import Notification from "@/models/Notification";

type SessionLike = {
  user?: { id?: string | null } | null;
} | null;

const isObjectId = (val: string) => /^[a-f\d]{24}$/i.test(val);

export async function PATCH(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = (await auth()) as SessionLike;
  const userId = String(session?.user?.id || "");
  if (!userId || !isObjectId(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!isObjectId(id)) {
    return NextResponse.json(
      { error: "Invalid notification id" },
      { status: 400 },
    );
  }

  const recipientUserId = new Types.ObjectId(userId);

  await Notification.updateOne(
    { _id: new Types.ObjectId(id), recipientUserId },
    { $set: { read: true, readAt: new Date() } },
  );

  const unreadCount = await Notification.countDocuments({
    recipientUserId,
    read: false,
  });

  return NextResponse.json({ unreadCount });
}
