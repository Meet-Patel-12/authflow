import mongoose from "mongoose";
import { User } from "../models/user.model";
import { AuditLog } from "../models/audit.model";
import { Session } from "../models/session.model";
import { ApiKey } from "../models/apiKey.model";
import { Membership } from "../models/membership.model";

// ─── Membership ───────────────────────────────────────────────────────────────

export const getOrgUserIds = async (
  organizationId: string,
): Promise<mongoose.Types.ObjectId[]> => {
  const memberships = await Membership.find({ organizationId })
    .select("userId")
    .lean();
  return memberships.map((m) => m.userId);
};

export const findMembership = async (
  userId: string,
  organizationId: string,
) => {
  return Membership.findOne({ userId, organizationId });
};

export const findMembershipWithRole = async (
  userId: string,
  organizationId: string,
) => {
  return Membership.findOne({ userId, organizationId }).select(
    "role createdAt",
  );
};

export const updateMembershipRole = async (
  userId: string,
  organizationId: string,
  role: string,
) => {
  return Membership.findOneAndUpdate(
    { userId, organizationId },
    { role },
    { new: true },
  );
};

export const countOwners = async (organizationId: string): Promise<number> => {
  return Membership.countDocuments({ organizationId, role: "owner" });
};

export const getOrgMembershipsWithRoles = async (
  organizationId: string,
  userIds: mongoose.Types.ObjectId[],
) => {
  return Membership.find({ organizationId, userId: { $in: userIds } })
    .select("userId role")
    .lean();
};

// ─── Users ────────────────────────────────────────────────────────────────────

export const findUserById = async (id: string) => {
  return User.findById(id).select("-password");
};

export const countOrgUsers = async (
  userIds: mongoose.Types.ObjectId[],
  filter: Record<string, unknown> = {},
) => {
  return User.countDocuments({ _id: { $in: userIds }, ...filter });
};

export const findOrgUsers = async (
  userIds: mongoose.Types.ObjectId[],
  query: Record<string, unknown>,
  sort: Record<string, 1 | -1>,
  skip: number,
  limit: number,
) => {
  return User.find({ _id: { $in: userIds }, ...query })
    .select("-password")
    .sort(sort)
    .limit(limit)
    .skip(skip);
};

export const setUserActive = async (userId: string, isActive: boolean) => {
  const user = await User.findById(userId);
  if (!user) return null;
  user.isActive = isActive;
  return user.save();
};

// ─── Sessions ─────────────────────────────────────────────────────────────────

export const countActiveSessions = async (
  organizationId: string,
): Promise<number> => {
  return Session.countDocuments({ organizationId, isActive: true });
};

export const findUserSessions = async (
  userId: string,
  organizationId: string,
) => {
  return Session.find({ userId, organizationId, isActive: true }).select(
    "ipAddress userAgent lastActivity createdAt",
  );
};

export const revokeUserSessions = async (
  userId: string,
  organizationId: string,
) => {
  return Session.updateMany({ userId, organizationId }, { isActive: false });
};

// ─── API Keys ─────────────────────────────────────────────────────────────────

export const countActiveApiKeys = async (
  organizationId: string,
): Promise<number> => {
  return ApiKey.countDocuments({ organizationId, isActive: true });
};

export const findUserApiKeys = async (
  userId: string,
  organizationId: string,
) => {
  return ApiKey.find({ userId, organizationId, isActive: true }).select(
    "name permissions createdAt",
  );
};

export const revokeUserApiKeys = async (
  userId: string,
  organizationId: string,
) => {
  return ApiKey.updateMany({ userId, organizationId }, { isActive: false });
};

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export const findAuditLogs = async (
  query: Record<string, unknown>,
  skip: number,
  limit: number,
) => {
  return AuditLog.find(query)
    .populate("userId", "name email")
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

export const countAuditLogs = async (
  query: Record<string, unknown>,
): Promise<number> => {
  return AuditLog.countDocuments(query);
};

// ─── Health ───────────────────────────────────────────────────────────────────

export const pingDatabase = async () => {
  return mongoose.connection.db?.admin().ping();
};
