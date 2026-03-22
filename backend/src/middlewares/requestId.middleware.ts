import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const requestId =
    (req.headers["x-request-id"] as string) ||
    crypto.randomBytes(16).toString("hex");

  req.requestId = requestId;
  res.setHeader("X-Request-ID", requestId);

  next();
};

export const getRequestId = (req: Request): string => {
  return req.requestId ?? "unknown";
};
