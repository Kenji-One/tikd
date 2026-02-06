// src/app/api/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import "@/lib/mongoose";
import { auth } from "@/lib/auth";
import Notification from "@/models/Notification";

type SessionLike = {
  user?: { id?: string | null } | null;
} | null;

const isObjectId = (val: string) => /^[a-f\d]{24}$/i.test(val);

export async function GET(req: NextRequest) {
  const session = (await auth()) as SessionLike;
  const userId = String(session?.user?.id || "");
  if (!userId || !isObjectId(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tab = (searchParams.get("tab") || "all") as "all" | "unread";
  const limitRaw = searchParams.get("limit");
  const limit = Math.min(
    Math.max(parseInt(limitRaw || "30", 10) || 30, 1),
    100,
  );

  const recipientUserId = new Types.ObjectId(userId);

  const filter: Record<string, any> = { recipientUserId };
  if (tab === "unread") filter.read = false;

  const [items, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("_id type title message href read createdAt")
      .lean<
        Array<{
          _id: Types.ObjectId;
          type: string;
          title: string;
          message?: string;
          href?: string;
          read: boolean;
          createdAt: Date;
        }>
      >(),
    Notification.countDocuments({ recipientUserId, read: false }),
  ]);

  return NextResponse.json({
    unreadCount,
    items: items.map((n) => ({
      id: String(n._id),
      type: n.type,
      title: n.title,
      message: n.message || "",
      href: n.href || "",
      read: Boolean(n.read),
      createdAt: n.createdAt.toISOString(),
    })),
  });
}

const createSchema = z.object({
  // optional: create for someone else (admin tooling later)
  recipientUserId: z.string().length(24).optional(),
  type: z.enum([
    "event.created",
    "event.published",
    "ticket.sold",
    "org.created",
    "org.invite",
    "system",
  ]),
  title: z.string().min(1),
  message: z.string().optional(),
  href: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = (await auth()) as SessionLike;
  const me = String(session?.user?.id || "");
  if (!me || !isObjectId(me)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json: unknown = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const recipient = parsed.data.recipientUserId || me;
  if (!isObjectId(recipient)) {
    return NextResponse.json(
      { error: "Invalid recipientUserId" },
      { status: 400 },
    );
  }

  const doc = await Notification.create({
    recipientUserId: new Types.ObjectId(recipient),
    type: parsed.data.type,
    title: parsed.data.title,
    message: parsed.data.message ?? "",
    href: parsed.data.href ?? "",
    read: false,
  });

  return NextResponse.json({ id: String(doc._id) }, { status: 201 });
}
