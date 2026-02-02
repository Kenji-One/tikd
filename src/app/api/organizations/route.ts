import { NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import { auth } from "@/lib/auth";
import "@/lib/mongoose";
import Organization from "@/models/Organization";
import OrgTeam from "@/models/OrgTeam";
import User from "@/models/User";

const businessTypeValues = [
  "brand",
  "venue",
  "community",
  "artist",
  "fraternity",
  "charity",
] as const;

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

const orgSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),

  banner: z.string().url().optional(),
  logo: z.string().url().optional(),

  website: websiteSchema,
  businessType: z.enum(businessTypeValues),
  location: z.string().min(2),
  accentColor: z
    .string()
    .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/)
    .optional()
    .or(z.literal("")),
});

function isObjectId(val: unknown) {
  return typeof val === "string" && /^[a-f\d]{24}$/i.test(val);
}

type SessionLike = {
  user?: {
    id?: string | null;
    email?: string | null;
    name?: string | null;
  } | null;
} | null;

type OrgLean = {
  _id: Types.ObjectId;
  name?: string;
  description?: string;
  banner?: string;
  logo?: string;
  website?: string;
  businessType?: string;
  location?: string;
  accentColor?: string;
  ownerId?: Types.ObjectId | string;
  createdAt?: Date;
  updatedAt?: Date;
};

async function getSessionUserIdentity(session: SessionLike) {
  const userId = session?.user?.id ?? undefined;
  const emailFromSession = session?.user?.email ?? undefined;

  let email = emailFromSession?.toLowerCase();
  let name = session?.user?.name ?? "";

  if (userId && (!email || !name)) {
    const u = await User.findById(userId)
      .select("email firstName lastName username")
      .lean<{
        email?: string;
        firstName?: string;
        lastName?: string;
        username?: string;
      } | null>();

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

async function ensureOrgOwnerIsAdmin(
  orgId: Types.ObjectId,
  ownerId: string,
  ownerEmail?: string,
  ownerName?: string,
) {
  if (!ownerEmail) return;

  const ownerEmailLower = ownerEmail.toLowerCase();

  await OrgTeam.updateOne(
    { organizationId: orgId, email: ownerEmailLower },
    {
      $set: {
        // keep these in $set so it works for BOTH existing docs and upserts
        organizationId: orgId,
        email: ownerEmailLower,

        userId: new Types.ObjectId(ownerId),
        name: ownerName ?? "",
        role: "admin",
        status: "active",
        temporaryAccess: false,
        invitedBy: new Types.ObjectId(ownerId),
      },
      $unset: {
        expiresAt: "",
        inviteToken: "",
      },
    },
    { upsert: true },
  );
}

export async function POST(req: Request) {
  const session = (await auth()) as SessionLike;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json: unknown = await req.json();
  const parsed = orgSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const org = await Organization.create({
    ...parsed.data,
    ownerId: session.user.id,
  });

  // ✅ Ensure creator becomes an active admin in org team
  const ident = await getSessionUserIdentity(session);
  if (ident.userId && ident.email) {
    await ensureOrgOwnerIsAdmin(org._id, ident.userId, ident.email, ident.name);
  }

  return NextResponse.json({ _id: org._id }, { status: 201 });
}

export async function GET() {
  const session = (await auth()) as SessionLike;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ident = await getSessionUserIdentity(session);
  if (!ident.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1) orgs you own
  const ownedOrgs = await Organization.find({ ownerId: ident.userId })
    .select(
      "name description banner logo website businessType location accentColor ownerId createdAt updatedAt",
    )
    .lean<OrgLean[]>();

  // Ensure owner membership exists (self-heal for old data)
  if (ownedOrgs.length && ident.email) {
    await Promise.all(
      ownedOrgs.map((o) =>
        ensureOrgOwnerIsAdmin(o._id, ident.userId!, ident.email, ident.name),
      ),
    );
  }

  // 2) orgs where you are an active member
  const membership = await OrgTeam.find({
    status: "active",
    $or: [
      {
        userId: isObjectId(ident.userId)
          ? new Types.ObjectId(ident.userId)
          : ident.userId,
      },
      ...(ident.email ? [{ email: ident.email.toLowerCase() }] : []),
    ],
  })
    .select("organizationId role")
    .lean<Array<{ organizationId: Types.ObjectId; role: string }>>();

  const memberOrgIds = membership.map((m) => String(m.organizationId));
  const ownedOrgIds = ownedOrgs.map((o) => String(o._id));

  const allOrgIds = Array.from(
    new Set([...ownedOrgIds, ...memberOrgIds]),
  ).filter(Boolean);

  const orgs =
    allOrgIds.length > ownedOrgs.length
      ? await Organization.find({ _id: { $in: allOrgIds } })
          .select(
            "name description banner logo website businessType location accentColor ownerId createdAt updatedAt",
          )
          .lean<OrgLean[]>()
      : ownedOrgs;

  // totalMembers = count of ACTIVE org members (OrgTeam)
  const totals = await OrgTeam.aggregate<{
    _id: Types.ObjectId;
    total: number;
  }>([
    {
      $match: {
        organizationId: { $in: orgs.map((o) => o._id) },
        status: "active",
      },
    },
    { $group: { _id: "$organizationId", total: { $sum: 1 } } },
  ]);

  const totalByOrgId = new Map<string, number>(
    totals.map((t) => [String(t._id), t.total]),
  );

  const roleByOrgId = new Map<string, string>(
    membership.map((m) => [String(m.organizationId), m.role]),
  );

  const shaped = orgs.map((o) => {
    const id = String(o._id);
    const isOwner = String(o.ownerId) === String(ident.userId);
    const myRole = isOwner ? "admin" : (roleByOrgId.get(id) ?? "member");

    return {
      ...o,
      totalMembers: totalByOrgId.get(id) ?? 0,
      myRole,
    };
  });

  return NextResponse.json(shaped);
}
