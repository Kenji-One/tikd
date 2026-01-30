// src/app/api/friends/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import "@/lib/mongoose";
import { Types } from "mongoose";
import Friendship from "@/models/Friendship";
import User from "@/models/User";

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

export async function GET() {
  const session = await auth();
  const me = session?.user?.id;

  if (!me || !isObjectId(me)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const meId = new Types.ObjectId(me);

  const friendships = await Friendship.find({
    status: "accepted",
    $or: [{ requesterId: meId }, { recipientId: meId }],
  })
    .populate("requesterId", "firstName lastName username email phone image")
    .populate("recipientId", "firstName lastName username email phone image")
    .lean();

  const friends = friendships
    .map((f) => {
      const requester = f.requesterId as any;
      const recipient = f.recipientId as any;

      const other =
        String(requester?._id) === String(meId) ? recipient : requester;

      if (!other?._id) return null;

      return {
        id: String(other._id),
        friendshipId: String(f._id),

        name: displayName(other),
        email: other.email ?? "",
        phone: other.phone ?? "",
        avatarUrl: other.image ?? "",

        // Keep UI fields stable (you can later map org/team roles here)
        role: "Contact",
        company: "Tikd",
        companyHref: "#",

        createdAt: f.createdAt ? new Date(f.createdAt).toISOString() : null,
      };
    })
    .filter(Boolean);

  return NextResponse.json(friends);
}
