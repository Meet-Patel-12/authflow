import { Request, Response, NextFunction } from "express";
import { processAuditLog } from "../services/audit.service";

// ─── Global Audit Logger ──────────────────────────────────────────────────────

export const auditLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const originalJson = res.json;

  res.json = function (data: any) {
    setImmediate(() => processAuditLog(req, res.statusCode, data));
    return originalJson.call(this, data);
  };

  next();
};
