import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";

import { stripe } from "@/lib/stripe";
import { connectDB } from "@/lib/db";
import { auth } from "@/lib/auth";
import { calcPrices } from "@/lib/pricing";
import { findCoupon } from "@/lib/coupons";
import {
  getTrackingAttributionFromRequest,
  isTrackingAttributionApplicableToEvent,
} from "@/lib/trackingAttribution";

import Event from "@/models/Event";
import TicketType from "@/models/TicketType";
import Order from "@/models/Order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "auto";
export const maxDuration = 15;

const CartItemSchema = z.object({
  key: z.string().trim().min(1).max(200),
  eventId: z.string().trim().length(24),
  eventTitle: z.string().trim().min(1).max(240),
  ticketTypeId: z.string().trim().length(24),
  ticketLabel: z.string().trim().min(1).max(160),
  unitPrice: z.number().finite().nonnegative(),
  currency: z.string().trim().min(3).max(8),
  image: z.string().trim().optional(),
  qty: z.number().int().min(1).max(20),
});

const BodySchema = z.object({
  items: z.array(CartItemSchema).min(1).max(20),
  couponCode: z.string().trim().max(80).nullable().optional(),
  customerEmail: z.string().email().nullable().optional(),
});

type AuthoritativeCartLine = {
  key: string;
  eventId: string;
  eventTitle: string;
  ticketTypeId: string;
  ticketLabel: string;
  unitPrice: number;
  currency: string;
  image?: string;
  qty: number;
};

type EventLean = {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  title: string;
  status: "published" | "draft";
};

type TicketTypeLean = {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  price: number;
  currency: string;
  soldCount: number;
  totalQuantity: number | null;
  minPerOrder: number | null;
  maxPerOrder: number | null;
  availabilityStatus: "scheduled" | "on_sale" | "paused" | "sale_ended";
  salesStartAt?: Date | null;
  salesEndAt?: Date | null;
  accessMode: "public" | "restricted" | "password";
};

function normalizeCurrencyCode(input: string): string {
  const raw = String(input || "")
    .trim()
    .toUpperCase();

  const map: Record<string, string> = {
    $: "USD",
    "€": "EUR",
    "£": "GBP",
    "¥": "JPY",
    "₩": "KRW",
    "₾": "GEL",
    A$: "AUD",
    C$: "CAD",
  };

  return map[raw] ?? raw;
}

function isOnSaleNow(
  ticketType: Pick<
    TicketTypeLean,
    "availabilityStatus" | "salesStartAt" | "salesEndAt"
  >,
  now: Date,
): boolean {
  if (ticketType.availabilityStatus !== "on_sale") return false;
  if (
    ticketType.salesStartAt &&
    ticketType.salesStartAt.getTime() > now.getTime()
  ) {
    return false;
  }
  if (
    ticketType.salesEndAt &&
    ticketType.salesEndAt.getTime() < now.getTime()
  ) {
    return false;
  }
  return true;
}

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let bodyJson: unknown;
  try {
    bodyJson = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(bodyJson);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid checkout payload.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { items, couponCode, customerEmail } = parsed.data;

  const distinctEventIds = Array.from(
    new Set(items.map((item) => item.eventId)),
  );
  if (distinctEventIds.length !== 1) {
    return NextResponse.json(
      { error: "Checkout must contain ticket types from a single event." },
      { status: 400 },
    );
  }

  const distinctTicketTypeIds = items.map((item) => item.ticketTypeId);
  const distinctTicketTypeIdSet = new Set(distinctTicketTypeIds);
  if (distinctTicketTypeIdSet.size !== distinctTicketTypeIds.length) {
    return NextResponse.json(
      { error: "Duplicate ticket types are not allowed in checkout." },
      { status: 400 },
    );
  }

  const distinctCurrencies = Array.from(
    new Set(items.map((item) => normalizeCurrencyCode(item.currency))),
  );
  if (distinctCurrencies.length !== 1) {
    return NextResponse.json(
      { error: "Mixed currencies are not supported." },
      { status: 400 },
    );
  }

  await connectDB();

  const eventId = distinctEventIds[0]!;
  const event = await Event.findById(eventId)
    .select("_id organizationId title status")
    .lean<EventLean | null>();

  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  if (event.status !== "published") {
    return NextResponse.json(
      { error: "This event is not available for checkout." },
      { status: 400 },
    );
  }

  const ticketTypes = await TicketType.find({
    _id: {
      $in: Array.from(distinctTicketTypeIdSet).map(
        (id) => new Types.ObjectId(id),
      ),
    },
    eventId: event._id,
  })
    .select(
      "_id eventId organizationId name price currency soldCount totalQuantity minPerOrder maxPerOrder availabilityStatus salesStartAt salesEndAt accessMode",
    )
    .lean<TicketTypeLean[]>();

  if (ticketTypes.length !== distinctTicketTypeIdSet.size) {
    return NextResponse.json(
      { error: "One or more ticket types no longer exist." },
      { status: 404 },
    );
  }

  const ticketTypeById = new Map(
    ticketTypes.map((ticketType) => [String(ticketType._id), ticketType]),
  );

  const now = new Date();
  const authoritativeItems: AuthoritativeCartLine[] = [];

  for (const item of items) {
    const ticketType = ticketTypeById.get(item.ticketTypeId);
    if (!ticketType) {
      return NextResponse.json(
        { error: "Ticket type not found." },
        { status: 404 },
      );
    }

    if (ticketType.accessMode !== "public") {
      return NextResponse.json(
        {
          error: `Ticket type "${ticketType.name}" is not publicly purchasable.`,
        },
        { status: 403 },
      );
    }

    if (!isOnSaleNow(ticketType, now)) {
      return NextResponse.json(
        { error: `Ticket type "${ticketType.name}" is not currently on sale.` },
        { status: 409 },
      );
    }

    if (ticketType.minPerOrder !== null && item.qty < ticketType.minPerOrder) {
      return NextResponse.json(
        {
          error: `Minimum quantity for "${ticketType.name}" is ${ticketType.minPerOrder}.`,
        },
        { status: 400 },
      );
    }

    if (ticketType.maxPerOrder !== null && item.qty > ticketType.maxPerOrder) {
      return NextResponse.json(
        {
          error: `Maximum quantity for "${ticketType.name}" is ${ticketType.maxPerOrder}.`,
        },
        { status: 400 },
      );
    }

    if (ticketType.totalQuantity !== null) {
      const remaining = Math.max(
        ticketType.totalQuantity - ticketType.soldCount,
        0,
      );
      if (item.qty > remaining) {
        return NextResponse.json(
          {
            error: `Only ${remaining} ticket(s) remaining for "${ticketType.name}".`,
          },
          { status: 409 },
        );
      }
    }

    const authoritativePrice = Number(ticketType.price);
    const authoritativeCurrency = normalizeCurrencyCode(ticketType.currency);

    const clientPrice = Number(item.unitPrice);
    const clientCurrency = normalizeCurrencyCode(item.currency);

    if (
      authoritativePrice !== clientPrice ||
      authoritativeCurrency !== clientCurrency
    ) {
      return NextResponse.json(
        {
          error: `Ticket pricing changed for "${ticketType.name}". Please refresh and try again.`,
        },
        { status: 409 },
      );
    }

    authoritativeItems.push({
      key: item.key,
      eventId,
      eventTitle: event.title,
      ticketTypeId: String(ticketType._id),
      ticketLabel: ticketType.name,
      unitPrice: authoritativePrice,
      currency: authoritativeCurrency,
      image: item.image,
      qty: item.qty,
    });
  }

  const normalizedCouponCode = String(couponCode ?? "").trim();
  const coupon = normalizedCouponCode
    ? findCoupon(normalizedCouponCode)
    : undefined;

  if (normalizedCouponCode && !coupon) {
    return NextResponse.json(
      { error: "Invalid coupon code." },
      { status: 400 },
    );
  }

  const pricing = calcPrices(authoritativeItems, coupon);
  const amountInCents = Math.round(pricing.total * 100);

  if (!Number.isFinite(amountInCents) || amountInCents <= 0) {
    return NextResponse.json(
      { error: "Invalid checkout total." },
      { status: 400 },
    );
  }

  const attribution = await getTrackingAttributionFromRequest(req);
  const applicableAttribution = isTrackingAttributionApplicableToEvent({
    attribution,
    eventId: String(event._id),
    organizationId: String(event.organizationId),
  })
    ? attribution
    : null;

  const order = await Order.create({
    userId: new Types.ObjectId(session.user.id),
    organizationId: event.organizationId,
    eventId: event._id,
    ticketIds: [],
    items: authoritativeItems.map((item) => ({
      ticketTypeId: new Types.ObjectId(item.ticketTypeId),
      ticketTypeLabel: item.ticketLabel,
      unitPrice: item.unitPrice,
      qty: item.qty,
      currency: item.currency,
    })),
    status: "pending",
    subtotal: pricing.subtotal,
    fees: pricing.fees,
    discount: pricing.discount,
    currency: pricing.currency,
    total: pricing.total,
    couponCode: coupon?.code ?? "",
    tracking: applicableAttribution
      ? {
          trackingLinkId: new Types.ObjectId(
            applicableAttribution.trackingLinkId,
          ),
          trackingCode: applicableAttribution.trackingCode,
          trackingCreatorUserId: new Types.ObjectId(
            applicableAttribution.trackingCreatorUserId,
          ),
          trackingOrganizationId: new Types.ObjectId(
            applicableAttribution.organizationId,
          ),
          trackingDestinationKind: applicableAttribution.destinationKind,
          trackingDestinationId: new Types.ObjectId(
            applicableAttribution.destinationId,
          ),
        }
      : null,
  });

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: pricing.currency.toLowerCase(),
      description: `Tikd order for ${event.title}`,
      automatic_payment_methods: { enabled: true },
      receipt_email: customerEmail || session.user.email || undefined,
      metadata: {
        orderId: String(order._id),
        eventId: String(event._id),
        organizationId: String(event.organizationId),
        userId: String(session.user.id),
      },
    });

    await Order.updateOne(
      { _id: order._id },
      { $set: { paymentIntentId: paymentIntent.id } },
    );

    return NextResponse.json(
      {
        clientSecret: paymentIntent.client_secret,
        orderId: String(order._id),
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    await Order.updateOne(
      { _id: order._id },
      { $set: { status: "cancelled" } },
    ).catch(() => {
      // best-effort cleanup only
    });

    const message =
      error instanceof Error
        ? error.message
        : "Unable to create payment intent.";

    return NextResponse.json(
      { error: message || "Unable to create payment intent." },
      { status: 500 },
    );
  }
}
