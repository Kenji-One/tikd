import { Schema, model, models, Types, Document } from "mongoose";

export interface IOrganization extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  logo?: string; // Cloudinary URL
  website?: string;
  ownerId: Types.ObjectId; // the User who manages this org
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    logo: { type: String, default: "" },
    website: { type: String, default: "" },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

export default models.Organization ||
  model<IOrganization>("Organization", OrganizationSchema);
