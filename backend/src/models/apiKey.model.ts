import mongoose, { Schema, Document } from "mongoose";
import { hashApiKey, generateApiKey } from "../utils/crypto.util";

export interface IApiKey extends Document {
  organizationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  keyHash: string;
  keyPrefix: string; // First 8 chars for display/identification
  permissions: string[];
  lastUsedAt?: Date;
  expiresAt?: Date;
  isActive: boolean;
  usageCount: number;
  rateLimit?: {
    requestsPerHour: number;
    requestsPerDay: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const apiKeySchema = new Schema<IApiKey>(
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
    name: { type: String, required: true, trim: true },
    keyHash: { type: String, required: true, unique: true, index: true },
    keyPrefix: { type: String, required: true, index: true },
    permissions: { type: [String], default: ["read"] },
    rateLimit: {
      requestsPerHour: {
        type: Number,
      },
      requestsPerDay: {
        type: Number,
      },
    },
    lastUsedAt: Date,
    expiresAt: Date,
    isActive: { type: Boolean, default: true, index: true },
    usageCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

apiKeySchema.index({ organizationId: 1, isActive: 1 });
apiKeySchema.index({ organizationId: 1, userId: 1 });

apiKeySchema.statics.generateKey = (organizationId: string) =>
  generateApiKey(organizationId);

apiKeySchema.statics.hashKey = (key: string) => hashApiKey(key);

export const ApiKey = mongoose.model<IApiKey>("ApiKey", apiKeySchema);
