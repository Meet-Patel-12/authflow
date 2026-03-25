import mongoose, { Schema, Document } from "mongoose";

export interface IApplicationMember extends Document {
  applicationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: "viewer" | "editor" | "admin";
  assignedAt: Date;
}

const applicationMemberSchema = new Schema<IApplicationMember>(
  {
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["viewer", "editor", "admin"],
      default: "viewer",
    },
    assignedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// Ensure unique user per application
applicationMemberSchema.index(
  { applicationId: 1, userId: 1 },
  { unique: true },
);

export const ApplicationMember = mongoose.model<IApplicationMember>(
  "ApplicationMember",
  applicationMemberSchema,
);
