// src/app/api/friends/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import "@/lib/mongoose";
import { Types } from "mongoose";
import Friendship from "@/models/Friendship";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const isObjectId = (v: string) => /^[a-f\d]{24}$/i.test(v);

type FriendUserLean = {
  _id: Types.ObjectId;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  phone?: string;
  image?: string;
};

type FriendshipLean = {
  _id: Types.ObjectId;
  requesterId: FriendUserLean;
  recipientId: FriendUserLean;
  createdAt?: Date;
};

/**
 * What we expect back from `.lean()` after populating requesterId/recipientId.
 * `_id` can be string/ObjectId depending on mongoose + lean behavior.
 */
type RawFriendshipPopulated = {
  _id: Types.ObjectId | string;
  requesterId:
    | (Omit<FriendUserLean, "_id"> & { _id: Types.ObjectId | string })
    | null;
  recipientId:
    | (Omit<FriendUserLean, "_id"> & { _id: Types.ObjectId | string })
    | null;
  createdAt?: Date | string | null;
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

export async function GET() {
  const session = await auth();
  const me = session?.user?.id;

  if (!me || !isObjectId(me)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const meId = new Types.ObjectId(me);

  const rawFriendships = (await Friendship.find({
    status: "accepted",
    $or: [{ requesterId: meId }, { recipientId: meId }],
  })
    .populate("requesterId", "firstName lastName username email phone image")
    .populate("recipientId", "firstName lastName username email phone image")
    .lean()) as unknown as RawFriendshipPopulated[];

  const friendships: FriendshipLean[] = rawFriendships.map((f) => ({
    _id: new Types.ObjectId(f._id),
    requesterId: {
      ...(f.requesterId ?? {}),
      _id: new Types.ObjectId(f.requesterId?._id ?? new Types.ObjectId()),
    },
    recipientId: {
      ...(f.recipientId ?? {}),
      _id: new Types.ObjectId(f.recipientId?._id ?? new Types.ObjectId()),
    },
    createdAt: f.createdAt ? new Date(f.createdAt) : undefined,
  }));

  const friends = friendships
    .map((f) => {
      const requester = f.requesterId;
      const recipient = f.recipientId;

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
    .filter((v): v is NonNullable<typeof v> => Boolean(v));

  return NextResponse.json(friends);
}
