import { Schema, model, models, Types, Document } from "mongoose";

export interface IArtist extends Document {
  _id: Types.ObjectId;
  stageName: string;
  avatar?: string; // Cloudinary URL
  isVerified: boolean;
  socials?: {
    instagram?: string;
    twitter?: string;
    website?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SocialSchema = new Schema(
  {
    instagram: String,
    twitter: String,
    website: String,
  },
  { _id: false }
);

const ArtistSchema = new Schema<IArtist>(
  {
    stageName: { type: String, required: true, trim: true },
    avatar: { type: String, default: "" },
    isVerified: { type: Boolean, default: false },
    socials: { type: SocialSchema, default: {} },
  },
  { timestamps: true }
);

export default models.Artist || model<IArtist>("Artist", ArtistSchema);
