import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";
import { z } from "zod";
import { auth } from "@/lib/auth";
import Event from "@/models/Event";
import Organization from "@/models/Organization";
import Artist from "@/models/Artist";

/* ------------------------- Schemas ------------------------- */
const artistInputSchema = z.object({
  name: z.string().min(1),
  image: z.string().url().optional(),
});

const bodySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),

  // start datetime in ISO, required
  date: z.coerce.date(),

  // extra metadata
  duration: z
    .string()
    .regex(/^([0-1]\d|2[0-3]):([0-5]\d)$/)
    .optional(),
  minAge: z.number().int().min(0).max(99).optional(),

  location: z.string().min(1),
  image: z.string().url().optional(),
  organizationId: z.string().length(24),

  categories: z.array(z.string()).default([]),
  coHosts: z.array(z.string().email()).default([]),
  promotionalTeamEmails: z.array(z.string().email()).default([]),
  promoters: z.array(z.string().email()).default([]),
  message: z.string().optional(),

  artists: z.array(artistInputSchema).default([]),

  status: z.enum(["published", "draft"]).default("published"),
});

/* --------------------------- GET --------------------------- */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const owned = searchParams.get("owned");

  const filter =
    owned === "1"
      ? { createdByUserId: session.user.id }
      : { date: { $gte: new Date() }, status: "published" };

  const events = await Event.find(filter).lean();
  return NextResponse.json(events);
}

/* --------------------------- POST -------------------------- */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  // Ensure org belongs to user
  const org = await Organization.findOne({
    _id: parsed.data.organizationId,
    ownerId: session.user.id,
  });
  if (!org) {
    return NextResponse.json(
      { error: "Organization not found or not yours" },
      { status: 403 }
    );
  }

  // Create Artist docs
  const artistIds = await Promise.all(
    parsed.data.artists.map(async (a) => {
      const doc = await Artist.create({
        stageName: a.name,
        avatar: a.image ?? "",
      });
      return doc._id;
    })
  );

  // Convert HH:MM -> minutes
  const durationMinutes = parsed.data.duration
    ? (() => {
        const [h, m] = parsed.data.duration
          .split(":")
          .map((n) => parseInt(n, 10));
        return h * 60 + m;
      })()
    : undefined;

  const event = await Event.create({
    title: parsed.data.title,
    description: parsed.data.description,
    date: parsed.data.date,
    durationMinutes,
    minAge: parsed.data.minAge,
    location: parsed.data.location,
    image: parsed.data.image,

    categories: parsed.data.categories,
    coHosts: parsed.data.coHosts,
    promotionalTeamEmails: parsed.data.promotionalTeamEmails,
    promoters: parsed.data.promoters,
    message: parsed.data.message,

    organizationId: parsed.data.organizationId,
    artists: artistIds,
    createdByUserId: session.user.id,
    status: parsed.data.status,
  });

  return NextResponse.json({ _id: event._id }, { status: 201 });
}
