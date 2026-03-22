import { Request, Response } from "express";
import mongoose from "mongoose";
import { getIpAddress, getUserAgent } from "../utils/request.util";
import { createAuditEntry } from "../repositories/audit.repository";
import {
  generateTOTPSecret,
  verifyTOTPSetup,
  activateMFA,
  verifyTOTP,
  disableMFA,
  regenerateBackupCodes,
} from "../services/mfa.service";

function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

// ─── Setup ────────────────────────────────────────────────────────────────────

export const setupMFA = async (req: Request, res: Response) => {
  try {
    const { userId, organizationId } = req.user!;
    const data = await generateTOTPSecret(userId, organizationId);
    res
      .status(200)
      .json({ success: true, message: "MFA setup initiated", data });
  } catch (error: any) {
    console.error("MFA setup error:", error);
    res.status(500).json({
      success: false,
      message: "Error setting up MFA",
      error: error.message,
    });
  }
};

// ─── Verify ───────────────────────────────────────────────────────────────────

export const verifyMFA = async (req: Request, res: Response) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message:
          "Database temporarily unavailable. Please try again in a moment.",
      });
    }

    const { userId, organizationId } = req.user!;
    const isValid = await verifyTOTPSetup(
      userId,
      organizationId,
      req.body.token,
    );

    if (!isValid) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid verification code" });
    }

    res
      .status(200)
      .json({ success: true, message: "MFA verified successfully" });
  } catch (error: any) {
    console.error("MFA verification error:", error);
    res.status(500).json({
      success: false,
      message: "Error verifying MFA",
      error: error.message,
    });
  }
};

// ─── Activate ─────────────────────────────────────────────────────────────────

export const activateMFAHandler = async (req: Request, res: Response) => {
  try {
    const { userId, organizationId } = req.user!;
    await activateMFA(userId, organizationId);

    await createAuditEntry({
      userId,
      organizationId,
      action: "mfa_enable",
      resource: "user",
      resourceId: userId,
      method: req.method,
      path: req.path,
      statusCode: 200,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });

    res
      .status(200)
      .json({ success: true, message: "MFA activated successfully" });
  } catch (error: any) {
    console.error("MFA activation error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Disable ──────────────────────────────────────────────────────────────────

export const disableMFAHandler = async (req: Request, res: Response) => {
  try {
    const { userId, organizationId } = req.user!;
    const isValid = await verifyTOTP(userId, organizationId, req.body.token);

    if (!isValid) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid verification code" });
    }

    await disableMFA(userId, organizationId);

    await createAuditEntry({
      userId,
      organizationId,
      action: "mfa_disable",
      resource: "user",
      resourceId: userId,
      method: req.method,
      path: req.path,
      statusCode: 200,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });

    res
      .status(200)
      .json({ success: true, message: "MFA disabled successfully" });
  } catch (error: any) {
    console.error("MFA disable error:", error);
    res.status(500).json({
      success: false,
      message: "Error disabling MFA",
      error: error.message,
    });
  }
};

// ─── Backup Codes ─────────────────────────────────────────────────────────────

export const regenerateBackupCodesHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId, organizationId } = req.user!;
    const isValid = await verifyTOTP(userId, organizationId, req.body.token);

    if (!isValid) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid verification code" });
    }

    const backupCodes = await regenerateBackupCodes(userId, organizationId);
    res.status(200).json({
      success: true,
      message: "Backup codes regenerated successfully",
      data: { backupCodes },
    });
  } catch (error: any) {
    console.error("Backup codes regeneration error:", error);
    res.status(500).json({
      success: false,
      message: "Error regenerating backup codes",
      error: error.message,
    });
  }
};
