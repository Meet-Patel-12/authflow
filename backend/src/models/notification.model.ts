import mongoose, { Document, Schema } from "mongoose";

export interface INotificationPreference extends Document {
  userId: mongoose.Types.ObjectId;
  accountActivity: boolean; // login alerts, profile changes, password changes
  securityAlerts: boolean; // MFA changes, suspicious activity, session revoked
  productUpdates: boolean; // new features, changelog
  marketingEmails: boolean; // promotions, newsletters
  createdAt: Date;
  updatedAt: Date;
}

const notificationPreferenceSchema = new Schema<INotificationPreference>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    accountActivity: { type: Boolean, default: true },
    securityAlerts: { type: Boolean, default: true },
    productUpdates: { type: Boolean, default: true },
    marketingEmails: { type: Boolean, default: false }, // opt-out by default
  },
  { timestamps: true },
);

export const NotificationPreference = mongoose.model<INotificationPreference>(
  "NotificationPreference",
  notificationPreferenceSchema,
);
