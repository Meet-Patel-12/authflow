import { Request, Response } from "express";
import { getIpAddress, getUserAgent } from "../utils/request.util";
import { verifyTOTP, verifyBackupCode } from "../services/mfa.service";
import {
  findUserById,
  findMembership,
  createSession,
} from "../repositories/auth.repository";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt";

// POST /api/mfa/validate
// Public endpoint — called after login when MFA is required.
// Accepts either a TOTP code or a backup code.

export const validateMFA = async (req: Request, res: Response) => {
  try {
    const { userId, token, useBackupCode, organizationId } = req.body;

    if (!userId || !token || !organizationId) {
      return res.status(400).json({
        success: false,
        message: "userId, organizationId and token are required",
      });
    }

    const isValid = useBackupCode
      ? await verifyBackupCode(userId, organizationId, token)
      : await verifyTOTP(userId, organizationId, token);

    if (!isValid) {
      return res.status(400).json({ success: false, message: "Invalid code" });
    }

    const [user, membership] = await Promise.all([
      findUserById(userId),
      findMembership(userId, organizationId),
    ]);

    if (!user || !membership) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const payload = {
      userId: user._id.toString(),
      email: user.email,
      role: membership.role,
      organizationId,
    };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    const ipAddress = getIpAddress(req);

    await createSession({
      userId: user._id,
      organizationId,
      refreshToken,
      ipAddress,
      userAgent: getUserAgent(req),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    user.lastLoginAt = new Date();
    user.lastLoginIp = ipAddress;
    await user.save();

    res.status(200).json({
      success: true,
      message: "MFA validated successfully",
      data: { accessToken, refreshToken },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error validating MFA code",
      error: error.message,
    });
  }
};
