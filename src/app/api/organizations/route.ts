// src/app/api/organizations/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import "@/lib/mongoose"; // runs the connection once
import Organization from "@/models/Organization";

const businessTypeValues = [
  "brand",
  "venue",
  "community",
  "artist",
  "fraternity",
  "charity",
] as const;

// website: truly optional – empty/undefined OK, but if present must be a valid URL
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

  /** ✅ NEW */
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

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json();
  const parsed = orgSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const org = await Organization.create({
    ...parsed.data,
    ownerId: session.user.id,
  });

  return NextResponse.json({ _id: org._id }, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const list = await Organization.find({ ownerId: session.user.id }).lean();
  return NextResponse.json(list);
}
