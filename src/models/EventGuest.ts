// src/models/EventGuest.ts
import { Schema, models, model, Types, Document, type Model } from "mongoose";

export type EventGuestStatus = "checked_in" | "pending_arrival";

export interface IEventGuest extends Document {
  _id: Types.ObjectId;

  eventId: Types.ObjectId;
  userId?: Types.ObjectId | null; // if guest is an existing user
  status: EventGuestStatus;

  // Optional snapshot fields (helpful if user profile changes later)
  fullName: string;
  email?: string;
  phone?: string;

  source: "manual";

  createdAt: Date;
  updatedAt: Date;
}

const EventGuestSchema = new Schema<IEventGuest>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["checked_in", "pending_arrival"],
      default: "pending_arrival",
      index: true,
    },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    source: { type: String, enum: ["manual"], default: "manual" },
  },
  { timestamps: true },
);

// One manual guest record per (eventId, userId) when userId exists
EventGuestSchema.index(
  { eventId: 1, userId: 1 },
  {
    unique: true,
    partialFilterExpression: { userId: { $type: "objectId" } },
  },
);

const EventGuest: Model<IEventGuest> =
  (models.EventGuest as Model<IEventGuest>) ||
  model<IEventGuest>("EventGuest", EventGuestSchema);

export default EventGuest;
