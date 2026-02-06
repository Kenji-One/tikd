// src/app/api/notifications/mark-all-read/route.ts
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import "@/lib/mongoose";
import { auth } from "@/lib/auth";
import Notification from "@/models/Notification";

type SessionLike = {
  user?: { id?: string | null } | null;
} | null;

const isObjectId = (val: string) => /^[a-f\d]{24}$/i.test(val);

export async function PATCH() {
  const session = (await auth()) as SessionLike;
  const userId = String(session?.user?.id || "");
  if (!userId || !isObjectId(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const recipientUserId = new Types.ObjectId(userId);

  await Notification.updateMany(
    { recipientUserId, read: false },
    { $set: { read: true, readAt: new Date() } },
  );

  const unreadCount = await Notification.countDocuments({
    recipientUserId,
    read: false,
  });

  return NextResponse.json({ unreadCount });
}
