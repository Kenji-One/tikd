// src/models/ResetToken.ts

import { Schema, model, models, Document, Types, Model } from "mongoose";

export interface IResetToken extends Document {
  userId: Types.ObjectId;
  token: string;
  expiresAt: Date;
  used: boolean;
}

const ResetTokenSchema = new Schema<IResetToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    token: { type: String, required: true, length: 6 },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL
    used: { type: Boolean, required: true, default: false },
  },
  { timestamps: true }
);

/**
 * Hot-reload safe model export.
 * Cast `models.ResetToken` as `Model<IResetToken>` instead of `mongoose.Model`.
 */
const ResetToken =
  (models.ResetToken as Model<IResetToken>) ||
  model<IResetToken>("ResetToken", ResetTokenSchema);

export default ResetToken;
