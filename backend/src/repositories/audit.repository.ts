import { AuditLog } from "../models/audit.model";

export interface AuditLogData {
  userId?: string;
  organizationId: string;
  action: string;
  resource: string;
  resourceId?: string;
  method: string;
  path: string;
  statusCode: number;
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, unknown>;
  requestId: string;
}

export const createAuditLog = async (data: AuditLogData): Promise<void> => {
  try {
    await AuditLog.create(data);
  } catch (error: any) {
    if (process.env.NODE_ENV === "development") {
      console.error("Audit log write error:", error.message);
    }
  }
};

export const createAuditEntry = async (data: Record<string, unknown>) => {
  return AuditLog.create(data);
};
