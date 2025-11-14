import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";
import { z } from "zod";
import { auth } from "@/lib/auth";
import PromotionalTeam from "@/models/PromotionalTeam";

/* GET: list my teams */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const teams = await PromotionalTeam.find({ ownerId: session.user.id }).lean();
  return NextResponse.json(teams);
}

/* POST: create team */
const bodySchema = z.object({
  name: z.string().min(1),
  members: z.array(z.string().email()).default([]),
});
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }
  const team = await PromotionalTeam.create({
    ownerId: session.user.id,
    name: parsed.data.name,
    members: parsed.data.members,
  });
  return NextResponse.json({ _id: team._id }, { status: 201 });
}
