// src/app/api/events/[eventId]/ticket-types/route.ts
import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";
import { z } from "zod";

import { auth } from "@/lib/auth";
import Event, { type IEvent } from "@/models/Event";
import TicketType from "@/models/TicketType";

const checkoutSchema = z.object({
  requireFullName: z.boolean(),
  requirePhone: z.boolean(),
  requireGender: z.boolean(),
  requireDob: z.boolean(),
  subjectToApproval: z.boolean(),
  addBuyerDetailsToOrder: z.boolean(),
  addPurchasedTicketsToAttendeesCount: z.boolean(),
});

const designSchema = z.object({
  layout: z.enum(["horizontal", "vertical", "down", "up"]),
  brandColor: z.string(),
  logoUrl: z.string().optional(),
  backgroundUrl: z.string().optional(),
  footerText: z.string().optional(),
});

// NOTE: exported so the [ticketTypeId] route can reuse it
export const ticketTypeBodySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(""),

  price: z.number().min(0),
  currency: z.string().min(3).max(3).default("USD"),
  feeMode: z.enum(["pass_on", "absorb"]).default("pass_on"),
  isFree: z.boolean().default(false),

  totalQuantity: z.number().int().min(0).nullable().optional(),
  minPerOrder: z.number().int().min(0).nullable().optional(),
  maxPerOrder: z.number().int().min(0).nullable().optional(),

  availabilityStatus: z
    .enum(["scheduled", "on_sale", "paused", "sale_ended"])
    .default("on_sale"),
  salesStartAt: z.string().datetime().nullable().optional(),
  salesEndAt: z.string().datetime().nullable().optional(),

  accessMode: z.enum(["public", "password"]).default("public"),
  password: z.string().optional().or(z.literal("")),

  checkout: checkoutSchema.default({
    requireFullName: true,
    requirePhone: false,
    requireGender: false,
    requireDob: false,
    subjectToApproval: false,
    addBuyerDetailsToOrder: true,
    addPurchasedTicketsToAttendeesCount: true,
  }),

  design: designSchema.default({
    layout: "horizontal",
    brandColor: "#9a46ff",
    logoUrl: "",
    backgroundUrl: "",
    footerText: "",
  }),
});

// GET: list ticket types for this event
export async function GET(
  _req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const event = await Event.findOne({
    _id: params.eventId,
    createdByUserId: session.user.id,
  })
    .lean<IEvent>()
    .exec();

  if (!event) {
    return NextResponse.json(
      { error: "Event not found or not yours" },
      { status: 404 }
    );
  }

  const ticketTypes = await TicketType.find({
    eventId: params.eventId,
  })
    .sort({ createdAt: 1 })
    .lean()
    .exec();

  return NextResponse.json(ticketTypes);
}

// POST: create new ticket type
export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const event = await Event.findOne({
    _id: params.eventId,
    createdByUserId: session.user.id,
  })
    .lean<IEvent>()
    .exec();

  if (!event) {
    return NextResponse.json(
      { error: "Event not found or not yours" },
      { status: 404 }
    );
  }

  const json = await req.json();
  const parsed = ticketTypeBodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const {
    salesStartAt,
    salesEndAt,
    totalQuantity,
    minPerOrder,
    maxPerOrder,
    checkout,
    design,
    ...rest
  } = parsed.data;

  const doc = await TicketType.create({
    ...rest,
    checkout,
    design,
    totalQuantity: totalQuantity ?? null,
    minPerOrder: minPerOrder ?? null,
    maxPerOrder: maxPerOrder ?? null,
    salesStartAt: salesStartAt ? new Date(salesStartAt) : null,
    salesEndAt: salesEndAt ? new Date(salesEndAt) : null,
    organizationId: event.organizationId,
    eventId: event._id,
    createdByUserId: session.user.id,
  });

  return NextResponse.json(doc, { status: 201 });
}
