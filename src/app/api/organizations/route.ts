import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import "@/lib/mongoose"; // runs the connection once
import Organization from "@/models/Organization";

const orgSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  logo: z.string().url().optional(),
  website: z.string().url().optional(),
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
