import { IApiKey } from "../models/apiKey.model";
import { hashApiKey, generateApiKey } from "../utils/crypto.util";
import {
  findUserApiKeys,
  findUserApiKeyById,
  findActiveApiKeyById,
  createApiKey,
  deactivateApiKey,
  getApiKeyUsageStats,
} from "../repositories/apiKey.repository";

// ─── Format ───────────────────────────────────────────────────────────────────

export const formatApiKey = (key: IApiKey) => {
  return {
    id: key._id.toString(),
    name: key.name,
    keyPrefix: key.keyPrefix,
    permissions: key.permissions,
    usageCount: key.usageCount,
    lastUsedAt: key.lastUsedAt,
    expiresAt: key.expiresAt,
    createdAt: key.createdAt,
  };
};

// ─── List ─────────────────────────────────────────────────────────────────────

export const listApiKeys = async (userId: string, organizationId: string) => {
  const keys = await findUserApiKeys(userId, organizationId);
  return keys.map(formatApiKey);
};

// ─── Get ──────────────────────────────────────────────────────────────────────

export const getApiKey = async (
  id: string,
  userId: string,
  organizationId: string,
) => {
  const key = await findUserApiKeyById(id, userId, organizationId);
  if (!key) return null;
  return formatApiKey(key);
};

// ─── Create ───────────────────────────────────────────────────────────────────

export const createNewApiKey = async (
  userId: string,
  organizationId: string,
  name: string,
  permissions: string[],
  expiresInDays?: number,
) => {
  const rawKey = generateApiKey(organizationId);
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = rawKey.substring(0, 16);

  const apiKey = await createApiKey({
    organizationId,
    userId,
    name,
    permissions,
    keyHash,
    keyPrefix,
    expiresAt: expiresInDays
      ? new Date(Date.now() + expiresInDays * 86_400_000)
      : undefined,
  });

  return {
    id: apiKey._id.toString(),
    name: apiKey.name,
    key: rawKey, // Only time the raw key is returned
    keyPrefix: apiKey.keyPrefix,
    permissions: apiKey.permissions,
    expiresAt: apiKey.expiresAt,
    createdAt: apiKey.createdAt,
  };
};

// ─── Delete ───────────────────────────────────────────────────────────────────

export const deleteApiKey = async (
  id: string,
  userId: string,
  organizationId: string,
): Promise<boolean> => {
  const apiKey = await findActiveApiKeyById(id, userId, organizationId);
  if (!apiKey) return false;
  await deactivateApiKey(apiKey);
  return true;
};

// ─── Usage ────────────────────────────────────────────────────────────────────

export const getUsageStats = async (organizationId: string) => {
  return getApiKeyUsageStats(organizationId);
};
