// src\models\User.ts
import { Schema, models, model, Document, Model } from "mongoose";

import {
  CHECKOUT_GENDER_VALUES,
  type UserCheckoutProfile,
} from "@/types/checkout";

/* ───────── Types ───────── */
export type Channel = "call" | "email" | "sms";

export interface ChannelPrefs {
  call: boolean;
  email: boolean;
  sms: boolean;
}

export interface UserNotifications {
  channels: {
    apiLimits: ChannelPrefs;
    reminders: ChannelPrefs;
    storage: ChannelPrefs;
    securityAlerts: ChannelPrefs;
  };
  marketing: {
    sales: boolean;
    special: boolean;
    weekly: boolean;
    outlet: boolean;
  };
}

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  image?: string;
  role: "user" | "admin";

  // Profile fields
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  zip?: string;
  defaultAddress?: boolean;

  /** Friends UI */
  jobTitle?: string;
  company?: string;
  companyHref?: string;

  /** Instagram on Friend card / reusable checkout autofill */
  instagram?: string;

  /**
   * Dedicated reusable checkout autofill fields.
   * Historical purchases must NOT depend on these values directly;
   * orders/tickets should snapshot buyer data at purchase time.
   */
  checkoutProfile?: UserCheckoutProfile;

  // Security audit
  passwordUpdatedAt?: Date;

  // Notifications
  notifications?: UserNotifications;

  createdAt: Date;
  updatedAt: Date;
}

/* ───────── Sub-schemas ───────── */
const ChannelSchema = new Schema<ChannelPrefs>(
  {
    call: { type: Boolean, default: false },
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
  },
  { _id: false },
);

const NotificationsSchema = new Schema<UserNotifications>(
  {
    channels: {
      apiLimits: { type: ChannelSchema, default: () => ({}) },
      reminders: { type: ChannelSchema, default: () => ({}) },
      storage: { type: ChannelSchema, default: () => ({}) },
      securityAlerts: { type: ChannelSchema, default: () => ({}) },
    },
    marketing: {
      sales: { type: Boolean, default: false },
      special: { type: Boolean, default: false },
      weekly: { type: Boolean, default: false },
      outlet: { type: Boolean, default: true },
    },
  },
  { _id: false },
);

const CheckoutProfileSchema = new Schema<UserCheckoutProfile>(
  {
    facebookProfile: {
      type: String,
      trim: true,
      default: "",
      maxlength: 280,
    },
    gender: {
      type: String,
      enum: [...CHECKOUT_GENDER_VALUES, null],
      default: null,
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    updatedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false },
);

/* ───────── User schema ───────── */
const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 24,
      match: [
        /^[a-z0-9_]+$/,
        "Username can contain lowercase letters, numbers and underscores only.",
      ],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email."],
    },

    /**
     * Hidden by default so normal reads never expose hashes unless a route
     * explicitly opts in with .select("+password").
     */
    password: { type: String, required: true, select: false },

    image: { type: String, default: "" },
    role: { type: String, enum: ["user", "admin"], default: "user" },

    // Optional profile fields
    firstName: { type: String, trim: true, default: "" },
    lastName: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "" },
    zip: { type: String, trim: true, default: "" },
    defaultAddress: { type: Boolean, default: false },

    jobTitle: { type: String, trim: true, default: "" },
    company: { type: String, trim: true, default: "" },
    companyHref: { type: String, trim: true, default: "" },

    instagram: { type: String, trim: true, default: "" },

    checkoutProfile: {
      type: CheckoutProfileSchema,
      default: () => ({
        facebookProfile: "",
        gender: null,
        dateOfBirth: null,
        updatedAt: null,
      }),
    },

    passwordUpdatedAt: { type: Date },

    notifications: { type: NotificationsSchema, default: () => ({}) },
  },
  { timestamps: true, strict: true },
);

const User: Model<IUser> = models.User || model<IUser>("User", UserSchema);
export default User;
