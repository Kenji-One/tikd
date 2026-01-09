// src/models/Event.ts
import { Schema, model, models, Document, Types } from "mongoose";

export interface IEvent extends Document {
  title: string;
  description?: string;

  /** Start datetime */
  date: Date;

  /** End datetime (optional, but used for multi-day events) */
  endDate?: Date;

  /** Derived from either duration OR (endDate - date) */
  durationMinutes?: number;

  minAge?: number;
  location: string;
  image?: string;

  categories: string[];
  coHosts: string[];
  promotionalTeamEmails: string[];
  promoters: string[];
  message?: string;

  organizationId: Types.ObjectId;
  createdByUserId: Types.ObjectId;
  artists: Types.ObjectId[];
  status: "published" | "draft";

  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true },
    description: String,

    date: { type: Date, required: true },
    endDate: { type: Date, default: undefined },

    durationMinutes: { type: Number, default: undefined },
    minAge: { type: Number, default: undefined },
    location: { type: String, required: true },
    image: String,

    categories: { type: [String], default: [] },
    coHosts: { type: [String], default: [] },
    promotionalTeamEmails: { type: [String], default: [] },
    promoters: { type: [String], default: [] },
    message: { type: String, default: "" },

    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    createdByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    artists: [{ type: Schema.Types.ObjectId, ref: "Artist" }],

    status: {
      type: String,
      enum: ["published", "draft"],
      default: "published",
    },
  },
  { timestamps: true }
);

export default models.Event || model<IEvent>("Event", EventSchema);
