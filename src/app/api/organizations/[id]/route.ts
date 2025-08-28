// src/app/api/organizations/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import "@/lib/mongoose";
import Organization, { IOrganization } from "@/models/Organization";
import Event from "@/models/Event";
import { serialize } from "@/lib/serialize";

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

  const include = req.nextUrl.searchParams.get("include")?.split(",") ?? [];

  /* --------------------- fetch org ------------------------------------ */
  const org = await Organization.findById(id).lean<OrgLean>().exec();
  if (!org) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
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
