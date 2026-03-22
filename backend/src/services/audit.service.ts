import { Request } from "express";
import { createAuditLog } from "../repositories/audit.repository";
import {
  getIpAddress,
  getUserAgent,
  shouldAuditRequest,
  determineAction,
  determineResource,
  determineResourceId,
} from "../utils/request.util";
import { getRequestId } from "../middlewares/requestId.middleware";

export const processAuditLog = async (
  req: Request,
  statusCode: number,
  responseData: any,
): Promise<void> => {
  try {
    if (!shouldAuditRequest(req, statusCode)) return;

    const user = req.user;

    // Resolve organization from token or response body (e.g. registration)
    const organizationId: string | undefined =
      user?.organizationId || responseData?.organization?.id;

    // Skip if no organization context — unauthenticated actions aren't tenant-scoped
    if (!organizationId) return;

    await createAuditLog({
      userId: user?.userId,
      organizationId,
      action: determineAction(req),
      resource: determineResource(req),
      resourceId: determineResourceId(req, responseData),
      method: req.method,
      path: req.path,
      statusCode,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
      metadata: {
        query: req.query,
        params: req.params,
        ...(statusCode >= 400 && { error: responseData?.message }),
      },
      requestId: getRequestId(req),
    });
  } catch (error: any) {
    if (process.env.NODE_ENV === "development") {
      console.error("Audit service error:", error.message);
    }
  }
};
