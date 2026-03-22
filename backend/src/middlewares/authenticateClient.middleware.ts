import { Request, Response, NextFunction } from "express";
import { validateClientCredentials } from "../services/applicationAuth.service";

export const authenticateClient = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { client_id, client_secret } = req.body;

    const result = await validateClientCredentials(client_id, client_secret);

    if (!result.success) {
      res.status(result.status).json({
        success: false,
        error: "unauthorized",
        message: result.message,
      });
      return;
    }

    // Strip credentials before the route handler sees the body —
    // prevents accidental logging or leaking in error responses
    delete req.body.client_id;
    delete req.body.client_secret;

    req.application = result.application;
    next();
  } catch (error) {
    console.error("authenticateClient error:", error);
    res.status(500).json({
      success: false,
      error: "server_error",
      message: "Authentication failed",
    });
  }
};
