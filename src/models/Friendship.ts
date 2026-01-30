// src/models/Friendship.ts
import {
  Schema,
  models,
  model,
  type Model,
  type Document,
  Types,
} from "mongoose";

export type FriendshipStatus = "pending" | "accepted" | "declined";

export interface IFriendship extends Document {
  requesterId: Types.ObjectId;
  recipientId: Types.ObjectId;
  status: FriendshipStatus;
  createdAt: Date;
  updatedAt: Date;
}

const FriendshipSchema = new Schema<IFriendship>(
  {
    requesterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recipientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
      required: true,
    },
  },
  { timestamps: true, strict: true },
);

// Helpful indexes
FriendshipSchema.index({ requesterId: 1, recipientId: 1 }, { unique: true });
FriendshipSchema.index({ recipientId: 1, status: 1 });
FriendshipSchema.index({ requesterId: 1, status: 1 });

const Friendship: Model<IFriendship> =
  models.Friendship || model<IFriendship>("Friendship", FriendshipSchema);

export default Friendship;
