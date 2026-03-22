import { NextFunction, Request, Response } from "express";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3, S3_BUCKET, getAvatarUrl } from "../config/s3";
import { v4 as uuidv4 } from "uuid";
import { getIpAddress, getUserAgent } from "../utils/request.util";
import { createAuditEntry } from "../repositories/audit.repository";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "../services/email.service";
import {
  registerUser,
  loginUser,
  verifyUserEmail,
  requestPasswordResetToken,
  resetUserPassword,
  updateUserProfile,
  changeUserPassword,
  logoutUser,
  refreshAccessToken,
  getUserSessions,
  revokeUserSession,
  deleteUserAccount,
  deactivateUserAccount,
  buildDataExport,
  getConnectedApps,
} from "../services/auth.service";
import { User } from "../models/user.model";

// ─── Register ─────────────────────────────────────────────────────────────────

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, organizationName } = req.body;
    const result = await registerUser({
      email,
      password,
      name,
      organizationName,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });

    if (!result.success) {
      return res
        .status(result.status)
        .json({ success: false, message: result.message });
    }

    // Fire-and-forget — don't fail registration if email fails
    sendVerificationEmail(
      result.user.email,
      result.verificationToken,
      result.user.name,
    ).catch((e) => console.error("Failed to send verification email:", e));

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message,
    });
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await loginUser({
      email,
      password,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });

    if (!result.success) {
      return res
        .status(result.status)
        .json({ success: false, message: result.message });
    }

    if (result.mfaRequired) {
      return res.status(200).json({
        success: true,
        mfaRequired: true,
        data: {
          mfaRequired: true,
          userId: result.userId,
          organizationId: result.organizationId,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, message: "Login failed", error: error.message });
  }
};

// ─── Verify Email ─────────────────────────────────────────────────────────────

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const result = await verifyUserEmail(req.body.token);

    if (!result.success) {
      return res
        .status(result.status)
        .json({ success: false, message: result.message });
    }

    await createAuditEntry({
      userId: result.userId,
      organizationId: result.organizationId,
      action: "email_verify",
      resource: "user",
      method: req.method,
      path: req.path,
      statusCode: 200,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });

    res
      .status(200)
      .json({ success: true, message: "Email verified successfully" });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error verifying email",
      error: error.message,
    });
  }
};

// ─── Password Reset ───────────────────────────────────────────────────────────

export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const result = await requestPasswordResetToken(req.body.email);

    // Always return same message to prevent email enumeration
    if (result) {
      sendPasswordResetEmail(
        result.user.email,
        result.resetToken,
        result.user.name,
      ).catch((e) => console.error("Failed to send password reset email:", e));
    }

    res.status(200).json({
      success: true,
      message: "If an account exists, a password reset link has been sent",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error requesting password reset",
      error: error.message,
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    const result = await resetUserPassword(token, password);

    if (!result.success) {
      return res
        .status(result.status)
        .json({ success: false, message: result.message });
    }

    await createAuditEntry({
      userId: result.userId,
      organizationId: result.organizationId,
      action: "password_reset",
      resource: "user",
      method: req.method,
      path: req.path,
      statusCode: 200,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });

    res
      .status(200)
      .json({ success: true, message: "Password reset successfully" });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error resetting password",
      error: error.message,
    });
  }
};

// ─── Profile ──────────────────────────────────────────────────────────────────

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { userId, organizationId } = req.user!;
    const result = await updateUserProfile(
      userId,
      organizationId,
      req.body.name,
    );

    if (!result) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    await createAuditEntry({
      userId,
      organizationId,
      action: "profile_update",
      resource: "user",
      resourceId: userId,
      method: req.method,
      path: req.path,
      statusCode: 200,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });

    const { user, membership } = result;
    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          role: membership?.role,
          organizationId,
          isEmailVerified: user.isEmailVerified,
          mfaEnabled: user.mfaEnabled,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error updating profile",
      error: error.message,
    });
  }
};

// ─── Change Password ──────────────────────────────────────────────────────────

export const changePassword = async (req: Request, res: Response) => {
  try {
    const { userId, organizationId } = req.user!;
    const { currentPassword, newPassword } = req.body;
    const accessToken = req.headers.authorization?.split(" ")[1];

    const result = await changeUserPassword(
      userId,
      currentPassword,
      newPassword,
      accessToken,
    );

    if (!result.success) {
      return res
        .status(result.status)
        .json({ success: false, message: result.message });
    }

    await createAuditEntry({
      userId,
      organizationId,
      action: "password_change",
      resource: "user",
      resourceId: userId,
      method: req.method,
      path: req.path,
      statusCode: 200,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });

    res.status(200).json({
      success: true,
      message:
        "Password changed successfully. Please log in again with your new password.",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error changing password",
      error: error.message,
    });
  }
};

// ─── Logout ───────────────────────────────────────────────────────────────────

export const logout = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    const accessToken = req.headers.authorization?.split(" ")[1];

    await logoutUser(refreshToken, accessToken);

    const { userId, organizationId } = req.user ?? {};
    if (userId) {
      await createAuditEntry({
        userId,
        organizationId,
        action: "logout",
        resource: "user",
        method: req.method,
        path: req.originalUrl,
        statusCode: 200,
        ipAddress: getIpAddress(req),
        userAgent: getUserAgent(req),
      }).catch((e) => console.error("Failed to create audit log:", e));
    }

    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error logging out",
      error: error.message,
    });
  }
};

// ─── Refresh Token ────────────────────────────────────────────────────────────

export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res
        .status(400)
        .json({ success: false, message: "Refresh token required" });
    }

    const result = await refreshAccessToken(refreshToken);
    if (!result.success) {
      return res
        .status(result.status)
        .json({ success: false, message: result.message });
    }

    res
      .status(200)
      .json({ success: true, data: { accessToken: result.accessToken } });
  } catch {
    res.status(401).json({ success: false, message: "Refresh failed" });
  }
};

// ─── Current User ─────────────────────────────────────────────────────────────

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const { userId, organizationId } = req.user!;
    const { user, membership } = await import("../services/auth.service").then(
      async (s) => {
        const u = await (
          await import("../repositories/auth.repository")
        ).findUserById(userId);
        const m = await (
          await import("../repositories/auth.repository")
        ).findMembership(userId, organizationId);
        return { user: u, membership: m };
      },
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          role: membership?.role,
          organizationId,
          isEmailVerified: user.isEmailVerified,
          mfaEnabled: user.mfaEnabled,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching user",
      error: error.message,
    });
  }
};

// ─── Sessions ─────────────────────────────────────────────────────────────────

export const getSessionsHandler = async (req: Request, res: Response) => {
  try {
    const currentRefreshToken =
      (req.query?.refreshToken as string) ||
      req.body?.refreshToken ||
      req.cookies?.refreshToken;
    const data = await getUserSessions(req.user!.userId, currentRefreshToken);
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching sessions",
      error: error.message,
    });
  }
};

export const revokeSessionHandler = async (req: Request, res: Response) => {
  try {
    const revoked = await revokeUserSession(
      req.params.sessionId as string,
      req.user!.userId,
    );
    if (!revoked) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Session revoked successfully" });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error revoking session",
      error: error.message,
    });
  }
};

// ─── Delete / Deactivate ──────────────────────────────────────────────────────

export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const { userId } = req.user!;
    const accessToken = req.headers.authorization?.split(" ")[1];
    const result = await deleteUserAccount(
      userId,
      req.body.password,
      accessToken,
    );

    if (!result.success) {
      return res
        .status(result.status)
        .json({ success: false, message: result.message });
    }

    res
      .status(200)
      .json({ success: true, message: "Account deleted successfully" });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error deleting account",
      error: error.message,
    });
  }
};

export const deactivateAccount = async (req: Request, res: Response) => {
  try {
    const { userId, organizationId } = req.user!;
    const accessToken = req.headers.authorization?.split(" ")[1];
    const result = await deactivateUserAccount(userId, accessToken);

    if (!result.success) {
      return res
        .status(result.status)
        .json({ success: false, message: result.message });
    }

    await createAuditEntry({
      userId,
      organizationId,
      action: "account_deactivate",
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
      .json({ success: true, message: "Account deactivated successfully" });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error deactivating account",
      error: error.message,
    });
  }
};

// ─── Data Export ──────────────────────────────────────────────────────────────

export const downloadMyData = async (req: Request, res: Response) => {
  try {
    const { userId, organizationId } = req.user!;
    const exportData = await buildDataExport(userId, organizationId);

    if (!exportData) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    await createAuditEntry({
      userId,
      organizationId,
      action: "data_export",
      resource: "user",
      resourceId: userId,
      method: req.method,
      path: req.path,
      statusCode: 200,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });

    const filename = `authflow-data-${exportData.exportedBy}-${new Date().toISOString().split("T")[0]}.json`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/json");
    res.status(200).send(JSON.stringify(exportData, null, 2));
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error exporting data",
      error: error.message,
    });
  }
};

// ─── Connected Apps ───────────────────────────────────────────────────────────

export const getConnectedAppsHandler = async (req: Request, res: Response) => {
  try {
    const apps = await getConnectedApps(req.user!.userId);
    if (!apps) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, data: { apps } });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching connected apps",
      error: error.message,
    });
  }
};

// ── Upload avatar ─────────────────────────────────────────────────────────────
export const uploadAvatar = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: "No file provided" });
      return;
    }

    const userId = req.user!.userId;
    const ext = req.file.mimetype.split("/")[1].replace("jpeg", "jpg");
    const key = `avatars/${userId}/${uuidv4()}.${ext}`;

    // Upload to S3
    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
        // Remove ACL line if your bucket blocks public ACLs (recommended)
        // and use a bucket policy for public read instead
      }),
    );

    const avatarUrl = getAvatarUrl(key);

    // Delete old avatar from S3 if one exists
    const user = await User.findById(userId);
    if (user?.avatar) {
      const oldKey = extractS3Key(user.avatar);
      if (oldKey) {
        await s3
          .send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: oldKey }))
          .catch(() => {
            /* old file missing is non-fatal */
          });
      }
    }

    // Save new URL on user record
    await User.findByIdAndUpdate(userId, { avatar: avatarUrl });

    res.json({
      success: true,
      message: "Avatar updated",
      data: { avatarUrl },
    });
  } catch (error) {
    next(error);
  }
};

// ── Remove avatar ─────────────────────────────────────────────────────────────
export const removeAvatar = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const user = await User.findById(userId);

    if (user?.avatar) {
      const key = extractS3Key(user.avatar);
      if (key) {
        await s3
          .send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }))
          .catch(() => {
            /* non-fatal */
          });
      }
      await User.findByIdAndUpdate(userId, { $unset: { avatar: 1 } });
    }

    res.json({ success: true, message: "Avatar removed" });
  } catch (error) {
    next(error);
  }
};

// ── Helper — pull the S3 key back out of a full URL ───────────────────────────
const extractS3Key = (url: string): string | null => {
  try {
    const { pathname } = new URL(url);
    // pathname starts with "/" — strip it
    return pathname.slice(1);
  } catch {
    return null;
  }
};
