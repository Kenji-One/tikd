/**
 *  Ticket model
 *  ------------
 *  Each document represents **one issued ticket**.
 *  - `eventId`   points to the Event collection (Mongo ObjectId)
 *  - `ownerId`   the User who owns / purchased it
 *  - `orderId`   Stripe PaymentIntent / CheckoutSession / internal Order (_optional_)
 *  - `qrCode`    URL of a QR / barcode image (stored on Cloudinary)
 *  - `seat`      granular seat info; null for GA tickets
 *  - `status`    lifecycle: reserved → paid → scanned / cancelled
 */

import {
  Schema,
  models,
  model,
  Types,
  Document,
  Model,
  HydratedDocument,
} from "mongoose";

export interface ITicket extends Document {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  ownerId: Types.ObjectId;
  orderId?: Types.ObjectId | null;
  ticketType: "general" | "vip" | "backstage";
  price: number;
  currency: string; // ISO-4217, e.g. "USD"
  status: "reserved" | "paid" | "scanned" | "cancelled";
  seat?: { section: string; row: string; number: string } | null;
  qrCode?: string; // Cloudinary URL
  createdAt: Date;
  updatedAt: Date;
}

/* -------------------------------------------------------------------------- */
/*  Schema                                                                    */
/* -------------------------------------------------------------------------- */

const SeatSchema = new Schema(
  {
    section: { type: String, required: true },
    row: { type: String, required: true },
    number: { type: String, required: true },
  },
  { _id: false } // embed, no sub-id
);

const TicketSchema = new Schema<ITicket>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    ticketType: {
      type: String,
      enum: ["general", "vip", "backstage"],
      default: "general",
    },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, length: 3, uppercase: true },
    status: {
      type: String,
      enum: ["reserved", "paid", "scanned", "cancelled"],
      default: "reserved",
      index: true,
    },
    seat: { type: SeatSchema, default: null },
    qrCode: { type: String, default: "" },
  },
  { timestamps: true }
);

/* -------------------------------------------------------------------------- */
/*  Indexes & virtuals                                                        */
/* -------------------------------------------------------------------------- */

// Prevent double-booking GA tickets in the same order (example)
TicketSchema.index(
  { orderId: 1, ticketType: 1 },
  { unique: false, partialFilterExpression: { orderId: { $exists: true } } }
);

// Convenience virtual: `isGA`
TicketSchema.virtual("isGA").get(function (this: HydratedDocument<ITicket>) {
  return this.seat == null;
});

/* -------------------------------------------------------------------------- */
/*  Model export (hot-reload safe)                                            */
/* -------------------------------------------------------------------------- */

const Ticket =
  (models.Ticket as Model<ITicket>) || model<ITicket>("Ticket", TicketSchema);

export default Ticket;
