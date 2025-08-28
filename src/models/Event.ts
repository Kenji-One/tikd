import { Schema, model, models, Document, Types } from "mongoose";

interface TicketType {
  _id: Types.ObjectId;
  slug: string; // e.g. "general-admission"
  label: string; // "General Admission"
  price: number;
  currency: string; // ISO-4217
  quantity: number; // total inventory
  feesIncluded: boolean;
}

export interface IEvent extends Document {
  title: string;
  description?: string;
  date: Date;
  location: string; // human-readable; refine later with geo
  image?: string; // poster
  organizationId: Types.ObjectId;
  createdByUserId: Types.ObjectId;
  artists: Types.ObjectId[];
  ticketTypes: TicketType[];
  createdAt: Date;
  updatedAt: Date;
}

const TicketTypeSchema = new Schema<TicketType>(
  {
    slug: { type: String, required: true, lowercase: true },
    label: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, length: 3, uppercase: true },
    quantity: { type: Number, required: true, min: 0 },
    feesIncluded: { type: Boolean, default: true },
  },
  { _id: true }
);

const EventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true },
    description: String,
    date: { type: Date, required: true },
    location: { type: String, required: true },
    image: String,

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

    artists: [
      {
        type: Schema.Types.ObjectId,
        ref: "Artist",
      },
    ],

    ticketTypes: [TicketTypeSchema],
  },
  { timestamps: true }
);

export default models.Event || model<IEvent>("Event", EventSchema);
