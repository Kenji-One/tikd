// src/app/api/friends/candidates/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { Types, type FilterQuery } from "mongoose";
import { auth } from "@/lib/auth";
import "@/lib/mongoose";
import Friendship from "@/models/Friendship";
import User from "@/models/User";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const isObjectId = (v: string) => /^[a-f\d]{24}$/i.test(v);

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type CandidateUserLean = {
  _id: Types.ObjectId;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  phone?: string;
  image?: string;
};

type FriendshipIdsLean = {
  requesterId: Types.ObjectId;
  recipientId: Types.ObjectId;
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

export async function GET(req: NextRequest) {
  const session = await auth();
  const me = session?.user?.id;

  if (!me || !isObjectId(me)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const meId = new Types.ObjectId(me);

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  // Find existing relationships to exclude (pending + accepted)
  const rels = (await Friendship.find({
    status: { $in: ["pending", "accepted"] },
    $or: [{ requesterId: meId }, { recipientId: meId }],
  })
    .select("requesterId recipientId")
    .lean()) as FriendshipIdsLean[];

  const excluded = new Set<string>([String(meId)]);
  for (const r of rels) {
    excluded.add(String(r.requesterId));
    excluded.add(String(r.recipientId));
  }

  const excludedObjectIds = Array.from(excluded)
    .filter(isObjectId)
    .map((id) => new Types.ObjectId(id));

  const query: FilterQuery<CandidateUserLean> = {
    _id: { $nin: excludedObjectIds },
  };

  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    query.$or = [
      { email: rx },
      { username: rx },
      { firstName: rx },
      { lastName: rx },
      { phone: rx },
    ];
  }

  const users = (await User.find(query)
    .select("firstName lastName username email phone image")
    .limit(25)
    .lean()) as unknown as CandidateUserLean[];

  const mapped = users.map((u) => ({
    id: String(u._id),
    name: displayName(u),
    email: u.email ?? "",
    phone: u.phone ?? "",
    avatarUrl: u.image ?? "",
  }));

  return NextResponse.json(mapped);
}
