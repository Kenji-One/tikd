import { Schema, model, models, Document, Types } from "mongoose";

export type PageViewSourceType =
  | "direct"
  | "search"
  | "social"
  | "internal"
  | "referral"
  | "unknown";

export interface IEventPageView extends Document {
  eventId: Types.ObjectId;
  visitorId: string;

  path?: string;
  url?: string;
  referrer?: string;
  referrerHost?: string;

  sourceType: PageViewSourceType;
  sourceLabel?: string;

  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;

  countryCode?: string;
  countryRegion?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;

  userAgent?: string;
  viewedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

const EventPageViewSchema = new Schema<IEventPageView>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },

    visitorId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    path: { type: String, default: "" },
    url: { type: String, default: "" },
    referrer: { type: String, default: "" },
    referrerHost: { type: String, default: "" },

    sourceType: {
      type: String,
      enum: ["direct", "search", "social", "internal", "referral", "unknown"],
      default: "unknown",
      index: true,
    },
    sourceLabel: { type: String, default: "" },

    utmSource: { type: String, default: "" },
    utmMedium: { type: String, default: "" },
    utmCampaign: { type: String, default: "" },

    countryCode: { type: String, default: "", index: true },
    countryRegion: { type: String, default: "" },
    city: { type: String, default: "" },
    latitude: { type: Number, default: undefined },
    longitude: { type: Number, default: undefined },
    timezone: { type: String, default: "" },

    userAgent: { type: String, default: "" },

    viewedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true },
);

EventPageViewSchema.index({ eventId: 1, viewedAt: -1 });
EventPageViewSchema.index({ eventId: 1, visitorId: 1, viewedAt: -1 });
EventPageViewSchema.index({ eventId: 1, countryCode: 1, viewedAt: -1 });
EventPageViewSchema.index({ sourceType: 1, viewedAt: -1 });

export default models.EventPageView ||
  model<IEventPageView>("EventPageView", EventPageViewSchema);
