import { Request, Response, NextFunction } from "express";
import { IApiKey } from "../models/apiKey.model";
import { hashApiKey } from "../utils/crypto.util";
import { AuthUser } from "../types/auth.types";
import {
  findActiveApiKeyByHash,
  updateApiKeyUsage,
} from "../repositories/apiKey.repository";

export interface PopulatedOrg {
  _id: { toString(): string };
  isActive: boolean;
}

export interface PopulatedUser {
  _id: { toString(): string };
}

export type ApiKeyValidationResult =
  | { success: true; apiKey: IApiKey; user: AuthUser }
  | { success: false; status: 401 | 403 | 500; message: string };

export async function validateApiKey(
  rawKey: string,
): Promise<ApiKeyValidationResult> {
  const apiKey = await findActiveApiKeyByHash(hashApiKey(rawKey));

  if (!apiKey) {
    return { success: false, status: 401, message: "Invalid API key" };
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return { success: false, status: 401, message: "API key expired" };
  }

  const org = apiKey.organizationId as unknown as PopulatedOrg;
  if (!org?._id) {
    return {
      success: false,
      status: 403,
      message: "Invalid organization reference",
    };
  }

  if (!org.isActive) {
    return { success: false, status: 403, message: "Organization not active" };
  }

  const user = apiKey.userId as unknown as PopulatedUser;
  if (!user?._id) {
    return { success: false, status: 403, message: "Invalid user reference" };
  }

  await updateApiKeyUsage(apiKey);

  return {
    success: true,
    apiKey,
    user: {
      userId: user._id.toString(),
      organizationId: org._id.toString(),
      role: "sdk_user",
      email: "",
      isSDKUser: true,
    },
  };
}

export function hasApiKeyPermission(
  apiKey: IApiKey,
  requiredPermission: string,
): boolean {
  return (
    apiKey.permissions.includes(requiredPermission) ||
    apiKey.permissions.includes("admin")
  );
}

// ─── Authenticate API Key ─────────────────────────────────────────────────────

export const authenticateApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const rawKey = req.headers["x-api-key"] as string;

    if (!rawKey) {
      return res
        .status(401)
        .json({ success: false, message: "API key is required" });
    }

    const result = await validateApiKey(rawKey);

    if (!result.success) {
      return res
        .status(result.status)
        .json({ success: false, message: result.message });
    }

    req.user = result.user;
    req.apiKey = result.apiKey;

    next();
  } catch (error) {
    console.error("API key authentication error:", error);
    return res
      .status(500)
      .json({ success: false, message: "API key authentication failed" });
  }
};

// ─── Check API Key Permission ─────────────────────────────────────────────────

export const checkApiKeyPermission = (requiredPermission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.apiKey) {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }

    if (!hasApiKeyPermission(req.apiKey, requiredPermission)) {
      return res.status(403).json({
        success: false,
        message: `Permission denied. Required: ${requiredPermission}`,
      });
    }

    next();
  };
};
