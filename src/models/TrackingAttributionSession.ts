import { Schema, model, models, Document, Types } from "mongoose";

export type TrackingAttributionDestinationKind = "Event" | "Organization";

export interface ITrackingAttributionSession extends Document {
  _id: Types.ObjectId;

  /**
   * Secure opaque cookie token hash.
   * Raw token is never stored in DB.
   */
  cookieTokenHash: string;

  trackingLinkId: Types.ObjectId;
  trackingCode: string;

  organizationId: Types.ObjectId;

  destinationKind: TrackingAttributionDestinationKind;
  destinationId: Types.ObjectId;

  trackingCreatorUserId: Types.ObjectId;

  firstSeenAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

const TrackingAttributionSessionSchema =
  new Schema<ITrackingAttributionSession>(
    {
      cookieTokenHash: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        index: true,
      },

      trackingLinkId: {
        type: Schema.Types.ObjectId,
        ref: "TrackingLink",
        required: true,
        index: true,
      },

      trackingCode: {
        type: String,
        required: true,
        trim: true,
        index: true,
      },

      organizationId: {
        type: Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true,
      },

      destinationKind: {
        type: String,
        enum: ["Event", "Organization"],
        required: true,
        index: true,
      },

      destinationId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true,
      },

      trackingCreatorUserId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      firstSeenAt: {
        type: Date,
        required: true,
        default: Date.now,
      },

      lastSeenAt: {
        type: Date,
        required: true,
        default: Date.now,
      },

      expiresAt: {
        type: Date,
        required: true,
        index: true,
      },
    },
    { timestamps: true, strict: true },
  );

TrackingAttributionSessionSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 },
);

TrackingAttributionSessionSchema.index({
  trackingLinkId: 1,
  expiresAt: -1,
});

TrackingAttributionSessionSchema.index({
  trackingCreatorUserId: 1,
  expiresAt: -1,
});

const TrackingAttributionSession =
  models.TrackingAttributionSession ||
  model<ITrackingAttributionSession>(
    "TrackingAttributionSession",
    TrackingAttributionSessionSchema,
  );

export default TrackingAttributionSession;
