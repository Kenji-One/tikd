// src/app/api/tickets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";

import Ticket, { type ITicket } from "@/models/Ticket";
import Event, { type IEvent } from "@/models/Event";
import TicketType, {
  type ITicketDesign,
  type ITicketType,
} from "@/models/TicketType";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "auto";
export const maxDuration = 15;

/* ------------------------------------------------------------------ */
/* Query parsing                                                       */
/* ------------------------------------------------------------------ */

const QuerySchema = z.object({
  scope: z.enum(["self"]).default("self"),
  status: z
    .enum(["reserved", "paid", "scanned", "cancelled", "refunded"])
    .optional(),
});

type EventPreview = Pick<
  IEvent,
  "_id" | "title" | "date" | "image" | "location"
>;

type TicketTypePreview = Pick<ITicketType, "_id" | "name" | "design">;

type TicketWithRelations = Omit<ITicket, "eventId" | "ticketTypeId"> & {
  eventId: EventPreview | null;
  ticketTypeId?: TicketTypePreview | null;
};

type TicketDesignResponse = {
  layout?: "horizontal" | "vertical" | "down" | "up";
  brandColor?: string;
  logoUrl?: string;
  backgroundUrl?: string;
  footerText?: string;
  watermarkEnabled?: boolean;
  eventInfoEnabled?: boolean;
  logoEnabled?: boolean;
  qrSize?: number;
  qrBorderRadius?: number;
};

type TicketApiResponse = {
  _id: string;

  eventId: string | null;
  eventTitle: string | null;
  event: {
    title: string | null;
    date: string | null;
    location: string | null;
    image: string | null;
  };

  date: string | null;
  dateLabel: string | null;
  venue: string | null;
  location: string | null;
  eventImg: string | null;
  image: string | null;

  qty: number;
  quantity: number;
  badge?: string;

  qrUrl?: string;
  qrSvg?: string;
  qrCode: string;

  reference: string;
  refCode: string;

  ticketTypeLabel: string;
  ticketType: string;

  status: ITicket["status"];
  price: number;
  currency: string;

  seat: ITicket["seat"] | null;

  design: TicketDesignResponse | null;
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatDateLabel(value?: Date | string | null): string | null {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildTicketReference(input: {
  ticketId: string;
  orderNumber?: number | null;
}): string {
  if (
    typeof input.orderNumber === "number" &&
    Number.isFinite(input.orderNumber) &&
    input.orderNumber > 0
  ) {
    return `ORD-${String(input.orderNumber).padStart(6, "0")}`;
  }

  return `TIX-${input.ticketId.slice(-8).toUpperCase()}`;
}

function normalizeDesign(
  design?: Partial<ITicketDesign> | null,
): TicketDesignResponse | null {
  if (!design) return null;

  return {
    layout: design.layout,
    brandColor: design.brandColor,
    logoUrl: design.logoUrl,
    backgroundUrl: design.backgroundUrl,
    footerText: design.footerText,
    watermarkEnabled: design.watermarkEnabled,
    eventInfoEnabled: design.eventInfoEnabled,
    logoEnabled: design.logoEnabled,
    qrSize: design.qrSize,
    qrBorderRadius: design.qrBorderRadius,
  };
}

function buildBadge(status: ITicket["status"]): string | undefined {
  switch (status) {
    case "scanned":
      return "Scanned";
    case "refunded":
      return "Refunded";
    case "cancelled":
      return "Cancelled";
    case "reserved":
      return "Reserved";
    default:
      return undefined;
  }
}

function serializeTicket(ticket: TicketWithRelations): TicketApiResponse {
  const ticketId = String(ticket._id);
  const eventDate =
    ticket.eventId?.date instanceof Date
      ? ticket.eventId.date.toISOString()
      : ticket.eventId?.date
        ? new Date(ticket.eventId.date).toISOString()
        : null;

  const resolvedTicketTypeLabel =
    ticket.ticketTypeId?.name?.trim() ||
    ticket.ticketTypeLabel?.trim() ||
    ticket.ticketType?.trim() ||
    "General admission";

  const refCode = buildTicketReference({
    ticketId,
    orderNumber: ticket.orderNumber ?? null,
  });

  const eventTitle = ticket.eventId?.title ?? null;
  const eventLocation = ticket.eventId?.location ?? null;
  const eventImage = ticket.eventId?.image ?? null;

  return {
    _id: ticketId,

    eventId: ticket.eventId?._id ? String(ticket.eventId._id) : null,
    eventTitle,
    event: {
      title: eventTitle,
      date: eventDate,
      location: eventLocation,
      image: eventImage,
    },

    date: eventDate,
    dateLabel: formatDateLabel(ticket.eventId?.date ?? null),
    venue: eventLocation,
    location: eventLocation,
    eventImg: eventImage,
    image: eventImage,

    qty: 1,
    quantity: 1,
    badge: buildBadge(ticket.status),

    qrUrl: undefined,
    qrSvg: undefined,
    qrCode: ticket.qrCode?.trim() || ticketId,

    reference: refCode,
    refCode,

    ticketTypeLabel: resolvedTicketTypeLabel,
    ticketType: resolvedTicketTypeLabel,

    status: ticket.status,
    price: ticket.price,
    currency: ticket.currency,

    seat: ticket.seat ?? null,

    design: normalizeDesign(ticket.ticketTypeId?.design ?? null),
  };
}

/* ------------------------------------------------------------------ */
/* GET /api/tickets?scope=self                                         */
/* ------------------------------------------------------------------ */

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const parsed = QuerySchema.safeParse({
    scope: req.nextUrl.searchParams.get("scope") ?? "self",
    status: req.nextUrl.searchParams.get("status") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid query params.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { scope, status } = parsed.data;

  if (scope !== "self") {
    return NextResponse.json(
      { error: "Unsupported scope. Only scope=self is implemented." },
      { status: 400 },
    );
  }

  await connectDB();

  // Ensure models are registered for populate()
  void Event;
  void TicketType;

  const query: {
    ownerId: string;
    status?: ITicket["status"];
  } = {
    ownerId: session.user.id,
  };

  if (status) {
    query.status = status;
  }

  const tickets = (await Ticket.find(query)
    .sort({ createdAt: -1 })
    .populate<{ eventId: EventPreview | null }>({
      path: "eventId",
      select: "title date location image",
      model: "Event",
    })
    .populate<{ ticketTypeId: TicketTypePreview | null }>({
      path: "ticketTypeId",
      select: "name design",
      model: "TicketType",
    })
    .lean()) as TicketWithRelations[];

  const shaped = tickets.map(serializeTicket);

  return NextResponse.json(shaped);
}
