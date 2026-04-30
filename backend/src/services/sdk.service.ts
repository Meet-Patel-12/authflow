import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "../utils/jwt";
import { RedisService } from "./redis.service";
import { verifyAppSecret } from "../utils/crypto.util";
import {
  findOrgById,
  findActiveApplicationByClientId,
  findSDKUserByEmail,
  findSDKUserByEmailWithPassword,
  findActiveSDKUserById,
  countSDKUsers,
  createSDKUser,
  saveSDKUser,
  createSDKSession,
  findActiveSDKSession,
  deactivateSDKSession,
  revokeSDKSessionByToken,
  saveSDKSession,
} from "../repositories/sdk.repository";

// ─── Shared ───────────────────────────────────────────────────────────────────

const buildTokenPayload = (
  userId: string,
  email: string,
  organizationId: string,
) => {
  return { userId, email, role: "sdk_user" as const, organizationId };
};

const verifyClientCredentials = async (
  clientId: string,
  clientSecret: string,
) => {
  const app = await findActiveApplicationByClientId(clientId);
  if (!app || !verifyAppSecret(clientSecret, app.clientSecret)) return null;
  return app;
};

// ─── Register ─────────────────────────────────────────────────────────────────

export type SDKRegisterResult =
  | { success: true; accessToken: string; refreshToken: string; user: object }
  | { success: false; status: 403 | 409; error: string; message: string };

export const sdkRegister = async (data: {
  organizationId: string;
  applicationId: string;
  email: string;
  password: string;
  name: string;
  metadata: Record<string, unknown>;
  refreshTokenTTL: number;
  ipAddress: string;
  userAgent: string;
}): Promise<SDKRegisterResult> => {
  const org = await findOrgById(data.organizationId);
  if (!org?.isActive) {
    return {
      success: false,
      status: 403,
      error: "organization_inactive",
      message: "Organization not found or inactive",
    };
  }

  const userCount = await countSDKUsers(data.organizationId);
  if (userCount >= org.limits.maxUsers) {
    return {
      success: false,
      status: 403,
      error: "user_limit_reached",
      message: `User limit reached. Your ${org.billing.plan} plan allows ${org.limits.maxUsers} users.`,
    };
  }

  const existing = await findSDKUserByEmail(data.organizationId, data.email);
  if (existing) {
    return {
      success: false,
      status: 409,
      error: "user_exists",
      message: "A user with this email already exists in your application",
    };
  }

  const sdkUser = await createSDKUser({
    organizationId: data.organizationId,
    applicationId: data.applicationId,
    email: data.email,
    password: data.password,
    name: data.name,
    metadata: data.metadata,
  });

  const payload = buildTokenPayload(
    sdkUser._id.toString(),
    sdkUser.email,
    data.organizationId,
  );
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  await createSDKSession({
    sdkUserId: sdkUser._id.toString(),
    organizationId: data.organizationId,
    refreshToken,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    expiresAt: new Date(Date.now() + data.refreshTokenTTL * 1000),
  });

  return {
    success: true,
    accessToken,
    refreshToken,
    user: {
      id: sdkUser._id,
      email: sdkUser.email,
      name: sdkUser.name,
      isEmailVerified: sdkUser.isEmailVerified,
      createdAt: sdkUser.createdAt,
    },
  };
};

// ─── Login ────────────────────────────────────────────────────────────────────

export type SDKLoginResult =
  | { success: true; accessToken: string; refreshToken: string; user: object }
  | { success: false; status: 401; error: string; message: string };

export const sdkLogin = async (data: {
  organizationId: string;
  email: string;
  password: string;
  refreshTokenTTL: number;
  ipAddress: string;
  userAgent: string;
}): Promise<SDKLoginResult> => {
  const sdkUser = await findSDKUserByEmailWithPassword(
    data.organizationId,
    data.email,
  );

  if (!sdkUser) {
    return {
      success: false,
      status: 401,
      error: "invalid_credentials",
      message: "Invalid email or password",
    };
  }

  if (!sdkUser.isActive) {
    return {
      success: false,
      status: 401,
      error: "account_suspended",
      message: "This account has been suspended",
    };
  }

  const isValid = await sdkUser.comparePassword(data.password);
  if (!isValid) {
    return {
      success: false,
      status: 401,
      error: "invalid_credentials",
      message: "Invalid email or password",
    };
  }

  const payload = buildTokenPayload(
    sdkUser._id.toString(),
    sdkUser.email,
    data.organizationId,
  );
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  await createSDKSession({
    sdkUserId: sdkUser._id.toString(),
    organizationId: data.organizationId,
    refreshToken,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    expiresAt: new Date(Date.now() + data.refreshTokenTTL * 1000),
  });

  sdkUser.lastLoginAt = new Date();
  sdkUser.lastLoginIp = data.ipAddress;
  await saveSDKUser(sdkUser);

  return {
    success: true,
    accessToken,
    refreshToken,
    user: {
      id: sdkUser._id,
      email: sdkUser.email,
      name: sdkUser.name,
      isEmailVerified: sdkUser.isEmailVerified,
      lastLoginAt: sdkUser.lastLoginAt,
    },
  };
};

// ─── Get Me ───────────────────────────────────────────────────────────────────

export type SDKMeResult =
  | { success: true; user: object }
  | { success: false; status: 401 | 403 | 404; error: string; message: string };

export const sdkGetMe = async (
  clientId: string,
  clientSecret: string,
  bearerToken: string | undefined,
): Promise<SDKMeResult> => {
  const app = await verifyClientCredentials(clientId, clientSecret);
  if (!app) {
    return {
      success: false,
      status: 401,
      error: "unauthorized",
      message: "Invalid client credentials",
    };
  }

  if (!bearerToken) {
    return {
      success: false,
      status: 401,
      error: "missing_token",
      message: "Authorization: Bearer <token> header is required",
    };
  }

  const isBlacklisted = await RedisService.isTokenBlacklisted(bearerToken);
  if (isBlacklisted) {
    return {
      success: false,
      status: 401,
      error: "token_revoked",
      message: "Token has been revoked",
    };
  }

  const decoded = verifyAccessToken(bearerToken);
  if (!decoded) {
    return {
      success: false,
      status: 401,
      error: "invalid_token",
      message: "Access token is invalid or expired",
    };
  }

  if (decoded.organizationId !== app.organizationId.toString()) {
    return {
      success: false,
      status: 403,
      error: "org_mismatch",
      message: "Token does not belong to this application",
    };
  }

  if (decoded.role !== "sdk_user") {
    return {
      success: false,
      status: 403,
      error: "invalid_token_type",
      message: "Invalid token type",
    };
  }

  const sdkUser = await findActiveSDKUserById(
    decoded.userId,
    app.organizationId.toString(),
  );
  if (!sdkUser) {
    return {
      success: false,
      status: 404,
      error: "user_not_found",
      message: "User not found",
    };
  }

  return {
    success: true,
    user: {
      id: sdkUser._id,
      email: sdkUser.email,
      name: sdkUser.name,
      avatar: sdkUser.avatar,
      isEmailVerified: sdkUser.isEmailVerified,
      metadata: sdkUser.metadata,
      lastLoginAt: sdkUser.lastLoginAt,
      createdAt: sdkUser.createdAt,
    },
  };
};

// ─── Refresh ──────────────────────────────────────────────────────────────────

export type SDKRefreshResult =
  | { success: true; accessToken: string }
  | { success: false; status: 401 | 403; error: string; message: string };

export const sdkRefresh = async (
  organizationId: string,
  refreshToken: string,
): Promise<SDKRefreshResult> => {
  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded) {
    return {
      success: false,
      status: 401,
      error: "invalid_token",
      message: "Refresh token is invalid or expired",
    };
  }

  if (decoded.organizationId !== organizationId) {
    return {
      success: false,
      status: 403,
      error: "org_mismatch",
      message: "Token does not belong to this application",
    };
  }

  const session = await findActiveSDKSession(refreshToken, organizationId);
  if (!session) {
    return {
      success: false,
      status: 401,
      error: "session_expired",
      message: "Session not found or expired. Please login again.",
    };
  }

  const sdkUser = await findActiveSDKUserById(
    session.sdkUserId.toString(),
    organizationId,
  );
  if (!sdkUser) {
    await deactivateSDKSession(session._id.toString());
    return {
      success: false,
      status: 401,
      error: "user_not_found",
      message: "User not found or suspended",
    };
  }

  const accessToken = generateAccessToken(
    buildTokenPayload(sdkUser._id.toString(), sdkUser.email, organizationId),
  );
  session.lastActivity = new Date();
  await saveSDKSession(session);

  return { success: true, accessToken };
};

// ─── Logout ───────────────────────────────────────────────────────────────────

export const sdkLogout = async (
  refreshToken: string,
  organizationId: string,
  accessToken?: string,
): Promise<void> => {
  await revokeSDKSessionByToken(refreshToken, organizationId);
  if (accessToken) await RedisService.blacklistToken(accessToken, 15 * 60);
};

// ─── Verify Token ─────────────────────────────────────────────────────────────

export const sdkVerifyToken = async (
  clientId: string,
  clientSecret: string,
  bearerToken: string | undefined,
): Promise<{ valid: boolean; reason?: string; user?: object }> => {
  const app = await verifyClientCredentials(clientId, clientSecret);
  if (!app) return { valid: false, reason: "Invalid client credentials" };

  if (!bearerToken) return { valid: false, reason: "No Bearer token provided" };

  const isBlacklisted = await RedisService.isTokenBlacklisted(bearerToken);
  if (isBlacklisted) return { valid: false, reason: "Token has been revoked" };

  const decoded = verifyAccessToken(bearerToken);
  if (!decoded) return { valid: false, reason: "Token is invalid or expired" };
  if (decoded.role !== "sdk_user")
    return { valid: false, reason: "Invalid token type" };
  if (decoded.organizationId !== app.organizationId.toString())
    return {
      valid: false,
      reason: "Token does not belong to this application",
    };

  const sdkUser = await findActiveSDKUserById(
    decoded.userId,
    app.organizationId.toString(),
  );
  if (!sdkUser) return { valid: false, reason: "User not found or suspended" };

  return {
    valid: true,
    user: {
      id: sdkUser._id,
      email: sdkUser.email,
      name: sdkUser.name,
      isEmailVerified: sdkUser.isEmailVerified,
      metadata: sdkUser.metadata,
      organizationId: app.organizationId,
    },
  };
};
