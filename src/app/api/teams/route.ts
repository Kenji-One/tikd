// src/app/api/teams/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import "@/lib/mongoose";
import Team from "@/models/Team";

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

/* GET: list my teams */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teams = await Team.find({ ownerId: session.user.id }).lean();
  return NextResponse.json(teams);
}

/* POST: create team */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json();
  const parsed = teamSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const team = await Team.create({
    ...parsed.data,
    ownerId: session.user.id,
  });

  return NextResponse.json({ _id: team._id }, { status: 201 });
}
