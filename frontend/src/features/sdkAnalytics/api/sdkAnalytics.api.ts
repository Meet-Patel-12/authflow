import api from "../../../app/apiClient";

const API_BASE_URL = "/admin/sdk-analytics";

interface Application {
  _id: string;
  name: string;
  type: string;
  createdAt: string;
}

interface SDKUserMetrics {
  totalUsers: number;
  activeUsers: number;
  emailVerifiedUsers: number;
  emailVerificationRate: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}

interface LoginMetrics {
  totalLogins: number;
  loginsToday: number;
  loginsThisWeek: number;
  loginsThisMonth: number;
  uniqueUsersLoggedIn: number;
}

interface DeviceStats {
  device: string;
  count: number;
  percentage: number;
}

interface CountryStats {
  country: string;
  count: number;
  percentage: number;
}

interface Trend {
  date: string;
  count: number;
}

export interface ApplicationUserData {
  applicationId: string;
  applicationName: string;
  metrics: SDKUserMetrics;
  loginMetrics: LoginMetrics;
  devices: DeviceStats[];
  countries: CountryStats[];
  registrationTrend: Trend[];
  loginTrend: Trend[];
}

class SDKAnalyticsService {
  async getApplicationsList() {
    const response = await api.get<{ success: boolean; data: Application[] }>(
      `${API_BASE_URL}/applications`,
    );
    return response.data;
  }

  async getAllApplicationsAnalytics() {
    const response = await api.get<{
      success: boolean;
      data: ApplicationUserData[];
    }>(`${API_BASE_URL}`);
    return response.data;
  }

  async getApplicationAnalytics(applicationId: string) {
    const response = await api.get<{
      success: boolean;
      data: ApplicationUserData;
    }>(`${API_BASE_URL}/${applicationId}`);
    return response.data;
  }

  async exportApplicationAnalytics(
    applicationId: string,
    format: "csv" | "json",
  ) {
    const response = await api.get(
      `${API_BASE_URL}/${applicationId}/export?format=${format}`,
      {
        responseType: format === "csv" ? "blob" : "json",
      },
    );
    return response.data;
  }
}

export const sdkAnalyticsService = new SDKAnalyticsService();
export type {
  Application,
  SDKUserMetrics,
  LoginMetrics,
  DeviceStats,
  CountryStats,
};
