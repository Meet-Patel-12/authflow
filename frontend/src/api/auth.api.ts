import api from "../app/apiClient";

import type {
  LoginCredentials,
  RegisterData,
  AuthResponse,
  User,
  Organization,
  ApiResponse,
  SessionsResponse,
} from "../types/global.types";

export const authService = {
  /* -------------------------------- */
  /* REGISTER */
  /* -------------------------------- */

  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post("/auth/register", data);
    return response.data;
  },

  /* -------------------------------- */
  /* LOGIN */
  /* -------------------------------- */

  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post("/auth/login", credentials);
    return response.data;
  },

  /* -------------------------------- */
  /* LOGOUT */
  /* -------------------------------- */

  logout: async (): Promise<ApiResponse> => {
    const refreshToken = localStorage.getItem("refreshToken"); // ✅ send it
    const response = await api.post("/auth/logout", { refreshToken });
    return response.data;
  },

  /* -------------------------------- */
  /* GET CURRENT USER */
  /* -------------------------------- */

  getCurrentUser: async (): Promise<
    ApiResponse<{
      user: User;
      organization: Organization | null;
    }>
  > => {
    const response = await api.get("/auth/me");
    return response.data;
  },

  /* -------------------------------- */
  /* PASSWORD RESET REQUEST */
  /* -------------------------------- */

  requestPasswordReset: async (email: string): Promise<ApiResponse> => {
    const response = await api.post("/auth/request-password-reset", { email });
    return response.data;
  },

  /* -------------------------------- */
  /* RESET PASSWORD */
  /* -------------------------------- */

  resetPassword: async (
    token: string,
    password: string,
  ): Promise<ApiResponse> => {
    const response = await api.post("/auth/reset-password", {
      token,
      password,
    });

    return response.data;
  },

  /* -------------------------------- */
  /* VERIFY EMAIL */
  /* -------------------------------- */

  verifyEmail: async (token: string): Promise<ApiResponse> => {
    const response = await api.post("/auth/verify-email", { token });
    return response.data;
  },

  /* -------------------------------- */
  /* SESSIONS */
  /* -------------------------------- */

  getSessions: async (): Promise<ApiResponse<SessionsResponse>> => {
    const refreshToken = localStorage.getItem("refreshToken");
    const response = await api.get("/auth/sessions", {
      params: refreshToken ? { refreshToken } : {},
    });
    return response.data;
  },

  revokeSession: async (sessionId: string): Promise<ApiResponse> => {
    const response = await api.delete(`/auth/sessions/${sessionId}`);
    return response.data;
  },

  /* -------------------------------- */
  /* MAGIC LINK LOGIN */
  /* -------------------------------- */

  sendMagicLink: async (email: string): Promise<ApiResponse> => {
    const response = await api.post("/auth/magic-link", { email });
    return response.data;
  },

  /* -------------------------------- */
  /* OAUTH LOGIN */
  /* -------------------------------- */

  googleLogin: () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
  },

  githubLogin: () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/github`;
  },
};
