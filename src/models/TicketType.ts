// src/models/TicketType.ts
import { Schema, model, models, Types, Document, type Model } from "mongoose";

export type TicketFeeMode = "pass_on" | "absorb";
export type TicketAvailabilityStatus =
  | "scheduled"
  | "on_sale"
  | "paused"
  | "sale_ended";

export interface ICheckoutRequirements {
  requireFullName: boolean;
  requirePhone: boolean;
  requireGender: boolean;
  requireDob: boolean;
  subjectToApproval: boolean;
  addBuyerDetailsToOrder: boolean;
  addPurchasedTicketsToAttendeesCount: boolean;
}

export interface ITicketDesign {
  layout: "horizontal" | "vertical" | "down" | "up";
  brandColor: string;
  logoUrl?: string;
  backgroundUrl?: string;
  footerText?: string;
}

export interface ITicketType extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  eventId: Types.ObjectId;
  createdByUserId: Types.ObjectId;

  /** Used for user-defined ordering in the Ticket Types list */
  sortOrder: number;

  name: string;
  description?: string;

  price: number; // major units (e.g. 25 = $25)
  currency: string; // ISO-4217, e.g. "USD"
  feeMode: TicketFeeMode;
  isFree: boolean;

  totalQuantity: number | null; // null = unlimited
  minPerOrder: number | null;
  maxPerOrder: number | null;

  soldCount: number;

  availabilityStatus: TicketAvailabilityStatus;
  salesStartAt?: Date | null;
  salesEndAt?: Date | null;

  accessMode: "public" | "password";
  password?: string;

  checkout: ICheckoutRequirements;
  design: ITicketDesign;

  createdAt: Date;
  updatedAt: Date;
}

const CheckoutSchema = new Schema<ICheckoutRequirements>(
  {
    requireFullName: { type: Boolean, default: true },
    requirePhone: { type: Boolean, default: false },
    requireGender: { type: Boolean, default: false },
    requireDob: { type: Boolean, default: false },
    subjectToApproval: { type: Boolean, default: false },
    addBuyerDetailsToOrder: { type: Boolean, default: true },
    addPurchasedTicketsToAttendeesCount: { type: Boolean, default: true },
  },
  { _id: false },
);

const DesignSchema = new Schema<ITicketDesign>(
  {
    layout: {
      type: String,
      enum: ["horizontal", "vertical", "down", "up"],
      default: "horizontal",
    },
    brandColor: { type: String, default: "#9a46ff" },
    logoUrl: { type: String, default: "" },
    backgroundUrl: { type: String, default: "" },
    footerText: { type: String, default: "" },
  },
  { _id: false },
);

const TicketTypeSchema = new Schema<ITicketType>(
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
    createdByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /** User-defined ordering */
    sortOrder: { type: Number, default: 0, index: true },

    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    price: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: "USD" },
    feeMode: {
      type: String,
      enum: ["pass_on", "absorb"],
      default: "pass_on",
    },
    isFree: { type: Boolean, default: false },

    totalQuantity: { type: Number, default: null },
    minPerOrder: { type: Number, default: null },
    maxPerOrder: { type: Number, default: null },

    soldCount: { type: Number, default: 0 },

    availabilityStatus: {
      type: String,
      enum: ["scheduled", "on_sale", "paused", "sale_ended"],
      default: "on_sale",
      index: true,
    },
    salesStartAt: { type: Date, default: null },
    salesEndAt: { type: Date, default: null },

    accessMode: {
      type: String,
      enum: ["public", "password"],
      default: "public",
    },
    password: { type: String, default: "" },

    checkout: { type: CheckoutSchema, default: () => ({}) },
    design: { type: DesignSchema, default: () => ({}) },
  },
  { timestamps: true },
);

const TicketType: Model<ITicketType> =
  (models.TicketType as Model<ITicketType>) ||
  model<ITicketType>("TicketType", TicketTypeSchema);

export default TicketType;
