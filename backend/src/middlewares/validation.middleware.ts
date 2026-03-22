import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { sanitizeObject } from "../utils/sanitize.util";

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((err) => ({
        field: "path" in err ? err.path : "unknown",
        message: err.msg,
      })),
    });
  }

  // Sanitize body, params, and query to prevent XSS
  req.body = sanitizeObject(req.body);

  for (const key in req.params) {
    req.params[key] = sanitizeObject(req.params[key]) as string;
  }
  for (const key in req.query) {
    req.query[key] = sanitizeObject(req.query[key]) as string;
  }

  next();
};
