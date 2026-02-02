// src/app/api/organizations/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import "@/lib/mongoose";
import Organization, { IOrganization } from "@/models/Organization";
import OrgTeam from "@/models/OrgTeam";
import Event from "@/models/Event";
import { serialize } from "@/lib/serialize";
import { z } from "zod";
import { auth } from "@/lib/auth";

type OrgLean = Omit<IOrganization, "_id" | "ownerId"> & {
  _id: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
};

function isObjectId(val: string) {
  return /^[a-f\d]{24}$/i.test(val);
}

async function assertCanViewOrg(orgId: string, userId: string) {
  const org = await Organization.findById(orgId)
    .select("_id ownerId")
    .lean<{
      _id: mongoose.Types.ObjectId;
      ownerId: mongoose.Types.ObjectId;
    } | null>();

  if (!org) return { ok: false as const, status: 404 };

  if (String(org.ownerId) === String(userId)) return { ok: true as const, org };

  const member = await OrgTeam.findOne({
    organizationId: org._id,
    userId,
    status: "active",
  })
    .select("_id role")
    .lean();

  if (member) return { ok: true as const, org };

  return { ok: false as const, status: 403 };
}

async function assertCanManageOrg(orgId: string, userId: string) {
  const org = await Organization.findById(orgId)
    .select("_id ownerId")
    .lean<{
      _id: mongoose.Types.ObjectId;
      ownerId: mongoose.Types.ObjectId;
    } | null>();

  if (!org) return { ok: false as const, status: 404 };

  if (String(org.ownerId) === String(userId)) return { ok: true as const, org };

  const admin = await OrgTeam.findOne({
    organizationId: org._id,
    userId,
    role: "admin",
    status: "active",
  })
    .select("_id")
    .lean();

  if (admin) return { ok: true as const, org };

  return { ok: false as const, status: 403 };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canView = await assertCanViewOrg(id, session.user.id);
  if (!canView.ok) {
    return NextResponse.json(
      {
        error: canView.status === 404 ? "Organization not found" : "Forbidden",
      },
      { status: canView.status },
    );
  }

  const include = req.nextUrl.searchParams.get("include")?.split(",") ?? [];

  /* --------------------- fetch org ------------------------------------ */
  const org = await Organization.findById(id).lean<OrgLean>().exec();
  if (!org) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 },
    );
  }

  const response: Record<string, unknown> = { ...serialize(org) };

  /* --------------------- optionally embed events ---------------------- */
  if (include.includes("events")) {
    const status = req.nextUrl.searchParams.get("status") as
      | "upcoming"
      | "past"
      | "all"
      | null;

    const now = new Date();
    const filter =
      status === "past"
        ? { organizationId: id, date: { $lte: now } }
        : status === "upcoming" || !status
          ? { organizationId: id, date: { $gt: now } }
          : { organizationId: id };

    const events = await Event.find(filter).sort({ date: 1 }).lean().exec();
    response.events = events.map(serialize);
  }

  return NextResponse.json(response);
}

/* -------------------------- PATCH (update) ------------------------- */

const businessTypeSchema = z.enum([
  "brand",
  "venue",
  "community",
  "artist",
  "fraternity",
  "charity",
]);

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
  )
  .or(z.literal(""));

const updateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),

  banner: z.string().url().optional().or(z.literal("")),
  logo: z.string().url().optional().or(z.literal("")),

  website: websiteSchema,
  businessType: businessTypeSchema,
  location: z.string().optional().or(z.literal("")),
  accentColor: z
    .string()
    .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/)
    .optional()
    .or(z.literal("")),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const can = await assertCanManageOrg(id, session.user.id);
  if (!can.ok) {
    return NextResponse.json(
      { error: can.status === 404 ? "Organization not found" : "Forbidden" },
      { status: can.status },
    );
  }

  const json = await req.json();
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const org = await Organization.findById(id).exec();
  if (!org) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 },
    );
  }

  const data = parsed.data;

  org.name = data.name;
  org.description = data.description ?? "";
  org.banner = data.banner ?? "";
  org.logo = data.logo ?? "";
  org.website = data.website ?? "";
  org.businessType = data.businessType;
  org.location = data.location ?? "";
  org.accentColor = data.accentColor ?? "";

  await org.save();

  const plain = org.toObject() as OrgLean;
  return NextResponse.json(serialize(plain));
}
