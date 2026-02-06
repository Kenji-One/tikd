// src/models/OrgRole.ts
import { Schema, model, models, Document, Types } from "mongoose";
import { ROLE_ICON_KEYS, type RoleIconKey } from "@/lib/roleIcons";

/* ----------------------------- Types ----------------------------- */
export type OrgPermissionKey =
  | "members.view"
  | "members.invite"
  | "members.remove"
  | "members.assignRoles"
  | "events.create"
  | "events.edit"
  | "events.publish"
  | "events.delete"
  | "links.createTrackingLinks";

export type OrgPermissions = Record<OrgPermissionKey, boolean>;

export interface IOrgRole extends Document {
  organizationId: Types.ObjectId;

  /** Stable identifier like "admin", "promoter", "scanner", "collaborator", "member", or custom slug */
  key: string;

  /** Display name */
  name: string;

  /** UI color hint (hex) */
  color?: string;

  /** Optional icon: either one of our lucide keys or an uploaded URL */
  iconKey?: RoleIconKey | null;
  iconUrl?: string | null;

  /** If true, role cannot be deleted/renamed-key (system default roles) */
  isSystem: boolean;

  /** Order for roles list + highest-role color logic */
  order: number;

  /** Permission map */
  permissions: OrgPermissions;

  createdBy: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

/* ----------------------------- Schema ---------------------------- */
const OrgRoleSchema = new Schema<IOrgRole>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: 2,
      maxlength: 48,
      match: [/^[a-z0-9][a-z0-9-]*$/, "Invalid role key"],
    },

    name: { type: String, required: true, trim: true, maxlength: 64 },

    color: {
      type: String,
      default: "",
      trim: true,
      match: [/^$|^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Invalid hex color"],
    },

    iconKey: {
      type: String,
      default: null,
      enum: [...ROLE_ICON_KEYS, null],
    },

    iconUrl: {
      type: String,
      default: null,
      trim: true,
      maxlength: 2048,
    },

    isSystem: { type: Boolean, default: false, index: true },

    order: { type: Number, default: 0, index: true },

    permissions: {
      type: Schema.Types.Mixed,
      required: true,
      default: () => ({}),
    },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, strict: true },
);

/** Uniqueness per org */
OrgRoleSchema.index({ organizationId: 1, key: 1 }, { unique: true });

const OrgRole = models.OrgRole || model<IOrgRole>("OrgRole", OrgRoleSchema);
export default OrgRole;
