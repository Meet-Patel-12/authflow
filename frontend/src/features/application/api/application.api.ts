import api from "../../../app/apiClient";
import type { ApiResponse } from "../../../shared/types/global.types";
import type {
  Application,
  ApplicationType,
} from "../../../shared/types/global.types";

// ─────────────────────────────────────────────────────────────────────────────
// Request / Response shapes
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateApplicationData {
  name: string;
  type: ApplicationType;
  description?: string;
  logo?: string;
}

export interface UpdateApplicationData {
  name?: string;
  description?: string;
  logo?: string;
  allowedCallbacks?: string[];
  allowedLogoutUrls?: string[];
  allowedOrigins?: string[];
  allowedWebOrigins?: string[];
  tokenExpiry?: {
    accessTokenTTL?: number;
    refreshTokenTTL?: number;
  };
}

// Returned on create and rotate-secret — raw secret shown ONCE only
export interface ApplicationWithSecret extends Application {
  clientSecret: string;
}

export interface ApplicationListResponse {
  applications: Application[];
}

export interface ApplicationDetailResponse {
  application: Application;
}

export interface ApplicationCreateResponse {
  application: ApplicationWithSecret;
}

export interface RotateSecretResponse {
  clientId: string;
  rawSecret: string; // new raw secret — shown ONCE only
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export const applicationService = {
  // ── List all applications for current org ──────────────────────────────────
  getApplications: async (): Promise<ApiResponse<ApplicationListResponse>> => {
    const response = await api.get("/applications");
    return response.data;
  },

  // ── Get single application (no secret returned) ───────────────────────────
  getApplication: async (
    id: string,
  ): Promise<ApiResponse<ApplicationDetailResponse>> => {
    const response = await api.get(`/applications/${id}`);
    return response.data;
  },

  // ── Create application — returns raw secret ONCE ──────────────────────────
  createApplication: async (
    data: CreateApplicationData,
  ): Promise<ApiResponse<ApplicationCreateResponse>> => {
    const response = await api.post("/applications", data);
    return response.data;
  },

  // ── Update application settings ───────────────────────────────────────────
  updateApplication: async (
    id: string,
    data: UpdateApplicationData,
  ): Promise<ApiResponse<ApplicationDetailResponse>> => {
    const response = await api.patch(`/applications/${id}`, data);
    return response.data;
  },

  // ── Rotate client secret — returns new raw secret ONCE ───────────────────
  // ⚠️ Immediately invalidates the previous secret.
  // Developer must update their app with the new secret.
  rotateSecret: async (
    id: string,
  ): Promise<ApiResponse<RotateSecretResponse>> => {
    const response = await api.post(`/applications/${id}/rotate-secret`);
    return response.data;
  },

  // ── Soft-delete application ───────────────────────────────────────────────
  deleteApplication: async (id: string): Promise<ApiResponse> => {
    const response = await api.delete(`/applications/${id}`);
    return response.data;
  },
};
