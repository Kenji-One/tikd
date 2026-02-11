// src/app/api/friends/requests/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import { auth } from "@/lib/auth";
import "@/lib/mongoose";
import Friendship from "@/models/Friendship";
import User from "@/models/User";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const isObjectId = (v: string) => /^[a-f\d]{24}$/i.test(v);

type PopulatedUserLean = {
  _id: Types.ObjectId;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  image?: string;
};

type IncomingRequestLean = {
  _id: Types.ObjectId;
  requesterId: PopulatedUserLean;
  createdAt?: Date;
};

function displayName(u: {
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
}) {
  const full = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  return full || u.username || u.email || "User";
}

/**
 * ✅ Accept either:
 * - { toUserIds: string[] }  (legacy / existing)
 * - { toEmail: string }      (new, privacy-friendly UX)
 */
const sendSchema = z.union([
  z.object({
    toUserIds: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    toEmail: z.string().trim().toLowerCase().email(),
  }),
]);

export async function GET() {
  const session = await auth();
  const me = session?.user?.id;

  if (!me || !isObjectId(me)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const meId = new Types.ObjectId(me);

  const incoming = (await Friendship.find({
    recipientId: meId,
    status: "pending",
  })
    .populate("requesterId", "firstName lastName username email image")
    .sort({ createdAt: -1 })
    .lean()) as unknown as IncomingRequestLean[];

  const mapped = incoming.map((r) => {
    const from = r.requesterId;

    return {
      id: String(r._id), // request id (used for accept/decline)
      fromUserId: from?._id ? String(from._id) : "",
      name: displayName(from ?? {}),
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

  const json: unknown = await req.json().catch(() => null);
  const parsed = sendSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const meId = new Types.ObjectId(me);

  // Build recipient list (objectIds) from either mode
  let toIds: Types.ObjectId[] = [];
  let toEmails: string[] = [];

  if ("toUserIds" in parsed.data) {
    const uniqueTo = Array.from(new Set(parsed.data.toUserIds)).filter(
      (id) => isObjectId(id) && id !== me,
    );

    if (!uniqueTo.length) {
      return NextResponse.json(
        { error: "No valid recipients provided." },
        { status: 400 },
      );
    }

    toIds = uniqueTo.map((id) => new Types.ObjectId(id));
  } else {
    const email = parsed.data.toEmail.trim().toLowerCase();
    toEmails = [email];

    // Find user by email (privacy-friendly UX)
    const user = await User.findOne({ email })
      .select("_id email")
      .lean<{ _id: Types.ObjectId; email?: string } | null>();

    if (!user?._id) {
      // Don’t leak extra info; just say not found
      return NextResponse.json(
        { error: "No user found with that email." },
        { status: 404 },
      );
    }

    if (String(user._id) === String(meId)) {
      return NextResponse.json(
        { error: "You cannot send a request to yourself." },
        { status: 400 },
      );
    }

    toIds = [new Types.ObjectId(user._id)];
  }

  const created: string[] = [];
  const skipped: Array<{
    toUserId?: string;
    toEmail?: string;
    reason: string;
  }> = [];

  for (let i = 0; i < toIds.length; i++) {
    const toId = toIds[i];
    const toEmail = toEmails[i]; // may be undefined in toUserIds mode

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
      skipped.push({
        toUserId: String(toId),
        toEmail,
        reason: "already_friends",
      });
      continue;
    }

    // Pending already exists
    if (existing.status === "pending") {
      skipped.push({
        toUserId: String(toId),
        toEmail,
        reason: "already_pending",
      });
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
