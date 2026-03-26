import { Request, Response } from "express";
import { Types } from "mongoose";
import { getIpAddress, getUserAgent } from "../utils/request.util";
import { createAuditEntry } from "../repositories/audit.repository";
import {
  sdkRegister,
  sdkLogin,
  sdkGetMe,
  sdkRefresh,
  sdkLogout,
  sdkVerifyToken,
} from "../services/sdk.service";
import {
  getAppSDKUsers,
  countAppSDKUsers,
  searchAppSDKUsers,
  countSearchAppSDKUsers,
  getSDKUserById,
  toggleSDKUserActive,
  deleteSDKUser,
} from "../repositories/sdk.repository";
import { findOrgApplicationById } from "../repositories/application.repository";

// ─── Register ─────────────────────────────────────────────────────────────────

export const registerHandler = async (req: Request, res: Response) => {
  try {
    const app = req.application!;
    const organizationId = app.organizationId.toString();
    const { email, password, name, metadata = {} } = req.body;

    const result = await sdkRegister({
      organizationId,
      applicationId: app._id.toString(),
      email,
      password,
      name,
      metadata,
      refreshTokenTTL: app.tokenExpiry.refreshTokenTTL,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });

    if (!result.success) {
      return res
        .status(result.status)
        .json({ success: false, error: result.error, message: result.message });
    }

    await createAuditEntry({
      userId: app.organizationId,
      organizationId,
      action: "sdk_user_register",
      resource: "sdk_user",
      resourceId: (result.user as any).id?.toString(),
      method: req.method,
      path: req.path,
      statusCode: 201,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
      metadata: { email, applicationId: app._id },
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      },
    });
  } catch (error: any) {
    console.error("SDK register error:", error);
    return res.status(500).json({
      success: false,
      error: "server_error",
      message: "Registration failed",
    });
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────

export const loginHandler = async (req: Request, res: Response) => {
  try {
    const app = req.application!;
    const organizationId = app.organizationId.toString();
    const { email, password } = req.body;

    const result = await sdkLogin({
      organizationId,
      email,
      password,
      refreshTokenTTL: app.tokenExpiry.refreshTokenTTL,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });

    if (!result.success) {
      return res
        .status(result.status)
        .json({ success: false, error: result.error, message: result.message });
    }

    await createAuditEntry({
      userId: app.organizationId,
      organizationId,
      action: "sdk_user_login",
      resource: "sdk_user",
      resourceId: (result.user as any).id?.toString(),
      method: req.method,
      path: req.path,
      statusCode: 200,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
      metadata: { applicationId: app._id },
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      },
    });
  } catch (error: any) {
    console.error("SDK login error:", error);
    return res
      .status(500)
      .json({ success: false, error: "server_error", message: "Login failed" });
  }
};

// ─── Me ───────────────────────────────────────────────────────────────────────

export const meHandler = async (req: Request, res: Response) => {
  try {
    const { client_id, client_secret } = req.query as {
      client_id: string;
      client_secret: string;
    };

    if (!client_id || !client_secret) {
      return res.status(401).json({
        success: false,
        error: "unauthorized",
        message: "client_id and client_secret are required as query parameters",
      });
    }

    const bearerToken = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : undefined;

    const result = await sdkGetMe(client_id, client_secret, bearerToken);

    if (!result.success) {
      return res
        .status(result.status)
        .json({ success: false, error: result.error, message: result.message });
    }

    return res.status(200).json({ success: true, data: { user: result.user } });
  } catch (error: any) {
    console.error("SDK me error:", error);
    return res.status(500).json({
      success: false,
      error: "server_error",
      message: "Error fetching user",
    });
  }
};

// ─── Refresh ──────────────────────────────────────────────────────────────────

export const refreshHandler = async (req: Request, res: Response) => {
  try {
    const organizationId = req.application!.organizationId.toString();
    const result = await sdkRefresh(organizationId, req.body.refreshToken);

    if (!result.success) {
      return res
        .status(result.status)
        .json({ success: false, error: result.error, message: result.message });
    }

    return res
      .status(200)
      .json({ success: true, data: { accessToken: result.accessToken } });
  } catch (error: any) {
    console.error("SDK refresh error:", error);
    return res.status(500).json({
      success: false,
      error: "server_error",
      message: "Token refresh failed",
    });
  }
};

// ─── Logout ───────────────────────────────────────────────────────────────────

export const logoutHandler = async (req: Request, res: Response) => {
  try {
    const organizationId = req.application!.organizationId.toString();
    const accessToken = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : undefined;

    await sdkLogout(req.body.refreshToken, organizationId, accessToken);
    // Always 200 — never reveal if session existed
    return res
      .status(200)
      .json({ success: true, message: "Logged out successfully" });
  } catch (error: any) {
    console.error("SDK logout error:", error);
    return res.status(500).json({
      success: false,
      error: "server_error",
      message: "Logout failed",
    });
  }
};

// ─── Verify Token ─────────────────────────────────────────────────────────────

export const verifyTokenHandler = async (req: Request, res: Response) => {
  try {
    const { client_id, client_secret } = req.query as {
      client_id: string;
      client_secret: string;
    };

    if (!client_id || !client_secret) {
      return res.status(200).json({
        success: true,
        data: {
          valid: false,
          reason: "client_id and client_secret are required",
        },
      });
    }

    const bearerToken = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : undefined;

    const result = await sdkVerifyToken(client_id, client_secret, bearerToken);
    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    console.error("SDK token verify error:", error);
    return res.status(500).json({
      success: false,
      error: "server_error",
      message: "Token verification failed",
    });
  }
};

// ─── SDK User Management (Admin) ───────────────────────────────────────────────

export const getAppSDKUsersHandler = async (req: Request, res: Response) => {
  try {
    const { appId } = req.params as { appId: string };
    const page = parseInt(req.query.page as string) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    // Convert appId to ObjectId for proper MongoDB query
    const appObjectId = new Types.ObjectId(appId);

    // Verify app belongs to org
    const app = await findOrgApplicationById(appId, req.user!.organizationId);
    if (!app) {
      return res
        .status(404)
        .json({ success: false, message: "Application not found" });
    }

    const users = await getAppSDKUsers(appObjectId, skip, limit);
    const total = await countAppSDKUsers(appObjectId);

    res.status(200).json({
      success: true,
      data: {
        users: users.map((u: any) => ({
          id: u._id,
          email: u.email,
          name: u.name,
          avatar: u.avatar,
          isActive: u.isActive,
          isEmailVerified: u.isEmailVerified,
          lastLoginAt: u.lastLoginAt,
          lastLoginIp: u.lastLoginIp,
          createdAt: u.createdAt,
        })),
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: total,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching SDK users",
      error: error.message,
    });
  }
};

export const searchAppSDKUsersHandler = async (req: Request, res: Response) => {
  try {
    const { appId } = req.params as { appId: string };
    const q = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    // Convert appId to ObjectId for proper MongoDB query
    const appObjectId = new Types.ObjectId(appId);

    // Verify app belongs to org
    const app = await findOrgApplicationById(appId, req.user!.organizationId);
    if (!app) {
      return res
        .status(404)
        .json({ success: false, message: "Application not found" });
    }

    const query = q
      ? {
          $or: [
            { email: { $regex: q, $options: "i" } },
            { name: { $regex: q, $options: "i" } },
          ],
        }
      : {};

    const users = await searchAppSDKUsers(appObjectId, query, skip, limit);
    const total = await countSearchAppSDKUsers(appObjectId, query);

    res.status(200).json({
      success: true,
      data: {
        users: users.map((u: any) => ({
          id: u._id,
          email: u.email,
          name: u.name,
          avatar: u.avatar,
          isActive: u.isActive,
          isEmailVerified: u.isEmailVerified,
          lastLoginAt: u.lastLoginAt,
          lastLoginIp: u.lastLoginIp,
          createdAt: u.createdAt,
        })),
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: total,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error searching SDK users",
      error: error.message,
    });
  }
};

export const getSDKUserDetailHandler = async (req: Request, res: Response) => {
  try {
    const { appId, userId } = req.params as { appId: string; userId: string };

    // Convert appId and userId to ObjectId for proper MongoDB query
    const appObjectId = new Types.ObjectId(appId);
    const userObjectId = new Types.ObjectId(userId);

    // Verify app belongs to org
    const app = await findOrgApplicationById(appId, req.user!.organizationId);
    if (!app) {
      return res
        .status(404)
        .json({ success: false, message: "Application not found" });
    }

    const user = await getSDKUserById(userObjectId, appObjectId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        lastLoginAt: user.lastLoginAt,
        lastLoginIp: user.lastLoginIp,
        metadata: user.metadata,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching user details",
      error: error.message,
    });
  }
};

export const toggleSDKUserActiveHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const { appId, userId } = req.params as { appId: string; userId: string };
    const { isActive } = req.body as { isActive: boolean };

    // Verify app belongs to org
    const app = await findOrgApplicationById(appId, req.user!.organizationId);
    if (!app) {
      return res
        .status(404)
        .json({ success: false, message: "Application not found" });
    }

    const user = await toggleSDKUserActive(userId, isActive);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    await createAuditEntry({
      organizationId: req.user!.organizationId,
      userId: req.user!.userId,
      action: isActive ? "sdk_user_enabled" : "sdk_user_disabled",
      resource: "sdk_user",
      resourceId: userId,
      method: req.method,
      path: req.path,
      statusCode: 200,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
      metadata: { applicationId: appId, isActive },
    });

    res.status(200).json({
      success: true,
      message: isActive ? "User enabled" : "User disabled",
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error updating user status",
      error: error.message,
    });
  }
};

export const deleteSDKUserHandler = async (req: Request, res: Response) => {
  try {
    const { appId, userId } = req.params as { appId: string; userId: string };

    // Verify app belongs to org
    const app = await findOrgApplicationById(appId, req.user!.organizationId);
    if (!app) {
      return res
        .status(404)
        .json({ success: false, message: "Application not found" });
    }

    const appObjectId = new Types.ObjectId(appId);
    const userObjectId = new Types.ObjectId(userId);
    const user = await getSDKUserById(userObjectId, appObjectId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    await deleteSDKUser(userId);

    await createAuditEntry({
      organizationId: req.user!.organizationId,
      userId: req.user!.userId,
      action: "sdk_user_deleted",
      resource: "sdk_user",
      resourceId: userId,
      method: req.method,
      path: req.path,
      statusCode: 200,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
      metadata: { applicationId: appId, email: user.email },
    });

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error deleting user",
      error: error.message,
    });
  }
};
