import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { stripe } from "@/lib/stripe";
import { connectDB } from "@/lib/db";
import { auth } from "@/lib/auth";
import { finalizeOrderFromPayment } from "@/lib/payments/finalizeOrder";

import Order from "@/models/Order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "auto";
export const maxDuration = 15;

type SafeOrderLean = {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  eventId: Types.ObjectId;
  status: "pending" | "paid" | "refunded" | "cancelled";
  paymentIntentId?: string;
  ticketIds: Types.ObjectId[];
  total: number;
  currency: string;
};

function parsePaymentIntentId(input: string): string | null {
  const raw = String(input || "").trim();
  if (!raw) return null;

  if (raw.startsWith("pi_")) {
    const secretIndex = raw.indexOf("_secret_");
    if (secretIndex > 0) {
      return raw.slice(0, secretIndex);
    }
    return raw;
  }

  return null;
}

async function loadOrderForUser(input: {
  userId: string;
  paymentIntentId: string;
  orderIdFromStripe?: string | null;
}): Promise<SafeOrderLean | null> {
  await connectDB();

  let order: SafeOrderLean | null = null;

  if (
    input.orderIdFromStripe &&
    Types.ObjectId.isValid(input.orderIdFromStripe)
  ) {
    order = await Order.findOne({
      _id: input.orderIdFromStripe,
      userId: new Types.ObjectId(input.userId),
    })
      .select(
        "_id userId eventId status paymentIntentId ticketIds total currency",
      )
      .lean<SafeOrderLean | null>();
  }

  if (order) {
    return order;
  }

  return Order.findOne({
    paymentIntentId: input.paymentIntentId,
    userId: new Types.ObjectId(input.userId),
  })
    .select(
      "_id userId eventId status paymentIntentId ticketIds total currency",
    )
    .lean<SafeOrderLean | null>();
}

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const paymentIntentInput =
    req.nextUrl.searchParams.get("paymentIntentId") ||
    req.nextUrl.searchParams.get("payment_intent") ||
    req.nextUrl.searchParams.get("clientSecret") ||
    req.nextUrl.searchParams.get("payment_intent_client_secret") ||
    "";

  const paymentIntentId = parsePaymentIntentId(paymentIntentInput);

  if (!paymentIntentId) {
    return NextResponse.json(
      { error: "Missing paymentIntentId." },
      { status: 400 },
    );
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    const orderIdFromStripe =
      typeof paymentIntent.metadata?.orderId === "string" &&
      paymentIntent.metadata.orderId.trim()
        ? paymentIntent.metadata.orderId.trim()
        : null;

    if (paymentIntent.status === "succeeded" && orderIdFromStripe) {
      await finalizeOrderFromPayment({
        orderId: orderIdFromStripe,
        paymentIntentId: paymentIntent.id,
      });
    }

    const order = await loadOrderForUser({
      userId: session.user.id,
      paymentIntentId: paymentIntent.id,
      orderIdFromStripe,
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const finalized =
      order.status === "paid" &&
      Array.isArray(order.ticketIds) &&
      order.ticketIds.length > 0;

    return NextResponse.json({
      ok: true,
      paymentIntentId: paymentIntent.id,
      paymentIntentStatus: paymentIntent.status,
      finalized,
      order: {
        id: String(order._id),
        status: order.status,
        ticketIds: order.ticketIds.map((id) => String(id)),
        total: order.total,
        currency: order.currency,
        eventId: String(order.eventId),
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to check payment status.",
      },
      { status: 500 },
    );
  }
}
