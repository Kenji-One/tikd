// src/app/api/stripe/create-payment-intent/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { connectDB } from "@/lib/db";
import Event from "@/models/Event";
import type mongoose from "mongoose";
import type { CartItem } from "@/types/cart";
import { calcPrices } from "@/lib/pricing";
import { findCoupon } from "@/lib/coupons";

type Body = {
  items: CartItem[];
  couponCode?: string | null;
  customerEmail?: string | null;
};

/** Minimal shape we need from Event for validation */
type TicketTypeLean = {
  _id: mongoose.Types.ObjectId;
  price: number;
  currency: string;
};
type EventTicketsLean = {
  _id: mongoose.Types.ObjectId;
  ticketTypes: TicketTypeLean[];
};

export async function POST(req: NextRequest) {
  try {
    const { items, couponCode, customerEmail }: Body = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Empty cart." }, { status: 400 });
    }

    await connectDB();

    // Enforce single-currency carts
    const currency = items[0].currency;
    if (items.some((i) => i.currency !== currency)) {
      return NextResponse.json(
        { error: "Mixed currencies are not supported." },
        { status: 400 }
      );
    }

    // Validate against DB event.ticketTypes (price + existence)
    for (const it of items) {
      const ev = await Event.findById(it.eventId)
        .select({ ticketTypes: 1 }) // only what we need
        .lean<EventTicketsLean | null>()
        .exec();

      if (!ev) {
        return NextResponse.json(
          { error: "Event not found." },
          { status: 404 }
        );
      }

      const tt = ev.ticketTypes.find((t) => String(t._id) === it.ticketTypeId);
      if (!tt) {
        return NextResponse.json(
          { error: "Ticket type not found." },
          { status: 404 }
        );
      }

      const priceChanged =
        Number(tt.price) !== it.unitPrice || tt.currency !== it.currency;

      if (priceChanged) {
        return NextResponse.json(
          { error: "Ticket price changed. Please refresh." },
          { status: 409 }
        );
      }
    }

    // Calculate totals (re-using your helpers)
    const coupon = couponCode ? findCoupon(couponCode) : undefined;
    const pricing = calcPrices(items, coupon);
    const amountInCents = Math.round(pricing.total * 100);

    // Create PaymentIntent for Payment Element
    const pi = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency.toLowerCase(),
      description: "Tikd order",
      automatic_payment_methods: { enabled: true },
      receipt_email: customerEmail || undefined,
      metadata: {
        primaryEventId: items[0].eventId,
        couponCode: couponCode || "",
        items: JSON.stringify(
          items.map((i) => ({
            eventId: i.eventId,
            ticketTypeId: i.ticketTypeId,
            qty: i.qty,
            unitPrice: i.unitPrice,
          }))
        ),
      },
    });

    return NextResponse.json(
      { clientSecret: pi.client_secret },
      { status: 201 }
    );
  } catch (err) {
    console.error("[create-payment-intent] error", err);
    return NextResponse.json(
      { error: "Unable to create payment intent" },
      { status: 500 }
    );
  }
}
