import {
  findNotificationPrefs,
  upsertNotificationPrefs,
} from "../repositories/notification.repository";

export interface NotificationPrefs {
  accountActivity: boolean;
  securityAlerts: boolean;
  productUpdates: boolean;
  marketingEmails: boolean;
}

const DEFAULTS: NotificationPrefs = {
  accountActivity: true,
  securityAlerts: true,
  productUpdates: true,
  marketingEmails: false,
};

export const formatPrefs = (
  prefs: Partial<NotificationPrefs>,
): NotificationPrefs => {
  return {
    accountActivity: prefs.accountActivity ?? DEFAULTS.accountActivity,
    securityAlerts: prefs.securityAlerts ?? DEFAULTS.securityAlerts,
    productUpdates: prefs.productUpdates ?? DEFAULTS.productUpdates,
    marketingEmails: prefs.marketingEmails ?? DEFAULTS.marketingEmails,
  };
};

export const getPreferences = async (
  userId: string,
): Promise<NotificationPrefs> => {
  const prefs = await findNotificationPrefs(userId);
  return prefs ? formatPrefs(prefs) : { ...DEFAULTS };
};

export const savePreferences = async (
  userId: string,
  data: NotificationPrefs,
): Promise<NotificationPrefs> => {
  const prefs = await upsertNotificationPrefs(userId, data);
  return formatPrefs(prefs);
};
