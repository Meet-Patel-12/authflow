import { Request, Response, NextFunction } from "express";

// ─── Role Check ───────────────────────────────────────────────────────────────

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
        required: roles,
        current: req.user.role,
      });
    }

    next();
  };
};

export const requireAdmin = requireRole("admin", "owner");

// ─── Ownership Check ──────────────────────────────────────────────────────────

export const requireOwnership = (resourceField: string = "userId") => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    // Admins and owners bypass ownership check
    if (req.user.role === "admin" || req.user.role === "owner") {
      return next();
    }

    const resourceUserId = req.params[resourceField] || req.body[resourceField];

    if (req.user.userId !== resourceUserId) {
      return res
        .status(403)
        .json({
          success: false,
          message: "You can only access your own resources",
        });
    }

    next();
  };
};

// ─── Any Auth (JWT or API Key) ────────────────────────────────────────────────

export const authenticateAny = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (req.user || req.apiKey) {
    return next();
  }

  return res
    .status(401)
    .json({ success: false, message: "Authentication required" });
};
