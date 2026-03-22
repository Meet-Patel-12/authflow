import mongoose from "mongoose";
import { ApiKey, IApiKey } from "../models/apiKey.model";

export const findActiveApiKeyByHash = async (
  keyHash: string,
): Promise<IApiKey | null> => {
  return ApiKey.findOne({ keyHash, isActive: true }).populate(
    "organizationId userId",
  );
};

export const updateApiKeyUsage = async (apiKey: IApiKey): Promise<void> => {
  apiKey.lastUsedAt = new Date();
  apiKey.usageCount += 1;
  await apiKey.save();
};

export const findUserApiKeys = async (
  userId: string,
  organizationId: string,
) => {
  return ApiKey.find({ userId, organizationId, isActive: true }).select(
    "-keyHash",
  );
};

export const findUserApiKeyById = async (
  id: string,
  userId: string,
  organizationId: string,
) => {
  return ApiKey.findOne({
    _id: id,
    userId,
    organizationId,
    isActive: true,
  }).select("-keyHash");
};

export const findActiveApiKeyById = async (
  id: string,
  userId: string,
  organizationId: string,
) => {
  return ApiKey.findOne({ _id: id, userId, organizationId, isActive: true });
};

export const createApiKey = async (data: {
  organizationId: string;
  userId: string;
  name: string;
  permissions: string[];
  keyHash: string;
  keyPrefix: string;
  expiresAt?: Date;
}): Promise<IApiKey> => {
  return ApiKey.create(data);
};

export const deactivateApiKey = async (apiKey: IApiKey): Promise<IApiKey> => {
  apiKey.isActive = false;
  return apiKey.save();
};

export const countActiveApiKeys = async (
  organizationId: string,
): Promise<number> => {
  return ApiKey.countDocuments({ organizationId, isActive: true });
};

export const getApiKeyUsageStats = async (organizationId: string) => {
  const stats = await ApiKey.aggregate([
    {
      $match: {
        organizationId: new mongoose.Types.ObjectId(organizationId),
        isActive: true,
      },
    },
    {
      $group: {
        _id: null,
        totalKeys: { $sum: 1 },
        totalUsage: { $sum: "$usageCount" },
      },
    },
  ]);
  return stats[0] ?? { totalKeys: 0, totalUsage: 0 };
};
