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
   *
   * IMPORTANT:
   * Because the public route is /t/[code], this must be globally unique.
   */
  code: string;

  /** Display path stored for convenience (always derived from code). */
  path: string;

  status: TrackingLinkStatus;

  iconKey?: PresetIconKey | null;
  iconUrl?: string | null;

  /** Aggregate metrics */
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
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

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
      index: true,
    },

    destinationId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    code: {
      type: String,
      required: true,
      trim: true,
      minlength: 4,
      maxlength: 64,
      match: [/^[A-Za-z0-9_-]+$/, "Invalid tracking code"],
      index: true,
    },

    path: {
      type: String,
      required: true,
      trim: true,
      maxlength: 256,
    },

    status: {
      type: String,
      enum: ["Active", "Paused", "Disabled"],
      default: "Active",
      index: true,
    },

    iconKey: {
      type: String,
      default: null,
      enum: [
        "instagram",
        "facebook",
        "x",
        "linkedin",
        "google",
        "youtube",
        "snapchat",
        "reddit",
        "tiktok",
        "telegram",
        null,
      ],
    },

    iconUrl: {
      type: String,
      default: null,
      trim: true,
      maxlength: 2048,
    },

    views: { type: Number, default: 0, min: 0 },
    ticketsSold: { type: Number, default: 0, min: 0 },
    revenue: { type: Number, default: 0, min: 0 },

    archived: { type: Boolean, default: false, index: true },
    lastViewedAt: { type: Date, default: undefined },

    createdByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true, strict: true },
);

/**
 * IMPORTANT:
 * Public URLs are /t/[code], so code must be globally unique.
 */
TrackingLinkSchema.index({ code: 1 }, { unique: true });

TrackingLinkSchema.index({
  organizationId: 1,
  archived: 1,
  createdAt: -1,
});

TrackingLinkSchema.index({
  organizationId: 1,
  destinationKind: 1,
  destinationId: 1,
  archived: 1,
});

export default models.TrackingLink ||
  model<ITrackingLink>("TrackingLink", TrackingLinkSchema);
