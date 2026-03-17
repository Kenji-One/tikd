import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import "@/lib/mongoose";
import Organization, { IOrganization } from "@/models/Organization";
import Event from "@/models/Event";
import { serialize } from "@/lib/serialize";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  canManageOrganizationProfile,
  hasAnyOrgEventPermission,
  requireOrgMembership,
} from "@/lib/orgAccess";

type OrgLean = Omit<IOrganization, "_id" | "ownerId"> & {
  _id: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
};

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

  const access = await requireOrgMembership({
    organizationId: id,
    userId: session.user.id,
    email: session.user.email ?? undefined,
  });

  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  const include = req.nextUrl.searchParams.get("include")?.split(",") ?? [];
  const wantsEvents = include.includes("events");

  if (wantsEvents && !hasAnyOrgEventPermission(access.access)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const org = await Organization.findById(id).lean<OrgLean>().exec();
  if (!org) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 },
    );
  }

  const response: Record<string, unknown> = {
    ...serialize(org),
    access: {
      isOwner: access.access.isOwner,
      role: access.access.effectiveRole,
      permissions: access.access.permissions,
      canManageProfile: canManageOrganizationProfile(access.access),
    },
  };

  if (wantsEvents) {
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

  const access = await requireOrgMembership({
    organizationId: id,
    userId: session.user.id,
    email: session.user.email ?? undefined,
  });

  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  if (!canManageOrganizationProfile(access.access)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
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
