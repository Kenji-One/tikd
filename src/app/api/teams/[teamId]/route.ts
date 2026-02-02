// src/app/api/teams/[teamId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";

import { auth } from "@/lib/auth";
import "@/lib/mongoose";
import Team from "@/models/Team";
import TeamMember from "@/models/TeamMember";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const isObjectId = (val: string): boolean => /^[a-f\d]{24}$/i.test(val);

/* website: truly optional – empty/undefined OK, but if present must be valid */
const websiteSchema = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) => {
      if (!value) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Must be a valid URL (e.g., https://example.com)" },
  );

const updateTeamSchema = z
  .object({
    name: z.string().min(1, "Name is required").optional(),
    description: z.string().optional(),

    banner: z.string().url().optional().or(z.literal("")),
    logo: z.string().url().optional().or(z.literal("")),

    website: websiteSchema.or(z.literal("")).optional(),
    location: z.string().min(2, "Location is required").optional(),
    accentColor: z
      .string()
      .regex(
        /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/,
        "Use a valid hex color (e.g., #6366F1)",
      )
      .optional()
      .or(z.literal("")),
  })
  .strict();

type RouteParams = { teamId: string };

async function assertCanViewTeam(teamId: string, userId: string) {
  const team = await Team.findById(teamId).select("_id ownerId").lean<{
    _id: Types.ObjectId;
    ownerId: Types.ObjectId;
  } | null>();

  if (!team) return { ok: false as const, status: 404 };

  if (String(team.ownerId) === String(userId)) return { ok: true as const };

  const member = await TeamMember.findOne({
    teamId,
    userId,
    status: "active",
  })
    .select("_id")
    .lean();

  if (member) return { ok: true as const };

  return { ok: false as const, status: 403 };
}

async function assertCanManageTeam(teamId: string, userId: string) {
  const team = await Team.findById(teamId).select("_id ownerId").lean<{
    _id: Types.ObjectId;
    ownerId: Types.ObjectId;
  } | null>();

  if (!team) return { ok: false as const, status: 404 };

  if (String(team.ownerId) === String(userId)) return { ok: true as const };

  const admin = await TeamMember.findOne({
    teamId,
    userId,
    role: "admin",
    status: "active",
  })
    .select("_id")
    .lean();

  if (admin) return { ok: true as const };

  return { ok: false as const, status: 403 };
}

/* GET: get single team (owner OR active member) */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<RouteParams> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId } = await params;
  if (!teamId || !isObjectId(teamId)) {
    return NextResponse.json({ error: "Invalid teamId" }, { status: 400 });
  }

  const can = await assertCanViewTeam(teamId, session.user.id);
  if (!can.ok) {
    return NextResponse.json(
      { error: can.status === 404 ? "Team not found" : "Forbidden" },
      { status: can.status },
    );
  }

  const team = await Team.findById(new Types.ObjectId(teamId)).lean();
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  return NextResponse.json(team);
}

/* PATCH: update team (owner OR active admin) */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<RouteParams> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId } = await params;
  if (!teamId || !isObjectId(teamId)) {
    return NextResponse.json({ error: "Invalid teamId" }, { status: 400 });
  }

  const can = await assertCanManageTeam(teamId, session.user.id);
  if (!can.ok) {
    return NextResponse.json(
      { error: can.status === 404 ? "Team not found" : "Forbidden" },
      { status: can.status },
    );
  }

  const json = await req.json();
  const parsed = updateTeamSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const updated = await Team.findOneAndUpdate(
    { _id: new Types.ObjectId(teamId) },
    { $set: parsed.data },
    { new: true, lean: true },
  );

  if (!updated) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

/* DELETE: delete team (owner-only) */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<RouteParams> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId } = await params;
  if (!teamId || !isObjectId(teamId)) {
    return NextResponse.json({ error: "Invalid teamId" }, { status: 400 });
  }

  const deleted = await Team.findOneAndDelete({
    _id: new Types.ObjectId(teamId),
    ownerId: session.user.id,
  }).lean();

  if (!deleted) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
