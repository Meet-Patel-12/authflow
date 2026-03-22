import mongoose, { Schema, Document } from "mongoose";

export interface IMFADevice extends Document {
  organizationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: "totp" | "sms";
  secret?: string;
  backupCodes?: string[];
  isVerified: boolean;
  isActive: boolean;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const mfaDeviceSchema = new Schema<IMFADevice>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: { type: String, enum: ["totp", "sms"], required: true },
    secret: { type: String, select: false },
    backupCodes: { type: [String], select: false },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: false },
    lastUsedAt: Date,
  },
  { timestamps: true },
);

mfaDeviceSchema.index({ organizationId: 1, userId: 1, type: 1 });
mfaDeviceSchema.index({ organizationId: 1, userId: 1, isActive: 1 });

export const MFADevice = mongoose.model<IMFADevice>(
  "MFADevice",
  mfaDeviceSchema,
);
