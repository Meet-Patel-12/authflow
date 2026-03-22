import mongoose, { Schema, Document } from "mongoose";
import { generateAppCredentials, verifyAppSecret } from "../utils/crypto.util";

export type ApplicationType =
  | "spa"
  | "regular_web"
  | "native"
  | "machine_to_machine";

export interface IApplication extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  logo?: string;
  type: ApplicationType;
  clientId: string; // public  — safe to expose in frontend code
  clientSecret: string; // private — stored as SHA-256 hash, select: false
  allowedCallbacks: string[];
  allowedLogoutUrls: string[];
  allowedOrigins: string[];
  allowedWebOrigins: string[];
  tokenExpiry: {
    accessTokenTTL: number; // seconds, default 86400  (24h)
    refreshTokenTTL: number; // seconds, default 604800 (7d)
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IApplicationModel extends mongoose.Model<IApplication> {
  generateCredentials(): {
    clientId: string;
    rawSecret: string;
    hashedSecret: string;
  };
  verifySecret(rawSecret: string, hashedSecret: string): boolean;
}

const applicationSchema = new Schema<IApplication>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 140 },
    logo: { type: String, trim: true },
    type: {
      type: String,
      enum: ["spa", "regular_web", "native", "machine_to_machine"],
      required: true,
    },

    clientId: { type: String, required: true, unique: true, index: true },
    clientSecret: { type: String, required: true, select: false },

    allowedCallbacks: { type: [String], default: [] },
    allowedLogoutUrls: { type: [String], default: [] },
    allowedOrigins: { type: [String], default: [] },
    allowedWebOrigins: { type: [String], default: [] },

    tokenExpiry: {
      accessTokenTTL: { type: Number, default: 86400, min: 300, max: 2592000 },
      refreshTokenTTL: {
        type: Number,
        default: 604800,
        min: 3600,
        max: 31536000,
      },
    },

    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

applicationSchema.index({ organizationId: 1, name: 1 }, { unique: true });

applicationSchema.statics.generateCredentials = () => generateAppCredentials();
applicationSchema.statics.verifySecret = (raw: string, hashed: string) =>
  verifyAppSecret(raw, hashed);

export const Application = mongoose.model<IApplication, IApplicationModel>(
  "Application",
  applicationSchema,
);
