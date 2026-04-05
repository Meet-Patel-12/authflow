import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

//  Axios instance

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

//  REQUEST INTERCEPTOR
//  Attach access token + organization header

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    const organizationId = localStorage.getItem("organizationId");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    //  Do NOT attach organization header to auth routes

    if (organizationId && config.url && !config.url.startsWith("/auth")) {
      config.headers["x-organization-id"] = organizationId;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

//  RESPONSE INTERCEPTOR
//  Handle token refresh and global errors

//  ⚠️ SECURITY NOTE:
//  Tokens stored in localStorage are vulnerable to XSS.
//  Production systems should use httpOnly cookies.

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Prevent infinite refresh loop
    // Only retry if:
    // 1. Status is 401
    // 2. Not already retried
    // 3. Not a refresh token request itself

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh-token")
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");

        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        // Request new access token
        const res = await api.post("/auth/refresh-token", {
          refreshToken,
        });

        const newAccessToken = res.data.data.accessToken;

        // Store new token
        localStorage.setItem("accessToken", newAccessToken);

        // Update header and retry original request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed → logout user
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("organizationId");

        // Signal logout to the app
        localStorage.setItem("forceLogout", "true");

        window.location.href = "/login";

        return Promise.reject(refreshError);
      }
    }

    // Global error logging
    if (error.response) {
      const status = error.response.status;

      if (status === 403) {
        console.error("Access forbidden");
      }

      if (status >= 500) {
        console.error("Server error");
      }
    }

    return Promise.reject(error);
  },
);

export default api;
