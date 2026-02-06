// src/lib/notifications.ts
import { Types } from "mongoose";
import Notification, { type NotificationType } from "@/models/Notification";

export async function createNotification(args: {
  recipientUserId: string | Types.ObjectId;
  type: NotificationType;
  title: string;
  message?: string;
  href?: string;
}) {
  const recipientUserId =
    typeof args.recipientUserId === "string"
      ? new Types.ObjectId(args.recipientUserId)
      : args.recipientUserId;

  return Notification.create({
    recipientUserId,
    type: args.type,
    title: args.title,
    message: args.message ?? "",
    href: args.href ?? "",
    read: false,
  });
}
