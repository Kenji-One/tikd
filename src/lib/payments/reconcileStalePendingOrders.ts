import Stripe from "stripe";
import { Types } from "mongoose";

import { stripe } from "@/lib/stripe";
import { connectDB } from "@/lib/db";
import { finalizeOrderFromPayment } from "@/lib/payments/finalizeOrder";

import Order from "@/models/Order";

type CandidateOrder = {
  _id: Types.ObjectId;
  paymentIntentId?: string;
  expiresAt?: Date | null;
};

export type ReconcileStalePendingOrdersResult = {
  ok: true;
  scanned: number;
  expired: number;
  finalized: number;
  skippedProcessing: number;
  skippedMissingPaymentIntent: number;
  errors: Array<{
    orderId: string;
    message: string;
  }>;
};

function isStripeResourceMissing(error: unknown): boolean {
  return (
    error instanceof Stripe.errors.StripeInvalidRequestError &&
    error.code === "resource_missing"
  );
}

async function markOrderExpired(orderId: Types.ObjectId | string) {
  await Order.updateOne(
    { _id: orderId, status: "pending" },
    {
      $set: {
        status: "expired",
      },
    },
  );
}

export async function reconcileStalePendingOrders(input?: {
  limit?: number;
  now?: Date;
}): Promise<ReconcileStalePendingOrdersResult> {
  await connectDB();

  const now = input?.now ?? new Date();
  const limit = Math.max(1, Math.min(input?.limit ?? 100, 500));

  const candidates = await Order.find({
    status: "pending",
    expiresAt: { $lte: now },
  })
    .sort({ expiresAt: 1, _id: 1 })
    .limit(limit)
    .select("_id paymentIntentId expiresAt")
    .lean<CandidateOrder[]>();

  const result: ReconcileStalePendingOrdersResult = {
    ok: true,
    scanned: 0,
    expired: 0,
    finalized: 0,
    skippedProcessing: 0,
    skippedMissingPaymentIntent: 0,
    errors: [],
  };

  for (const candidate of candidates) {
    result.scanned += 1;

    const orderId = String(candidate._id);
    const paymentIntentId = String(candidate.paymentIntentId ?? "").trim();

    if (!paymentIntentId) {
      await markOrderExpired(candidate._id);
      result.expired += 1;
      result.skippedMissingPaymentIntent += 1;
      continue;
    }

    try {
      const paymentIntent =
        await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === "succeeded") {
        const finalized = await finalizeOrderFromPayment({
          orderId,
          paymentIntentId: paymentIntent.id,
        });

        if (finalized.ok) {
          result.finalized += 1;
          continue;
        }

        result.errors.push({
          orderId,
          message: finalized.error,
        });
        continue;
      }

      if (paymentIntent.status === "processing") {
        result.skippedProcessing += 1;
        continue;
      }

      await markOrderExpired(candidate._id);
      result.expired += 1;
    } catch (error: unknown) {
      if (isStripeResourceMissing(error)) {
        await markOrderExpired(candidate._id);
        result.expired += 1;
        continue;
      }

      result.errors.push({
        orderId,
        message:
          error instanceof Error
            ? error.message
            : "Failed to reconcile stale pending order.",
      });
    }
  }

  return result;
}
