import api from "../../../app/apiClient";
import type { ApiResponse } from "../../../shared/types/global.types";

export interface ApiKey {
  id: string;
  name: string;
  key?: string; // only returned once on creation
  keyPrefix: string;
  permissions: string[];
  usageCount: number;
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

interface CreateApiKeyData {
  name: string;
  permissions: string[];
  expiresInDays?: number;
}

interface ApiKeysListResponse {
  apiKeys: ApiKey[];
}

export const apiKeyService = {
  // GET /api-keys
  getApiKeys: async (): Promise<ApiResponse<ApiKeysListResponse>> => {
    const response = await api.get("/api-keys");
    return response.data;
  },

  // POST /api-keys
  createApiKey: async (
    data: CreateApiKeyData,
  ): Promise<ApiResponse<ApiKey>> => {
    const response = await api.post("/api-keys", data);
    return response.data;
  },

  // DELETE /api-keys/:id
  deleteApiKey: async (id: string): Promise<ApiResponse> => {
    const response = await api.delete(`/api-keys/${id}`);
    return response.data;
  },
};
