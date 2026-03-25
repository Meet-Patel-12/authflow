import { ObjectId, Types } from "mongoose";
import { SDKUser } from "../models/sdkUser.model";
import { Application } from "../models/application.model";
import { AuditLog } from "../models/audit.model";

export interface SDKUserMetrics {
  totalUsers: number;
  activeUsers: number;
  emailVerifiedUsers: number;
  emailVerificationRate: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}

export interface LoginMetrics {
  totalLogins: number;
  loginsToday: number;
  loginsThisWeek: number;
  loginsThisMonth: number;
  uniqueUsersLoggedIn: number;
}

export interface DeviceStats {
  device: string;
  count: number;
  percentage: number;
}

export interface CountryStats {
  country: string;
  count: number;
  percentage: number;
}

export interface ApplicationUserData {
  applicationId: Types.ObjectId;
  applicationName: string;
  metrics: SDKUserMetrics;
  loginMetrics: LoginMetrics;
  devices: DeviceStats[];
  countries: CountryStats[];
  registrationTrend: Array<{
    date: string;
    count: number;
  }>;
  loginTrend: Array<{
    date: string;
    count: number;
  }>;
}

class SDKAnalyticsRepository {
  // Get all applications for organization
  async getApplicationsList(organizationId: Types.ObjectId) {
    return Application.find({
      organizationId,
    }).select("_id name type createdAt");
  }

  // Get user metrics for an application
  async getUserMetrics(
    organizationId: Types.ObjectId,
    applicationId?: Types.ObjectId,
  ): Promise<SDKUserMetrics> {
    const filter: any = { organizationId };
    if (applicationId) {
      filter.applicationId = applicationId;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate(),
    );

    const [
      totalUsers,
      activeUsers,
      emailVerified,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
    ] = await Promise.all([
      SDKUser.countDocuments(filter),
      SDKUser.countDocuments({ ...filter, isActive: true }),
      SDKUser.countDocuments({ ...filter, isEmailVerified: true }),
      SDKUser.countDocuments({
        ...filter,
        createdAt: { $gte: today },
      }),
      SDKUser.countDocuments({
        ...filter,
        createdAt: { $gte: weekAgo },
      }),
      SDKUser.countDocuments({
        ...filter,
        createdAt: { $gte: monthAgo },
      }),
    ]);

    return {
      totalUsers,
      activeUsers,
      emailVerifiedUsers: emailVerified,
      emailVerificationRate:
        totalUsers > 0 ? Math.round((emailVerified / totalUsers) * 100) : 0,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
    };
  }

  // Get login metrics
  async getLoginMetrics(
    organizationId: Types.ObjectId,
    applicationId?: Types.ObjectId,
  ): Promise<LoginMetrics> {
    const filter: any = {
      organizationId,
      action: "login",
      resource: "sdk_user",
    };
    if (applicationId) {
      filter.applicationId = applicationId;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate(),
    );

    const [
      totalLogins,
      loginsToday,
      loginsThisWeek,
      loginsThisMonth,
      uniqueLoginsToday,
    ] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.countDocuments({
        ...filter,
        createdAt: { $gte: today },
      }),
      AuditLog.countDocuments({
        ...filter,
        createdAt: { $gte: weekAgo },
      }),
      AuditLog.countDocuments({
        ...filter,
        createdAt: { $gte: monthAgo },
      }),
      AuditLog.distinct("userId", {
        ...filter,
        createdAt: { $gte: today },
      }),
    ]);

    return {
      totalLogins,
      loginsToday,
      loginsThisWeek,
      loginsThisMonth,
      uniqueUsersLoggedIn: uniqueLoginsToday.length,
    };
  }

  // Get device statistics from user agent
  async getDeviceStats(
    organizationId: Types.ObjectId,
    applicationId?: Types.ObjectId,
  ): Promise<DeviceStats[]> {
    const matchStage: any = {
      organizationId,
      action: "login",
      resource: "sdk_user",
      userAgent: { $exists: true, $ne: null },
    };
    if (applicationId) {
      matchStage.applicationId = applicationId;
    }

    const devices = await AuditLog.aggregate([
      {
        $match: matchStage,
      },
      {
        $group: {
          _id: "$userAgent",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 20,
      },
    ]);

    const totalLogins = devices.reduce((sum, d) => sum + d.count, 0);

    return devices.map((d) => ({
      device: parseUserAgent(d._id),
      count: d.count,
      percentage:
        totalLogins > 0 ? Math.round((d.count / totalLogins) * 100) : 0,
    }));
  }

  // Get country statistics from IP or metadata
  async getCountryStats(
    organizationId: Types.ObjectId,
    applicationId?: Types.ObjectId,
  ): Promise<CountryStats[]> {
    // Try to get from metadata first, then fallback to IP geolocation
    const matchStage: any = {
      organizationId,
      action: "login",
      resource: "sdk_user",
    };
    if (applicationId) {
      matchStage.applicationId = applicationId;
    }

    const countries = await AuditLog.aggregate([
      {
        $match: matchStage,
      },
      {
        $group: {
          _id: {
            $cond: [
              { $ne: ["$metadata.country", null] },
              "$metadata.country",
              "Unknown",
            ],
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 20,
      },
    ]);

    const totalLogins = countries.reduce((sum, c) => sum + c.count, 0);

    return countries.map((c) => ({
      country: c._id || "Unknown",
      count: c.count,
      percentage:
        totalLogins > 0 ? Math.round((c.count / totalLogins) * 100) : 0,
    }));
  }

  // Get registration trend over last 30 days
  async getRegistrationTrend(
    organizationId: Types.ObjectId,
    applicationId?: Types.ObjectId,
  ) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const matchStage: any = {
      organizationId,
      createdAt: { $gte: thirtyDaysAgo },
    };
    if (applicationId) {
      matchStage.applicationId = applicationId;
    }

    const trend = await SDKUser.aggregate([
      {
        $match: matchStage,
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    return trend.map((t) => ({
      date: t._id,
      count: t.count,
    }));
  }

  // Get login trend over last 30 days
  async getLoginTrend(
    organizationId: Types.ObjectId,
    applicationId?: Types.ObjectId,
  ) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const matchStage: any = {
      organizationId,
      action: "login",
      resource: "sdk_user",
      createdAt: { $gte: thirtyDaysAgo },
    };
    if (applicationId) {
      matchStage.applicationId = applicationId;
    }

    const trend = await AuditLog.aggregate([
      {
        $match: matchStage,
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    return trend.map((t) => ({
      date: t._id,
      count: t.count,
    }));
  }

  // Get full application user data (combines all metrics)
  async getApplicationUserData(
    organizationId: Types.ObjectId,
    applicationId: Types.ObjectId,
  ): Promise<ApplicationUserData> {
    const app = await Application.findOne({
      _id: applicationId,
      organizationId,
    }).select("_id name");

    if (!app) {
      throw new Error("Application not found");
    }

    const [
      metrics,
      loginMetrics,
      devices,
      countries,
      registrationTrend,
      loginTrend,
    ] = await Promise.all([
      this.getUserMetrics(organizationId, applicationId),
      this.getLoginMetrics(organizationId, applicationId),
      this.getDeviceStats(organizationId, applicationId),
      this.getCountryStats(organizationId, applicationId),
      this.getRegistrationTrend(organizationId, applicationId),
      this.getLoginTrend(organizationId, applicationId),
    ]);

    return {
      applicationId: app._id,
      applicationName: app.name,
      metrics,
      loginMetrics,
      devices,
      countries,
      registrationTrend,
      loginTrend,
    };
  }
}

// Helper function to parse user agent
function parseUserAgent(userAgent: string): string {
  if (!userAgent) return "Unknown";

  // Chrome
  if (userAgent.includes("Chrome")) return "Chrome";
  // Firefox
  if (userAgent.includes("Firefox")) return "Firefox";
  // Safari
  if (userAgent.includes("Safari") && !userAgent.includes("Chrome"))
    return "Safari";
  // Edge
  if (userAgent.includes("Edg")) return "Edge";
  // Mobile browsers
  if (userAgent.includes("Mobile")) return "Mobile Browser";
  // Desktop other
  return "Other";
}

export default new SDKAnalyticsRepository();
