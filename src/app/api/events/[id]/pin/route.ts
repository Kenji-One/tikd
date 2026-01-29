/* ------------------------------------------------------------------ */
/*  src/app/api/events/[id]/pin/route.ts                              */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";
import { z } from "zod";
import { Types } from "mongoose";

import { auth } from "@/lib/auth";
import Event from "@/models/Event";
import Organization from "@/models/Organization";
import User from "@/models/User";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const isObjectId = (val: string): boolean => /^[a-f\d]{24}$/i.test(val);

const bodySchema = z.object({
  pinned: z.boolean(),
});

type SessionLike =
  | {
      user?: {
        id?: string | null;
        email?: string | null;
      } | null;
    }
  | null
  | undefined;

// ✅ Next route handler context type (avoids Vercel "invalid PUT export" error)
type RouteContext = { params: Record<string, string | string[]> };

function getParam(
  params: Record<string, string | string[]>,
  key: string,
): string | null {
  const v = params[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0] ?? null;
  return null;
}

/**
 * Canonical resolver:
 * - Prefer email -> real Mongo user _id (most reliable)
 * - Only trust session.user.id if it exists as a User._id in Mongo
 */
async function resolveMongoUserObjectId(session: SessionLike) {
  const email = session?.user?.email ? String(session.user.email) : "";
  if (email) {
    const u = await User.findOne({ email })
      .select("_id")
      .lean<{ _id: unknown } | null>();

    if (u?._id) {
      const idStr = String(u._id);
      return Types.ObjectId.isValid(idStr) ? new Types.ObjectId(idStr) : null;
    }
  }

  const rawId = session?.user?.id ? String(session.user.id) : "";
  if (rawId && Types.ObjectId.isValid(rawId)) {
    // IMPORTANT: only accept it if it is truly a User._id in our DB
    const exists = await User.exists({ _id: rawId });
    return exists ? new Types.ObjectId(rawId) : null;
  }

  return null;
}

/**
 * PUT /api/events/:id/pin
 * Body: { pinned: boolean }
 * Pins/unpins for current user (DB-backed => sync across devices).
 */
export async function PUT(req: NextRequest, context: RouteContext) {
  const session = (await auth()) as SessionLike;
  const mongoUserId = await resolveMongoUserObjectId(session);

  if (!mongoUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = getParam(context.params, "id");
  if (!id || !isObjectId(id)) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }

  const json: unknown = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const { pinned } = parsed.data;

  const event = await Event.findById(id)
    .select("_id organizationId createdByUserId")
    .lean<{
      _id: unknown;
      organizationId: unknown;
      createdByUserId?: unknown;
    } | null>();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // ✅ Permission checks must use canonical Mongo user id
  const mongoUserIdStr = mongoUserId.toHexString();

  const org = await Organization.findById(String(event.organizationId))
    .select("_id ownerId")
    .lean<{ _id: unknown; ownerId?: unknown } | null>();

  const isOwner = !!org && String(org.ownerId ?? "") === mongoUserIdStr;

  const isCreator =
    !!event.createdByUserId && String(event.createdByUserId) === mongoUserIdStr;

  if (!isOwner && !isCreator) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  /**
   * IMPORTANT:
   * MongoDB does NOT allow updating the same path with multiple operators
   * in one update (e.g. $addToSet + $pull on pinnedByUserIds).
   *
   * So we do it in two steps to avoid:
   * "Updating the path 'pinnedByUserIds' would create a conflict ..."
   */
  if (pinned) {
    // 1) remove any legacy string pin for this user
    await Event.updateOne(
      { _id: id },
      { $pull: { pinnedByUserIds: mongoUserIdStr } },
    ).exec();

    // 2) add canonical ObjectId pin
    await Event.updateOne(
      { _id: id },
      { $addToSet: { pinnedByUserIds: mongoUserId } },
    ).exec();
  } else {
    // remove both possible representations
    await Event.updateOne(
      { _id: id },
      { $pull: { pinnedByUserIds: { $in: [mongoUserId, mongoUserIdStr] } } },
    ).exec();
  }

  return NextResponse.json(
    { ok: true, pinned },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    },
  );
}
