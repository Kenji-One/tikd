// src/models/Order.ts
import { Schema, model, models, Types, Document, Model } from "mongoose";

import {
  CHECKOUT_GENDER_VALUES,
  CHECKOUT_REQUIREMENTS_DEFAULTS,
  type CheckoutPartyDetails,
  type CheckoutRequirementsSnapshot,
} from "@/types/checkout";

export type OrderStatus =
  | "pending"
  | "paid"
  | "refunded"
  | "cancelled"
  | "expired";

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

export interface IOrderBuyerSnapshot extends CheckoutPartyDetails {
  userId?: Types.ObjectId | null;
}

export interface IOrder extends Document {
  _id: Types.ObjectId;

  userId: Types.ObjectId;
  organizationId: Types.ObjectId;
  eventId: Types.ObjectId;

  ticketIds: Types.ObjectId[];

  items: IOrderItemSnapshot[];

  /**
   * Immutable purchase-time buyer snapshot.
   * This must not be rebuilt later from the current User document.
   */
  buyerSnapshot?: IOrderBuyerSnapshot | null;

  /**
   * Immutable purchase-time requirements snapshot resolved from the selected
   * ticket types at checkout.
   */
  checkoutRequirementsSnapshot?: CheckoutRequirementsSnapshot | null;

  status: OrderStatus;

  paymentIntentId?: string;
  checkoutSessionId?: string;

  /**
   * Expiration timestamp for unpaid checkout attempts.
   * Used only while the order is still in a pending checkout lifecycle.
   */
  expiresAt?: Date | null;

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

const OrderBuyerSnapshotSchema = new Schema<IOrderBuyerSnapshot>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    firstName: {
      type: String,
      trim: true,
      default: "",
      maxlength: 120,
    },
    lastName: {
      type: String,
      trim: true,
      default: "",
      maxlength: 120,
    },
    fullName: {
      type: String,
      trim: true,
      default: "",
      maxlength: 240,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
      maxlength: 320,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
      maxlength: 40,
    },

    facebookProfile: {
      type: String,
      trim: true,
      default: "",
      maxlength: 280,
    },
    instagramProfile: {
      type: String,
      trim: true,
      default: "",
      maxlength: 280,
    },

    gender: {
      type: String,
      enum: [...CHECKOUT_GENDER_VALUES, null],
      default: null,
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },

    declaredAge: {
      type: Number,
      min: 0,
      max: 130,
      default: null,
    },
  },
  { _id: false },
);

const CheckoutRequirementsSnapshotSchema =
  new Schema<CheckoutRequirementsSnapshot>(
    {
      requireFullName: {
        type: Boolean,
        default: CHECKOUT_REQUIREMENTS_DEFAULTS.requireFullName,
      },

      requireEmail: {
        type: Boolean,
        default: CHECKOUT_REQUIREMENTS_DEFAULTS.requireEmail,
      },
      requirePhone: {
        type: Boolean,
        default: CHECKOUT_REQUIREMENTS_DEFAULTS.requirePhone,
      },
      requireFacebook: {
        type: Boolean,
        default: CHECKOUT_REQUIREMENTS_DEFAULTS.requireFacebook,
      },
      requireInstagram: {
        type: Boolean,
        default: CHECKOUT_REQUIREMENTS_DEFAULTS.requireInstagram,
      },
      requireGender: {
        type: Boolean,
        default: CHECKOUT_REQUIREMENTS_DEFAULTS.requireGender,
      },
      requireDob: {
        type: Boolean,
        default: CHECKOUT_REQUIREMENTS_DEFAULTS.requireDob,
      },
      requireAge: {
        type: Boolean,
        default: CHECKOUT_REQUIREMENTS_DEFAULTS.requireAge,
      },

      subjectToApproval: {
        type: Boolean,
        default: CHECKOUT_REQUIREMENTS_DEFAULTS.subjectToApproval,
      },

      addBuyerDetailsToOrder: {
        type: Boolean,
        default: CHECKOUT_REQUIREMENTS_DEFAULTS.addBuyerDetailsToOrder,
      },
      addPurchasedTicketsToAttendeesCount: {
        type: Boolean,
        default:
          CHECKOUT_REQUIREMENTS_DEFAULTS.addPurchasedTicketsToAttendeesCount,
      },

      enableEmailAttachments: {
        type: Boolean,
        default: CHECKOUT_REQUIREMENTS_DEFAULTS.enableEmailAttachments,
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

    buyerSnapshot: {
      type: OrderBuyerSnapshotSchema,
      default: null,
    },

    checkoutRequirementsSnapshot: {
      type: CheckoutRequirementsSnapshotSchema,
      default: null,
    },

    status: {
      type: String,
      enum: ["pending", "paid", "refunded", "cancelled", "expired"],
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

    expiresAt: {
      type: Date,
      default: null,
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
OrderSchema.index({ status: 1, expiresAt: 1 });
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
