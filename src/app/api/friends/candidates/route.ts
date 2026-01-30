// src/app/api/friends/candidates/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { Types } from "mongoose";
import { auth } from "@/lib/auth";
import "@/lib/mongoose";
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
  const rels = await Friendship.find({
    status: { $in: ["pending", "accepted"] },
    $or: [{ requesterId: meId }, { recipientId: meId }],
  })
    .select("requesterId recipientId")
    .lean();

  const excluded = new Set<string>([String(meId)]);
  for (const r of rels) {
    excluded.add(String(r.requesterId));
    excluded.add(String(r.recipientId));
  }

  const query: any = {
    _id: { $nin: Array.from(excluded).map((id) => new Types.ObjectId(id)) },
  };

  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [
      { email: rx },
      { username: rx },
      { firstName: rx },
      { lastName: rx },
      { phone: rx },
    ];
  }

  const users = await User.find(query)
    .select("firstName lastName username email phone image")
    .limit(25)
    .lean();

  const mapped = users.map((u) => ({
    id: String(u._id),
    name: displayName(u as any),
    email: (u as any).email ?? "",
    phone: (u as any).phone ?? "",
    avatarUrl: (u as any).image ?? "",
  }));

  return NextResponse.json(mapped);
}
