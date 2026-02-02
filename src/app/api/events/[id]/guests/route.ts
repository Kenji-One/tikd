// src/models/Ticket.ts
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

  /**
   * Legacy enum (kept for backward compatibility).
   * Prefer using `ticketTypeId` + `ticketTypeLabel` for UI display.
   */
  ticketType: "general" | "vip" | "backstage";

  /** ✅ New (optional) - links to configured ticket type */
  ticketTypeId?: Types.ObjectId | null;

  /** ✅ New (optional) - snapshot label for UI ("General Admission - Tier 1") */
  ticketTypeLabel?: string;

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
  { _id: false },
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

    // ✅ new optional refs/snapshots
    ticketTypeId: {
      type: Schema.Types.ObjectId,
      ref: "TicketType",
      default: null,
      index: true,
    },
    ticketTypeLabel: { type: String, default: "" },

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
  { timestamps: true },
);

/* -------------------------------------------------------------------------- */
/*  Indexes & virtuals                                                        */
/* -------------------------------------------------------------------------- */

TicketSchema.index(
  { orderId: 1, ticketType: 1 },
  { unique: false, partialFilterExpression: { orderId: { $exists: true } } },
);

TicketSchema.virtual("isGA").get(function (this: HydratedDocument<ITicket>) {
  return this.seat == null;
});

const Ticket =
  (models.Ticket as Model<ITicket>) || model<ITicket>("Ticket", TicketSchema);

export default Ticket;
