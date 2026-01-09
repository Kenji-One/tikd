// src/app/api/organizations/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import "@/lib/mongoose";
import Organization, { IOrganization } from "@/models/Organization";
import Event from "@/models/Event";
import { serialize } from "@/lib/serialize";
import { z } from "zod";
import { auth } from "@/lib/auth";

type OrgLean = Omit<IOrganization, "_id" | "ownerId"> & {
  _id: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const include = req.nextUrl.searchParams.get("include")?.split(",") ?? [];

  /* --------------------- fetch org ------------------------------------ */
  const org = await Organization.findById(id).lean<OrgLean>().exec();
  if (!org) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
    );
  }

  // ✅ security: only allow owner for now
  if (org.ownerId.toString() !== session.user.id) {
    return NextResponse.json(
      { error: "Forbidden – not your organization" },
      { status: 403 }
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

const updateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  logo: z.string().url().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  businessType: businessTypeSchema,
  location: z.string().optional().or(z.literal("")),
  accentColor: z.string().optional().or(z.literal("")),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      { status: 404 }
    );
  }

  if (org.ownerId.toString() !== session.user.id) {
    return NextResponse.json(
      { error: "Forbidden – not your organization" },
      { status: 403 }
    );
  }

  const data = parsed.data;

  org.name = data.name;
  org.description = data.description ?? "";
  org.logo = data.logo ?? "";
  org.website = data.website ?? "";
  org.businessType = data.businessType;
  org.location = data.location ?? "";
  org.accentColor = data.accentColor ?? "";

  await org.save();

  const plain = org.toObject() as OrgLean;
  return NextResponse.json(serialize(plain));
}
