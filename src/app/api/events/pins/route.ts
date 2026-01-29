/* ------------------------------------------------------------------ */
/*  src/app/api/events/pins/route.ts                                  */
/* ------------------------------------------------------------------ */

import { NextResponse } from "next/server";
import "@/lib/mongoose";
import { auth } from "@/lib/auth";
import Event from "@/models/Event";
import User from "@/models/User";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Canonical resolver:
 * - Prefer email -> real Mongo user _id (most reliable)
 * - Only trust session.user.id if it exists as a User._id in Mongo
 */
async function resolveMongoUserObjectId(session: any) {
  const email = session?.user?.email ? String(session.user.email) : "";
  if (email) {
    const u = await User.findOne({ email })
      .select("_id")
      .lean<{ _id: unknown }>();

    if (u?._id) {
      const idStr = String(u._id);
      return Types.ObjectId.isValid(idStr) ? new Types.ObjectId(idStr) : null;
    }
  }

  const rawId = session?.user?.id ? String(session.user.id) : "";
  if (rawId && Types.ObjectId.isValid(rawId)) {
    const exists = await User.exists({ _id: rawId });
    return exists ? new Types.ObjectId(rawId) : null;
  }

  return null;
}

/**
 * GET /api/events/pins
 * Returns ids of events pinned by current user.
 */
export async function GET() {
  const session = await auth();
  const mongoUserId = await resolveMongoUserObjectId(session);

  if (!mongoUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ✅ handle BOTH:
  // - correct ObjectId pins
  // - older/buggy string pins (mixed-type arrays happen in Mongo)
  const mongoUserIdStr = mongoUserId.toHexString();

  const rows = await Event.find({
    $or: [
      { pinnedByUserIds: mongoUserId },
      { pinnedByUserIds: mongoUserIdStr },
    ],
  })
    .select("_id")
    .lean<{ _id: unknown }[]>();

  const ids = rows.map((r) => String(r._id));

  return NextResponse.json(
    { ids },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    },
  );
}
