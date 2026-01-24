// src/models/Team.ts
import {
  Schema,
  model,
  models,
  type Document,
  type Model,
  Types,
} from "mongoose";

export interface ITeam extends Document {
  ownerId: Types.ObjectId;

  name: string;
  description?: string;

  banner?: string;
  logo?: string;

  website?: string;
  location: string;
  accentColor?: string;

  // optional convenience (can be maintained later)
  totalMembers?: number;

  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema = new Schema<ITeam>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },

    banner: { type: String, default: "" },
    logo: { type: String, default: "" },

    website: { type: String, default: "" },
    location: { type: String, required: true, trim: true },
    accentColor: { type: String, default: "" },

    totalMembers: { type: Number, default: 0 },
  },
  { timestamps: true, strict: true },
);

const Team: Model<ITeam> = models.Team || model<ITeam>("Team", TeamSchema);
export default Team;
