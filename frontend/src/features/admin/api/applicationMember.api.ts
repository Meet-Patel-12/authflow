import axios from "axios";

const API_BASE_URL = "/api/applications";

export const applicationMemberService = {
  // Get users in an application
  getAppUsers: async (appId: string, page: number = 1) => {
    const response = await axios.get(
      `${API_BASE_URL}/${appId}/users?page=${page}`,
    );
    return response.data;
  },

  // Search users in an application
  searchAppUsers: async (appId: string, query: string, page: number = 1) => {
    const response = await axios.get(
      `${API_BASE_URL}/${appId}/users/search?q=${query}&page=${page}`,
    );
    return response.data;
  },

  // Get available users to add to application
  getAvailableUsers: async (appId: string, page: number = 1) => {
    const response = await axios.get(
      `${API_BASE_URL}/${appId}/available-users?page=${page}`,
    );
    return response.data;
  },

  // Add user to application
  addUserToApp: async (
    appId: string,
    userId: string,
    role: string = "viewer",
  ) => {
    const response = await axios.post(`${API_BASE_URL}/${appId}/users`, {
      userId,
      role,
    });
    return response.data;
  },

  // Remove user from application
  removeUserFromApp: async (appId: string, userId: string) => {
    const response = await axios.delete(
      `${API_BASE_URL}/${appId}/users/${userId}`,
    );
    return response.data;
  },

  // Update user role in application
  updateUserRole: async (appId: string, userId: string, role: string) => {
    const response = await axios.patch(
      `${API_BASE_URL}/${appId}/users/${userId}`,
      { role },
    );
    return response.data;
  },
};
