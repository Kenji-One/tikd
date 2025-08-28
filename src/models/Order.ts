/**
 *  Order model
 *  -----------
 *  One document = one checkout / transaction.
 *  · Holds an array of Ticket _ids for easy aggregation.
 *  · Stores Stripe identifiers + total amounts (so we can rebuild revenue stats
 *    without hitting Stripe every time).
 */

import { Schema, model, models, Types, Document, Model } from "mongoose";

export interface IOrder extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  eventId: Types.ObjectId; // primary event (for grouped analytics)
  ticketIds: Types.ObjectId[]; // all tickets purchased in this order
  status: "pending" | "paid" | "refunded" | "cancelled";
  paymentIntentId?: string; // Stripe PI id
  checkoutSessionId?: string; // Stripe CS id (if you use it)
  subtotal: number; // tickets only
  fees: number; // service + processing fees
  currency: string; // ISO-4217
  total: number; // subtotal + fees
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    ticketIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Ticket",
        required: true,
      },
    ],

    status: {
      type: String,
      enum: ["pending", "paid", "refunded", "cancelled"],
      default: "pending",
      index: true,
    },

    /* Stripe linkage ---------------------------------------------------- */
    paymentIntentId: { type: String, default: "" },
    checkoutSessionId: { type: String, default: "" },

    /* Money ------------------------------------------------------------- */
    subtotal: { type: Number, required: true, min: 0 },
    fees: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, length: 3, uppercase: true },
    total: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

/* ---------------------------------------------------------------------- */
/*  Compound index to query a user’s orders by most-recent                */
/* ---------------------------------------------------------------------- */
OrderSchema.index({ userId: 1, createdAt: -1 });

/* ---------------------------------------------------------------------- */
/*  Hot-reload-safe export                                                */
/* ---------------------------------------------------------------------- */
const Order =
  (models.Order as Model<IOrder>) || model<IOrder>("Order", OrderSchema);

export default Order;
