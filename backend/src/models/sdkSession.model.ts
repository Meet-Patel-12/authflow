import mongoose, { Schema, Document } from "mongoose";

// SDKSession — active sessions for SDK end-users (isolated from platform Session).

export interface ISDKSession extends Document {
  sdkUserId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  refreshToken: string;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  expiresAt: Date;
  lastActivity: Date;
  createdAt: Date;
  updatedAt: Date;
}

const sdkSessionSchema = new Schema<ISDKSession>(
  {
    sdkUserId: {
      type: Schema.Types.ObjectId,
      ref: "SDKUser",
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    refreshToken: { type: String, required: true, index: true },
    ipAddress: { type: String, required: true },
    userAgent: { type: String, required: true },
    isActive: { type: Boolean, default: true, index: true },
    expiresAt: { type: Date, required: true },
    lastActivity: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// Auto-delete expired sessions
sdkSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Fast lookup for active sessions per user per org
sdkSessionSchema.index({ sdkUserId: 1, organizationId: 1, isActive: 1 });

export const SDKSession = mongoose.model<ISDKSession>(
  "SDKSession",
  sdkSessionSchema,
);
