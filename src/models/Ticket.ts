import {
  Schema,
  models,
  model,
  Types,
  Document,
  type Model,
  type HydratedDocument,
} from "mongoose";

export interface ITicketTrackingSnapshot {
  trackingLinkId?: Types.ObjectId | null;
  trackingCode?: string;
  trackingCreatorUserId?: Types.ObjectId | null;
}

export interface ITicket extends Document {
  _id: Types.ObjectId;

  organizationId: Types.ObjectId;
  eventId: Types.ObjectId;
  ownerId: Types.ObjectId;

  orderId?: Types.ObjectId | null;
  orderNumber?: number | null;

  /**
   * Legacy field kept for backwards compatibility.
   * Prefer ticketTypeId + ticketTypeLabel for new flows.
   */
  ticketType: string;

  ticketTypeId?: Types.ObjectId | null;
  ticketTypeLabel?: string;

  price: number;
  currency: string;

  status: "reserved" | "paid" | "scanned" | "cancelled" | "refunded";

  scannedAt?: Date | null;

  seat?: { section: string; row: string; number: string } | null;
  qrCode?: string;

  tracking?: ITicketTrackingSnapshot | null;

  createdAt: Date;
  updatedAt: Date;
}

const SeatSchema = new Schema(
  {
    section: { type: String, required: true },
    row: { type: String, required: true },
    number: { type: String, required: true },
  },
  { _id: false },
);

const TicketTrackingSnapshotSchema = new Schema<ITicketTrackingSnapshot>(
  {
    trackingLinkId: {
      type: Schema.Types.ObjectId,
      ref: "TrackingLink",
      default: null,
      index: true,
    },
    trackingCode: {
      type: String,
      default: "",
      trim: true,
      maxlength: 64,
    },
    trackingCreatorUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
  },
  { _id: false },
);

const TicketSchema = new Schema<ITicket>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

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
      index: true,
    },

    orderNumber: {
      type: Number,
      default: null,
      index: true,
    },

    ticketType: {
      type: String,
      default: "general",
      index: true,
    },

    ticketTypeId: {
      type: Schema.Types.ObjectId,
      ref: "TicketType",
      default: null,
      index: true,
    },

    ticketTypeLabel: {
      type: String,
      default: "",
      trim: true,
      maxlength: 160,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 3,
    },

    status: {
      type: String,
      enum: ["reserved", "paid", "scanned", "cancelled", "refunded"],
      default: "reserved",
      index: true,
    },

    scannedAt: {
      type: Date,
      default: null,
    },

    seat: {
      type: SeatSchema,
      default: null,
    },

    qrCode: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1024,
    },

    tracking: {
      type: TicketTrackingSnapshotSchema,
      default: null,
    },
  },
  { timestamps: true, strict: true },
);

TicketSchema.index({ eventId: 1, ownerId: 1, status: 1 });
TicketSchema.index({ eventId: 1, orderId: 1 });
TicketSchema.index({ eventId: 1, ticketTypeId: 1 });
TicketSchema.index({ organizationId: 1, status: 1, createdAt: -1 });

TicketSchema.virtual("isGA").get(function (this: HydratedDocument<ITicket>) {
  return this.seat == null;
});

const Ticket: Model<ITicket> =
  (models.Ticket as Model<ITicket>) || model<ITicket>("Ticket", TicketSchema);

export default Ticket;
