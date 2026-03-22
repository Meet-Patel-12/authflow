import api from "../../../app/apiClient";
import type { ApiResponse } from "../../../shared/types/global.types";

export interface Member {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  role: "owner" | "admin" | "member";
  joinedAt: string;
}

export const organizationMembersService = {
  // GET /organizations/details
  getMembers: async (): Promise<ApiResponse<{ members: Member[] }>> => {
    const response = await api.get("/organizations/details");
    return response.data;
  },

  // POST /organizations/members
  inviteMember: async (
    email: string,
    role: "admin" | "member",
  ): Promise<ApiResponse> => {
    const response = await api.post("/organizations/members", { email, role });
    return response.data;
  },

  // PATCH /organizations/members/:memberId
  updateRole: async (
    memberId: string,
    role: "admin" | "member",
  ): Promise<ApiResponse> => {
    const response = await api.patch(`/organizations/members/${memberId}`, {
      role,
    });
    return response.data;
  },

  // DELETE /organizations/members/:memberId
  removeMember: async (memberId: string): Promise<ApiResponse> => {
    const response = await api.delete(`/organizations/members/${memberId}`);
    return response.data;
  },
};
