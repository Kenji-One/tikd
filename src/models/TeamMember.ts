import { Schema, model, models, Document, Types } from "mongoose";

/* ----------------------------- Types ----------------------------- */
export type TeamMemberRole =
  | "admin"
  | "promoter"
  | "scanner"
  | "collaborator"
  | "member";

export type TeamMemberStatus = "invited" | "active" | "revoked" | "expired";

export interface ITeamMember extends Document {
  teamId: Types.ObjectId;

  email: string;
  userId?: Types.ObjectId | null;
  name?: string;

  role: TeamMemberRole;
  status: TeamMemberStatus;

  temporaryAccess: boolean;
  expiresAt?: Date;

  invitedBy: Types.ObjectId;
  inviteToken?: string;

  createdAt: Date;
  updatedAt: Date;
}

/* ----------------------------- Schema ---------------------------- */
const TeamMemberSchema = new Schema<ITeamMember>(
  {
    teamId: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email"],
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, default: "" },

    role: {
      type: String,
      enum: ["admin", "promoter", "scanner", "collaborator", "member"],
      required: true,
    },

    status: {
      type: String,
      enum: ["invited", "active", "revoked", "expired"],
      default: "invited",
      index: true,
    },

    temporaryAccess: { type: Boolean, default: false },
    expiresAt: { type: Date, default: undefined },

    invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    inviteToken: { type: String, default: undefined },
  },
  { timestamps: true, strict: true },
);

/** Ensure uniqueness per team+email */
TeamMemberSchema.index({ teamId: 1, email: 1 }, { unique: true });

/** Invite token lookups (accept-invite flows, etc.) */
TeamMemberSchema.index({ inviteToken: 1 }, { unique: true, sparse: true });

/** Keep status in sync when expired (but never override revoked) */
TeamMemberSchema.pre("save", function (next) {
  if (
    this.status !== "revoked" &&
    this.temporaryAccess &&
    this.expiresAt &&
    this.expiresAt.getTime() < Date.now()
  ) {
    this.status = "expired";
  }
  next();
});

const TeamMember =
  models.TeamMember || model<ITeamMember>("TeamMember", TeamMemberSchema);

export default TeamMember;
