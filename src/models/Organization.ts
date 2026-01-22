// src/models/Organization.ts
import { Schema, model, models, Types, Document } from "mongoose";

export type OrgBusinessType =
  | "brand"
  | "venue"
  | "community"
  | "artist"
  | "fraternity"
  | "charity";

export interface IOrganization extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;

  /** ✅ branding */
  banner?: string; // Cloudinary URL
  logo?: string; // Cloudinary URL

  website?: string;
  businessType: OrgBusinessType;
  location?: string;
  accentColor?: string;
  ownerId: Types.ObjectId; // the User who manages this org
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    /** ✅ NEW */
    banner: { type: String, default: "" },
    logo: { type: String, default: "" },

    website: { type: String, default: "" },
    businessType: {
      type: String,
      required: true,
      enum: ["brand", "venue", "community", "artist", "fraternity", "charity"],
    },
    location: { type: String, default: "" },
    accentColor: { type: String, default: "" },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

export default models.Organization ||
  model<IOrganization>("Organization", OrganizationSchema);
