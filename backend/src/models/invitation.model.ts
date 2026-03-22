import mongoose, { Schema, Document } from "mongoose";

// tokenHash stores SHA-256 hash of the plain token — plain token is sent in
// email only and never stored. Same pattern as API keys and password reset.

export interface IInvitation extends Document {
  email: string;
  organizationId: mongoose.Types.ObjectId;
  role: "owner" | "admin" | "member";
  tokenHash: string;
  isAccepted: boolean;
  expiresAt: Date;
  createdAt: Date;
}

const invitationSchema = new Schema<IInvitation>(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    role: {
      type: String,
      enum: ["owner", "admin", "member"],
      default: "member",
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
      select: false,
    },
    isAccepted: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL — auto-deletes
  },
  { timestamps: true },
);

// One active invite per email per org
invitationSchema.index(
  { email: 1, organizationId: 1 },
  { unique: true, partialFilterExpression: { isAccepted: false } },
);

export const Invitation = mongoose.model<IInvitation>(
  "Invitation",
  invitationSchema,
);
