import { Schema, model, models, Types, Document, Model } from "mongoose";

export type OrderStatus = "pending" | "paid" | "refunded" | "cancelled";
export type OrderTrackingDestinationKind = "Event" | "Organization";

export interface IOrderItemSnapshot {
  ticketTypeId: Types.ObjectId;
  ticketTypeLabel: string;
  unitPrice: number;
  qty: number;
  currency: string;
}

export interface IOrderTrackingSnapshot {
  trackingLinkId?: Types.ObjectId | null;
  trackingCode?: string;
  trackingCreatorUserId?: Types.ObjectId | null;
  trackingOrganizationId?: Types.ObjectId | null;
  trackingDestinationKind?: OrderTrackingDestinationKind | null;
  trackingDestinationId?: Types.ObjectId | null;
}

export interface IOrder extends Document {
  _id: Types.ObjectId;

  userId: Types.ObjectId;
  organizationId: Types.ObjectId;
  eventId: Types.ObjectId;

  ticketIds: Types.ObjectId[];

  items: IOrderItemSnapshot[];

  status: OrderStatus;

  paymentIntentId?: string;
  checkoutSessionId?: string;

  subtotal: number;
  fees: number;
  discount: number;
  currency: string;
  total: number;

  couponCode?: string;

  tracking?: IOrderTrackingSnapshot | null;

  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSnapshotSchema = new Schema<IOrderItemSnapshot>(
  {
    ticketTypeId: {
      type: Schema.Types.ObjectId,
      ref: "TicketType",
      required: true,
    },
    ticketTypeLabel: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    qty: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 3,
    },
  },
  { _id: false },
);

const OrderTrackingSnapshotSchema = new Schema<IOrderTrackingSnapshot>(
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
    trackingOrganizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
      index: true,
    },
    trackingDestinationKind: {
      type: String,
      enum: ["Event", "Organization", null],
      default: null,
    },
    trackingDestinationId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true,
    },
  },
  { _id: false },
);

const OrderSchema = new Schema<IOrder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

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

    ticketIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Ticket",
        default: [],
      },
    ],

    items: {
      type: [OrderItemSnapshotSchema],
      default: [],
      validate: {
        validator(value: IOrderItemSnapshot[]) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "Order must contain at least one item snapshot.",
      },
    },

    status: {
      type: String,
      enum: ["pending", "paid", "refunded", "cancelled"],
      default: "pending",
      index: true,
    },

    paymentIntentId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    checkoutSessionId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    fees: {
      type: Number,
      required: true,
      min: 0,
    },

    discount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 3,
    },

    total: {
      type: Number,
      required: true,
      min: 0,
    },

    couponCode: {
      type: String,
      default: "",
      trim: true,
      maxlength: 80,
    },

    tracking: {
      type: OrderTrackingSnapshotSchema,
      default: null,
    },
  },
  { timestamps: true, strict: true },
);

OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ eventId: 1, status: 1, createdAt: -1 });
OrderSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
OrderSchema.index(
  { paymentIntentId: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: {
      paymentIntentId: { $type: "string", $ne: "" },
    },
  },
);

const Order =
  (models.Order as Model<IOrder>) || model<IOrder>("Order", OrderSchema);

export default Order;
