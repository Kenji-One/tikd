import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";
import { z } from "zod";

import { auth } from "@/lib/auth";
import {
  requireEventPermission,
  requireViewEventDraft,
} from "@/lib/eventAccess";

import Event, { IEvent } from "@/models/Event";
import Artist, { IArtist } from "@/models/Artist";
import Organization, { IOrganization } from "@/models/Organization";
import Ticket from "@/models/Ticket";
import EventTeam from "@/models/EventTeam";
import TicketType from "@/models/TicketType";
import type { HydratedDocument, Types } from "mongoose";
import { createNotification } from "@/lib/notifications";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */
const isObjectId = (val: string): boolean => /^[a-f\d]{24}$/i.test(val);

type EventLean = Omit<IEvent, "organizationId" | "artists"> & {
  organizationId: Pick<
    IOrganization,
    "_id" | "name" | "logo" | "website" | "ownerId"
  >;
  artists: Pick<IArtist, "_id" | "stageName" | "avatar" | "isVerified">[];
  _id: Types.ObjectId;
};

type EventDoc = HydratedDocument<IEvent> & {
  internalNotes?: string;
};

/* ------------------------------------------------------------------ */
/*  GET /api/events/:id                                               */
/* ------------------------------------------------------------------ */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!isObjectId(id)) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }

  const session = await auth();

  const event = await Event.findById(id)
    .populate({
      path: "artists",
      model: Artist,
      select: "stageName avatar isVerified",
    })
    .populate({
      path: "organizationId",
      model: Organization,
      select: "name logo website ownerId",
    })
    .lean<EventLean>();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (event.status === "draft") {
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canView = await requireViewEventDraft({
      eventId: String(event._id),
      userId: session.user.id,
      email: session.user.email ?? undefined,
    });

    if (!canView.ok) {
      return NextResponse.json(
        { error: canView.error },
        { status: canView.status },
      );
    }
  }

  const attendingCount = await Ticket.countDocuments({
    eventId: event._id,
    status: "paid",
  });

  const attendeesPreview = await Ticket.aggregate([
    { $match: { eventId: event._id, status: "paid" } },
    { $group: { _id: "$ownerId" } },
    { $sample: { size: 4 } },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    { $project: { _id: "$user._id", image: "$user.image" } },
  ]);

  const now = new Date();

  const ticketTypesDocs = await TicketType.find({
    eventId: event._id,
    accessMode: "public",
    availabilityStatus: "on_sale",
    $and: [
      {
        $or: [{ salesStartAt: null }, { salesStartAt: { $lte: now } }],
      },
      {
        $or: [{ salesEndAt: null }, { salesEndAt: { $gte: now } }],
      },
    ],
  })
    .sort({ sortOrder: 1, createdAt: 1 })
    .select("name price currency feeMode totalQuantity soldCount design")
    .lean<
      Array<{
        _id: Types.ObjectId;
        name: string;
        price: number;
        currency: string;
        feeMode: "pass_on" | "absorb";
        totalQuantity: number | null;
        soldCount: number;
        design?: { backgroundUrl?: string | null } | null;
      }>
    >()
    .exec();

  const ticketTypes = ticketTypesDocs.map((ticketType) => {
    const remaining =
      ticketType.totalQuantity === null
        ? 999999
        : Math.max(
            (ticketType.totalQuantity ?? 0) - (ticketType.soldCount ?? 0),
            0,
          );

    return {
      _id: String(ticketType._id),
      label: ticketType.name,
      price: ticketType.price,
      quantity: remaining,
      currency: ticketType.currency,
      feesIncluded: ticketType.feeMode === "absorb",
      image: ticketType.design?.backgroundUrl || "",
    };
  });

  return NextResponse.json({
    ...event,
    organization: event.organizationId,
    attendingCount,
    attendeesPreview,
    ticketTypes,
  });
}

/* ------------------------------------------------------------------ */
/*  PATCH /api/events/:id                                             */
/* ------------------------------------------------------------------ */

const artistInputSchema = z.object({
  name: z.string().min(1),
  image: z.string().url().optional(),
});

const mediaItemSchema = z.object({
  url: z.string().url(),
  type: z.enum(["image", "video"]),
  caption: z.string().max(120).optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  date: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  minAge: z.coerce.number().int().min(0).max(99).optional(),
  location: z.string().min(1).optional(),
  image: z.string().url().optional(),
  media: z.array(mediaItemSchema).max(30).optional(),
  categories: z.array(z.string()).optional(),
  promoters: z.array(z.string().email()).optional(),
  message: z.string().optional(),
  artists: z.array(artistInputSchema).optional(),
  status: z.enum(["published", "draft"]).optional(),
  internalNotes: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!isObjectId(id)) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }

  const body: unknown = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const data = parsed.data;

  const editFieldKeys = [
    "title",
    "description",
    "date",
    "endDate",
    "minAge",
    "location",
    "image",
    "media",
    "categories",
    "promoters",
    "message",
    "artists",
    "internalNotes",
  ] as const;

  const hasEditChanges = editFieldKeys.some((key) => data[key] !== undefined);
  const hasStatusChange = data.status !== undefined;

  if (!hasEditChanges && !hasStatusChange) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 },
    );
  }

  if (hasEditChanges) {
    const canEdit = await requireEventPermission({
      eventId: id,
      userId: session.user.id,
      email: session.user.email ?? undefined,
      permission: "events.edit",
    });

    if (!canEdit.ok) {
      return NextResponse.json(
        { error: canEdit.error },
        { status: canEdit.status },
      );
    }
  }

  if (hasStatusChange) {
    const canPublish = await requireEventPermission({
      eventId: id,
      userId: session.user.id,
      email: session.user.email ?? undefined,
      permission: "events.publish",
    });

    if (!canPublish.ok) {
      return NextResponse.json(
        { error: canPublish.error },
        { status: canPublish.status },
      );
    }
  }

  const event = (await Event.findById(id).exec()) as EventDoc | null;
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const prevStatus = event.status;

  if (data.title !== undefined) event.title = data.title;
  if (data.description !== undefined) event.description = data.description;
  if (data.date !== undefined) event.date = data.date;
  if (data.endDate !== undefined) event.endDate = data.endDate;

  if (event.endDate && event.date) {
    const ms = event.endDate.getTime() - event.date.getTime();
    if (Number.isFinite(ms) && ms > 0) {
      event.durationMinutes = Math.round(ms / 60000);
    } else {
      event.durationMinutes = undefined;
    }
  }

  if (data.minAge !== undefined) event.minAge = data.minAge;
  if (data.location !== undefined) event.location = data.location;
  if (data.image !== undefined) event.image = data.image;

  if (data.media !== undefined) {
    event.media = data.media as unknown as IEvent["media"];
  }

  if (data.categories !== undefined) event.categories = data.categories;
  if (data.promoters !== undefined) event.promoters = data.promoters;
  if (data.message !== undefined) event.message = data.message;

  if (data.artists !== undefined) {
    const prevIds = Array.isArray(event.artists) ? event.artists : [];

    if (prevIds.length > 0) {
      try {
        await Artist.deleteMany({ _id: { $in: prevIds } });
      } catch {
        // ignore cleanup errors
      }
    }

    const newIds = await Promise.all(
      data.artists.map(async (artist) => {
        const doc = await Artist.create({
          stageName: artist.name,
          avatar: artist.image ?? "",
        });
        return doc._id;
      }),
    );

    event.artists = newIds as unknown as Types.ObjectId[];
  }

  if (data.status !== undefined) event.status = data.status;

  if (data.internalNotes !== undefined) {
    event.internalNotes = data.internalNotes;
  }

  await event.save();

  const didPublishNow = prevStatus === "draft" && event.status === "published";
  if (didPublishNow) {
    const recipients = new Set<string>();

    if (event.createdByUserId) recipients.add(String(event.createdByUserId));

    const org = await Organization.findById(event.organizationId)
      .select("_id ownerId name")
      .lean<{
        _id: Types.ObjectId;
        ownerId: Types.ObjectId;
        name?: string;
      } | null>();

    if (org?.ownerId) recipients.add(String(org.ownerId));

    const team = await EventTeam.find({
      eventId: event._id,
      status: "active",
      userId: { $ne: null },
    })
      .select("userId")
      .lean<Array<{ userId?: Types.ObjectId | null }>>();

    for (const row of team) {
      if (row.userId) recipients.add(String(row.userId));
    }

    const title = "Event published";
    const message = `“${event.title}” is now live.`;
    const href = `/dashboard/events/${String(event._id)}`;

    await Promise.all(
      Array.from(recipients).map((userId) =>
        createNotification({
          recipientUserId: userId,
          type: "event.published",
          title,
          message,
          href,
        }),
      ),
    );
  }

  return NextResponse.json({ ok: true });
}
