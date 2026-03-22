import { Request, Response, NextFunction } from "express";
import { resolveAuthUser } from "../services/auth.service";

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ success: false, message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const result = await resolveAuthUser(token);

    if (!result.success) {
      return res
        .status(result.status)
        .json({ success: false, message: result.message });
    }

    req.user = result.user;
    next();
  } catch {
    return res
      .status(401)
      .json({ success: false, message: "Authentication failed" });
  }
};
