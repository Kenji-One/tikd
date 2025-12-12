// src/models/PromoCode.ts
import { Schema, model, models, Types, Document, type Model } from "mongoose";

export type PromoCodeKind = "discount" | "special_access";
export type PromoDiscountMode = "percentage" | "amount";

export interface IPromoCode extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  eventId: Types.ObjectId;
  createdByUserId: Types.ObjectId;

  name: string; // internal / title
  description?: string;
  code: string; // actual promo code users enter, e.g. EARLYBIRD20

  kind: PromoCodeKind; // discount vs special access
  discountMode?: PromoDiscountMode | null;
  discountValue?: number | null; // percentage or currency depending on mode
  overallItems?: number | null; // for special access / overall items obtained

  maxUses?: number | null; // null = unlimited
  usesCount: number;
  isActive: boolean;

  validFrom?: Date | null;
  validUntil?: Date | null;

  applicableTicketTypeIds: Types.ObjectId[];

  createdAt: Date;
  updatedAt: Date;
}

const PromoCodeSchema = new Schema<IPromoCode>(
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

    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    code: { type: String, required: true, trim: true },

    kind: {
      type: String,
      enum: ["discount", "special_access"],
      default: "discount",
    },
    discountMode: {
      type: String,
      enum: ["percentage", "amount"],
      default: "percentage",
    },
    discountValue: { type: Number, default: 0 },
    overallItems: { type: Number, default: null },

    maxUses: { type: Number, default: null },
    usesCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },

    validFrom: { type: Date, default: null },
    validUntil: { type: Date, default: null },

    applicableTicketTypeIds: [
      { type: Schema.Types.ObjectId, ref: "TicketType" },
    ],
  },
  { timestamps: true }
);

// promo code must be unique per event
PromoCodeSchema.index(
  { eventId: 1, code: 1 },
  { unique: true, name: "uniq_event_code" }
);

const PromoCode: Model<IPromoCode> =
  (models.PromoCode as Model<IPromoCode>) ||
  model<IPromoCode>("PromoCode", PromoCodeSchema);

export default PromoCode;
