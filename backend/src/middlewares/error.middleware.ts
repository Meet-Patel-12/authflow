import { Request, Response, NextFunction } from "express";
import { getRequestId } from "../middlewares/requestId.middleware";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const requestId = getRequestId(req);
  const statusCode = err.statusCode || 500;
  const message = IS_PRODUCTION
    ? "Internal Server Error"
    : err.message || "Internal Server Error";

  console.error(`[Error ${requestId}]`, err);

  res.status(statusCode).json({
    success: false,
    message,
    ...(!IS_PRODUCTION && { requestId, details: err.message }),
  });
};
