import api from "../app/apiClient";

const API_BASE_URL = "/applications";

export const applicationMemberService = {
  // Get SDK users in an application
  getAppUsers: async (appId: string, page: number = 1) => {
    const response = await api.get(
      `${API_BASE_URL}/${appId}/users?page=${page}`,
    );
    return response.data;
  },

  // Search SDK users in an application
  searchAppUsers: async (appId: string, query: string, page: number = 1) => {
    const response = await api.get(
      `${API_BASE_URL}/${appId}/users/search?q=${query}&page=${page}`,
    );
    return response.data;
  },

  // Get SDK user details
  getAppUserDetail: async (appId: string, userId: string) => {
    const response = await api.get(`${API_BASE_URL}/${appId}/users/${userId}`);
    return response.data;
  },

  // Toggle SDK user active/inactive status
  toggleUserStatus: async (
    appId: string,
    userId: string,
    isActive: boolean,
  ) => {
    const response = await api.patch(
      `${API_BASE_URL}/${appId}/users/${userId}/toggle-active`,
      { isActive },
    );
    return response.data;
  },

  // Delete SDK user
  deleteAppUser: async (appId: string, userId: string) => {
    const response = await api.delete(
      `${API_BASE_URL}/${appId}/users/${userId}`,
    );
    return response.data;
  },
};
