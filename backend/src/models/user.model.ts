import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  email: string;
  password?: string;
  name: string;
  avatar?: string;
  role: "user" | "admin" | "owner";
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  mfaEnabled: boolean;
  oauth: {
    google?: { id: string; email: string; picture?: string };
    github?: { id: string; username: string; avatar?: string };
  };
  lastLoginAt?: Date;
  lastLoginIp?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },

    password: {
      type: String,
      select: false,
      validate: {
        validator: (value: string) => !value || value.length >= 8,
        message: "Password must be at least 8 characters",
      },
    },

    name: { type: String, required: [true, "Name is required"], trim: true },
    avatar: {
      type: String,
      default: null,
    },
    role: { type: String, enum: ["user", "admin", "owner"], default: "user" },

    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    mfaEnabled: { type: Boolean, default: false },

    oauth: {
      google: {
        id: { type: String, index: true, sparse: true },
        email: String,
        picture: String,
      },
      github: {
        id: { type: String, index: true, sparse: true },
        username: String,
        avatar: String,
      },
    },

    lastLoginAt: Date,
    lastLoginIp: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  if (!this.password) return false;
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch {
    return false;
  }
};

export const User = mongoose.model<IUser>("User", userSchema);
