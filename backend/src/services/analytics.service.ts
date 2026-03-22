import mongoose from "mongoose";
import {
  getOrgUserIds,
  countPlatformUsers,
  getPlatformUserGrowth,
  countSDKUsers,
  getSDKUserGrowth,
  countActiveApplications,
  findActiveApplications,
  countAuditAction,
  getLoginActivity,
  getSDKLoginActivity,
  getPlatformDeviceStats,
  getSDKDeviceStats,
} from "../repositories/analytics.repository";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const getDateRange = (
  period: string,
): {
  startDate: Date;
  endDate: Date;
} => {
  const now = new Date();
  const startDate = new Date();

  switch (period) {
    case "7d":
      startDate.setDate(now.getDate() - 7);
      break;
    case "90d":
      startDate.setDate(now.getDate() - 90);
      break;
    case "1y":
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate.setDate(now.getDate() - 30);
  }

  return { startDate, endDate: now };
};

const formatDeviceStats = (raw: { _id: string; count: number }[]) => {
  const total = raw.reduce((sum, item) => sum + item.count, 0);
  return raw.map((item) => ({
    device: item._id,
    count: item.count,
    percentage: total > 0 ? Math.round((item.count / total) * 100) : 0,
  }));
};

const buildGrowthSeries = (
  raw: { _id: string; newUsers: number }[],
  initialCount: number,
) => {
  let cumulative = initialCount;
  return raw.map((item) => {
    cumulative += item.newUsers;
    return { date: item._id, total: cumulative, newUsers: item.newUsers };
  });
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const getDashboardAnalytics = async (
  organizationId: string,
  period: string,
) => {
  const orgObjectId = new mongoose.Types.ObjectId(organizationId);
  const { startDate, endDate } = getDateRange(period);
  const orgUserIds = await getOrgUserIds(organizationId);

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalPlatformUsers,
    activePlatformUsers,
    mfaEnabled,
    newPlatformThisWeek,
    newPlatformThisMonth,
    totalSDKUsers,
    activeSDKUsers,
    newSDKUsersThisWeek,
    newSDKUsersThisMonth,
    totalApplications,
    totalLogins,
    totalSDKLogins,
    platformGrowthRaw,
    sdkGrowthRaw,
    loginActivityData,
    sdkLoginActivityData,
    deviceStatsRaw,
    sdkDeviceStatsRaw,
    platformBaseCount,
    sdkBaseCount,
    applications,
  ] = await Promise.all([
    countPlatformUsers(orgUserIds),
    countPlatformUsers(orgUserIds, { isEmailVerified: true }),
    countPlatformUsers(orgUserIds, { mfaEnabled: true }),
    countPlatformUsers(orgUserIds, { createdAt: { $gte: oneWeekAgo } }),
    countPlatformUsers(orgUserIds, { createdAt: { $gte: oneMonthAgo } }),
    countSDKUsers(orgObjectId),
    countSDKUsers(orgObjectId, { isActive: true }),
    countSDKUsers(orgObjectId, { createdAt: { $gte: oneWeekAgo } }),
    countSDKUsers(orgObjectId, { createdAt: { $gte: oneMonthAgo } }),
    countActiveApplications(organizationId),
    countAuditAction(orgObjectId, "login", startDate, endDate),
    countAuditAction(orgObjectId, "sdk_user_login", startDate, endDate),
    getPlatformUserGrowth(orgUserIds, startDate, endDate),
    getSDKUserGrowth(orgObjectId, startDate, endDate),
    getLoginActivity(orgObjectId, "login", startDate, endDate),
    getSDKLoginActivity(orgObjectId, startDate, endDate),
    getPlatformDeviceStats(orgObjectId),
    getSDKDeviceStats(orgObjectId),
    countPlatformUsers(orgUserIds, { createdAt: { $lt: startDate } }),
    countSDKUsers(orgObjectId, { createdAt: { $lt: startDate } }),
    findActiveApplications(organizationId),
  ]);

  const sdkUserCountsByApp = await Promise.all(
    applications.map(async (app) => ({
      applicationId: app._id,
      applicationName: app.name,
      type: app.type,
      clientId: app.clientId,
      userCount: await countSDKUsers(orgObjectId),
      activeUserCount: await countSDKUsers(orgObjectId, { isActive: true }),
    })),
  );

  return {
    platformSummary: {
      totalUsers: totalPlatformUsers,
      activeUsers: activePlatformUsers,
      newUsersThisWeek: newPlatformThisWeek,
      newUsersThisMonth: newPlatformThisMonth,
      totalLogins,
      mfaAdoptionRate:
        totalPlatformUsers > 0
          ? Math.round((mfaEnabled / totalPlatformUsers) * 100)
          : 0,
    },
    sdkSummary: {
      totalUsers: totalSDKUsers,
      activeUsers: activeSDKUsers,
      newUsersThisWeek: newSDKUsersThisWeek,
      newUsersThisMonth: newSDKUsersThisMonth,
      totalLogins: totalSDKLogins,
      totalApplications,
      usersByApplication: sdkUserCountsByApp,
    },
    platformUserGrowth: buildGrowthSeries(platformGrowthRaw, platformBaseCount),
    sdkUserGrowth: buildGrowthSeries(sdkGrowthRaw, sdkBaseCount),
    loginActivity: loginActivityData,
    sdkLoginActivity: sdkLoginActivityData,
    deviceStats: formatDeviceStats(deviceStatsRaw),
    sdkDeviceStats: formatDeviceStats(sdkDeviceStatsRaw),
  };
};

// ─── User Growth ──────────────────────────────────────────────────────────────

export const getPlatformUserGrowthData = async (
  organizationId: string,
  period: string,
) => {
  const { startDate, endDate } = getDateRange(period);
  const orgUserIds = await getOrgUserIds(organizationId);
  const raw = await getPlatformUserGrowth(orgUserIds, startDate, endDate);
  return raw.map((item) => ({ date: item._id, newUsers: item.newUsers }));
};

export const getSDKUserGrowthData = async (
  organizationId: string,
  period: string,
) => {
  const orgObjectId = new mongoose.Types.ObjectId(organizationId);
  const { startDate, endDate } = getDateRange(period);
  const raw = await getSDKUserGrowth(orgObjectId, startDate, endDate);
  return raw.map((item) => ({ date: item._id, newUsers: item.newUsers }));
};

// ─── Login Activity ───────────────────────────────────────────────────────────

export const getLoginActivityData = async (
  organizationId: string,
  period: string,
) => {
  const orgObjectId = new mongoose.Types.ObjectId(organizationId);
  const { startDate, endDate } = getDateRange(period);
  return getLoginActivity(orgObjectId, "login", startDate, endDate);
};

// ─── Export ───────────────────────────────────────────────────────────────────

export const getExportData = async (organizationId: string, period: string) => {
  const orgObjectId = new mongoose.Types.ObjectId(organizationId);
  const { startDate, endDate } = getDateRange(period);
  const orgUserIds = await getOrgUserIds(organizationId);

  const [
    totalPlatformUsers,
    activePlatformUsers,
    totalSDKUsers,
    activeSDKUsers,
    totalLogins,
    totalSDKLogins,
    totalApplications,
  ] = await Promise.all([
    countPlatformUsers(orgUserIds),
    countPlatformUsers(orgUserIds, { isEmailVerified: true }),
    countSDKUsers(orgObjectId),
    countSDKUsers(orgObjectId, { isActive: true }),
    countAuditAction(orgObjectId, "login", startDate, endDate),
    countAuditAction(orgObjectId, "sdk_user_login", startDate, endDate),
    countActiveApplications(organizationId),
  ]);

  return {
    period,
    dateRange: { start: startDate.toISOString(), end: endDate.toISOString() },
    platform: {
      totalUsers: totalPlatformUsers,
      activeUsers: activePlatformUsers,
      totalLogins,
    },
    sdk: {
      totalUsers: totalSDKUsers,
      activeUsers: activeSDKUsers,
      totalLogins: totalSDKLogins,
      totalApplications,
    },
  };
};

export const buildCSV = (
  data: ReturnType<typeof getExportData> extends Promise<infer T> ? T : never,
): string => {
  return [
    "Category,Metric,Value",
    `Platform,Total Users,${data.platform.totalUsers}`,
    `Platform,Active Users,${data.platform.activeUsers}`,
    `Platform,Total Logins,${data.platform.totalLogins}`,
    `SDK,Total Users,${data.sdk.totalUsers}`,
    `SDK,Active Users,${data.sdk.activeUsers}`,
    `SDK,Total Logins,${data.sdk.totalLogins}`,
    `SDK,Total Applications,${data.sdk.totalApplications}`,
  ].join("\n");
};
