import { Request, Response } from "express";
import { getIpAddress, getUserAgent } from "../utils/request.util";
import { createAuditEntry } from "../repositories/audit.repository";
import {
  handleOAuthCallback,
  sendMagicLink,
  verifyMagicLink,
} from "../services/oauth.service";

const FRONTEND_URL = process.env.FRONTEND_URL;

// ─── OAuth Callback ───────────────────────────────────────────────────────────

export const oauthCallback = async (req: Request, res: Response) => {
  try {
    const ipAddress = getIpAddress(req);
    const userAgent = getUserAgent(req);
    const result = await handleOAuthCallback(req.user, ipAddress, userAgent);

    if (!result.success) {
      return res.redirect(`${FRONTEND_URL}/login?error=${result.error}`);
    }

    const provider = req.path.includes("google") ? "google" : "github";

    await createAuditEntry({
      userId: result.userId,
      organizationId: result.organizationId,
      action: "login",
      resource: "user",
      resourceId: result.userId,
      method: req.method,
      path: req.path,
      statusCode: 200,
      ipAddress,
      userAgent,
      metadata: { provider },
    });

    return res.redirect(
      `${FRONTEND_URL}/auth/callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`,
    );
  } catch {
    return res.redirect(`${FRONTEND_URL}/login?error=server_error`);
  }
};

// ─── Magic Link ───────────────────────────────────────────────────────────────

export const requestMagicLink = async (req: Request, res: Response) => {
  try {
    await sendMagicLink(req.body.email);
    // Always return the same message — never reveal account existence
    res.status(200).json({
      success: true,
      message: "If an account exists, a magic link has been sent",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error requesting magic link",
      error: error.message,
    });
  }
};

export const verifyMagicLinkHandler = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res
        .status(400)
        .json({ success: false, message: "Token is required" });
    }

    const result = await verifyMagicLink(
      token,
      getIpAddress(req),
      getUserAgent(req),
    );

    if (!result.success) {
      return res
        .status(result.status)
        .json({ success: false, message: result.message });
    }

    await createAuditEntry({
      userId: result.userId,
      organizationId: result.organizationId,
      action: "login",
      resource: "user",
      resourceId: result.userId,
      method: req.method,
      path: req.path,
      statusCode: 200,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
      metadata: { authMethod: "magic_link" },
    });

    res.status(200).json({
      success: true,
      message: "Magic link verified successfully",
      data: {
        user: {
          id: result.userId,
          email: result.email,
          name: result.name,
          role: result.role,
        },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error verifying magic link",
      error: error.message,
    });
  }
};
