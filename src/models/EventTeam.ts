import { Schema, model, models, Document, Types } from "mongoose";

/* ----------------------------- Types ----------------------------- */
export type EventTeamRole = "admin" | "promoter" | "scanner" | "collaborator";
export type EventTeamStatus = "invited" | "active" | "revoked" | "expired";

export interface IEventTeam extends Document {
  eventId: Types.ObjectId;
  email: string;
  userId?: Types.ObjectId | null;
  name?: string;

  role: EventTeamRole;
  status: EventTeamStatus;

  temporaryAccess: boolean;
  expiresAt?: Date;

  invitedBy: Types.ObjectId;
  inviteToken?: string;

  createdAt: Date;
  updatedAt: Date;
}

/* ----------------------------- Schema ---------------------------- */
const EventTeamSchema = new Schema<IEventTeam>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
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
      enum: ["admin", "promoter", "scanner", "collaborator"],
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
  { timestamps: true, strict: true }
);

/** Ensure uniqueness per event+email */
EventTeamSchema.index({ eventId: 1, email: 1 }, { unique: true });

/** Keep status in sync when expired */
EventTeamSchema.pre("save", function (next) {
  if (
    this.temporaryAccess &&
    this.expiresAt &&
    this.expiresAt.getTime() < Date.now()
  ) {
    this.status = "expired";
  }
  next();
});

const EventTeam =
  models.EventTeam || model<IEventTeam>("EventTeam", EventTeamSchema);
export default EventTeam;
