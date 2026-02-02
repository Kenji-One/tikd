import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import { auth } from "@/lib/auth";
import "@/lib/mongoose";
import Team from "@/models/Team";
import TeamMember from "@/models/TeamMember";
import User from "@/models/User";

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

const teamSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),

  banner: z.string().url().optional(),
  logo: z.string().url().optional(),

  website: websiteSchema,
  location: z.string().min(2, "Location is required"),
  accentColor: z
    .string()
    .regex(
      /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/,
      "Use a valid hex color (e.g., #6366F1)",
    )
    .optional()
    .or(z.literal("")),
});

function isObjectId(val: string) {
  return /^[a-f\d]{24}$/i.test(val);
}

/* ------------------------------ Types ------------------------------ */
type SessionLike = {
  user?: {
    id?: string | null;
    email?: string | null;
    name?: string | null;
  } | null;
} | null;

type SessionIdentity = {
  userId?: string;
  email?: string;
  name: string;
};

type UserLean = {
  email?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
};

type TeamLean = {
  _id: Types.ObjectId;
  ownerId?: Types.ObjectId | string;
  [k: string]: unknown;
};

async function getSessionUserIdentity(
  session: SessionLike,
): Promise<SessionIdentity> {
  const userId = (session?.user?.id ?? undefined) || undefined;
  const emailFromSession = (session?.user?.email ?? undefined) || undefined;

  let email = emailFromSession?.toLowerCase();
  let name = (session?.user?.name ?? "") || "";

  if (userId && (!email || !name)) {
    const u = await User.findById(userId)
      .select("email firstName lastName username")
      .lean<UserLean | null>();

    if (u) {
      if (!email && u.email) email = u.email.toLowerCase();

      if (!name) {
        name =
          u.firstName || u.lastName
            ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()
            : (u.username ?? "");
      }
    }
  }

  return { userId, email, name: name.trim() };
}

async function ensureTeamOwnerIsAdmin(
  teamId: Types.ObjectId,
  ownerId: string,
  ownerEmail?: string,
  ownerName?: string,
) {
  if (!ownerEmail) return;

  const ownerEmailLower = ownerEmail.toLowerCase();
  const ownerObjId = new Types.ObjectId(ownerId);

  await TeamMember.updateOne(
    { teamId, email: ownerEmailLower },
    {
      $setOnInsert: {
        teamId,
        email: ownerEmailLower,
      },

      $set: {
        userId: ownerObjId,
        name: ownerName ?? "",
        role: "admin",
        status: "active",
        temporaryAccess: false,
        invitedBy: ownerObjId,
      },

      $unset: {
        expiresAt: "",
        inviteToken: "",
      },
    },
    { upsert: true },
  );
}

/* GET: list teams I own OR where I'm an active member */
export async function GET() {
  const session = (await auth()) as SessionLike;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ident = await getSessionUserIdentity(session);
  if (!ident.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownedTeams = await Team.find({ ownerId: ident.userId }).lean<
    TeamLean[]
  >();

  // self-heal: ensure owner membership exists
  if (ownedTeams.length && ident.email) {
    await Promise.all(
      ownedTeams.map((t) =>
        ensureTeamOwnerIsAdmin(t._id, ident.userId!, ident.email, ident.name),
      ),
    );
  }

  const membership = await TeamMember.find({
    status: "active",
    $or: [
      ...(isObjectId(ident.userId)
        ? [{ userId: new Types.ObjectId(ident.userId) }]
        : []),
      ...(ident.email ? [{ email: ident.email.toLowerCase() }] : []),
    ],
  })
    .select("teamId role")
    .lean<Array<{ teamId: Types.ObjectId; role: string }>>();

  const memberTeamIds = membership.map((m) => String(m.teamId));
  const ownedTeamIds = ownedTeams.map((t) => String(t._id));
  const allTeamIds = Array.from(
    new Set([...ownedTeamIds, ...memberTeamIds]),
  ).filter(Boolean);

  const teams =
    allTeamIds.length > ownedTeams.length
      ? await Team.find({ _id: { $in: allTeamIds } }).lean<TeamLean[]>()
      : ownedTeams;

  const totals = await TeamMember.aggregate<{
    _id: Types.ObjectId;
    total: number;
  }>([
    { $match: { teamId: { $in: teams.map((t) => t._id) }, status: "active" } },
    { $group: { _id: "$teamId", total: { $sum: 1 } } },
  ]);

  const totalByTeamId = new Map<string, number>(
    totals.map((t) => [String(t._id), t.total]),
  );

  const roleByTeamId = new Map<string, string>(
    membership.map((m) => [String(m.teamId), m.role]),
  );

  const shaped = teams.map((t) => {
    const id = String(t._id);
    const isOwner = String(t.ownerId) === String(ident.userId);
    const myRole = isOwner ? "admin" : (roleByTeamId.get(id) ?? "member");

    return {
      ...t,
      totalMembers: totalByTeamId.get(id) ?? 0,
      myRole,
    };
  });

  return NextResponse.json(shaped);
}

/* POST: create team */
export async function POST(req: NextRequest) {
  const session = (await auth()) as SessionLike;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json: unknown = await req.json();
  const parsed = teamSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const team = await Team.create({
    ...parsed.data,
    ownerId: session.user.id,
  });

  // ✅ Ensure creator becomes an active admin in team members
  const ident = await getSessionUserIdentity(session);
  if (ident.userId && ident.email) {
    await ensureTeamOwnerIsAdmin(
      team._id as Types.ObjectId,
      ident.userId,
      ident.email,
      ident.name,
    );
  }

  return NextResponse.json({ _id: team._id }, { status: 201 });
}
