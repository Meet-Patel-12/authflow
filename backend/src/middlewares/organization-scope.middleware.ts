import { Request, Response, NextFunction } from "express";

export const organizationScope = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user?.organizationId) {
    return res.status(400).json({
      success: false,
      message: "Organization context missing",
    });
  }

  req.orgId = req.user.organizationId;

  next();
};
