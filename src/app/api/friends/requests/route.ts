// src/app/api/friends/requests/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import { auth } from "@/lib/auth";
import "@/lib/mongoose";
import Friendship from "@/models/Friendship";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const isObjectId = (v: string) => /^[a-f\d]{24}$/i.test(v);

function displayName(u: {
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
}) {
  const full = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  return full || u.username || u.email || "User";
}

const sendSchema = z.object({
  toUserIds: z.array(z.string().min(1)).min(1),
});

export async function GET() {
  const session = await auth();
  const me = session?.user?.id;

  if (!me || !isObjectId(me)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const meId = new Types.ObjectId(me);

  const incoming = await Friendship.find({
    recipientId: meId,
    status: "pending",
  })
    .populate("requesterId", "firstName lastName username email image")
    .sort({ createdAt: -1 })
    .lean();

  const mapped = incoming.map((r) => {
    const from = r.requesterId as any;
    return {
      id: String(r._id), // request id (used for accept/decline)
      fromUserId: String(from?._id ?? ""),
      name: displayName(from),
      avatarUrl: from?.image ?? "",
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
    };
  });

  return NextResponse.json(mapped);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const me = session?.user?.id;

  if (!me || !isObjectId(me)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = sendSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const meId = new Types.ObjectId(me);

  const uniqueTo = Array.from(new Set(parsed.data.toUserIds)).filter(
    (id) => isObjectId(id) && id !== me,
  );

  if (!uniqueTo.length) {
    return NextResponse.json(
      { error: "No valid recipients provided." },
      { status: 400 },
    );
  }

  const created: string[] = [];
  const skipped: Array<{ toUserId: string; reason: string }> = [];

  for (const to of uniqueTo) {
    const toId = new Types.ObjectId(to);

    // Check both directions
    const existing = await Friendship.findOne({
      $or: [
        { requesterId: meId, recipientId: toId },
        { requesterId: toId, recipientId: meId },
      ],
    });

    if (!existing) {
      const doc = await Friendship.create({
        requesterId: meId,
        recipientId: toId,
        status: "pending",
      });
      created.push(String(doc._id));
      continue;
    }

    // Already friends
    if (existing.status === "accepted") {
      skipped.push({ toUserId: to, reason: "already_friends" });
      continue;
    }

    // Pending already exists
    if (existing.status === "pending") {
      skipped.push({ toUserId: to, reason: "already_pending" });
      continue;
    }

    // Declined previously → allow re-send by overwriting to pending (from me → to)
    existing.requesterId = meId;
    existing.recipientId = toId;
    existing.status = "pending";
    await existing.save();

    created.push(String(existing._id));
  }

  return NextResponse.json({ ok: true, created, skipped }, { status: 201 });
}
