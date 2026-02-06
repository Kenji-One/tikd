// src/models/Notification.ts
import {
  Schema,
  model,
  models,
  type Document,
  type Model,
  Types,
} from "mongoose";

export type NotificationType =
  | "event.created"
  | "event.published"
  | "ticket.sold"
  | "org.created"
  | "org.invite"
  | "system";

export interface INotification extends Document {
  recipientUserId: Types.ObjectId;

  type: NotificationType;
  title: string;
  message?: string;
  href?: string;

  read: boolean;
  readAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      required: true,
      enum: [
        "event.created",
        "event.published",
        "ticket.sold",
        "org.created",
        "org.invite",
        "system",
      ],
      index: true,
    },

    title: { type: String, required: true, trim: true },
    message: { type: String, default: "", trim: true },
    href: { type: String, default: "", trim: true },

    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: undefined },
  },
  { timestamps: true, strict: true },
);

// Helpful compound indexes
NotificationSchema.index({ recipientUserId: 1, createdAt: -1 });
NotificationSchema.index({ recipientUserId: 1, read: 1, createdAt: -1 });

const Notification: Model<INotification> =
  models.Notification ||
  model<INotification>("Notification", NotificationSchema);

export default Notification;
