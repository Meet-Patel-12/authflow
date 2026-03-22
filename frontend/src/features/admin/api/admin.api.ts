import api from "../../../app/apiClient";
import type {
  ApiResponse,
  PaginatedResponse,
  User,
} from "../../../shared/types/global.types";

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  mfaEnabled: number;
  totalSessions: number;
  totalApiKeys: number;
  totalOrganizations: number;
}

interface UserFilters {
  search?: string;
  role?: string;
  mfaEnabled?: boolean;
  isEmailVerified?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export const adminService = {
  // Get admin dashboard stats
  getStats: async (): Promise<ApiResponse<AdminStats>> => {
    const response = await api.get("/admin/stats");
    return response.data;
  },

  // Get all users with pagination and filters
  getUsers: async (
    filters: UserFilters = {},
  ): Promise<PaginatedResponse<User>> => {
    const params = new URLSearchParams();

    if (filters.search) params.append("search", filters.search);
    if (filters.role) params.append("role", filters.role);
    if (filters.mfaEnabled !== undefined)
      params.append("mfaEnabled", String(filters.mfaEnabled));
    if (filters.isEmailVerified !== undefined)
      params.append("isEmailVerified", String(filters.isEmailVerified));
    if (filters.page) params.append("page", String(filters.page));
    if (filters.limit) params.append("limit", String(filters.limit));
    if (filters.sortBy) params.append("sortBy", filters.sortBy);
    if (filters.sortOrder) params.append("sortOrder", filters.sortOrder);

    const response = await api.get(`/admin/users?${params.toString()}`);
    return response.data;
  },

  // Get Single user details
  getUser: async (userId: string): Promise<ApiResponse<User>> => {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data;
  },

  // Update user
  updateUser: async (
    userId: string,
    data: Partial<User>,
  ): Promise<ApiResponse<User>> => {
    const response = await api.patch(`/admin/users/${userId}`, data);
    return response.data;
  },

  // Update user role
  updateUserRole: async (
    userId: string,
    role: string,
  ): Promise<ApiResponse> => {
    const response = await api.patch(`/admin/users/${userId}/role`, { role });
    return response.data;
  },

  // Suspend user
  suspendUser: async (userId: string): Promise<ApiResponse> => {
    const response = await api.post(`/admin/users/${userId}/suspend`);
    return response.data;
  },

  // Active user
  activateUser: async (userId: string): Promise<ApiResponse> => {
    const response = await api.post(`/admin/users/${userId}/activate`);
    return response.data;
  },

  //Delete user
  deleteUser: async (userId: string): Promise<ApiResponse> => {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  },

  // Get User activity/sessions
  getUserDetail: async (userId: string): Promise<ApiResponse> => {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data;
  },
};
