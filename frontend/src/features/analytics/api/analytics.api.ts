import api from "../../../app/apiClient";
import type { ApiResponse } from "../../../shared/types/global.types";

interface UserGrowth {
  date: string;
  users: number;
  newUsers: number;
}

interface LoginActivity {
  date: string;
  logins: number;
  uniqueUsers: number;
}

interface DeviceStats {
  device: string;
  count: number;
  percentage: number;
}

interface GeographicData {
  country: string;
  users: number;
}

interface AnalyticsData {
  userGrowth: UserGrowth[];
  loginActivity: LoginActivity[];
  deviceStats: DeviceStats[];
  geographicData: GeographicData[];
  summary: {
    totalUsers: number;
    activeUsers: number;
    newUsersThisWeek: number;
    newUsersThisMonth: number;
    totalLogins: number;
    avgSessionDuration: number;
    mfaAdoptionRate: number;
  };
}

export const analyticsService = {
  // Get analytics dashboard data
  getAnalytics: async (
    period: string = "30d",
  ): Promise<ApiResponse<AnalyticsData>> => {
    const response = await api.get(`/admin/analytics?period=${period}`);
    return response.data;
  },

  // Get user growth data
  getUserGrowth: async (
    period: string = "30d",
  ): Promise<ApiResponse<UserGrowth[]>> => {
    const response = await api.get(`/admin/analytics/users?period=${period}`);
    return response.data;
  },

  // Get login activity
  getLoginActivity: async (
    period: string = "30d",
  ): Promise<ApiResponse<LoginActivity[]>> => {
    const response = await api.get(`/admin/analytics/logins?period=${period}`);
    return response.data;
  },

  // Export analytics data
  exportData: async (
    period: string = "30d",
    format: "csv" | "json" = "csv",
  ): Promise<Blob> => {
    const response = await api.get(
      `/admin/analytics/export?period=${period}&format=${format}`,
      {
        responseType: "blob",
      },
    );
    return response.data;
  },
};
