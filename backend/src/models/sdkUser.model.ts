import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

// SDKUser — end-users of a developer's application (Auth0: tenant User Store).
// Scoped to one organization. Email unique per org, not globally.

export interface ISDKUser extends Document {
  organizationId: mongoose.Types.ObjectId;
  applicationId: mongoose.Types.ObjectId;
  email: string;
  password?: string;
  name: string;
  avatar?: string;
  isEmailVerified: boolean;
  isActive: boolean;
  metadata: Record<string, unknown>;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const sdkUserSchema = new Schema<ISDKUser>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      index: true,
    },
    email: { type: String, required: true, lowercase: true, trim: true },
    password: { type: String, select: false },
    name: { type: String, required: true, trim: true },
    avatar: String,
    isEmailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    lastLoginAt: Date,
    lastLoginIp: String,
  },
  { timestamps: true },
);

// Email unique per org — two orgs can share the same email address
sdkUserSchema.index({ organizationId: 1, email: 1 }, { unique: true });

sdkUserSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

sdkUserSchema.methods.comparePassword = async function (
  candidate: string,
): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

export const SDKUser = mongoose.model<ISDKUser>("SDKUser", sdkUserSchema);
