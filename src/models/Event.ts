import { Schema, model, models, Document, Types } from "mongoose";

export interface IEvent extends Document {
  title: string;
  description?: string;
  date: Date;
  location: string;
  price: number; // in USD for now
  image?: string;
  organizerId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true },
    description: String,
    date: { type: Date, required: true },
    location: { type: String, required: true },
    price: { type: Number, required: true },
    image: String,
    organizerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export default models.Event || model<IEvent>("Event", EventSchema);
