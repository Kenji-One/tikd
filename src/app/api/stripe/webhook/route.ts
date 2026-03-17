import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { stripe } from "@/lib/stripe";
import { connectDB } from "@/lib/db";
import { finalizeOrderFromPayment } from "@/lib/payments/finalizeOrder";

import Order from "@/models/Order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "auto";
export const maxDuration = 15;

function getWebhookSecret(): string {
  const secret = String(process.env.STRIPE_WEBHOOK_SECRET ?? "").trim();
  if (!secret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET.");
  }
  return secret;
}

function getOrderIdFromMetadata(
  paymentIntent: Stripe.PaymentIntent,
): string | null {
  const value = paymentIntent.metadata?.orderId;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function markOrderCancelledFromPaymentIntent(input: {
  paymentIntentId: string;
  orderId?: string | null;
}) {
  await connectDB();

  if (input.orderId) {
    await Order.updateOne(
      { _id: input.orderId, status: "pending" },
      {
        $set: {
          status: "cancelled",
          paymentIntentId: input.paymentIntentId,
        },
      },
    );
    return;
  }

  await Order.updateOne(
    { paymentIntentId: input.paymentIntentId, status: "pending" },
    {
      $set: {
        status: "cancelled",
      },
    },
  );
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header." },
      { status: 400 },
    );
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      getWebhookSecret(),
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Invalid webhook signature.",
      },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        const finalized = await finalizeOrderFromPayment({
          orderId: getOrderIdFromMetadata(paymentIntent),
          paymentIntentId: paymentIntent.id,
        });

        if (!finalized.ok) {
          return NextResponse.json(
            { error: finalized.error },
            { status: finalized.status >= 400 ? 500 : finalized.status },
          );
        }

        break;
      }

      case "payment_intent.payment_failed":
      case "payment_intent.canceled": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        await markOrderCancelledFromPaymentIntent({
          paymentIntentId: paymentIntent.id,
          orderId: getOrderIdFromMetadata(paymentIntent),
        });

        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Webhook processing failed.",
      },
      { status: 500 },
    );
  }
}
