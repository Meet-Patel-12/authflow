import api from "../app/apiClient";
import type { ApiResponse, Organization } from "../types/global.types";

interface CreateOrganizationData {
  name: string;
  slug?: string;
}

interface OrganizationDetails {
  organization: {
    id: string;
    name: string;
    slug: string;
    billing: {
      plan: "free" | "pro" | "enterprise";
      status: "active" | "cancelled" | "past_due";
    };
    limits: {
      maxUsers: number;
      maxApiKeys: number;
      maxApiCalls: number;
    };
    settings: {
      allowSignup: boolean;
      requireEmailVerification: boolean;
      requireMFA: boolean;
      allowedDomains: string[];
    };
    stats: {
      members: number;
      apiKeys: number;
      activeSessions: number;
    };
  };
  members: {
    id: string;
    userId: string;
    name: string;
    email: string;
    role: string;
    joinedAt: string;
  }[];
}

export const organizationService = {
  // GET /organizations/my-organizations
  getOrganizations: async (): Promise<ApiResponse<Organization[]>> => {
    const response = await api.get("/organizations/my-organizations");
    return response.data;
  },

  // GET /organizations/details
  getOrganizationDetails: async (): Promise<
    ApiResponse<OrganizationDetails>
  > => {
    const response = await api.get("/organizations/details");
    return response.data;
  },

  // POST /auth/register — create org via registration flow
  createOrganization: async (
    data: CreateOrganizationData,
  ): Promise<ApiResponse> => {
    const response = await api.post("/organizations/create", data);
    return response.data;
  },

  // PATCH /organizations
  updateOrganization: async (
    data: Partial<{ name: string; settings: Record<string, any> }>,
  ): Promise<ApiResponse> => {
    const response = await api.patch("/organizations", data);
    return response.data;
  },

  getCurrentOrganization: async (): Promise<ApiResponse<Organization>> => {
    const response = await api.get("/organizations/");
    return response.data;
  },

  // DELETE /organizations
  deleteOrganization: async (): Promise<ApiResponse> => {
    const response = await api.delete("/organizations");
    return response.data;
  },
};
