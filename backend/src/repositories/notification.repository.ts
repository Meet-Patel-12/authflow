import { NotificationPreference } from "../models/notification.model";

interface NotificationPrefs {
  accountActivity: boolean;
  securityAlerts: boolean;
  productUpdates: boolean;
  marketingEmails: boolean;
}

export const findNotificationPrefs = async (userId: string) => {
  return NotificationPreference.findOne({ userId });
};

export const upsertNotificationPrefs = async (
  userId: string,
  data: NotificationPrefs,
) => {
  return NotificationPreference.findOneAndUpdate(
    { userId },
    { $set: data },
    { new: true, upsert: true },
  );
};
