import { Types } from "mongoose";
import { SDKUser, ISDKUser } from "../models/sdkUser.model";
import { SDKSession, ISDKSession } from "../models/sdkSession.model";
import { Organization } from "../models/organization.model";
import { Application } from "../models/application.model";

// ─── Organization ─────────────────────────────────────────────────────────────

export const findOrgById = async (organizationId: string) => {
  return Organization.findById(organizationId);
};

// ─── Application ──────────────────────────────────────────────────────────────

export const findActiveApplicationByClientId = async (clientId: string) => {
  return Application.findOne({ clientId, isActive: true }).select(
    "+clientSecret",
  );
};

// ─── SDK User ─────────────────────────────────────────────────────────────────

export const findSDKUserByEmail = async (
  organizationId: string,
  email: string,
) => {
  return SDKUser.findOne({ organizationId, email });
};

export const findSDKUserByEmailWithPassword = async (
  organizationId: string,
  email: string,
) => {
  return SDKUser.findOne({ organizationId, email }).select("+password");
};

export const findActiveSDKUserById = async (
  userId: string,
  organizationId: string,
) => {
  return SDKUser.findOne({ _id: userId, organizationId, isActive: true });
};

export const countSDKUsers = async (
  organizationId: string,
): Promise<number> => {
  return SDKUser.countDocuments({ organizationId });
};

export const createSDKUser = async (data: {
  organizationId: string;
  applicationId: string;
  email: string;
  password: string;
  name: string;
  metadata: Record<string, unknown>;
}): Promise<ISDKUser> => {
  return SDKUser.create(data);
};

export const saveSDKUser = async (user: ISDKUser): Promise<ISDKUser> => {
  return user.save();
};

// ─── SDK Session ──────────────────────────────────────────────────────────────

export const createSDKSession = async (data: {
  sdkUserId: string;
  organizationId: string;
  refreshToken: string;
  ipAddress: string;
  userAgent: string;
  expiresAt: Date;
}): Promise<ISDKSession> => {
  return SDKSession.create(data);
};

export const findActiveSDKSession = async (
  refreshToken: string,
  organizationId: string,
) => {
  return SDKSession.findOne({
    refreshToken,
    organizationId,
    isActive: true,
    expiresAt: { $gt: new Date() },
  });
};

export const deactivateSDKSession = async (sessionId: string) => {
  return SDKSession.findByIdAndUpdate(sessionId, { isActive: false });
};

export const revokeSDKSessionByToken = async (
  refreshToken: string,
  organizationId: string,
) => {
  return SDKSession.findOneAndUpdate(
    { refreshToken, organizationId, isActive: true },
    { isActive: false },
  );
};

export const saveSDKSession = async (
  session: ISDKSession,
): Promise<ISDKSession> => {
  return session.save();
};

// ─── SDK User Management (Admin) ──────────────────────────────────────────────

export const getAppSDKUsers = async (
  applicationId: string | Types.ObjectId,
  skip: number = 0,
  limit: number = 20,
) => {
  const appId =
    typeof applicationId === "string"
      ? new Types.ObjectId(applicationId)
      : applicationId;
  return SDKUser.find({ applicationId: appId })
    .select("-password")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

export const countAppSDKUsers = async (
  applicationId: string | Types.ObjectId,
): Promise<number> => {
  const appId =
    typeof applicationId === "string"
      ? new Types.ObjectId(applicationId)
      : applicationId;
  return SDKUser.countDocuments({ applicationId: appId });
};

export const searchAppSDKUsers = async (
  applicationId: string | Types.ObjectId,
  query: Record<string, unknown>,
  skip: number = 0,
  limit: number = 20,
) => {
  const appId =
    typeof applicationId === "string"
      ? new Types.ObjectId(applicationId)
      : applicationId;
  return SDKUser.find({ applicationId: appId, ...query })
    .select("-password")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

export const countSearchAppSDKUsers = async (
  applicationId: string | Types.ObjectId,
  query: Record<string, unknown>,
): Promise<number> => {
  const appId =
    typeof applicationId === "string"
      ? new Types.ObjectId(applicationId)
      : applicationId;
  return SDKUser.countDocuments({ applicationId: appId, ...query });
};

export const getSDKUserById = async (
  userId: string | Types.ObjectId,
  applicationId: string | Types.ObjectId,
) => {
  const userId_objId =
    typeof userId === "string" ? new Types.ObjectId(userId) : userId;
  const appId =
    typeof applicationId === "string"
      ? new Types.ObjectId(applicationId)
      : applicationId;
  return SDKUser.findOne({ _id: userId_objId, applicationId: appId }).select(
    "-password",
  );
};

export const updateSDKUser = async (
  userId: string,
  updates: {
    name?: string;
    email?: string;
    avatar?: string;
    metadata?: Record<string, unknown>;
  },
) => {
  return SDKUser.findByIdAndUpdate(userId, updates, { new: true }).select(
    "-password",
  );
};

export const toggleSDKUserActive = async (
  userId: string,
  isActive: boolean,
) => {
  return SDKUser.findByIdAndUpdate(userId, { isActive }, { new: true }).select(
    "-password",
  );
};

export const deleteSDKUser = async (userId: string) => {
  return SDKUser.findByIdAndDelete(userId);
};
