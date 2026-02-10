// src/models/TrackingLink.ts
import { Schema, model, models, Document, Types } from "mongoose";

export type TrackingDestinationKind = "Event" | "Organization";
export type TrackingLinkStatus = "Active" | "Paused" | "Disabled";

export type PresetIconKey =
  | "instagram"
  | "facebook"
  | "x"
  | "linkedin"
  | "google"
  | "youtube"
  | "snapchat"
  | "reddit"
  | "tiktok"
  | "telegram";

export interface ITrackingLink extends Document {
  name: string;

  organizationId: Types.ObjectId;

  destinationKind: TrackingDestinationKind;
  destinationId: Types.ObjectId;

  /**
   * Short code used in the public tracking URL.
   * Example: /t/Ab3Kp9xQ/
   */
  code: string;

  /** Display path stored for convenience (always derived from code). */
  path: string;

  status: TrackingLinkStatus;

  iconKey?: PresetIconKey | null;
  iconUrl?: string | null;

  /** Basic metrics (we’ll increment views on redirect). */
  views: number;
  ticketsSold: number;
  revenue: number;

  archived: boolean;
  lastViewedAt?: Date;

  createdByUserId: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const TrackingLinkSchema = new Schema<ITrackingLink>(
  {
    name: { type: String, required: true, trim: true },

    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    destinationKind: {
      type: String,
      enum: ["Event", "Organization"],
      required: true,
    },

    destinationId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    code: { type: String, required: true, index: true },
    path: { type: String, required: true },

    status: {
      type: String,
      enum: ["Active", "Paused", "Disabled"],
      default: "Active",
    },

    iconKey: { type: String, default: null },
    iconUrl: { type: String, default: null },

    views: { type: Number, default: 0 },
    ticketsSold: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },

    archived: { type: Boolean, default: false, index: true },
    lastViewedAt: { type: Date, default: undefined },

    createdByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

// Unique per org (lets different orgs have same code without collision)
TrackingLinkSchema.index({ organizationId: 1, code: 1 }, { unique: true });

export default models.TrackingLink ||
  model<ITrackingLink>("TrackingLink", TrackingLinkSchema);
