import { Types } from "mongoose";
import sdkAnalyticsRepository, {
  ApplicationUserData,
} from "../repositories/sdkAnalytics.repository";

class SDKAnalyticsService {
  async getApplicationsList(organizationId: string | Types.ObjectId) {
    const orgId =
      typeof organizationId === "string"
        ? new Types.ObjectId(organizationId)
        : (organizationId as Types.ObjectId);
    return sdkAnalyticsRepository.getApplicationsList(orgId);
  }

  async getApplicationAnalytics(
    organizationId: string | Types.ObjectId,
    applicationId: string | Types.ObjectId,
  ): Promise<ApplicationUserData> {
    const orgId =
      typeof organizationId === "string"
        ? new Types.ObjectId(organizationId)
        : (organizationId as Types.ObjectId);
    const appId =
      typeof applicationId === "string"
        ? new Types.ObjectId(applicationId)
        : (applicationId as Types.ObjectId);
    return sdkAnalyticsRepository.getApplicationUserData(orgId, appId);
  }

  async getAllApplicationsAnalytics(organizationId: string | Types.ObjectId) {
    const orgId =
      typeof organizationId === "string"
        ? new Types.ObjectId(organizationId)
        : (organizationId as Types.ObjectId);
    const applications =
      await sdkAnalyticsRepository.getApplicationsList(orgId);

    if (applications.length === 0) {
      return [];
    }

    // Get data for all applications in parallel
    const data = await Promise.all(
      applications.map((app) =>
        sdkAnalyticsRepository.getApplicationUserData(
          orgId,
          app._id as Types.ObjectId,
        ),
      ),
    );

    return data;
  }

  async exportApplicationAnalytics(
    organizationId: string | Types.ObjectId,
    applicationId: string | Types.ObjectId,
    format: "csv" | "json",
  ) {
    const data = await this.getApplicationAnalytics(
      organizationId,
      applicationId,
    );

    if (format === "json") {
      return JSON.stringify(data, null, 2);
    }

    // CSV format
    const rows = [
      ["Metric", "Value", "Metric Type"],
      ["Application Name", data.applicationName, "General"],
      ["Total SDK Users", data.metrics.totalUsers.toString(), "Users"],
      ["Active Users", data.metrics.activeUsers.toString(), "Users"],
      [
        "Email Verified Users",
        data.metrics.emailVerifiedUsers.toString(),
        "Users",
      ],
      [
        "Email Verification Rate",
        data.metrics.emailVerificationRate.toString() + "%",
        "Users",
      ],
      ["New Users Today", data.metrics.newUsersToday.toString(), "Users"],
      [
        "New Users This Week",
        data.metrics.newUsersThisWeek.toString(),
        "Users",
      ],
      [
        "New Users This Month",
        data.metrics.newUsersThisMonth.toString(),
        "Users",
      ],
      ["Total Logins", data.loginMetrics.totalLogins.toString(), "Logins"],
      ["Logins Today", data.loginMetrics.loginsToday.toString(), "Logins"],
      [
        "Logins This Week",
        data.loginMetrics.loginsThisWeek.toString(),
        "Logins",
      ],
      [
        "Logins This Month",
        data.loginMetrics.loginsThisMonth.toString(),
        "Logins",
      ],
      [
        "Unique Users Logged In",
        data.loginMetrics.uniqueUsersLoggedIn.toString(),
        "Logins",
      ],
    ];

    // Add devices section
    rows.push(["", "", ""]);
    rows.push(["Device", "Count", "Percentage"]);
    data.devices.forEach((d) => {
      rows.push([d.device, d.count.toString(), d.percentage.toString() + "%"]);
    });

    // Add countries section
    rows.push(["", "", ""]);
    rows.push(["Country", "Count", "Percentage"]);
    data.countries.forEach((c) => {
      rows.push([c.country, c.count.toString(), c.percentage.toString() + "%"]);
    });

    // Format as CSV
    return rows
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");
  }
}

export default new SDKAnalyticsService();
