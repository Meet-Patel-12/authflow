import api from "../../../app/apiClient";
import type { ApiResponse } from "../../../shared/types/global.types";

export interface AuditLog {
  id: string;
  action: string;
  userId?: { email: string; name: string } | string;
  resource: string;
  method: string;
  path: string;
  statusCode: number;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

export interface AuditLogFilters {
  page?: number;
  action?: string;
  resource?: string;
  statusCode?: string;
  startDate?: string;
  endDate?: string;
}

export const auditLogsService = {
  getAuditLogs: async (filters: AuditLogFilters = {}) => {
    const params = new URLSearchParams();

    if (filters.page) params.append("page", String(filters.page));
    if (filters.action) params.append("action", filters.action);
    if (filters.resource) params.append("resource", filters.resource);
    if (filters.statusCode) params.append("statusCode", filters.statusCode);
    if (filters.startDate) params.append("startDate", filters.startDate);
    if (filters.endDate) params.append("endDate", filters.endDate);

    const response = await api.get(`/admin/audit-logs?${params.toString()}`);

    return response.data as ApiResponse<{
      items: AuditLog[];
      pagination: {
        page: number;
        totalPages: number;
        total: number;
      };
    }>;
  },
};
