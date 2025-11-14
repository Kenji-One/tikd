/* ------------------------------------------------------------------ */
/*  /api/events/[id]/team/[memberId] – Update / Delete / Resend       */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";
import { z } from "zod";
import crypto from "crypto";

import { auth } from "@/lib/auth";
import Event from "@/models/Event";
import EventTeam, { EventTeamRole, EventTeamStatus } from "@/models/EventTeam";

type Ctx = { params: Promise<{ id: string; memberId: string }> };
const isObjectId = (val: string) => /^[a-f\d]{24}$/i.test(val);

async function assertCanManage(eventId: string, userId: string) {
  const owner = await Event.findOne({
    _id: eventId,
    createdByUserId: userId,
  }).lean();
  if (owner) return true;
  const admin = await EventTeam.findOne({
    eventId,
    userId,
    role: "admin",
    status: "active",
  }).lean();
  return !!admin;
}

const patchSchema = z.object({
  role: z.enum(["admin", "promoter", "scanner", "collaborator"]).optional(),
  status: z.enum(["invited", "active", "revoked"]).optional(), // "expired" is automatic
  temporaryAccess: z.boolean().optional(),
  expiresAt: z.coerce.date().optional(),
  action: z.enum(["resend"]).optional(), // resend invitation
});

/* ------------------------------- PATCH ---------------------------- */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, memberId } = await ctx.params;
  if (!isObjectId(id) || !isObjectId(memberId))
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });

  const can = await assertCanManage(id, session.user.id);
  if (!can) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const json = await req.json();
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success)
    return NextResponse.json(parsed.error.flatten(), { status: 400 });

  const { role, status, temporaryAccess, expiresAt, action } = parsed.data;

  if (action === "resend") {
    const newToken = crypto.randomBytes(20).toString("hex");
    const updated = await EventTeam.findOneAndUpdate(
      { _id: memberId, eventId: id },
      { $set: { inviteToken: newToken, status: "invited" } },
      { new: true }
    );
    if (!updated)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    // TODO: send invite email here
    return NextResponse.json(updated);
  }

  const update: any = {};
  if (role) update.role = role;
  if (status) update.status = status;
  if (typeof temporaryAccess === "boolean")
    update.temporaryAccess = temporaryAccess;
  if (expiresAt) update.expiresAt = expiresAt;

  const updated = await EventTeam.findOneAndUpdate(
    { _id: memberId, eventId: id },
    { $set: update },
    { new: true }
  );
  if (!updated)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(updated);
}

/* ------------------------------- DELETE --------------------------- */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, memberId } = await ctx.params;
  if (!isObjectId(id) || !isObjectId(memberId))
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });

  const can = await assertCanManage(id, session.user.id);
  if (!can) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const res = await EventTeam.deleteOne({ _id: memberId, eventId: id });
  if (res.deletedCount === 0)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
