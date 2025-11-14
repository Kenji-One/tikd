import { Schema, model, models, Document, Types } from "mongoose";

export interface IPromotionalTeam extends Document {
  ownerId: Types.ObjectId; // user who owns this team
  name: string;
  members: string[]; // emails
  createdAt: Date;
  updatedAt: Date;
}

const PromotionalTeamSchema = new Schema<IPromotionalTeam>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    members: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default models.PromotionalTeam ||
  model<IPromotionalTeam>("PromotionalTeam", PromotionalTeamSchema);
